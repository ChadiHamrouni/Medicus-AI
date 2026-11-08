import uuid
from typing import List

from src.tools.mediknowledge.embeddings.text_embedding import gen_text_embedding
from src.tools.mediknowledge.models.document import Document, GNode, RNode
from src.tools.mediknowledge.ingestion.processing.process_text import chunk_text, clean_text
from src.tools.mediknowledge.ingestion.insights.text_insights import get_text_insights
from src.tools.mediknowledge.config.config import Config

config = Config()

GEN_CHUNK_SIZE = config.get("prompts", "gen_chunk_size")
GEN_OVERLAP = config.get("prompts", "gen_overlap")
RETRIEVER_CHUNK_SIZE = config.get("prompts", "retriever_chunk_size")
RETRIEVER_OVERLAP = config.get("prompts", "retriever_overlap")


async def create_text_nodes(documents: Document|List[Document]) -> tuple[list[GNode], list[RNode]]:
    # Ensure documents is a list even if a single Document is passed
    if isinstance(documents, Document):
        documents = [documents]

    generative_nodes = []
    retriever_nodes = []

    for document in documents:
        gen_chunks = await chunk_text(document.text, GEN_CHUNK_SIZE, GEN_OVERLAP)
        for gen_chunk in gen_chunks:
            gnode_id = str(uuid.uuid4())
            gen_node = GNode(
                node_id=gnode_id,
                document_id=document.document_id,
                document_type=document.document_type,
                text=gen_chunk,
                metadata=document.metadata,
                media=document.media,
                source=document.source
            )
            generative_nodes.append(gen_node)

            # Create retriever nodes for each gen node
            retriever_chunks = await chunk_text(gen_chunk, RETRIEVER_CHUNK_SIZE, RETRIEVER_OVERLAP)
            for retriever_chunk in retriever_chunks:
                vector = await gen_text_embedding(retriever_chunk)

                retriever_node = RNode(
                    gnode_id=gnode_id,
                    text=retriever_chunk,
                    clean_text=clean_text(retriever_chunk),
                    vector=vector,
                    metadata=document.metadata
                )
                retriever_nodes.append(retriever_node)

            # Create a retriever summary node for the gen node
            summary = await get_text_insights(gen_chunk)

            # Add a test to check if not summary.relevance then continue
            if not summary.relevance:
                continue

            # Else do the existing code
            summary_text = summary.title + '\n' + summary.description_summary
            summary_vector = await gen_text_embedding(summary_text)
            summary_node = RNode(
                gnode_id=gnode_id,
                # Concatenate title and description_summary for the text field
                text=summary_text,
                clean_text=clean_text(summary_text),
                vector=summary_vector,
                metadata=document.metadata
            )
            retriever_nodes.append(summary_node)

    return generative_nodes, retriever_nodes


import asyncio
from src.tools.mediknowledge.models.document import Document, Media, MediaType, Metadata


# Assuming the create_text_nodes function is defined as above

async def main():
    # Create a Document object with sample text data
    document = Document(
        document_id="123-125",
        document_type=MediaType.TEXT,
        text="This is a sample text that will be used to create text nodes.",
        metadata=Metadata(),
        media=Media(),
        source=None  # Replace with an actual Source object if needed
    )

    # Create text nodes from the document
    gen_nodes, retriever_nodes = await create_text_nodes(document)

    # Print the generated nodes
    print(f"Generated GNodes: {gen_nodes}")
    print(f"Generated RNodes: {retriever_nodes}")


if __name__ == "__main__":
    asyncio.run(main())
