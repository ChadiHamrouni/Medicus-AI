import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from fsspec.implementations.local import LocalFileSystem
import os
from tempfile import NamedTemporaryFile

from src.tools.mediknowledge.config.config import Config
from src.tools.mediknowledge.ingestion.pipeline import IngestionPipeline
from src.tools.mediknowledge.ingestion.extracting.extract_from_txt import extract_from_txt
from src.tools.mediknowledge.ingestion.extracting.extract_from_pdf import extract_from_pdf
from src.tools.mediknowledge.ingestion.parsing.text_nodes import create_text_nodes
from src.tools.mediknowledge.ingestion.parsing.pdf_nodes import create_pdf_nodes
from src.tools.mediknowledge.ingestion.storing.store_node import store_nodes

SUPPORTED_EXTENSIONS = Config().get("supported_extensions")
router = APIRouter()


@router.post('/ingest')
async def ingest_files(
        files: List[UploadFile] = File(...),
        specialty_id: str = Form(...),
        country_id: str = Form(...),
        doctor_id: str = Form(...)
):
    fs = LocalFileSystem()  # Assuming local filesystem for saving uploaded files
    for file in files:
        filename = file.filename
        file_ext = filename.split('.')[-1].lower()

        if file_ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type for {filename}. Supported types are: {', '.join(SUPPORTED_EXTENSIONS)}"
            )

        # Save the uploaded file to a temporary file
        with NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        if file_ext == "pdf":
            logging.info(f"Processing PDF file: {filename}")
            pdf_pipeline = IngestionPipeline(functions=[
                extract_from_pdf,
                create_pdf_nodes,
                store_nodes
            ])
            # Run the pipeline with the temporary file path
            await pdf_pipeline.run(temp_file_path, fs, doctor_id, country_id, specialty_id)

            # Clean up the temporary file after processing
            os.unlink(temp_file_path)
        elif file_ext in ["txt", "rtf"]:
            logging.info(f"Processing text file: {filename}")
            text_pipeline = IngestionPipeline(functions=[
                extract_from_txt,
                create_text_nodes,
                store_nodes
            ])
            # Run the pipeline with the temporary file path
            await text_pipeline.run(temp_file_path, fs, doctor_id, country_id, specialty_id)

            # Clean up the temporary file after processing
            os.unlink(temp_file_path)
        # Add more conditions for other file types as needed

    return {"message": "Files are being processed."}

