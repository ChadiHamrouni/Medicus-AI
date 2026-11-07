import json
from typing import Any, Dict

def ensure_metadata_dict(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure metadata field is properly converted to dict."""
    if 'metadata' in row_dict:
        metadata = row_dict['metadata']
        if isinstance(metadata, str):
            try:
                parsed = json.loads(metadata)
                row_dict['metadata'] = parsed if isinstance(parsed, dict) else {}
            except (json.JSONDecodeError, TypeError):
                row_dict['metadata'] = {}
        elif metadata is None:
            row_dict['metadata'] = {}
        elif not isinstance(metadata, dict):
            row_dict['metadata'] = {}
    else:
        row_dict['metadata'] = {}
    return row_dict
