import logging
from typing import List

from src.tools.mediknowledge.config.clients import OpenAIClient
from src.tools.mediknowledge.config.config import Config

# Configure logging at the application level
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai_client = OpenAIClient().openai_client()
config = Config()


async def gen_text_embedding(text: str) -> List[float]:
    """Get embeddings from OpenAI API."""
    model = config.get("embedding", "model")

    try:
        response = openai_client.embeddings.create(model=model, input=text)
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise


import asyncio
async def main():
    sample_text = "This is a sample text for generating embeddings."

    # Generate text embeddings for the sample text
    embeddings = await gen_text_embedding(sample_text)

    # Print the generated embeddings
    print(embeddings)


if __name__ == "__main__":
    asyncio.run(main())
