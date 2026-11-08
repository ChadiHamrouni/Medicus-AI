import uuid
from typing import List, Tuple

from src.tools.mediknowledge.embeddings.text_embedding import gen_text_embedding
from src.tools.mediknowledge.models.document import Document, GNode, RNode
from src.tools.mediknowledge.ingestion.processing.process_text import clean_text
from src.tools.mediknowledge.ingestion.insights.table_insights import get_table_insights


async def create_table_nodes(documents: Document|List[Document]) -> Tuple[List[GNode], List[RNode]]:
    # Ensure documents is a list even if a single Document is passed
    if isinstance(documents, Document):
        documents = [documents]
    generative_nodes = []
    retriever_nodes = []

    for document in documents:
        media_metadata = await get_table_insights(document)

        # Skip processing if media_metadata.relevance is not true
        if not media_metadata.relevance:
            continue

        gnode_id = str(uuid.uuid4())
        generative_node = GNode(
            node_id=gnode_id,
            document_type=document.document_type,
            document_id=document.document_id,
            text=document.text,
            metadata=document.metadata,
            media=document.media,
            media_metadata=media_metadata,
            source=document.source
        )

        generative_nodes.append(generative_node)

        # Build text_for_retriever with checks for None
        text_for_retriever_parts = [
            document.media_metadata.title if document.media_metadata and document.media_metadata.title else "",
            document.media_metadata.description_summary if document.media_metadata and document.media_metadata.description_summary else ""
        ]
        text_for_retriever = " ".join(filter(None, text_for_retriever_parts)).strip()

        # Assuming gen_text_embedding is an async function
        vector = await gen_text_embedding(text_for_retriever)

        retriever_node = RNode(
            gnode_id=gnode_id,
            text=text_for_retriever,
            clean_text=clean_text(text_for_retriever),
            vector=vector,
            metadata=document.metadata
        )
        retriever_nodes.append(retriever_node)

    return generative_nodes, retriever_nodes


import asyncio
from src.tools.mediknowledge.models.document import Document, Media, MediaType, Metadata, Source


async def main():
    # Create a Document object with sample data
    document = Document(
        document_id="123-456",
        document_type=MediaType.TABLE,
        text="Sample document text",
        metadata=Metadata(),
        media=Media(),
        source=Source()
    )

    # Create image nodes from the document
    gen_nodes, retriever_nodes = await create_table_nodes(document)

    # Print the generated nodes

    for node in gen_nodes:
        print(node)

    for node in retriever_nodes:
        print(node)


if __name__ == "__main__":
    asyncio.run(main())
