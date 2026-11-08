# track.py

import json
from datetime import datetime
from typing import Dict, Any
from fsspec.implementations.local import LocalFileSystem
from src.tools.mediknowledge.config.config import Config

config = Config('regions.json')
REGION_BUCKETS = config.get('REGION_BUCKETS')
COUNTRY_TO_REGION = config.get('COUNTRY_TO_REGION')


def get_metadata_path(country_id: str, specialty_id: str = None, doctor_id: str = None) -> str:
    region = COUNTRY_TO_REGION.get(country_id.lower())
    bucket_name = REGION_BUCKETS.get(region)
    # Determine the level of metadata based on provided identifiers
    if doctor_id:
        return f"{bucket_name}/{country_id}/{specialty_id}/{doctor_id}/track_metadata.json"
    elif specialty_id:
        return f"{bucket_name}/{country_id}/{specialty_id}/track_metadata.json"
    else:
        return f"{bucket_name}/{country_id}/track_metadata.json"


def load_metadata(metadata_file_path: str, fs: LocalFileSystem) -> Dict[str, Any]:
    try:
        with fs.open(metadata_file_path, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {}


def save_metadata(metadata_file_path: str, fs: LocalFileSystem, new_metadata: Dict[str, Any]) -> None:
    # Load existing metadata, if available
    existing_metadata = load_metadata(metadata_file_path, fs)

    # Merge existing metadata with new metadata
    merged_metadata = {**existing_metadata, **new_metadata}

    # Save the merged metadata back to the file
    with fs.open(metadata_file_path, 'w') as file:
        json.dump(merged_metadata, file, indent=4)


def check_if_ingestion_is_needed(file_path: str, fs: LocalFileSystem, country_id: str, specialty_id: str = None,
                                 doctor_id: str = None) -> bool:
    metadata_file_path = get_metadata_path(country_id, specialty_id, doctor_id)
    metadata = load_metadata(metadata_file_path, fs)
    existing_metadata = metadata.get(file_path)

    # Get the last modified time of the file itself
    file_last_modified = fs.modified(file_path)  # This should already be a datetime object

    if existing_metadata:
        existing_ingestion_date = datetime.fromisoformat(existing_metadata['ingestion_date'])
        # If the file itself is older than the prompts date, no update is needed
        return file_last_modified > existing_ingestion_date
    # If there is no existing metadata, an update is needed
    return True


# Example usage of the check_if_document_needs_update function
def main():
    fs = LocalFileSystem()  # Replace with appropriate filesystem if not local
    country_id = 'tun'  # Tunisia
    specialty_id = '456'
    doctor_id = '123'
    file_path = '../../../assets/medicus_general.txt'

    # Check if the document needs to be updated
    if check_if_ingestion_is_needed(file_path, fs, country_id, specialty_id, doctor_id):
        print(f"Document at {file_path} needs to be updated.")
        # Proceed with re-prompts process
    else:
        print(f"Document at {file_path} is up-to-date. No need to re-ingest.")


if __name__ == "__main__":
    main()
