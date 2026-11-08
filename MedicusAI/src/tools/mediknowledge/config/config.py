"""Configuration for the MediKnowledge ingestion pipeline.

    Config().get("prompts", "gen_chunk_size")          -> 300
    Config().get("llms", "text_llm")                   -> {"model": ..., "temperature": ..., "max_tokens": ...}
    Config('regions.json').get("COUNTRY_TO_REGION")    -> {...}

Static values live in config.json / regions.json next to this file. Model names are never
hard-coded: they come from the Medicus LLM settings (LLM_MODEL*, EMBEDDING_MODEL), so the
pipeline uses whatever provider the deployment is configured with. Region buckets are
folders under STORAGE_LOCAL_PATH/knowledge unless KNOWLEDGE_BUCKET_ROOT is set
(e.g. "s3://my-bucket").
"""

import json
import os
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from typing import Any

_DIR = Path(__file__).resolve().parent


@lru_cache
def _load(filename: str) -> dict:
    with open(_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def _with_runtime_values(filename: str, data: dict) -> dict:
    from medicus_common.llm import get_llm_settings

    data = deepcopy(data)
    if filename == "config.json":
        s = get_llm_settings()
        for llm in data.get("llms", {}).values():
            llm["model"] = s.model_for(llm.pop("role", "text"))
        data["embeddings"]["text_embedding"]["model"] = s.embedding_model
        dimension = os.environ.get("EMBEDDING_DIMENSION")
        if dimension:
            data["Ingestion"]["embedding_dimension"] = int(dimension)
    elif filename == "regions.json":
        root = os.environ.get("KNOWLEDGE_BUCKET_ROOT") or \
            os.path.join(os.environ.get("STORAGE_LOCAL_PATH", "./data/storage"), "knowledge")
        data["REGION_BUCKETS"] = {region: f"{root.rstrip('/')}/{name}" for region, name in data["REGION_BUCKETS"].items()}
    return data


class Config:
    def __init__(self, filename: str = "config.json"):
        self.filename = filename
        self._data = _with_runtime_values(filename, _load(filename))

    def get(self, *keys: str, default: Any = None) -> Any:
        node: Any = self._data
        for key in keys:
            if not isinstance(node, dict) or key not in node:
                return default
            node = node[key]
        return node
