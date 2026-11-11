"""Elasticsearch indices for the MediKnowledge pipeline (one pair per country).

    <country><generative_suffix>  generative nodes: the passages the assistant reads
    <country><retriever_suffix>   retriever nodes: small embedded chunks that are searched

Shards, replicas, vector similarity and HNSW parameters come from mediknowledge.toml.
"""

import asyncio
import logging
from typing import Any, Dict, Tuple

from src.tools.mediknowledge.config.clients import ElasticsearchClient
from src.tools.mediknowledge.config.settings import get_settings

logger = logging.getLogger(__name__)

_METADATA = {
    "type": "object",
    "properties": {
        "doctor_id": {"type": "keyword"},
        "country_id": {"type": "keyword"},
        "specialty_id": {"type": "keyword"},
        "created_at": {"type": "date"},
    },
}


def _index_settings() -> Dict[str, Any]:
    s = get_settings().index
    return {"number_of_shards": s.shards, "number_of_replicas": s.replicas}


async def generative_index_mappings() -> Dict[str, Any]:
    """Mapping for generative nodes (full passages with their document metadata)."""
    return {
        "settings": _index_settings(),
        "mappings": {
            "properties": {
                "node_id": {"type": "keyword"},
                "document_id": {"type": "keyword"},
                "document_type": {"type": "keyword"},
                "text": {"type": "text", "analyzer": "english"},
                "metadata": _METADATA,
                "media": {"type": "object", "properties": {"path": {"type": "keyword"}, "ext": {"type": "keyword"}}},
                "media_metadata": {"type": "object", "properties": {
                    "title": {"type": "text"}, "description_summary": {"type": "text"}}},
                "source": {"type": "object", "properties": {"path": {"type": "keyword"}, "ext": {"type": "keyword"}}},
            }
        },
    }


async def retriever_index_mappings() -> Dict[str, Any]:
    """Mapping for retriever nodes: keyword-searchable text plus an HNSW vector."""
    s = get_settings()
    return {
        "settings": _index_settings(),
        "mappings": {
            "properties": {
                "gnode_id": {"type": "keyword"},
                "text": {"type": "text", "analyzer": "english"},
                "clean_text": {"type": "text", "analyzer": "english"},
                "metadata": _METADATA,
                "vector": {
                    "type": "dense_vector",
                    "dims": s.embedding.dimension,
                    "index": True,
                    "similarity": s.index.similarity,
                    "index_options": {"type": "hnsw", "m": s.index.hnsw_m, "ef_construction": s.index.hnsw_ef_construction},
                },
            }
        },
    }


def index_names(country_id: str) -> Tuple[str, str]:
    idx = get_settings().index
    return idx.name(country_id, "generative"), idx.name(country_id, "retriever")


async def create_index(es_client, country_id: str) -> Tuple[str, str]:
    """Create the country's index pair if missing; returns (generative, retriever) names."""
    gen, ret = index_names(country_id)
    for name, mappings in ((gen, generative_index_mappings), (ret, retriever_index_mappings)):
        if not es_client.indices.exists(index=name):
            es_client.indices.create(index=name, body=await mappings())
            logger.info(f"Created Elasticsearch index {name}")
    return gen, ret


async def drop_index(es_client, country_id: str) -> None:
    """Delete the country's index pair (all doctors' knowledge for that country)."""
    for name in index_names(country_id):
        if es_client.indices.exists(index=name):
            es_client.indices.delete(index=name)
            logger.info(f"Deleted Elasticsearch index {name}")


async def main():
    gen, ret = await create_index(ElasticsearchClient().es_client(), "us")
    logger.info(f"Indices ready: {gen}, {ret}")


if __name__ == "__main__":
    asyncio.run(main())
