"""Typed, validated MediKnowledge settings loaded from mediknowledge.toml.

    from src.tools.mediknowledge.config.settings import get_settings
    s = get_settings()
    s.retrieval.top_k, s.chunking.retriever.size, s.index.name("us", "retriever")

The file path can be overridden with MEDIKNOWLEDGE_CONFIG; EMBEDDING_DIMENSION overrides
embedding.dimension. Invalid values fail fast at startup with a clear message.
"""

import os
import tomllib
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

DEFAULT_PATH = Path(__file__).resolve().parent / "mediknowledge.toml"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Ingestion(_Strict):
    supported_extensions: list[str]
    max_file_mb: int = Field(gt=0)


class Window(_Strict):
    size: int = Field(gt=0)
    overlap: int = Field(ge=0)

    @model_validator(mode="after")
    def _overlap_smaller(self):
        if self.overlap >= self.size:
            raise ValueError("overlap must be smaller than size")
        return self


class PostgresChunks(_Strict):
    size_chars: int = Field(gt=0)
    overlap_chars: int = Field(ge=0)
    max_chunks_per_document: int = Field(gt=0)


class Chunking(_Strict):
    generative: Window
    retriever: Window
    postgres: PostgresChunks


class Embedding(_Strict):
    dimension: int = Field(gt=0, le=4096)
    batch_size: int = Field(gt=0)


class Index(_Strict):
    generative_suffix: str
    retriever_suffix: str
    shards: int = Field(ge=1)
    replicas: int = Field(ge=0)
    similarity: Literal["cosine", "dot_product", "l2_norm", "max_inner_product"]
    hnsw_m: int = Field(ge=2)
    hnsw_ef_construction: int = Field(ge=4)

    def name(self, country_id: str, kind: Literal["generative", "retriever"]) -> str:
        suffix = self.generative_suffix if kind == "generative" else self.retriever_suffix
        return f"{country_id.lower()}{suffix}"


class Retrieval(_Strict):
    top_k: int = Field(gt=0, le=50)
    candidates: int = Field(gt=0)
    knn_num_candidates: int = Field(gt=0, le=10000)
    rrf_k: int = Field(ge=1)
    context_excerpts: int = Field(ge=0)
    max_vector_chunks: int = Field(gt=0)

    @model_validator(mode="after")
    def _knn_covers_candidates(self):
        if self.knn_num_candidates < self.candidates:
            raise ValueError("knn_num_candidates must be >= candidates")
        return self


class LLMRole(_Strict):
    role: Literal["text", "vision", "tools", "guardrail"]
    temperature: float = Field(ge=0, le=2)
    max_tokens: int = Field(gt=0)


class LLMs(_Strict):
    text: LLMRole
    vision: LLMRole


class MediKnowledgeSettings(_Strict):
    ingestion: Ingestion
    chunking: Chunking
    embedding: Embedding
    index: Index
    retrieval: Retrieval
    llms: LLMs


def _path() -> Path:
    return Path(os.environ.get("MEDIKNOWLEDGE_CONFIG") or DEFAULT_PATH)


@lru_cache
def get_settings() -> MediKnowledgeSettings:
    path = _path()
    with open(path, "rb") as f:
        data = tomllib.load(f)
    dimension = os.environ.get("EMBEDDING_DIMENSION")
    if dimension:
        data.setdefault("embedding", {})["dimension"] = int(dimension)
    try:
        return MediKnowledgeSettings.model_validate(data)
    except Exception as exc:
        raise RuntimeError(f"Invalid MediKnowledge settings in {path}: {exc}") from exc
