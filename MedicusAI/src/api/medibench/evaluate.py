import time
import json
import sys
import os
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from unittest.mock import patch
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from medicus_common.models.convo.payload import AppPayload, ConvoStatus
from medicus_common.core.logging_config import logger
from src.handlers.meditext import meditext_handler
from .common import ASSISTANT_MAP, BASE_DIR

router = APIRouter(tags=["evaluation"])

RESULTS_DIR = BASE_DIR / "tests" / "results"

@router.get("/run/has-results")
def has_results(domain: str, lang: str = "en") -> List[str]:
    if not RESULTS_DIR.exists():
        return []
    prefix = f"{domain}_"
    suffix = f"_{lang}.json"
    coverages = []
    for f in RESULTS_DIR.iterdir():
        if f.name.startswith(prefix) and f.name.endswith(suffix):
            coverages.append(f.name[len(prefix):-len(suffix)])
    return sorted(list(set(coverages)))

@router.get("/run/results")
def get_results(domain: str, coverage: str, lang: str = "en"):
    path = RESULTS_DIR / f"{domain}_{coverage}_{lang}.json"
    empty = {"patient_context": None, "doctor_context": None, "conversation_history": [], "turns": []}
    if not path.exists():
        return empty
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list) and data and isinstance(data[0], dict) and "patient_context" in data[0]:
            return {
                "patient_context": data[0].get("patient_context"),
                "doctor_context": data[0].get("doctor_context"),
                "conversation_history": data[0].get("conversation_history", []),
                "turns": data[1:],
            }
        return data if isinstance(data, dict) else {"turns": data}
    except Exception:
        return empty

# ---------------------------------------------------------------------------
# Test Runner (Streaming orchestrator)
# ---------------------------------------------------------------------------

_domain_locks: Dict[str, asyncio.Lock] = {}

def _get_domain_lock(domain: str) -> asyncio.Lock:
    if domain not in _domain_locks:
        _domain_locks[domain] = asyncio.Lock()
    return _domain_locks[domain]

class SaveResultsRequest(BaseModel):
    domain: str
    coverage: str
    lang: str
    results: Dict[str, Any]

