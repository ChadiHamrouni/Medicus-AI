"""Hybrid search over the Elasticsearch knowledge indices.

Two rankings over the doctor's retriever chunks, merged with reciprocal rank fusion (RRF):
  1. kNN on the chunk embeddings (meaning, paraphrases)
  2. BM25 keyword search on the chunk text (exact terms: drug names, prices, procedure names)
The best chunks are mapped back to their generative passage ("small-to-big"), which is what the
assistant reads. Fusion runs here rather than in Elasticsearch, so it works on any license tier.
Every query is filtered to one doctor: a doctor's patients only ever see that doctor's documents.
All sizes come from the [retrieval] section of mediknowledge.toml.
"""

import logging

from src.tools.mediknowledge.config.clients import ElasticsearchClient
from src.tools.mediknowledge.config.settings import get_settings
from src.tools.mediknowledge.embeddings.text_embedding import gen_text_embedding
from src.tools.mediknowledge.ingestion.indexing.es_index import index_names

logger = logging.getLogger(__name__)


async def search_knowledge_es(query: str, doctor_id: str | int, country_id: str, top_k: int | None = None) -> list[dict]:
    """Top passages for `query` from this doctor's documents, best first."""
    s = get_settings().retrieval
    top_k = top_k or s.top_k
    es = ElasticsearchClient().es_client()
    gen, ret = index_names(country_id)
    if not es.indices.exists(index=ret):
        return []
    doctor_filter = [{"term": {"metadata.doctor_id": str(doctor_id)}}]

    vector = await gen_text_embedding(query)
    semantic = es.search(index=ret, size=s.candidates, source=["gnode_id", "text"], knn={
        "field": "vector", "query_vector": vector, "k": s.candidates,
        "num_candidates": s.knn_num_candidates, "filter": doctor_filter})["hits"]["hits"]
    keyword = es.search(index=ret, size=s.candidates, source=["gnode_id", "text"], query={"bool": {
        "must": {"multi_match": {"query": query, "fields": ["clean_text^2", "text"]}},
        "filter": doctor_filter}})["hits"]["hits"]

    # Reciprocal rank fusion over chunks, then keep each passage's best chunk.
    fused, chunk = {}, {}
    for ranking in (semantic, keyword):
        for rank, hit in enumerate(ranking):
            fused[hit["_id"]] = fused.get(hit["_id"], 0.0) + 1.0 / (s.rrf_k + rank + 1)
            chunk[hit["_id"]] = hit["_source"]
    passages: dict[str, dict] = {}
    for chunk_id, score in sorted(fused.items(), key=lambda kv: kv[1], reverse=True):
        gnode_id = chunk[chunk_id]["gnode_id"]
        if gnode_id not in passages:
            passages[gnode_id] = {"score": round(score, 4), "matched": chunk[chunk_id]["text"]}
        if len(passages) >= top_k:
            break
    if not passages:
        return []

    docs = es.mget(index=gen, ids=list(passages))["docs"]
    results = []
    for doc in docs:
        if not doc.get("found"):
            continue
        src = doc["_source"]
        results.append({"passage_id": doc["_id"], "score": passages[doc["_id"]]["score"], "text": src.get("text", ""),
                        "matched_chunk": passages[doc["_id"]]["matched"], "source": (src.get("source") or {}).get("path")})
    results.sort(key=lambda r: r["score"], reverse=True)
    logger.info(f"[MEDIKNOWLEDGE/ES] doctor {doctor_id}: {len(results)} passages for {query[:60]!r} "
                f"({len(semantic)} vector + {len(keyword)} keyword candidates)")
    return results
