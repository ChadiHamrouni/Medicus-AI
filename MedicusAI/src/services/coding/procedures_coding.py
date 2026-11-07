"""Procedure text to code mapping via fuzzy DB search."""

from typing import List, Dict, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.procedures import (
    ProcedureCodeMapping,
    ProcedureCodeMappingResult,
)


async def map_procedure_texts_to_codes(
    procedure_texts: List[str],
) -> ProcedureCodeMappingResult:
    """Map procedure texts to procedure_id via search_procedures_fuzzy()."""
    if not procedure_texts:
        return ProcedureCodeMappingResult(mappings=[])

    resolved: Dict[str, Optional[int]] = {}

    try:
        async with db_manager.get_connection() as conn:
            for text in procedure_texts:
                row = await conn.fetchrow(
                    "SELECT procedure_id FROM search_procedures_fuzzy($1) LIMIT 1",
                    text,
                )
                resolved[text] = row["procedure_id"] if row else None
    except Exception as e:
        logger.error(f"procedure_lookup_failed: {e}")
        resolved = {text: None for text in procedure_texts}

    return ProcedureCodeMappingResult(
        mappings=[
            ProcedureCodeMapping(procedure_text=t, procedure_id=resolved.get(t))
            for t in procedure_texts
        ]
    )
