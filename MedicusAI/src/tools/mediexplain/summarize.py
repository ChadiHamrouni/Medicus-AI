from agents import function_tool
from src.services.summarizing.mediexplain_service import run_mediexplain


@function_tool
async def mediexplain_explain(conversation_id: str) -> str:
    """
    Convert medical instructions and diagnoses into clear, patient-friendly language.

    INTENT
    ------
    Use this tool to explain what the doctor has communicated to the patient in simple,
    everyday language. Covers prescriptions, diagnoses, follow-up instructions,
    and warning signs — nothing the patient does not need to know.

    WHEN TO USE
    -----------
    - When a patient asks "What does this mean?" about a doctor's message.
    - When a patient received a prescription or diagnosis and needs it explained.
    - When a patient asks "What should I do next?" or "What did the doctor say?"

    WHEN NOT TO USE
    ---------------
    - Do NOT use to generate medical advice beyond what the doctor communicated.
    - Do NOT use to change, correct, or challenge clinical records.
    - Do NOT use for general medical education unrelated to this patient's care.

    PARAMETERS
    ----------
    conversation_id : str
        UUID of the patient's (mediaid) conversation.

    RETURNS
    -------
    str
        A plain-language explanation covering medications, instructions, follow-up
        steps, and warning signs — in simple, empathetic language the patient can act on.
        Excludes internal clinical reasoning and doctor-AI diagnostic deliberation.
    """
    return await run_mediexplain(conversation_id)
