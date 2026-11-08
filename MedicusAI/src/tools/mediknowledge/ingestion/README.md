# RAG Ingestion Pipeline

This package implements the Retrieval-Augmented Generation (RAG) ingestion pipeline, which is composed of the following steps:

1. **Extracting** (Input: file_path → Output: document)
   - Extracts content from various file types, including PDFs, images, videos, and audio files.
   - Performs pre-processing validation to check file type, size limits, and detect any corruption.
   - Implements robust error handling to gracefully manage failed extractions.

2. **Text Cleaning & Preprocessing** (Input: document → Output: cleaned_document)
   - Cleans and preprocesses text to improve the quality of the data before further processing.
   - Removes irrelevant content such as headers, footers, and any redundant or unwanted information.
   - Handles special characters and standardizes formatting to ensure consistency across documents.
   - Eliminates duplicate content to streamline the dataset for subsequent steps.

3. **Parsing/Chunking** (Input: cleaned_document → Output: list[node])
   - Parses cleaned documents and chunks them into manageable pieces suitable for analysis and indexing.
   - Optimizes chunk sizes to balance context retention with performance considerations.
   - Ensures overlap between chunks where necessary to maintain context continuity.
   - Preserves metadata and relationships between chunks to retain document structure and meaning.

4. **Embedding Generation** (Input: list[node] → Output: list[node_with_embeddings])
   - Generates vector embeddings for each chunk to capture semantic meaning and facilitate efficient retrieval.
   - Selects an appropriate embedding model based on the content type and desired outcome.
   - Manages batch processing to enhance performance and scalability of the embedding generation process.

5. **Indexing** (Input: node_with_embeddings → Output: indexed_nodes)
   - Indexes nodes with embeddings into Elasticsearch, making them searchable and retrievable.
   - Utilizes bulk indexing to improve performance and reduce indexing time.
   - Incorporates error handling and retry mechanisms to ensure robustness.
   - Applies upsert logic to handle updates to existing documents without duplicating content.

## Additional Considerations
- Implements monitoring and logging throughout the pipeline to track progress and diagnose issues.
- Introduces validation steps between transformations to ensure data integrity.
- Employs caching mechanisms for frequently accessed content to enhance efficiency.
- Utilizes pipeline orchestration and error recovery strategies to manage complex workflows.
- Designs for scalability to handle large sets of documents and support growing data volumes.

## Regions and countries convention
nam - North America
- us-east
- us-west
- ca (Canada)
- mx (Mexico)

eur - Europe
- eu-west
- eu-central
- eu-north
- uk

apac - Asia Pacific
    jpn (Japan)
    kor (South Korea)
    sgp (Singapore)
    aus (Australia/New Zealand)
   
gcn - Greater China
    chn (Mainland China)
    hkg (Hong Kong)
    twn (Taiwan)

ind - India Subcontinent
    ind (India)
    bgd (Bangladesh)
    pak (Pakistan)

mea - Middle East & Africa
    uae (UAE/Gulf)
    tur (Turkey)
    zaf (South Africa)
    egy (Egypt)

sam - South America
    bra (Brazil)
    arg (Argentina)
    col (Colombia)