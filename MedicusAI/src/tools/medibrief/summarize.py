from agents import function_tool
from src.services.summarizing.medibrief_service import run_medibrief


@function_tool
async def medibrief_summarize(conversation_id: str) -> str:
    """
    Generate a clinical summary of a patient's discussion for their doctor.

    INTENT
    ------
    Use this tool to provide the doctor with a concise clinical update on what has been
    discussed in the linked patient conversation. It bridges the patient's interactions
    with Sara and the doctor's clinical review.

    WHEN TO USE
    -----------
    - When a doctor asks: "What has the patient been saying?"
    - When a doctor needs a catch-up on a patient's recent history before a consultation.
    - When the "Orange Pill" badge indicates new unsummarized patient messages.

    WHEN NOT TO USE
    ---------------
    - Do NOT use for general medical research or non-patient queries.
    - Do NOT use if the doctor is asking about their own clinical notes.

    PARAMETERS
    ----------
    conversation_id : str
        UUID of the CURRENT (doctor-facing) conversation.
        The tool resolves the linked patient mirror conversation automatically.

    RETURNS
    -------
    str
        A physician-ready clinical brief covering symptoms, medications, timeline,
        and action items — in formal medical language. Excludes social filler.
    """
    return await run_medibrief(conversation_id)
