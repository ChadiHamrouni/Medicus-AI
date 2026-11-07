"""Condition text to code mapping via fuzzy DB search."""

from typing import List, Dict, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.conditions import (
    ConditionCodeMapping,
    ConditionCodeMappingResult,
)


async def map_condition_texts_to_codes(
    condition_texts: List[str],
) -> ConditionCodeMappingResult:
    """Map condition texts to condition_id via search_conditions_fuzzy()."""
    if not condition_texts:
        return ConditionCodeMappingResult(mappings=[])

    resolved: Dict[str, Optional[int]] = {}

    try:
        async with db_manager.get_connection() as conn:
            for text in condition_texts:
                row = await conn.fetchrow(
                    "SELECT condition_id FROM search_conditions_fuzzy($1) LIMIT 1",
                    text,
                )
                resolved[text] = row["condition_id"] if row else None
    except Exception as e:
        logger.error(f"condition_lookup_failed: {e}")
        resolved = {text: None for text in condition_texts}

    return ConditionCodeMappingResult(
        mappings=[
            ConditionCodeMapping(condition_text=t, condition_id=resolved.get(t))
            for t in condition_texts
        ]
    )
