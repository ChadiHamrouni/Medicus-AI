"""Put the doctor's most relevant published excerpts in front of the assistant for each patient turn.

Models (especially small local ones) do not always decide to call `search_doctor_knowledge`
and then answer about prices or preparation from general knowledge. Retrieving up front
grounds every answer about the practice in the doctor's own words; the tool stays available
for follow-up searches.
"""

from typing import Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.tools.mediknowledge.hybrid_search import hybrid_search

EXCERPTS = 3

_GUIDE = """# THE DOCTOR'S PUBLISHED INFORMATION (MediKnowledge)
The doctor of this conversation published the documents below for their patients.
- For questions about this practice — fees, insurance, how a procedure is done here,
  preparation, recovery, hours, policies — answer from these excerpts and name the document.
- If the excerpts do not cover the question, call `search_doctor_knowledge` with a better
  query; if that finds nothing, say the doctor has not published that information.
- Never invent prices, insurers, instructions or policies. Ignore excerpts that are not
  relevant to the patient's message."""


async def knowledge_context(doctor_id: Optional[int], message: str) -> Optional[dict]:
    """A system message with excerpts relevant to `message`, or None if the doctor published nothing."""
    if not doctor_id or not (message or "").strip():
        return None
    try:
        titles = await db_manager.fetch(
            "SELECT title FROM knowledge.documents WHERE doctor_id = $1 ORDER BY created_at DESC LIMIT 20", doctor_id)
        if not titles:
            return None
        hits = await hybrid_search(doctor_id, message, limit=EXCERPTS)
    except Exception as e:
        logger.warning(f"[MEDIKNOWLEDGE] context retrieval failed for doctor {doctor_id}: {e}")
        return None

    parts = [_GUIDE, "Documents: " + "; ".join(f"\"{r['title']}\"" for r in titles)]
    if hits:
        parts.append("Excerpts most related to the patient's latest message:")
        parts.extend(f"[{i}] from \"{h['title']}\":\n{h['content']}" for i, h in enumerate(hits, 1))
    logger.info(f"[MEDIKNOWLEDGE] doctor {doctor_id}: {len(hits)} excerpts added to context")
    return {"role": "system", "content": "\n\n".join(parts)}
