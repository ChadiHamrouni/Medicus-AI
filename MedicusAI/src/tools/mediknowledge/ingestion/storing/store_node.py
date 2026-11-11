# store_node.py

from typing import Tuple, List, Dict
import logging
from src.tools.mediknowledge.models.document import GNode, RNode, MediaType
from src.tools.mediknowledge.config.clients import ElasticsearchClient
from src.tools.mediknowledge.ingestion.indexing.es_index import create_index, index_names

logger = logging.getLogger(__name__)
es_client = ElasticsearchClient().es_client()


async def store_generative_node(node: GNode) -> None:
    index_name = index_names(node.metadata.country_id)[0]
    # Ensure the index exists before storing the node
    await create_index(es_client, node.metadata.country_id)
    try:
        node_dict = serialize_gnode(node)
        doc_id = node_dict.get('node_id')
        response = es_client.index(index=index_name, id=doc_id, body=node_dict)
        logger.info(f"Successfully stored generative node with ID {doc_id}: {response}")
    except Exception as e:
        logger.error(f"Failed to store generative node: {e}")


async def store_retriever_node(node: RNode) -> None:
    index_name = index_names(node.metadata.country_id)[1]
    # Ensure the index exists before storing the node
    await create_index(es_client, node.metadata.country_id)
    try:
        node_dict = serialize_rnode(node)
        response = es_client.index(index=index_name, body=node_dict)
        logger.info(f"Successfully stored retriever node: {response}")
    except Exception as e:
        logger.error(f"Failed to store retriever node: {e}")


async def store_nodes(nodes: Tuple[List[GNode], List[RNode]]) -> None:
    """
    Store lists of generative and retriever nodes into their respective Elasticsearch indices.
    :param nodes: A tuple containing lists of GNode and RNode objects.
    """
    gen_nodes, ret_nodes = nodes
    # Store generative nodes
    for gnode in gen_nodes:
        await store_generative_node(gnode)
    # Store retriever nodes
    for rnode in ret_nodes:
        await store_retriever_node(rnode)


def serialize_gnode(node: GNode) -> Dict:
    node_dict = node.dict()
    node_dict['document_type'] = node.document_type.value  # Convert enum to string
    node_dict['metadata'] = node.metadata.dict()  # Serialize Metadata to dict
    # Serialize datetime fields to ISO format strings
    if node.metadata.created_at:
        node_dict['metadata']['created_at'] = node.metadata.created_at.isoformat()
    return node_dict


def serialize_rnode(node: RNode) -> Dict:
    node_dict = node.dict()
    # Serialize Metadata to dict
    node_dict['metadata'] = node.metadata.dict()
    # Serialize datetime fields to ISO format strings if they are not None
    if node.metadata.created_at:
        node_dict['metadata']['created_at'] = node.metadata.created_at.isoformat()
    return node_dict


def main():
    # Create sample RNode and GNode objects
    rnodes = [
        RNode(
            gnode_id="r1",
            text="Sample retriever text 1",
            clean_text="Sample clean text 1",
            vector=[0.1, 0.2, 0.3]  # Example vector
        ),
        RNode(
            gnode_id="r2",
            text="Sample retriever text 2",
            clean_text="Sample clean text 2",
            vector=[0.4, 0.5, 0.6]  # Example vector
        )
    ]

    gnodes = [
        GNode(
            node_id="g1",
            document_type=MediaType.TEXT,  # Example document type
            text="Sample generative text 1"
            # Other fields...
        ),
        GNode(
            node_id="g2",
            document_type=MediaType.TEXT,  # Example document type
            text="Sample generative text 2"
            # Other fields...
        )
    ]

    # Store the nodes in Elasticsearch
    store_nodes((gnodes, rnodes))


if __name__ == "__main__":
    main()
