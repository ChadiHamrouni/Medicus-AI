import re

from typing import List

import tiktoken

from src.tools.mediknowledge.models.document import Document

tokenizer = tiktoken.get_encoding("o200k_base")


async def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """
    Splits the text into chunks of a specified size with overlap.
    if the last chunk is less than half the chunk_size, it gets added to the second-to-last chunk

    :param text: The text to split.
    :param chunk_size: The size of each chunk.
    :param overlap: The number of overlapping tokens between chunks.
    :return: A list of text chunks.
    """
    tokens = text.split()
    chunks = [
        " ".join(tokens[i: i + chunk_size])
        for i in range(0, len(tokens), chunk_size - overlap)
    ]

    # Check if the last chunk is less than half the chunk_size
    if len(chunks) > 1 and len(chunks[-1].split()) < chunk_size // 2:
        chunks[-2] += " " + chunks[-1]  # Add the last chunk to the second-to-last chunk
        chunks.pop()  # Remove the last chunk

    return chunks


def clean_text(text: str) -> str:
    """
    Comprehensive text cleaning for summaries and content.

    Args:
        text (str): Input text to clean

    Returns:
        str: Cleaned text
    """
    if not isinstance(text, str):
        return str(text)

    # Add space between lowercase and uppercase
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)

    # Add space after punctuation (excluding brackets and braces)
    text = re.sub(r"(?<=[.,!?])(?=[a-zA-Z])", " ", text)

    # Add space after closing parenthesis
    text = re.sub(r"(?<=\))(?=[A-Za-z])", " ", text)

    # Add space before opening parenthesis
    text = re.sub(r"(?<=[a-zA-Z])(?=\()", " ", text)

    # Fix bullet points
    text = re.sub(r"●", "\n●", text)  # Add newline before bullet points
    text = re.sub(r"(?<=●)(?=\w)", " ", text)  # Add space after bullet points

    # Normalize multiple spaces and lines
    text = re.sub(r"\s+", " ", text)  # Normalize spaces
    text = re.sub(r"\n\s*\n", "\n\n", text)  # Normalize multiple newlines

    # Fix specific formatting patterns in your medical text
    text = re.sub(
        r"(?<=\d)\.(?=\s*[A-Z])", ".\n", text
    )  # Add newline after numbered points
    text = re.sub(r"(?<=:)(?=\w)", " ", text)  # Add space after colons

    # Remove leading/trailing whitespace
    text = text.strip()

    return text


def get_text_for_insights(document: Document) -> str:
    # Step 1: Handle document.text based on its type
    if isinstance(document.text, str):
        text_content = document.text
    elif isinstance(document.text, list):
        # Assuming you want to concatenate all text entries in the list
        text_content = " ".join(d.get('text', '') for d in document.text)
    else:
        text_content = ""

    # Step 2: Concatenate document.text with media.alt_text
    text_for_insights = text_content
    if document.media and document.media.alt_text:
        text_for_insights += " " + document.media.alt_text

    # Remove any leading/trailing whitespace
    text_for_insights = text_for_insights.strip()

    return text_for_insights


def count_tokens(text: str) -> int:
    """Count the number of tokens in a text string."""
    return len(tokenizer.encode(text))