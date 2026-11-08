# pdf_nodes.py
from typing import List, Tuple

from src.tools.mediknowledge.models.document import Document, GNode, RNode
from src.tools.mediknowledge.ingestion.parsing.text_nodes import create_text_nodes
from src.tools.mediknowledge.ingestion.parsing.image_nodes import create_image_nodes
from src.tools.mediknowledge.ingestion.parsing.table_nodes import create_table_nodes


async def create_pdf_nodes(
        pdf_content: Tuple[List[Document], List[Document], List[Document]]
) -> Tuple[List[GNode], List[RNode]]:
    text_documents, image_documents, table_documents = pdf_content

    # Aggregate GNode and RNode lists from each document type
    gnodes, rnodes = [], []

    # Process text documents if the list is not empty
    if text_documents:
        text_gnodes, text_rnodes = await create_text_nodes(text_documents)
        gnodes.extend(text_gnodes)
        rnodes.extend(text_rnodes)

    # Process image documents if the list is not empty
    if image_documents:
        image_gnodes, image_rnodes = await create_image_nodes(image_documents)
        gnodes.extend(image_gnodes)
        rnodes.extend(image_rnodes)

    # Process table documents if the list is not empty
    if table_documents:
        table_gnodes, table_rnodes = await create_table_nodes(table_documents)
        gnodes.extend(table_gnodes)
        rnodes.extend(table_rnodes)

    return gnodes, rnodes


# async def main():
#     # Example creation of Document objects with sample data
#     text_document = Document(
#         document_id=str(uuid.uuid4()),
#         document_type=MediaType.TEXT,
#         text="This is a sample text that will be used to create text nodes.",
#         metadata=Metadata(
#             doctor_id="123",
#             country_id="US",
#             specialty_id="456",
#             created_at=datetime.now()
#         ),
#         media=None,
#         source=Source(path="path/to/textfile.txt", ext="txt")
#     )
#
#     # Example usage of create_pdf_nodes function with a list of Document objects
#     gnodes, rnodes = await create_pdf_nodes((text_document,))
#
#     # Print the generated nodes
#     print(f"Generated GNodes: {gnodes}")
#     print(f"Generated RNodes: {rnodes}")
#
#
# if __name__ == "__main__":
#     asyncio.run(main())
