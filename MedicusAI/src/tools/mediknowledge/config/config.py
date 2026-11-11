"""Key-path access to the MediKnowledge configuration.

    Config().get("chunking", "generative", "size")    -> 300
    Config().get("llms", "text")                      -> {"model": ..., "temperature": ..., "max_tokens": ...}
    Config().get("embedding", "model")                -> the configured embedding model
    Config("regions.json").get("COUNTRY_TO_REGION")   -> {...}

Tunable values live in mediknowledge.toml (validated by settings.py); prefer get_settings()
for typed access in new code. Model names are never hard-coded: they come from the Medicus
LLM settings (LLM_MODEL*, EMBEDDING_MODEL). Region buckets are folders under
STORAGE_LOCAL_PATH/knowledge unless KNOWLEDGE_BUCKET_ROOT is set (e.g. "s3://my-bucket").
"""

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.tools.mediknowledge.config.settings import get_settings

_DIR = Path(__file__).resolve().parent


@lru_cache
def _settings_dict() -> dict:
    from medicus_common.llm import get_llm_settings

    data = get_settings().model_dump()
    llm = get_llm_settings()
    for entry in data["llms"].values():
        entry["model"] = llm.model_for(entry.pop("role"))
    data["embedding"]["model"] = llm.embedding_model
    return data


@lru_cache
def _regions() -> dict:
    with open(_DIR / "regions.json", encoding="utf-8") as f:
        data = json.load(f)
    root = os.environ.get("KNOWLEDGE_BUCKET_ROOT") or \
        os.path.join(os.environ.get("STORAGE_LOCAL_PATH", "./data/storage"), "knowledge")
    data["REGION_BUCKETS"] = {region: f"{root.rstrip('/')}/{name}" for region, name in data["REGION_BUCKETS"].items()}
    return data


class Config:
    def __init__(self, filename: str = "mediknowledge.toml"):
        self.filename = filename
        self._data = _regions() if filename == "regions.json" else _settings_dict()

    def get(self, *keys: str, default: Any = None) -> Any:
        node: Any = self._data
        for key in keys:
            if not isinstance(node, dict) or key not in node:
                return default
            node = node[key]
        return node
