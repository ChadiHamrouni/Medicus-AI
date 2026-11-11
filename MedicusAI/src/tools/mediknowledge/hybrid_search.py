"""MediKnowledge hybrid search over one doctor's published material.

Three rankings are merged with reciprocal rank fusion (RRF):
  1. full-text search with English stemming   (precise wording, plurals, verb forms)
  2. prefix search without stemming            (other languages, partial words)
  3. embedding similarity, when an embedding model is configured (meaning, synonyms)
"""

import math
import re
from typing import Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.llm import embed

from src.tools.mediknowledge.config.settings import get_settings

# Tunable values: [retrieval] in config/mediknowledge.toml.
_S = get_settings().retrieval
CANDIDATES = _S.candidates        # per ranking, before fusion
RRF_K = _S.rrf_k
MAX_VECTOR_CHUNKS = _S.max_vector_chunks

# Words that carry no meaning in a question (English and French, the demo languages).
_STOPWORDS = set("""
a an and are as at be been but by can could do does for from had has have how i if in into is it its
me my no not of on or our please should so than that the their them then there these they this to
us was we what when where which who why will with would you your about tell explain much many any
le la les un une des du de et est sont en au aux pour par sur dans avec ce cette ces que qui quoi
comment combien quel quelle quels quelles je tu il elle nous vous ils elles mon ma mes votre vos
""".split())


def _terms(query: str) -> list[str]:
    words = re.findall(r"[^\W\d_]{3,}|\d+", query.lower())
    seen: list[str] = []
    for w in words:
        if w not in _STOPWORDS and w not in seen:
            seen.append(w)
    return seen[:12]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


async def _text_rankings(doctor_id: int, terms: list[str]) -> tuple[list[int], list[int]]:
    if not terms:
        return [], []
    english = " | ".join(terms)
    prefixes = " | ".join(f"{t}:*" for t in terms)
    stemmed = await db_manager.fetch(
        """SELECT id FROM knowledge.chunks
           WHERE doctor_id = $1 AND search_tsv @@ to_tsquery('english', $2)
           ORDER BY ts_rank_cd(search_tsv, to_tsquery('english', $2)) DESC LIMIT $3""",
        doctor_id, english, CANDIDATES)
    prefixed = await db_manager.fetch(
        """SELECT id FROM knowledge.chunks
           WHERE doctor_id = $1 AND search_tsv @@ to_tsquery('simple', $2)
           ORDER BY ts_rank_cd(search_tsv, to_tsquery('simple', $2)) DESC LIMIT $3""",
        doctor_id, prefixes, CANDIDATES)
    return [r["id"] for r in stemmed], [r["id"] for r in prefixed]


async def _vector_ranking(doctor_id: int, query: str) -> list[int]:
    try:
        vectors = await embed([query])
    except Exception as e:
        logger.warning(f"[MEDIKNOWLEDGE] query embedding failed, keyword search only: {e}")
        return []
    if not vectors:
        return []
    rows = await db_manager.fetch(
        """SELECT id, embedding FROM knowledge.chunks
           WHERE doctor_id = $1 AND embedding IS NOT NULL LIMIT $2""", doctor_id, MAX_VECTOR_CHUNKS)
    scored = sorted(((_cosine(vectors[0], list(r["embedding"])), r["id"]) for r in rows), reverse=True)
    return [chunk_id for score, chunk_id in scored[:CANDIDATES] if score > 0.2]


async def hybrid_search(doctor_id: int, query: str, limit: int = 5) -> list[dict]:
    """Best-matching excerpts of the doctor's documents: [{title, content, score}]."""
    query = (query or "").strip()
    if not query:
        return []
    stemmed, prefixed = await _text_rankings(doctor_id, _terms(query))
    semantic = await _vector_ranking(doctor_id, query)

    fused: dict[int, float] = {}
    for ranking in (stemmed, prefixed, semantic):
        for rank, chunk_id in enumerate(ranking):
            fused[chunk_id] = fused.get(chunk_id, 0.0) + 1.0 / (RRF_K + rank + 1)
    best = sorted(fused.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    if not best:
        return []

    rows = await db_manager.fetch(
        """SELECT c.id, c.content, d.title
           FROM knowledge.chunks c JOIN knowledge.documents d ON d.id = c.document_id
           WHERE c.id = ANY($1::bigint[])""", [chunk_id for chunk_id, _ in best])
    by_id = {r["id"]: r for r in rows}
    return [{"title": by_id[cid]["title"], "content": by_id[cid]["content"], "score": round(score, 4)}
            for cid, score in best if cid in by_id]


async def doctor_has_knowledge(doctor_id: Optional[int]) -> bool:
    if not doctor_id:
        return False
    return bool(await db_manager.fetchval(
        "SELECT EXISTS (SELECT 1 FROM knowledge.documents WHERE doctor_id = $1)", doctor_id))
