from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from medicus_common.core.logging_config import logger
from .common import ASSISTANT_MAP, BASE_DIR

router = APIRouter(prefix="/instructions", tags=["instructions"])

class InstructionSave(BaseModel):
    content: str

ASSISTANTS_DIR = BASE_DIR / "src" / "assistants"
ARCHIVE_DIR = ASSISTANTS_DIR / "version_control"

def _md_path(assistant: str) -> Path:
    if assistant == "common":
        return ASSISTANTS_DIR / "common" / "common_instructions.md"
    return ASSISTANTS_DIR / assistant / f"{assistant}_instructions.md"

def _archive_dir(assistant: str) -> Path:
    return ARCHIVE_DIR / assistant

@router.get("/assistants")
def list_assistants():
    if not ASSISTANTS_DIR.exists():
        logger.error(f"FATAL: ASSISTANTS_DIR does not exist at {ASSISTANTS_DIR.resolve()}")
    return list(ASSISTANT_MAP.keys()) + ["common"]

@router.get("/{assistant}/history")
def get_history(assistant: str):
    d = _archive_dir(assistant)
    if not d.exists():
        return []
    prefix = f"{assistant}_instructions_"
    timestamps = [
        f.name[len(prefix):-3]
        for f in d.iterdir()
        if f.name.startswith(prefix) and f.name.endswith(".md")
    ]
    return sorted(timestamps, reverse=True)

@router.get("/{assistant}/archive/{timestamp}")
def get_archive(assistant: str, timestamp: str):
    path = _archive_dir(assistant) / f"{assistant}_instructions_{timestamp}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archive not found")
    return {"assistant": assistant, "timestamp": timestamp, "content": path.read_text(encoding="utf-8")}

@router.get("/{assistant}")
def get_instructions(assistant: str):
    path = _md_path(assistant)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"No instructions for '{assistant}' at {path.resolve()}")
    return {"assistant": assistant, "content": path.read_text(encoding="utf-8")}

@router.put("/{assistant}")
def save_instructions(assistant: str, body: InstructionSave):
    path = _md_path(assistant)
    if not path.parent.exists():
        raise HTTPException(status_code=404, detail=f"Assistant '{assistant}' not found")
    
    path.write_text(body.content, encoding="utf-8")

    archive_dir_path = _archive_dir(assistant)
    archive_dir_path.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    (archive_dir_path / f"{assistant}_instructions_{ts}.md").write_text(body.content, encoding="utf-8")

    if assistant in ASSISTANT_MAP:
        agent = ASSISTANT_MAP[assistant]
        common_path = _md_path("common")
        common_content = common_path.read_text(encoding="utf-8") if common_path.exists() else ""
        agent.instructions = f"{body.content}\n\n{common_content}"
        logger.info(f"Hot-reloaded instructions for {assistant}")
        
    elif assistant == "common":
        common_content = body.content
        for agent_name, live_agent in ASSISTANT_MAP.items():
            agent_path = _md_path(agent_name)
            agent_content = agent_path.read_text(encoding="utf-8") if agent_path.exists() else ""
            live_agent.instructions = f"{agent_content}\n\n{common_content}"
            logger.info(f"Hot-reloaded instructions for {agent_name} with new common block")

    return {"ok": True}
