"""MediKnowledge ingestion: a doctor's file or text -> clean text -> chunks -> (embeddings) -> PostgreSQL."""

import re
from pathlib import Path
from typing import Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.llm import embed

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_CHUNKS_PER_DOCUMENT = 2000
CHUNK_CHARS = 900          # ~200 tokens: precise enough to quote, large enough to keep context
CHUNK_OVERLAP = 150
EMBED_BATCH = 32


# ---------------------------------------------------------------------------
# Extracting
# ---------------------------------------------------------------------------

def extract_text(data: bytes, filename: str) -> str:
    """Plain text from a PDF, .txt or .md file."""
    ext = Path(filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext or '?'}'. Use PDF, TXT or MD.")
    if len(data) > MAX_FILE_BYTES:
        raise ValueError("File too large (max 20 MB)")
    if ext == ".pdf":
        import fitz  # PyMuPDF

        with fitz.open(stream=data, filetype="pdf") as doc:
            text = "\n\n".join(page.get_text() for page in doc)
        if not text.strip():
            raise ValueError("This PDF has no selectable text (scanned pages are not supported yet).")
        return text
    return data.decode("utf-8", errors="replace")


def clean_text(text: str) -> str:
    """Normalise whitespace, drop page numbers and hyphenated line breaks from PDFs."""
    text = text.replace("\r\n", "\n").replace("­", "")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)                 # re-join hyphenated words
    text = re.sub(r"^\s*(page\s*)?\d+\s*(/\s*\d+)?\s*$", "", text, flags=re.I | re.M)  # page numbers
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str, size: int = CHUNK_CHARS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Paragraph-aware chunks of about `size` characters, overlapping by about `overlap`."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    pieces: list[str] = []
    for p in paragraphs:                       # split oversized paragraphs on sentence ends
        if len(p) <= size:
            pieces.append(p)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", p)
        buf = ""
        for s in sentences:
            if buf and len(buf) + len(s) + 1 > size:
                pieces.append(buf)
                buf = ""
            while len(s) > size:               # a single huge "sentence" (tables, lists)
                pieces.append(s[:size])
                s = s[size - overlap:]
            buf = f"{buf} {s}".strip()
        if buf:
            pieces.append(buf)

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) + 2 > size:
            chunks.append(current)
            tail = current[-overlap:]
            current = tail[tail.find(" ") + 1:] if " " in tail else ""   # start the overlap at a word
        current = f"{current}\n\n{piece}".strip() if current else piece
    if current:
        chunks.append(current)
    return chunks


# ---------------------------------------------------------------------------
# Storing
# ---------------------------------------------------------------------------

async def _embed_all(chunks: list[str]) -> list[Optional[list[float]]]:
    """Embeddings for every chunk, or Nones when no embedding model is configured or it fails."""
    vectors: list[Optional[list[float]]] = []
    try:
        for i in range(0, len(chunks), EMBED_BATCH):
            batch = await embed(chunks[i:i + EMBED_BATCH])
            if batch is None:
                return [None] * len(chunks)
            vectors.extend(batch)
        return vectors
    except Exception as e:
        logger.warning(f"[MEDIKNOWLEDGE] embeddings unavailable, keyword search only: {e}")
        return [None] * len(chunks)


async def add_document(doctor_id: int, title: str, text: str, *, source_name: Optional[str] = None,
                       mime_type: Optional[str] = None) -> dict:
    """Store a document for `doctor_id` and index it. Returns {id, title, chunk_count}."""
    chunks = chunk_text(clean_text(text))
    if not chunks:
        raise ValueError("The document has no text to index")
    if len(chunks) > MAX_CHUNKS_PER_DOCUMENT:
        raise ValueError(f"Document too long ({len(chunks)} chunks, max {MAX_CHUNKS_PER_DOCUMENT})")
    vectors = await _embed_all(chunks)

    async with db_manager.transaction() as conn:
        document_id = await conn.fetchval(
            """INSERT INTO knowledge.documents (doctor_id, title, source_name, mime_type, chunk_count)
               VALUES ($1, $2, $3, $4, $5) RETURNING id""",
            doctor_id, title.strip()[:200] or "Untitled", source_name, mime_type, len(chunks))
        await conn.executemany(
            """INSERT INTO knowledge.chunks (document_id, doctor_id, chunk_index, content, embedding)
               VALUES ($1, $2, $3, $4, $5)""",
            [(document_id, doctor_id, i, c, v) for i, (c, v) in enumerate(zip(chunks, vectors))])
    logger.info(f"[MEDIKNOWLEDGE] doctor {doctor_id} added document {document_id}: {len(chunks)} chunks, "
                f"embeddings={'yes' if vectors and vectors[0] is not None else 'no'}")
    return {"id": document_id, "title": title, "chunk_count": len(chunks)}


async def list_documents(doctor_id: int) -> list[dict]:
    rows = await db_manager.fetch(
        """SELECT id, title, source_name, mime_type, chunk_count, created_at
           FROM knowledge.documents WHERE doctor_id = $1 ORDER BY created_at DESC""", doctor_id)
    return [dict(r) for r in rows]


async def delete_document(doctor_id: int, document_id: int) -> bool:
    deleted = await db_manager.fetchval(
        "DELETE FROM knowledge.documents WHERE id = $1 AND doctor_id = $2 RETURNING id", document_id, doctor_id)
    return deleted is not None
