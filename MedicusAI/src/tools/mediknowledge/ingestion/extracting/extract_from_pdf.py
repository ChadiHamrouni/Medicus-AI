import io
import os
import uuid
from datetime import datetime
from typing import List, Tuple
import asyncio
import fitz  # PyMuPDF
from fsspec import AbstractFileSystem

from src.tools.mediknowledge.ingestion.processing.process_image import is_valid_image
from src.tools.mediknowledge.ingestion.processing.process_table import is_valid_table
from src.tools.mediknowledge.models.document import Document, MediaType, Metadata, Source, Media


async def extract_texts_from_pdf(
        pdf_path: str,
        fs: AbstractFileSystem,
        doctor_id: str = None,
        country_id: str = None,
        specialty_id: str = None,
        document_id: str = None
) -> List[Document]:
    # Extract file metadata including the last modified timestamp
    metadata = Metadata(
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        created_at=datetime.fromtimestamp(fs.modified(pdf_path).timestamp())
    )

    _, file_ext = os.path.splitext(pdf_path)
    source = Source(
        path=pdf_path,
        ext=file_ext[1:]
    )

    with fs.open(pdf_path, 'rb') as f:
        with fitz.open(stream=f.read(), filetype="pdf") as doc:
            full_text = " ".join(page.get_text() for page in doc)

        document = Document(
            document_id=document_id,
            document_type=MediaType.TEXT,
            text=full_text,
            metadata=metadata,
            source=source
        )

    return [document]


async def extract_images_from_pdf(
        pdf_path: str,
        fs: AbstractFileSystem,
        doctor_id: str = None,
        country_id: str = None,
        specialty_id: str = None,
        document_id: str = None
) -> List[Document]:
    documents = []

    file_name, file_extension = os.path.splitext(os.path.basename(pdf_path))
    output_folder = f"{file_name}_{file_extension.lstrip('.')}"
    output_folder = os.path.join(os.path.dirname(pdf_path), output_folder)
    os.makedirs(output_folder, exist_ok=True)
    image_folder = os.path.join(output_folder, "images")
    os.makedirs(image_folder, exist_ok=True)

    # Extract file metadata including the last modified timestamp
    metadata = Metadata(
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        created_at=datetime.fromtimestamp(fs.modified(pdf_path).timestamp())
    )
    _, file_ext = os.path.splitext(pdf_path)
    source = Source(
        path=pdf_path,
        ext=file_ext[1:]
    )

    with fs.open(pdf_path, 'rb') as file:
        pdf_data = file.read()  # Read the PDF data once and store it in a variable

    # Use the PDF data with fitz.open
    with fitz.open(stream=pdf_data, filetype="pdf") as doc:
        for page_num, page in enumerate(doc, start=1):
            for img_index, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                # Assuming is_valid_image is a synchronous function
                if not await is_valid_image(base_image, image_bytes):
                    continue
                image_filename = f"{page_num}_{img_index + 1}.{image_ext}"
                image_path = os.path.join(image_folder, image_filename)
                with fs.open(image_path, "wb") as f:
                    f.write(image_bytes)

                media = Media(
                    path=image_path,
                    ext=image_ext
                )

                document = Document(
                    document_id=document_id,
                    document_type=MediaType.IMAGE,
                    text=page.get_text("text"),  # Include the text from the page where the image is found
                    metadata=metadata,
                    media=media,
                    source=source
                )

                documents.append(document)

    return documents


async def extract_tables_from_pdf(
        pdf_path: str,
        fs: AbstractFileSystem,
        doctor_id: str = None,
        country_id: str = None,
        specialty_id: str = None,
        document_id: str = None
) -> List[Document]:
    documents = []

    file_name, file_extension = os.path.splitext(os.path.basename(pdf_path))
    output_folder = f"{file_name}_{file_extension.lstrip('.')}"
    output_folder = os.path.join(os.path.dirname(pdf_path), output_folder)
    os.makedirs(output_folder, exist_ok=True)
    table_folder = os.path.join(output_folder, "tables")
    os.makedirs(table_folder, exist_ok=True)

    # Extract file metadata including the last modified timestamp
    metadata = Metadata(
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        created_at=datetime.fromtimestamp(fs.modified(pdf_path).timestamp())
    )

    _, file_ext = os.path.splitext(pdf_path)
    source = Source(
        path=pdf_path,
        ext=file_ext[1:]
    )
    # Read PDF content into memory
    with fs.open(pdf_path, "rb") as s3_pdf:
        pdf_stream = io.BytesIO(s3_pdf.read())

    # Open the PDF file using fitz with the memory buffer
    with fitz.open(stream=pdf_stream, filetype="pdf") as pdf:
        for page_number, page in enumerate(pdf):
            # Check if the custom method for finding tables exists
            if hasattr(page, "find_tables"):
                table_list = page.find_tables()
                for table_index, table in enumerate(table_list):
                    df = (table.to_pandas())
                    if not await is_valid_table(df):
                        continue
                    csv_filename = f"{page_number}_{table_index + 1}.csv"
                    csv_filepath = os.path.join(table_folder, csv_filename)
                    # Save the table as CSV and upload to S3
                    with fs.open(csv_filepath, "w") as file:
                        df.to_csv(file, index=False)

                    media = Media(
                        path=csv_filepath,
                        ext='csv'
                    )

                    document = Document(
                        document_id=document_id,
                        document_type=MediaType.TABLE,
                        text=page.get_text("text"),  # Include the text from the page where the table is found
                        metadata=metadata,
                        media=media,
                        source=source
                    )

                    documents.append(document)

    return documents


async def extract_from_pdf(
    pdf_path: str,
    fs: AbstractFileSystem,
    doctor_id: str,
    country_id: str,
    specialty_id: str
) -> Tuple[List[Document], List[Document], List[Document]]:
    # Generate a unique document_id for the PDF content
    document_id = str(uuid.uuid4())

    # Run the three extraction functions in parallel
    text_documents_future = extract_texts_from_pdf(
        pdf_path=pdf_path,
        fs=fs,
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        document_id=document_id
    )
    image_documents_future = extract_images_from_pdf(
        pdf_path=pdf_path,
        fs=fs,
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        document_id=document_id
    )
    table_documents_future = extract_tables_from_pdf(
        pdf_path=pdf_path,
        fs=fs,
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        document_id=document_id
    )

    # Await all futures and get their results
    text_documents, image_documents, table_documents = await asyncio.gather(
        text_documents_future,
        image_documents_future,
        table_documents_future
    )

    # Return a tuple containing lists of documents
    return text_documents, image_documents, table_documents


# from fsspec.implementations.local import LocalFileSystem
#
#
# # Example usage of the extract_content_from_pdf function
# async def main():
#     fs = LocalFileSystem()  # Replace with appropriate filesystem if not local
#     pdf_path = "../../../assets/ophtalmo_2021.pdf"
#     doctor_id = "12345"
#     country_id = "US"
#     specialty_id = "XYZ"
#
#     # Extract all content from the PDF
#     text_documents, image_documents, table_documents = await extract_content_from_pdf(
#         pdf_path=pdf_path,
#         fs=fs,
#         doctor_id=doctor_id,
#         country_id=country_id,
#         specialty_id=specialty_id
#     )
#
#     # Print details of the extracted documents
#     for doc_list, doc_type in zip((text_documents, image_documents, table_documents), ('Text', 'Image', 'Table')):
#         for doc in doc_list:
#             print(f"Extracted {doc_type}: {doc.source.path}")
#
# if __name__ == "__main__":
#     asyncio.run(main())