@router.post("/run/save-results")
def save_results(body: SaveResultsRequest):
    """Persist run results written by the UI (evaluateTurn flow) to disk."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / f"{body.domain}_{body.coverage}_{body.lang}.json"
    path.write_text(json.dumps(body.results, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True}


class RunRequest(BaseModel):
    domain: str
    index: Optional[int] = None
    lang: str = "en"
    assistant: Optional[str] = None
    coverage: Optional[str] = None

_PYTEST_HEADER_PREFIXES = ("platform ", "rootdir:", "configfile:", "plugins:", "asyncio:") # removed "collected "

def _is_pytest_header(text: str) -> bool:
    s = text.strip()
    return any(s.startswith(p) for p in _PYTEST_HEADER_PREFIXES) or "test session starts" in s

async def _stream_pytest(cmd: List[str], cwd: Path):
    """Run pytest as subprocess and yield stdout lines as SSE."""
    logger.info(f"[RUN] Executing: {' '.join(cmd)}")
    logger.info(f"[RUN] CWD: {os.getcwd()}")
    env = os.environ.copy()
    env["PYTHONPATH"] = str(cwd)
    env["PYTHONUNBUFFERED"] = "1"  # Force unbuffered output
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(cwd),
            env=env,
        )
    except Exception as e:
        logger.error(f"[RUN] Failed to start process: {e}")
        yield f"data: Error starting tests: {e}\n\n"
        return

    if not process.stdout:
        yield "data: Error: Pipe not available\n\n"
        return

    async for line in process.stdout:
        text = line.decode(errors="replace").rstrip()
        if text:
            # Yield everything for debugging
            logger.info(f"[PYTEST] {text}")
            # Forward turn results with special marker for frontend parsing
            if text.startswith("__TURN_RESULT__"):
                yield f"data: {text}\n\n"
            else:
                yield f"data: {text}\n\n"
    
    await process.wait()
    logger.info(f"[RUN] Pytest exited with code {process.returncode}")
    yield f"data: __EXIT__{process.returncode}\n\n"

@router.post("/run")
async def run_tests(body: RunRequest):
    """Run pytest for the given domain/index and stream output via SSE."""
    logger.info(f"[RUN] Request for domain={body.domain}, coverage={body.coverage}")
    
    # Verify pytest is available
    try:
        import pytest
        logger.info(f"[RUN] pytest version {pytest.__version__} is available")
    except ImportError:
        logger.error("[RUN] pytest module not found in current environment")
        raise HTTPException(status_code=500, detail="pytest not installed in backend environment")

    test_file = BASE_DIR / "tests" / "src" / "test_orchestrator.py"
    if not test_file.exists():
        logger.error(f"[RUN] Test file not found at: {test_file}")
        raise HTTPException(status_code=500, detail=f"Test orchestrator not found at {test_file}")

    cmd = [
        sys.executable, "-m", "pytest",
        str(test_file),
        "--export-json",
        "--lang", body.lang,
        "-v",
        "-s",          # Disable output capturing - show print statements in real-time
        "--tb=short",
    ]
    
    k_parts = []
    if body.coverage:
        k_parts.append(body.coverage)
    else:
        if body.domain:
            k_parts.append(body.domain)
        if body.assistant:
            k_parts.append(body.assistant)
            
    if k_parts:
        cmd += ["-k", " and ".join(k_parts)]

    async def _locked_stream():
        lock = _get_domain_lock(body.domain)
        async with lock:
            async for chunk in _stream_pytest(cmd, BASE_DIR):
                yield chunk

    return StreamingResponse(
        _locked_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ---------------------------------------------------------------------------
# Single Turn Evaluation
# ---------------------------------------------------------------------------

class TestEvaluatePayload(BaseModel):
    assistant_id: str
    user_message: str
    instructions: str
    common_instructions: str
    history: List[Dict[str, Any]] = []
    agent_context: Dict[str, Any] = {}
    
    convo_id: str = "test-convo"
    patient_id: Optional[int] = 123
    doctor_id: Optional[int] = 456
    sender_id: Optional[int] = 123
    mirror_convo_id: Optional[str] = None

@router.post("/evaluate")
async def evaluate_turn(payload: TestEvaluatePayload):
    logger.info(f"[TEST EVALUATE] Incoming run for {payload.assistant_id}")
    
    base_agent = ASSISTANT_MAP.get(payload.assistant_id)
    if not base_agent:
        raise HTTPException(status_code=400, detail="Unknown assistant")

    full_prompt = f"{payload.instructions}\n\n{payload.common_instructions}"
    original_instructions = base_agent.instructions
    
    captured_result = None
    
    async def spy_run_text(*args, **kwargs):
        nonlocal captured_result
        from src.handlers.helpers.meditext.run_text import run_text
        res = await run_text(*args, **kwargs)
        captured_result = res
        return res

    start_time = time.time()

    app_payload = AppPayload(
        convo_id=payload.convo_id,
        text_io=payload.user_message,
        assistant=payload.assistant_id,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        sender_id=payload.sender_id,
        receiver_id=None,
        convo_status=ConvoStatus.ACTIVE,
        file_io="",
        audio_io=None,
        mirror_convo_id=payload.mirror_convo_id
    )

    try:
        base_agent.instructions = full_prompt
        mock_history = (payload.history, None)
        
        from medicus_common.models.patient.patient_view import PatientView
        from medicus_common.models.doctor.doctor_view import DoctorView
        
        mock_patient = PatientView(**payload.agent_context.get("patient", {})) if payload.agent_context.get("patient") else None
        mock_doctor = DoctorView(**payload.agent_context.get("doctor", {})) if payload.agent_context.get("doctor") else None

        with patch("src.handlers.meditext.ConvoService.add_convo_message", return_value={"id": 1, "role": "assistant", "content": {}, "created_at": ""}), \
             patch("src.handlers.meditext.ConvoService.load_history", return_value=mock_history), \
             patch("src.handlers.meditext.get_patient_context", return_value=mock_patient), \
             patch("src.handlers.meditext.get_doctor_context", return_value=mock_doctor), \
             patch("src.handlers.meditext.run_text", side_effect=spy_run_text), \
             patch("src.handlers.meditext._trigger_compaction"), \
             patch("src.handlers.meditext.socketio_broadcast_service.broadcast_ai_message"):
            
            cloud_result, handler_time_internal = await meditext_handler(app_payload)
            
    except Exception as e:
        logger.error(f"[TEST EVALUATE] Agent execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        base_agent.instructions = original_instructions

    handler_time = time.time() - start_time

    if not captured_result:
        raise HTTPException(status_code=500, detail="Agent returned no result")

    new_items_serializable = []
    if hasattr(captured_result, "new_items") and captured_result.new_items:
        for item in captured_result.new_items:
            item_type = getattr(item, "type", None)
            
            if item_type == "tool_call_item":
                raw = item.raw_item
                tool_name = getattr(raw, "name", "unknown")
                tool_args = getattr(raw, "arguments", "{}")
                if hasattr(raw, "type") and raw.type == "web_search_call":
                     tool_name = "web_search"
                     tool_args = getattr(getattr(raw, "action", None), "query", "{}")
                
                try:
                    parsed_args = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                except:
                    parsed_args = tool_args
                    
                new_items_serializable.append({
                    "type": "tool_call",
                    "name": tool_name,
                    "arguments": parsed_args
                })
            
            elif item_type == "tool_call_output_item":
                raw = item.raw_item
                output_content = getattr(raw, "content", None) or getattr(raw, "output", None) or str(raw)
                new_items_serializable.append({
                    "type": "tool_output",
                    "output": output_content
                })

    return {
        "text_io": cloud_result.text_io if cloud_result else captured_result.final_output,
        "new_items": new_items_serializable,
        "handler_time": handler_time,
    }
