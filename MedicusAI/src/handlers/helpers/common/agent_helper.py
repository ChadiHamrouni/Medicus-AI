# ============================================================
# FILE: src/handlers/helpers/common/agent_helper.py
# ============================================================

from typing import Any, Dict, Optional

from medicus_common.models.convo.payload import AppPayload
from medicus_common.models.patient.patient_view import PatientView
from medicus_common.models.doctor.doctor_view import DoctorView

from src.security.tool_guard import build_tool_context


def build_agent_context(
    payload: AppPayload,
    patient_context: Optional[PatientView] = None,
) -> Dict[str, Any]:
    """
    Trusted run context for tools (never shown to the LLM).

    `payload` must already have been rewritten from a ChatScope by the API layer,
    so its identity fields are server-verified. The tool guard injects these
    values into every tool call.
    """
    from datetime import date

    # Build patient display info from patient_context if available
    patient_name = None
    patient_age = None
    patient_gender = None
    if patient_context:
        # Build display name
        if patient_context.first_name or patient_context.last_name:
            patient_name = f"{patient_context.first_name or ''} {patient_context.last_name or ''}".strip()

        # Use current_age if available, otherwise calculate from dob
        if patient_context.current_age:
            patient_age = patient_context.current_age
        elif patient_context.dob:
            patient_age = (date.today() - patient_context.dob).days // 365

        # Gender
        if patient_context.gender:
            patient_gender = patient_context.gender.value if hasattr(patient_context.gender, 'value') else str(patient_context.gender)

    return build_tool_context(
        user_id=payload.user_id,
        actor_role="doctor" if payload.assistant == "medidoc" else "patient",
        assistant=payload.assistant,
        conversation_id=payload.convo_id,
        mirror_conversation_id=payload.mirror_convo_id,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        patient_name=patient_name,
        patient_age=patient_age,
        patient_gender=patient_gender,
    )


def build_convo_context(
    patient_context: Optional[PatientView],
    doctor_context: Optional[DoctorView],
    convo_context: Dict[str, Any],
    assistant: str,
) -> Dict[str, str]:
    """
    CONVERSATION CONTEXT (LLM-VISIBLE, HUMAN-READABLE)

    Purpose:
    - Clinical understanding
    - Reasoning
    - Natural language grounding
    - ID *reference*, not authority

    Rules:
    - This is advisory, not authoritative.
    - IDs here are for interpretation only.
    - Tools MUST NOT trust this for execution.
    """
    from datetime import datetime, timezone

    parts: list[str] = []

    # -----------------------------
    # Current Date/Time (critical for scheduling)
    # -----------------------------
    now = datetime.now(timezone.utc)
    parts.append(f"## Current Date and Time\nToday is {now.strftime('%A, %B %d, %Y')} (UTC: {now.strftime('%Y-%m-%d %H:%M')})")

    # -----------------------------
    # Patient (descriptive only)
    # -----------------------------
    if patient_context:
        p = []
        p.append("## Patient Overview")
        p.append(f"Patient reference: #{patient_context.id}")  # NOT authoritative
        p.append(f"Name: {patient_context.first_name} {patient_context.last_name}")

        if patient_context.dob:
            from datetime import date
            age = (date.today() - patient_context.dob).days // 365
            p.append(f"Age: {age}")

        if patient_context.gender:
            p.append(f"Gender: {patient_context.gender}")

        parts.append("\n".join(p))

    # -----------------------------
    # Doctor (descriptive only)
    # -----------------------------
    if doctor_context:
        d = ["## Clinician Overview", f"Clinician reference: #{doctor_context.id}",
             f"Name: Dr. {doctor_context.first_name} {doctor_context.last_name}"]

        if doctor_context.specialty_name:
            d.append(f"Specialty: {doctor_context.specialty_name}")

        parts.append("\n".join(d))

    # -----------------------------
    # Conversation IDs (for tool use)
    # -----------------------------
    convo_ids = []
    if convo_context.get("conversation_id"):
        convo_ids.append(f"Current conversation ID: {convo_context['conversation_id']}")
    if convo_context.get("mirror_conversation_id"):
        convo_ids.append(f"Patient mirror conversation ID: {convo_context['mirror_conversation_id']}")

    if convo_ids:
        parts.append("## Conversation Context\n" + "\n".join(convo_ids))

    # -----------------------------
    # Compaction summary (AI long-term memory)
    # -----------------------------
    if convo_context.get("compact_summary"):
        parts.append("## Prior Conversation Context\n" + convo_context["compact_summary"])

    # -----------------------------
    # Domain-specific summary (role-appropriate)
    # medibrief → doctor | mediexplain → patient
    # -----------------------------
    if assistant == "medidoc" and convo_context.get("medibrief_summary"):
        parts.append(
            "## Patient Clinical Summary (MediBrief)\n"
            + convo_context["medibrief_summary"]
        )
    elif assistant == "mediaid" and convo_context.get("mediexplain_summary"):
        parts.append(
            "## Your Medical Summary (MediExplain)\n"
            + convo_context["mediexplain_summary"]
        )

    return {
        "role": "system",
        "content": "\n\n".join(parts),
    }
