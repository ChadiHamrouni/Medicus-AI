from agents import function_tool

from medicus_common.core.logging_config import logger

from src.tools.mediknowledge.hybrid_search import hybrid_search


@function_tool
async def search_doctor_knowledge(doctor_id: int, query: str) -> dict:
    """
    Search the material this doctor published for their patients.

    INTENT
    ------
    Use this tool when the patient asks about the doctor's own practice and
    services: how a procedure is performed, how to prepare for it, recovery,
    risks the doctor explains, prices and payment, clinic policies, opening
    information, or any question the doctor's documents may answer.

    Answer ONLY from the returned excerpts and say which document they come
    from. If nothing relevant is returned, say the doctor has not published
    information about it and offer to pass the question on to the doctor.
    Never present general medical knowledge as the doctor's own instructions.

    PARAMETERS
    ----------
    doctor_id: int
        Filled in automatically (the doctor of this conversation).
    query: str
        The patient's question, rephrased as a short search query
        (e.g. "colonoscopy preparation diet", "price of teeth whitening").

    RETURNS
    -------
    dict with
      results: list of {source, excerpt}, best match first
      found: number of excerpts
    """
    try:
        hits = await hybrid_search(doctor_id, query, limit=5)
    except Exception as e:
        logger.error(f"[MEDIKNOWLEDGE] search failed for doctor {doctor_id}: {e}")
        return {"results": [], "found": 0, "error": "The doctor's documents could not be searched right now."}
    logger.info(f"[MEDIKNOWLEDGE] doctor {doctor_id}: {len(hits)} excerpts for {query[:60]!r}")
    return {
        "results": [{"source": h["title"], "excerpt": h["content"]} for h in hits],
        "found": len(hits),
    }
