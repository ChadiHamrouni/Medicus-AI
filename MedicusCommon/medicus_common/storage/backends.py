"""Object-storage backends. Pick one with STORAGE_BACKEND=local|s3|azure."""

import asyncio
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional


class ObjectStorage(ABC):
    """Minimal async key/value blob store. Keys look like 'attachments/<uuid>/<file>'."""

    @abstractmethod
    async def put(self, key: str, data: bytes, content_type: Optional[str] = None) -> None: ...

    @abstractmethod
    async def get(self, key: str) -> Optional[bytes]: ...

    @abstractmethod
    async def delete(self, key: str) -> bool: ...


def _check_key(key: str) -> str:
    if not key or key.startswith("/") or "\\" in key or any(part in ("", ".", "..") for part in key.split("/")):
        raise ValueError(f"Invalid storage key: {key!r}")
    return key


class LocalStorage(ObjectStorage):
    """Files on local disk (or a mounted volume). Default for self-hosting and development."""

    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / _check_key(key)).resolve()
        if self.root not in path.parents:
            raise ValueError(f"Storage key escapes storage root: {key!r}")
        return path

    async def put(self, key: str, data: bytes, content_type: Optional[str] = None) -> None:
        path = self._path(key)

        def _write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(path.suffix + ".part")
            tmp.write_bytes(data)
            os.replace(tmp, path)

        await asyncio.to_thread(_write)

    async def get(self, key: str) -> Optional[bytes]:
        path = self._path(key)
        return await asyncio.to_thread(lambda: path.read_bytes() if path.is_file() else None)

    async def delete(self, key: str) -> bool:
        path = self._path(key)

        def _delete() -> bool:
            if path.is_file():
                path.unlink()
                return True
            return False

        return await asyncio.to_thread(_delete)


class S3Storage(ObjectStorage):
    """Amazon S3 or any S3-compatible service (MinIO, Cloudflare R2, Backblaze B2, Ceph...)."""

    def __init__(self, bucket: str, endpoint_url: Optional[str], region: Optional[str],
                 access_key_id: Optional[str], secret_access_key: Optional[str]):
        import boto3

        self.bucket = bucket
        self.client = boto3.client(
            "s3", endpoint_url=endpoint_url or None, region_name=region or None,
            aws_access_key_id=access_key_id or None, aws_secret_access_key=secret_access_key or None,
        )

    async def put(self, key: str, data: bytes, content_type: Optional[str] = None) -> None:
        extra = {"ContentType": content_type} if content_type else {}
        await asyncio.to_thread(self.client.put_object, Bucket=self.bucket, Key=_check_key(key), Body=data, **extra)

    async def get(self, key: str) -> Optional[bytes]:
        def _get() -> Optional[bytes]:
            try:
                return self.client.get_object(Bucket=self.bucket, Key=_check_key(key))["Body"].read()
            except self.client.exceptions.NoSuchKey:
                return None

        return await asyncio.to_thread(_get)

    async def delete(self, key: str) -> bool:
        await asyncio.to_thread(self.client.delete_object, Bucket=self.bucket, Key=_check_key(key))
        return True


class AzureBlobStorage(ObjectStorage):
    """Azure Blob Storage (optional; install the `azure` extra)."""

    def __init__(self, container: str, connection_string: str):
        from azure.storage.blob.aio import BlobServiceClient

        self.container = container
        self.service = BlobServiceClient.from_connection_string(connection_string)

    async def put(self, key: str, data: bytes, content_type: Optional[str] = None) -> None:
        from azure.storage.blob import ContentSettings

        blob = self.service.get_blob_client(self.container, _check_key(key))
        settings = ContentSettings(content_type=content_type) if content_type else None
        await blob.upload_blob(data, overwrite=True, content_settings=settings)

    async def get(self, key: str) -> Optional[bytes]:
        from azure.core.exceptions import ResourceNotFoundError

        try:
            stream = await self.service.get_blob_client(self.container, _check_key(key)).download_blob()
            return await stream.readall()
        except ResourceNotFoundError:
            return None

    async def delete(self, key: str) -> bool:
        from azure.core.exceptions import ResourceNotFoundError

        try:
            await self.service.get_blob_client(self.container, _check_key(key)).delete_blob()
            return True
        except ResourceNotFoundError:
            return False
