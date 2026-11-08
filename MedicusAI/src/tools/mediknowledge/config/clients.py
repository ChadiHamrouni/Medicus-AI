"""Clients used by the MediKnowledge ingestion pipeline (synchronous, as the pipeline expects).

OpenAIClient          OpenAI SDK pointed at the configured LLM server (OpenAI, Ollama, vLLM...)
ElasticsearchClient   ELASTICSEARCH_URL (default http://elasticsearch:9200), optional ELASTICSEARCH_API_KEY
AWSClient             S3 / S3-compatible storage: S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
AzureClient           Azure Blob storage: AZURE_STORAGE_CONNECTION_STRING
"""

import os
from functools import lru_cache, wraps


def _add_extra_body(client, extra: dict) -> None:
    """Merge `extra` into the request body of every chat completion call made with `client`."""
    for resource in (client.chat.completions, client.beta.chat.completions):
        for name in ("create", "parse"):
            method = getattr(resource, name, None)
            if method is None:
                continue

            @wraps(method)
            def with_extra(*args, _method=method, **kwargs):
                kwargs["extra_body"] = {**extra, **(kwargs.get("extra_body") or {})}
                return _method(*args, **kwargs)

            setattr(resource, name, with_extra)


class OpenAIClient:
    """Sync OpenAI SDK client for the server configured in LLM_* (any OpenAI-compatible API)."""

    @staticmethod
    @lru_cache
    def _client():
        from openai import OpenAI
        from medicus_common.llm import get_llm_settings

        s = get_llm_settings()
        base_url = s.base_url if s.provider != "openai" else None
        client = OpenAI(api_key=s.resolved_api_key or "not-needed", base_url=base_url, timeout=s.timeout_seconds)
        if s.reasoning_effort and s.provider != "openai":
            # Same as the rest of Medicus: e.g. LLM_REASONING_EFFORT=none turns off "thinking" on
            # local models, which otherwise spend the whole token budget before answering.
            _add_extra_body(client, {"reasoning_effort": s.reasoning_effort})
        return client

    def client(self):
        return self._client()

    def openai_client(self):
        return self._client()


class ElasticsearchClient:
    @staticmethod
    @lru_cache
    def _client():
        from elasticsearch import Elasticsearch

        url = os.environ.get("ELASTICSEARCH_URL", "http://elasticsearch:9200")
        api_key = os.environ.get("ELASTICSEARCH_API_KEY")
        return Elasticsearch(url, api_key=api_key) if api_key else Elasticsearch(url)

    def es_client(self):
        return self._client()

    def client(self):
        return self._client()


class AWSClient:
    def client_kwargs(self) -> dict:
        """Keyword arguments for fsspec.filesystem("s3", ...)."""
        kwargs = {"key": os.environ.get("S3_ACCESS_KEY_ID"), "secret": os.environ.get("S3_SECRET_ACCESS_KEY")}
        client_kwargs = {k: v for k, v in {"endpoint_url": os.environ.get("S3_ENDPOINT_URL"),
                                           "region_name": os.environ.get("S3_REGION")}.items() if v}
        if client_kwargs:
            kwargs["client_kwargs"] = client_kwargs
        return {k: v for k, v in kwargs.items() if v}

    def client(self):
        import boto3

        return boto3.client(
            "s3",
            endpoint_url=os.environ.get("S3_ENDPOINT_URL") or None,
            region_name=os.environ.get("S3_REGION") or None,
            aws_access_key_id=os.environ.get("S3_ACCESS_KEY_ID") or None,
            aws_secret_access_key=os.environ.get("S3_SECRET_ACCESS_KEY") or None,
        )


class AzureClient:
    def filesystem_kwargs(self) -> dict:
        """Keyword arguments for fsspec.filesystem("abfs", ...)."""
        return {"connection_string": os.environ.get("AZURE_STORAGE_CONNECTION_STRING")}
