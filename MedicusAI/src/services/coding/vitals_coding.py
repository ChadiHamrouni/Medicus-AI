"""Vital text to key mapping via fuzzy DB search."""

from typing import List, Dict, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.vitals import (
    VitalKeyMapping,
    VitalKeyMappingResult,
)


async def map_vital_texts_to_keys(
    vital_texts: List[str],
) -> VitalKeyMappingResult:
    """Map vital texts to standardized vital keys via search_vitals_fuzzy()."""
    if not vital_texts:
        return VitalKeyMappingResult(mappings=[])

    resolved: Dict[str, Optional[str]] = {}

    try:
        async with db_manager.get_connection() as conn:
            for text in vital_texts:
                row = await conn.fetchrow(
                    "SELECT f.vital_id, v.vital_key FROM search_vitals_fuzzy($1) f JOIN vitals v ON v.vital_id = f.vital_id LIMIT 1",
                    text,
                )
                resolved[text] = (row["vital_id"], row["vital_key"]) if row else (None, None)
    except Exception as e:
        logger.error(f"vital_lookup_failed: {e}")
        resolved = {text: (None, None) for text in vital_texts}

    return VitalKeyMappingResult(
        mappings=[
            VitalKeyMapping(vital_text=t, vital_id=resolved.get(t, (None, None))[0], vital_key=resolved.get(t, (None, None))[1])
            for t in vital_texts
        ]
    )
