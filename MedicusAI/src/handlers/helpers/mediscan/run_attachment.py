"""Attachment pipeline: triage -> specialised analysis. Works with any configured LLM provider."""

import base64
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel

from medicus_common.core.artifact_loader import load_artifact_file
from medicus_common.core.logging_config import logger
from medicus_common.llm import complete, get_llm_settings, image_part, parse_structured, text_part

from .attachment_utils import image_mime_from_ext

BASE_DIR = Path(__file__).resolve().parent
TRIAGE_PROMPT = load_artifact_file(BASE_DIR / "triage_instructions.md", "instructions")
CLINICAL_IMAGE_PROMPT = load_artifact_file(BASE_DIR / "clinical_image_prompt.md", "instructions")
LAB_REPORT_PROMPT = load_artifact_file(BASE_DIR / "lab_report_prompt.md", "instructions")
DOCUMENT_PROMPT = load_artifact_file(BASE_DIR / "document_prompt.md", "instructions")

MAX_PDF_PAGES_AS_IMAGES = 4
MIN_TEXT_CHARS_PER_PAGE = 80


class TriageResult(BaseModel):
    category: Literal["INSURANCE_CARD", "DOCUMENT_SIMPLE", "LAB_REPORT", "CLINICAL_IMAGE", "INVALID"]
    blurry: bool = False
    rejected: bool = False
    rejection_reason: Optional[str] = None


def _data_url(data: bytes, mime_type: str) -> str:
    return f"data:{mime_type};base64,{base64.b64encode(data).decode('ascii')}"


def _pdf_parts(file_bytes: bytes) -> list[dict]:
    """Represent a PDF as chat content parts for the active provider."""
    if get_llm_settings().provider == "openai":
        return [{"type": "file", "file": {"filename": "document.pdf",
                                          "file_data": _data_url(file_bytes, "application/pdf")}}]

    import fitz  # PyMuPDF

    parts: list[dict] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        text = "\n\n".join(f"--- Page {i + 1} ---\n{page.get_text()}" for i, page in enumerate(doc))
        parts.append(text_part(f"Extracted document text:\n{text[:60000]}"))
        scanned = len(text.strip()) < MIN_TEXT_CHARS_PER_PAGE * max(1, doc.page_count)
        if scanned and get_llm_settings().supports_vision:
            for page in list(doc)[:MAX_PDF_PAGES_AS_IMAGES]:
                png = page.get_pixmap(dpi=150).tobytes("png")
                parts.append(image_part(_data_url(png, "image/png")))
    return parts


def _content_parts(file_bytes: bytes, mime_type: str) -> list[dict]:
    mime_type = (mime_type or "").lower()
    if mime_type.startswith("image/"):
        if not get_llm_settings().supports_vision:
            # The reason is shown in the chat: keep configuration details in the log only.
            logger.warning("[MEDISCAN] Image received but LLM_SUPPORTS_VISION=false; set it for a vision model")
            raise ValueError("I can't view images with the current setup. Please describe what the image "
                             "shows, or share the report as a PDF, and I'll help with that.")
        return [image_part(_data_url(file_bytes, mime_type))]
    if mime_type == "application/pdf":
        return _pdf_parts(file_bytes)
    if mime_type.startswith("text/"):
        return [text_part(file_bytes.decode("utf-8", errors="replace")[:60000])]
    raise ValueError(f"Unsupported attachment type: {mime_type or 'unknown'}")


def _messages(instructions: str, parts: list[dict]) -> list[dict]:
    return [{"role": "system", "content": instructions}, {"role": "user", "content": parts}]


async def triage_attachment(parts: list[dict]) -> TriageResult:
    result = await parse_structured(_messages(TRIAGE_PROMPT, parts), TriageResult, role="triage")
    if result is None:
        raise RuntimeError("Attachment triage failed")
    return result


_REPLY_FORMAT = {
    "patient": """
Reply format. The reader is the patient who sent this file; they are not medically trained.
- Write in plain, warm language, in the language of the patient's message.
- Start with one sentence saying what the file is (for example "These are your lipid panel and HbA1c results from 2 November").
- Then the results or findings that matter, most important first: anything outside its reference range, each with the value, the normal range and a one-line plain explanation of what that measure is.
- Summarise the normal results in one line instead of listing them.
- If the patient asked something with the file, answer it.
- End by suggesting they go over the results with their doctor. Do not diagnose or suggest changes to treatment.
- Markdown bullets and bold only. No tables, no LaTeX or math notation, no numbered section headings. At most 180 words.
""",
    "doctor": """
Reply format. The reader is a clinician.
- One line: what the file is, with its date if visible.
- Key values or findings with units and reference ranges, abnormal ones first and marked (H)/(L).
- One line starting "Notable:" with clinically relevant patterns. Non-diagnostic.
- If the clinician asked something with the file, answer it.
- Markdown bullets or a compact table. No LaTeX or math notation. At most 180 words.
""",
}


async def run_attachment(file_bytes: bytes, mime_type: Optional[str], ext: Optional[str] = None,
                         audience: Literal["patient", "doctor"] = "patient",
                         user_text: Optional[str] = None) -> Dict[str, Any]:
    """Returns {"status": "ok", "text": ...} or {"status": "rejected"|"error", "reason": ...}.

    The reply is written for `audience` and answers `user_text` (the message sent with the file)."""
    if not mime_type and ext:
        mime_type = image_mime_from_ext(ext)

    try:
        parts = _content_parts(file_bytes, mime_type or "")
    except ValueError as e:
        return {"status": "rejected", "reason": str(e)}

    triage = await triage_attachment(parts)
    if triage.rejected or triage.category == "INVALID":
        return {"status": "rejected", "reason": triage.rejection_reason or "This file could not be used."}
    if triage.category == "CLINICAL_IMAGE" and triage.blurry:
        return {
            "status": "rejected",
            "reason": "Image quality is insufficient for medical interpretation. "
                      "Please retake the photo with better lighting and focus.",
        }

    if triage.category == "CLINICAL_IMAGE":
        prompt, role = CLINICAL_IMAGE_PROMPT, "vision"
    elif triage.category == "LAB_REPORT":
        prompt, role = LAB_REPORT_PROMPT, "lab"
    else:
        prompt, role = DOCUMENT_PROMPT, "doc"

    logger.info(f"[MEDISCAN] {triage.category} -> {role} model ({audience})")
    instructions = prompt + "\n" + _REPLY_FORMAT.get(audience, _REPLY_FORMAT["patient"])
    question = (user_text or "").strip()
    reply_parts = ([text_part(f"Message sent with this file: {question}")] if question else []) + parts
    text = await complete(_messages(instructions, reply_parts), role=role)
    return {"status": "ok", "category": triage.category, "text": text}
