import json
from pathlib import Path
from typing import List, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .common import BASE_DIR

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

SCENARIOS_DIR = BASE_DIR / "tests" / "scenarios"

def _scenario_file(domain: str, lang: str) -> Path:
    # First priority: check if it exists in any of the type subfolders (meditext, medivox, mediscan)
    for type_dir in SCENARIOS_DIR.iterdir():
        if not type_dir.is_dir():
            continue
        path = type_dir / lang / f"{domain}.json"
        if path.exists():
            return path
            
    # Fallback/Default path for creation or if not found
    return SCENARIOS_DIR / "meditext" / lang / f"{domain}.json"

@router.get("/domains")
def list_domains(lang: str = "en"):
    # Dynamically scan all subdirectories for available scenario files in the given language
    domains_map = {}
    
    for type_dir in SCENARIOS_DIR.iterdir():
        if not type_dir.is_dir():
            continue
            
        lang_dir = type_dir / lang
        if lang_dir.exists() and lang_dir.is_dir():
            for f in lang_dir.glob("*.json"):
                if f.stem == "__init__":
                    continue
                # Store in map to handle duplicates across types gracefully
                if f.stem not in domains_map:
                    domains_map[f.stem] = {
                        "slug": f.stem,
                        "label": f.stem.replace("_", " ").title()
                    }
    
    return sorted(list(domains_map.values()), key=lambda x: x["label"])

def _load_scenarios(domain: str, lang: str) -> List[dict]:
    path = _scenario_file(domain, lang)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save_scenarios(domain: str, lang: str, data: List[dict]) -> None:
    path = _scenario_file(domain, lang)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

@router.get("")
def list_scenarios(domain: str, lang: str = "en"):
    scenarios = _load_scenarios(domain, lang)
    return [
        {"index": i, "coverage": s.get("coverage", ""), "assistant": s.get("assistant", "")}
        for i, s in enumerate(scenarios)
    ]

@router.get("/{index}")
def get_scenario(domain: str, index: int, lang: str = "en"):
    scenarios = _load_scenarios(domain, lang)
    if index < 0 or index >= len(scenarios):
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"index": index, "total": len(scenarios), **scenarios[index]}

class ConversationTurn(BaseModel):
    role: str
    content: str

class ScenarioUpdate(BaseModel):
    coverage: str
    assistant: str
    context_id: str = "paired_clinical"
    conversation: List[ConversationTurn]

@router.put("/{index}")
def update_scenario(domain: str, index: int, body: ScenarioUpdate, lang: str = "en"):
    scenarios = _load_scenarios(domain, lang)
    if index < 0 or index >= len(scenarios):
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenarios[index] = {
        "domain": domain,
        **body.model_dump(),
        "conversation": [t.model_dump() for t in body.conversation],
    }
    _save_scenarios(domain, lang, scenarios)
    return {"ok": True}

@router.post("")
def create_scenario(domain: str, body: ScenarioUpdate, lang: str = "en"):
    scenarios = _load_scenarios(domain, lang)
    new = {
        "domain": domain,
        **body.model_dump(),
        "conversation": [t.model_dump() for t in body.conversation],
    }
    scenarios.append(new)
    _save_scenarios(domain, lang, scenarios)
    return {"index": len(scenarios) - 1, "total": len(scenarios)}

@router.delete("/{index}")
def delete_scenario(domain: str, index: int, lang: str = "en"):
    scenarios = _load_scenarios(domain, lang)
    if index < 0 or index >= len(scenarios):
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenarios.pop(index)
    _save_scenarios(domain, lang, scenarios)
    return {"ok": True, "total": len(scenarios)}
