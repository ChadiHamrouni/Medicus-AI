from pathlib import Path

# Define the base paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

SRC_DIR = PROJECT_ROOT / "src"
SRC_TOOLS_DIR = SRC_DIR / "tools"
DATASETS_DIR = PROJECT_ROOT / "evaluation" / "datasets"

DATASETS_DIR.mkdir(parents=True, exist_ok=True)

# Add any application-specific paths
MEDIBENCH_DIR = PROJECT_ROOT / "internal" / "medibench"
MEDISUPPORT_DIR = PROJECT_ROOT / "internal" / "src"
