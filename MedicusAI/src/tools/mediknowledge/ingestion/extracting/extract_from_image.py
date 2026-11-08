import os
import uuid
from datetime import datetime
from fsspec.spec import AbstractFileSystem
from PIL import Image

from src.tools.mediknowledge.models.document import Document, Metadata, Media, MediaType
from src.tools.mediknowledge.ingestion.processing.process_image import get_image_alt_text


async def extract_from_image(
        image_path: str,
        fs: AbstractFileSystem,
        image_text: str = None,
        doctor_id: str = None,
        country_id: str = None,
        specialty_id: str = None
) -> Document:
    """Extracts content from an image file and returns a Document object."""

    # Verify the image is not corrupt by attempting to open it
    try:
        with fs.open(image_path, 'rb') as f:
            img = Image.open(f)
            img.verify()  # Verify the integrity of the image
            image_format = img.format
            if not image_format:
                raise ValueError("Unable to determine the image format.")
    except (IOError, ValueError) as e:
        raise ValueError(
            f"The image at {image_path} is corrupt or not a true image. Error: {e}"
        )

    # Extract file metadata
    metadata = Metadata(
        doctor_id=doctor_id,
        country_id=country_id,
        specialty_id=specialty_id,
        created_at=datetime.fromtimestamp(fs.modified(image_path).timestamp())
    )

    _, file_ext = os.path.splitext(image_path)
    media = Media(
        path=image_path,
        ext=file_ext[1:],
        alt_text=await get_image_alt_text(fs, image_path)
    )

    document = Document(
        document_id=str(uuid.uuid4()),
        document_type=MediaType.IMAGE,
        text=image_text,
        metadata=metadata,
        media=media
    )

    return document


import asyncio
from fsspec.implementations.local import LocalFileSystem


# Example usage of the extract_from_txt function
async def main():
    fs = LocalFileSystem()  # Replace with appropriate filesystem if not local
    image_path = "../../../assets/flash_attention.png"  # Replace with your image path
    doctor_id = None
    country_id = "US"
    specialty_id = "456"

    document = await extract_from_image(image_path, fs, doctor_id, country_id, specialty_id)
    print(document.dict())  # Use json.dumps to serialize with indentation


if __name__ == "__main__":
    asyncio.run(main())
