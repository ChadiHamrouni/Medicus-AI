# text_insights.py
import logging

from src.tools.mediknowledge.config.clients import OpenAIClient
from src.tools.mediknowledge.config.config import Config
from src.tools.mediknowledge.ingestion.prompts import get_media_insights as insight_prompts
from src.tools.mediknowledge.models.document import MediaMetadata, Document

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the OpenAI client
openai_client = OpenAIClient().client()
config = Config()
text_llm = config.get("llms", "text")


async def get_text_insights(document: Document | str) -> MediaMetadata:
    """
    Summarize text content from a Node object or a string using OpenAI's API.
    """
    # Determine the text content based on the type of 'document'
    text_content = document.text if isinstance(document, Document) else document

    try:
        response = openai_client.beta.chat.completions.parse(
            model=text_llm["model"],  # Assuming model name is stored in metadata
            messages=[
                {"role": "system", "content": insight_prompts.get_text_insights()},
                {"role": "user", "content": text_content},
            ],
            temperature=text_llm["temperature"],
            max_tokens=text_llm["max_tokens"],
            response_format=MediaMetadata
        )

    except Exception as e:
        logger.error(f"Error during text summarization: {e}")
        raise

    return response.choices[0].message.parsed


import asyncio
from src.tools.mediknowledge.models.document import MediaType, Metadata, Media


# Assuming the summarize_text function is defined as above

async def main():
    document = Document(
        document_type=MediaType.TEXT,
        text="Sample document text",
        metadata=Metadata(),
        media=Media(),
    )
    # Summarize the text content of the node
    media_metadata = await get_text_insights(document)

    # Print the summary
    print(media_metadata)


if __name__ == "__main__":
    asyncio.run(main())
