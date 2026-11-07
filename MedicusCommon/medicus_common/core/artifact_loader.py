from pathlib import Path


def load_artifact_files(directory: Path, pattern: str = "*.md") -> str:
    """Loads and concatenates all markdown files from a directory."""
    if not directory.is_dir():
        return ""
    files = sorted(directory.glob(pattern))
    return "\n\n".join(f.read_text(encoding="utf-8") for f in files)


def load_artifact_file(file_path: Path, file_type: str) -> str:
    """Loads content from a markdown file with error handling."""

    default_message = f"# {file_type.capitalize()} not found"
    error_message = f"# Error loading {file_type}: {{e}}"
    try:
        if not file_path.is_file():
            raise FileNotFoundError(f"{file_type.capitalize()} file not found at: {file_path}")
        
        content = file_path.read_text(encoding='utf-8')
        return content
        
    except FileNotFoundError as e:
        return default_message
        
    except Exception as e:
        return error_message.format(e=e)