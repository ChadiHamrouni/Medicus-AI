import logging
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.tools.mediknowledge.config.settings import get_settings
from src.tools.mediknowledge.ingestion.run import UnsupportedFile, ingest_file

router = APIRouter()


@router.post('/ingest')
async def ingest_files(
        files: List[UploadFile] = File(...),
        specialty_id: str = Form(...),
        country_id: str = Form(...),
        doctor_id: str = Form(...)
):
    """Index uploaded documents into the doctor's Elasticsearch knowledge base."""
    supported = get_settings().ingestion.supported_extensions
    results = []
    for file in files:
        ext = Path(file.filename or "").suffix.lstrip(".").lower()
        if ext not in supported:
            raise HTTPException(status_code=400,
                                detail=f"Invalid file type for {file.filename}. Supported types are: {', '.join(supported)}")
        with NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(await file.read())
            path = tmp.name
        try:
            logging.info(f"Ingesting {file.filename}")
            results.append(await ingest_file(path, doctor_id, country_id, specialty_id))
        except UnsupportedFile as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        finally:
            os.unlink(path)
    return {"message": "Files indexed.", "files": results}
