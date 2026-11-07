from typing import Optional

_IMAGE_MIME_BY_EXT = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
}


def image_mime_from_ext(ext: str) -> Optional[str]:
    return _IMAGE_MIME_BY_EXT.get((ext or "").lower())
