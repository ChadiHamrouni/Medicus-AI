import asyncio
import base64
import os
import xml.etree.ElementTree as ET

import fsspec
import matplotlib.pyplot as plt
import piexif
from piexif.helper import UserComment
from PIL import Image, PngImagePlugin

from src.tools.mediknowledge.ingestion.processing.check_file import (
    get_filesystem_and_check_path,
)

# Define the namespace map for easier reference
NAMESPACE_MAP = {"Iptc4xmpExt": "http://iptc.org/std/Iptc4xmpExt/2008-02-29/"}


# Function to encode the image
async def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


async def is_valid_image(image_info, image_bytes):
    min_width, min_height = 100, 100  # Example minimum dimensions in pixels
    max_aspect_ratio = 2  # Example maximum aspect ratio (width / height)
    min_file_size = 1024  # Example minimum file size in bytes

    # Extract image dimensions and size
    image_width, image_height = image_info["width"], image_info["height"]
    image_size = len(image_bytes)

    # Apply rules
    if (
        image_width < min_width
        or image_height < min_height
        or max(image_width / image_height, image_height / image_width)
        > max_aspect_ratio
        or image_size < min_file_size
    ):
        return False

    return True


async def add_image_alt_text(
    fs: fsspec.AbstractFileSystem, image_path: str, alt_text: str
):
    # Open the image using the provided filesystem
    with fs.open(image_path, "rb") as file:
        img = Image.open(file)

    # Add description based on the image format
    if img.format == "JPEG":
        # Prepare the EXIF data with the description
        exif_dict = piexif.load(img.info["exif"]) if "exif" in img.info else {}
        user_comment = UserComment.dump(alt_text, encoding="unicode")
        exif_dict["Exif"][piexif.ExifIFD.UserComment] = user_comment

        # Convert the modified EXIF data back to bytes
        exif_bytes = piexif.dump(exif_dict)

        # Save the image with the new EXIF data, overwriting the original file
        img.save(image_path, "jpeg", exif=exif_bytes)
    elif img.format == "PNG":
        # Prepare the metadata with the description
        meta = PngImagePlugin.PngInfo()
        meta.add_text("Description", alt_text)

        # Save the image with the new metadata, overwriting the original file
        img.save(image_path, "PNG", pnginfo=meta)
    else:
        raise ValueError(f"Adding description not supported for {img.format} format.")


async def get_image_alt_text(
        fs: fsspec.AbstractFileSystem,
        image_path: str
) -> str:
    # Open the image using the provided filesystem
    with fs.open(image_path, "rb") as file:
        img = Image.open(file)
        # Handle JPEG format
        if img.format == "JPEG" and "exif" in img.info:
            exif_dict = piexif.load(img.info["exif"])
            user_comment = exif_dict.get("Exif", {}).get(piexif.ExifIFD.UserComment)
            if user_comment:
                return UserComment.load(user_comment)

        # Handle PNG format
        elif img.format == "PNG":
            for key in img.info:
                if key == "Description":
                    return img.info[key]

        # Handle other formats by checking XMP data
        xmp_data = img.info.get("XML:com.adobe.xmp")
        if xmp_data:
            root = ET.fromstring(xmp_data)
            description_tag = root.find(
                ".//Iptc4xmpExt:ArtworkContentDescription", namespaces=NAMESPACE_MAP
            )
            if description_tag is not None:
                return description_tag.text.strip()

    return None


async def plot_images(fs: fsspec.AbstractFileSystem, image_path: str):
    # Define a set of valid image extensions
    valid_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"}

    # Check if the path is an S3 URI or a local path
    if image_path.startswith("s3://"):
        # Extract bucket name and key from S3 URI
        s3_parts = image_path[5:].split("/", 1)
        bucket_name = s3_parts[0]
        key_prefix = s3_parts[1] if len(s3_parts) > 1 else ""
        image_dir = f"{bucket_name}/{key_prefix}"
    else:
        # Use the local path directly
        image_dir = image_path

    # Filter out files that do not have a valid image extension
    image_files = [
        f
        for f in fs.ls(image_dir)
        if fs.isfile(f) and os.path.splitext(f)[1].lower() in valid_extensions
    ]
    images_shown = 0

    for img_file in image_files:
        try:
            with fs.open(img_file, "rb") as file:
                image = Image.open(file).convert("RGB")
            plt.subplot(8, 8, images_shown + 1)
            plt.imshow(image)
            plt.xticks([])
            plt.yticks([])
            images_shown += 1
            if images_shown >= 64:
                break
        except IOError:
            print(f"Cannot open image file: {img_file}")

    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    # Example usage for local filesystem
    # Determine if the path is local or remote and create the appropriate filesystem object
    image_path = "../../../assets/flash_attention.png"
    fs = get_filesystem_and_check_path(image_path)
    desc = asyncio.run(get_image_alt_text(fs, image_path))
    print(desc)
