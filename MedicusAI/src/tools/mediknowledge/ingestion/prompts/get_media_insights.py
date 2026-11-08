def get_text_insights() -> str:
    return """
    Analyze the provided text and extract the following insights:

    1. Title: Generate a concise title that encapsulates the main subject or theme of the text.
    2. Summary: Create a clear and detailed summary of the text, capturing the main ideas and essential details in a paragraph of no more than 150 words. The summary should be understandable by a general audience and omit non-critical information.
    3. Relevance: Rate the relevance as 'true' only if the text is highly relevant to the medical or healthcare domain; otherwise, rate it as 'false'.
    """


def get_image_insights() -> str:
    return """
    Provide insights based on an image and any accompanying text. 

    1. Title: Suggest a concise title that captures the main subject or theme of the image, using information from the accompanying text and/or by analyzing the image itself.
    2. Description: Offer a detailed explanation of what the image depicts, including any notable elements or features.
    3. Relevance: Rate the relevance as 'true' only if the image is highly relevant to the medical or healthcare domain; otherwise, rate it as 'false'.
    """


def get_table_insights() -> str:
    return """
    Provide insights based on a table of data. 

    1. Title: Devise a concise title that encapsulates the primary focus of the table, using information from any accompanying text or by analyzing the table itself.
    2. Description: Summarize the key information presented in the table, highlighting significant trends, patterns, or outliers.
    3. Relevance: Rate the relevance as 'true' only if the table is highly relevant to the medical or healthcare domain; otherwise, rate it as 'false'.
    """
