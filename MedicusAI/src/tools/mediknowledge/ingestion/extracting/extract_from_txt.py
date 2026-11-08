import os
import uuid
from datetime import datetime
from fsspec import AbstractFileSystem

from src.tools.mediknowledge.models.document import Document, Metadata, MediaType, Source


async def extract_from_txt(
        txt_path: str,
        fs: AbstractFileSystem,
        doctor_id: str = None,
        country_id: str = None,
        specialty_id: str = None
) -> Document:
    """Extracts text content from a text file and returns a Document object."""

    """Extracts text from a text file."""
    with fs.open(txt_path, "r", encoding="utf-8") as file:
        text_content = file.read()

    # Extract file metadata
    metadata = Metadata(
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        created_at=datetime.fromtimestamp(fs.modified(txt_path).timestamp())
    )

    _, file_ext = os.path.splitext(txt_path)
    source = Source(
        path=txt_path,
        ext=file_ext[1:]
    )

    # Create a Document instance with the extracted text data
    document = Document(
        document_id=str(uuid.uuid4()),
        document_type=MediaType.TEXT,
        text=text_content,
        metadata=metadata,
        source=source
    )

    return document


import asyncio
from fsspec.implementations.local import LocalFileSystem


# Example usage of the extract_from_txt function
async def main():
    fs = LocalFileSystem()  # Replace with appropriate filesystem if not local
    txt_path = "../../../assets/medicus_general.txt"
    doctor_id = None
    country_id = "US"
    specialty_id = "456"

    document = await extract_from_txt(txt_path, fs, doctor_id, country_id, specialty_id)
    print(document.dict())


if __name__ == "__main__":
    asyncio.run(main())
