"""
Pluggable object storage for attachments, voice notes and vault documents.

  STORAGE_BACKEND=local   (default) files under STORAGE_LOCAL_PATH
  STORAGE_BACKEND=s3      AWS S3 / MinIO / R2 / any S3-compatible API
  STORAGE_BACKEND=azure   Azure Blob Storage

Objects are always addressed by a key (e.g. "attachments/<conversation>/<file>",
"vault/p-<uuid>/d-<uuid>.pdf"); URLs are never stored in the database.
"""

import base64
import hashlib
import hmac
import mimetypes
import re
import time
import uuid
from functools import lru_cache
from typing import Literal, Optional
from urllib.parse import unquote, urlparse

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from medicus_common.storage.backends import AzureBlobStorage, LocalStorage, ObjectStorage, S3Storage


class StorageSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    backend: Literal["local", "s3", "azure"] = Field("local", alias="STORAGE_BACKEND")
    bucket: str = Field("medicus", alias="STORAGE_BUCKET")
    local_path: str = Field("./data/storage", alias="STORAGE_LOCAL_PATH")
    s3_endpoint_url: Optional[str] = Field(None, alias="S3_ENDPOINT_URL")
    s3_region: Optional[str] = Field(None, alias="S3_REGION")
    s3_access_key_id: Optional[str] = Field(None, alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: Optional[str] = Field(None, alias="S3_SECRET_ACCESS_KEY")
    azure_connection_string: Optional[str] = Field(None, alias="AZURE_STORAGE_CONNECTION_STRING")
    max_upload_bytes: int = Field(20 * 1024 * 1024, alias="STORAGE_MAX_UPLOAD_BYTES")
    # Secret used to sign short-lived download links. Falls back to JWT_SECRET_KEY.
    signing_secret: Optional[str] = Field(None, alias="STORAGE_SIGNING_SECRET")
    jwt_secret_key: Optional[str] = Field(None, alias="JWT_SECRET_KEY")


@lru_cache
def get_storage_settings() -> StorageSettings:
    return StorageSettings()


@lru_cache
def get_storage() -> ObjectStorage:
    s = get_storage_settings()
    if s.backend == "s3":
        return S3Storage(s.bucket, s.s3_endpoint_url, s.s3_region, s.s3_access_key_id, s.s3_secret_access_key)
    if s.backend == "azure":
        if not s.azure_connection_string:
            raise RuntimeError("STORAGE_BACKEND=azure requires AZURE_STORAGE_CONNECTION_STRING")
        return AzureBlobStorage(s.bucket, s.azure_connection_string)
    return LocalStorage(s.local_path)


_SAFE_NAME = re.compile(r"[^A-Za-z0-9._()-]+")


def safe_filename(filename: Optional[str]) -> str:
    name = _SAFE_NAME.sub("_", (filename or "file").rsplit("/", 1)[-1].rsplit("\\", 1)[-1]).strip("._")
    return name[:120] or "file"


def attachment_key(conversation_id: str, filename: Optional[str]) -> str:
    return f"attachments/{conversation_id}/{uuid.uuid4().hex}_{safe_filename(filename)}"


def guess_content_type(key: str) -> str:
    return mimetypes.guess_type(key)[0] or "application/octet-stream"


def normalize_key(blob_url_or_path: str) -> str:
    """
    Accept a storage key or a legacy blob URL and return the storage key.

    Legacy rows may contain full Azure URLs such as
    https://<account>.blob.core.windows.net/<container>/<key>; the container
    segment is dropped. Raises ValueError for anything that is not a plain key.
    """
    value = (blob_url_or_path or "").strip()
    if value.startswith(("http://", "https://")):
        parts = unquote(urlparse(value).path).lstrip("/").split("/", 1)
        if len(parts) != 2:
            raise ValueError("Unsupported media URL")
        value = parts[1]
    value = unquote(value).lstrip("/")
    if not value or ".." in value.split("/") or "\\" in value:
        raise ValueError("Invalid media key")
    return value


# ---------------------------------------------------------------------------
# Short-lived signed links (for clients that cannot send an Authorization header,
# e.g. a PDF viewer). Signature = HMAC-SHA256(secret, "<key>|<expires>").
# ---------------------------------------------------------------------------

def _secret() -> bytes:
    s = get_storage_settings()
    secret = s.signing_secret or s.jwt_secret_key
    if not secret:
        raise RuntimeError("Set STORAGE_SIGNING_SECRET or JWT_SECRET_KEY to sign download links")
    return secret.encode()


def sign_key(key: str, ttl_seconds: int = 600) -> tuple[str, int]:
    expires = int(time.time()) + ttl_seconds
    digest = hmac.new(_secret(), f"{key}|{expires}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("="), expires


def verify_signed_key(key: str, signature: str, expires: int) -> bool:
    if expires < int(time.time()):
        return False
    expected = hmac.new(_secret(), f"{key}|{expires}".encode(), hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected).decode().rstrip("=")
    return hmac.compare_digest(expected_b64, signature or "")


__all__ = [
    "ObjectStorage",
    "StorageSettings",
    "attachment_key",
    "get_storage",
    "get_storage_settings",
    "guess_content_type",
    "normalize_key",
    "safe_filename",
    "sign_key",
    "verify_signed_key",
]
