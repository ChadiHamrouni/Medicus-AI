"""Ingest one document into the doctor's Elasticsearch knowledge indices.

Used by the /ingest route and by the command line (python -m src.tools.mediknowledge.cli).
"""

import logging
from pathlib import Path

from fsspec.implementations.local import LocalFileSystem

from src.tools.mediknowledge.config.clients import ElasticsearchClient
from src.tools.mediknowledge.config.settings import get_settings
from src.tools.mediknowledge.ingestion.extracting.extract_from_pdf import extract_from_pdf
from src.tools.mediknowledge.ingestion.extracting.extract_from_txt import extract_from_txt
from src.tools.mediknowledge.ingestion.indexing.es_index import create_index, index_names
from src.tools.mediknowledge.ingestion.parsing.pdf_nodes import create_pdf_nodes
from src.tools.mediknowledge.ingestion.parsing.text_nodes import create_text_nodes
from src.tools.mediknowledge.ingestion.pipeline import IngestionPipeline
from src.tools.mediknowledge.ingestion.storing.store_node import store_nodes

logger = logging.getLogger(__name__)

# extension -> pipeline steps (extract -> chunk + embed -> store)
_PIPELINES = {
    "pdf": [extract_from_pdf, create_pdf_nodes, store_nodes],
    "txt": [extract_from_txt, create_text_nodes, store_nodes],
    "md": [extract_from_txt, create_text_nodes, store_nodes],
    "rtf": [extract_from_txt, create_text_nodes, store_nodes],
}


class UnsupportedFile(ValueError):
    pass


def check_file(path: str | Path) -> str:
    """Return the file's extension after checking it is supported and within the size limit."""
    s = get_settings().ingestion
    path = Path(path)
    ext = path.suffix.lstrip(".").lower()
    if ext not in s.supported_extensions or ext not in _PIPELINES:
        raise UnsupportedFile(f"{path.name}: unsupported type. Supported: {', '.join(s.supported_extensions)}")
    if path.stat().st_size > s.max_file_mb * 1024 * 1024:
        raise UnsupportedFile(f"{path.name}: larger than {s.max_file_mb} MB")
    return ext


async def ingest_file(path: str | Path, doctor_id: str, country_id: str, specialty_id: str) -> dict:
    """Extract, chunk, embed and index one file. Returns how many nodes the indices now hold for it."""
    ext = check_file(path)
    es = ElasticsearchClient().es_client()
    gen, ret = await create_index(es, country_id)
    before = {i: es.count(index=i)["count"] for i in (gen, ret)}

    await IngestionPipeline(functions=_PIPELINES[ext]).run(str(path), LocalFileSystem(), str(doctor_id), country_id, str(specialty_id))

    for i in (gen, ret):
        es.indices.refresh(index=i)
    added = {i: es.count(index=i)["count"] - before[i] for i in (gen, ret)}
    logger.info(f"[MEDIKNOWLEDGE] ingested {Path(path).name}: {added[gen]} passages, {added[ret]} searchable chunks")
    return {"file": Path(path).name, "generative_nodes": added[gen], "retriever_nodes": added[ret],
            "indices": list(index_names(country_id))}
