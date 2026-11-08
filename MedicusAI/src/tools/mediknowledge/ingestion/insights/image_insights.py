import logging

from src.tools.mediknowledge.config.clients import OpenAIClient
from src.tools.mediknowledge.models.document import MediaMetadata, Document
from src.tools.mediknowledge.ingestion.processing.process_image import encode_image
from src.tools.mediknowledge.ingestion.processing.process_text import get_text_for_insights
from src.tools.mediknowledge.ingestion.prompts import get_media_insights as insight_prompts
from src.tools.mediknowledge.config.config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the OpenAI client
openai_client = OpenAIClient().openai_client()
config = Config()
image_llm = config.get("llms", "image_llm")


async def get_image_insights(document: Document) -> MediaMetadata:
    """
    Extracts insights from image content in a Document object.
    """
    # Check if image_path is provided
    image_path = document.media.path if document.media else None
    if not image_path:
        raise ValueError("No image path provided.")

    try:
        base64_image = await encode_image(image_path)
    except Exception as e:
        logger.error(f"Failed to encode image: {e}")
        raise

    text_for_insights = get_text_for_insights(document)

    try:
        response = openai_client.chat.completions.parse(
            model=image_llm["model"],
            messages=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": insight_prompts.get_image_insights(),
                        },
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": text_for_insights,
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                }
            ],
            temperature=image_llm["temperature"],
            max_tokens=image_llm["max_tokens"],
            response_format=MediaMetadata
        )
    except Exception as e:
        logger.error(f"Failed to get insights from OpenAI: {e}")
        raise

    return response.choices[0].message.parsed


import asyncio
from src.tools.mediknowledge.models.document import Document, Media, MediaMetadata, MediaType, Metadata

async def main():
    document = Document(
        document_type=MediaType.IMAGE,
        text="Sample document text",
        metadata=Metadata(),
        media=Media(path="../../../assets/ophtalmo_2021_pdf/images/image_15_1.png", alt_text="Sample alt text"),
    )

    media_metadata = await get_image_insights(document)
    print(media_metadata)


if __name__ == "__main__":
    asyncio.run(main())
