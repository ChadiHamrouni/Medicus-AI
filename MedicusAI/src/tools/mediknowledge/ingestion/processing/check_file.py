import fsspec
from dotenv import load_dotenv

from src.tools.mediknowledge.config.clients import AWSClient, AzureClient

# Load environment variables from .env file
load_dotenv()


def get_filesystem_and_check_path(file_path: str):
    """Determine if the path is local or remote and create the appropriate filesystem object.
       Check if the file exists before proceeding.

    Args:
        file_path (str): The path to the file.

    Returns:
        fsspec.AbstractFileSystem: The filesystem object.
    """
    # Determine if the path is local or remote and create the appropriate filesystem object
    if file_path.startswith("s3://"):
        aws_client = AWSClient()
        fs = fsspec.filesystem("s3", **aws_client.client_kwargs())
    elif file_path.startswith("abfs://") or file_path.startswith("az://"):
        azure_client = AzureClient()
        fs = fsspec.filesystem("abfs", **azure_client.filesystem_kwargs())
    else:
        fs = fsspec.filesystem("file")

    # Check if the file exists before proceeding
    if not fs.exists(file_path):
        raise FileNotFoundError(f"The file {file_path} does not exist.")

    return fs


def list_files_in_bucket(bucket_name: str, prefix: str):
    """Lists all files in the specified S3 bucket and prefix using the provided AWS client."""
    aws_client = AWSClient()
    s3_client = aws_client.client()
    paginator = s3_client.get_paginator("list_objects_v2")

    # Use the paginator to handle buckets with many objects
    pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)

    for page in pages:
        if "Contents" in page:
            for obj in page["Contents"]:
                print(obj["Key"])  # Print the file name


if __name__ == "__main__":
    # Example usage
    file_path = "s3://668ea478db3732c783e385c7/rag/rag_data/raw_files/test/llama2.pdf"
    fs = get_filesystem_and_check_path(file_path)
    print(fs)
    # file_path = "../../assets/medicus_general.txt"
    # Define the S3 path
    bucket_name = "668ea478db3732c783e385c7"  # Replace with your bucket name
    prefix = "rag/rag_data/raw_files/"  # Replace with your prefix
    list_files_in_bucket(bucket_name, prefix)
