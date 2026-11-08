import logging
from typing import Any, Dict, Tuple

from src.tools.mediknowledge.config.clients import ElasticsearchClient
from src.tools.mediknowledge.config.config import Config

# Configure logging at the application level
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

embedding_dimension = Config().get("Ingestion", "embedding_dimension", default=1536)


async def generative_index_mappings() -> Dict[str, Any]:
    """
    Get the mapping configuration for generation indices with support for documents.
    """
    return {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 1,
        },
        "mappings": {
            "properties": {
                "node_id": {"type": "keyword"},  # GNode specific field
                "document_id": {"type": "keyword"},
                "document_type": {"type": "keyword"},  # From Document
                "text": {"type": "text"},  # From Document
                "metadata": {  # From Document
                    "type": "object",
                    "properties": {
                        "doctor_id": {"type": "keyword"},
                        "country_id": {"type": "keyword"},
                        "specialty_id": {"type": "keyword"},
                        "created_at": {"type": "date"},
                    },
                },
                "media": {  # From Document
                    "type": "object",
                    "properties": {
                        "path": {"type": "keyword"},
                        "ext": {"type": "keyword"},
                    },
                },
                "media_metadata": {  # From Document
                    "type": "object",
                    "properties": {
                        "title": {"type": "text"},
                        "description_summary": {"type": "text"},
                    },
                },
                "source": {  # From Document
                    "type": "object",
                    "properties": {
                        "path": {"type": "keyword"},
                        "ext": {"type": "keyword"},
                    }
                }
            }
        }
    }


async def retriever_index_mappings() -> Dict[str, Any]:
    """
    Get the mapping configuration for retrieval indices.
    """
    return {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 1,
        },
        "mappings": {
            "properties": {
                "gnode_id": {"type": "keyword"},  # RNode specific field
                "text": {"type": "text"},  # From RNode
                "clean_text": {"type": "text"},  # From RNode
                "vector": {
                    "type": "dense_vector",
                    "dims": embedding_dimension,
                    "index": True,
                    "similarity": "cosine",
                    "index_options": {
                        "type": "hnsw",
                        "m": 16,  # Example parameter, adjust as needed
                        "ef_construction": 128,  # Example parameter, adjust as needed
                    }
                }
            }
        }
    }


async def create_index(es_client, country_id: str) -> Tuple[str, str]:
    # Create index names with suffixes
    index_name_gen = country_id.lower() + "_gen"
    index_name_ret = country_id.lower() + "_ret"

    # Check if the generation index already exists
    if not es_client.indices.exists(index=index_name_gen):
        gen_mappings = await generative_index_mappings()  # Await the coroutine to get the mappings
        es_client.indices.create(index=index_name_gen, body=gen_mappings)
        logger.info(f"Successfully created Elasticsearch index: {index_name_gen}")
    else:
        logger.info(f"Index '{index_name_gen}' already exists.")

    # Check if the retrieval index already exists
    if not es_client.indices.exists(index=index_name_ret):
        ret_mappings = await retriever_index_mappings()  # This is not a coroutine, so no need to await
        es_client.indices.create(index=index_name_ret, body=ret_mappings)
        logger.info(f"Successfully created Elasticsearch index: {index_name_ret}")
    else:
        logger.info(f"Index '{index_name_ret}' already exists.")

    return index_name_gen, index_name_ret


async def drop_index(es_client, country_id: str) -> None:
    """
    Drop Elasticsearch indices based on country_id and specialty_id.

    :param es_client: The Elasticsearch client instance.
    :param country_id: The country ID used to construct the index names.
    """
    # Create index names with suffixes
    index_name_gen = country_id.lower() + "_gen"
    index_name_ret = country_id.lower() + "_ret"

    # Attempt to delete both the generation and retrieval indices
    for index_name in [index_name_gen, index_name_ret]:
        if es_client.indices.exists(index=index_name):
            es_client.indices.delete(index=index_name)
            logger.info(f"Successfully deleted Elasticsearch index: {index_name}")
        else:
            logger.info(f"Index '{index_name}' does not exist and cannot be deleted.")


import asyncio


async def main():
    # Initialize Elasticsearch client
    _es_client = ElasticsearchClient().es_client()

    # Define parameters for index creation
    country_id = "us"

    # Create indices for generation and retrieval
    index_name_gen, index_name_ret = create_index(
        es_client=_es_client,
        country_id=country_id
    )

    # Log the names of the created indices
    logger.info(f"Generation index name: {index_name_gen}")
    logger.info(f"Retrieval index name: {index_name_ret}")


if __name__ == "__main__":
    asyncio.run(main())
