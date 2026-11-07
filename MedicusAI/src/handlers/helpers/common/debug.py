"""Console tracing of agent turns for local debugging.

These helpers print patient context, conversation history and model output,
which is protected health information. They are no-ops unless
MEDICUS_DEBUG_TRACE=true AND ENVIRONMENT is not production.
"""

import functools
import os


def _trace_enabled() -> bool:
    return (os.environ.get("MEDICUS_DEBUG_TRACE", "").lower() == "true"
            and os.environ.get("ENVIRONMENT", "development").lower() != "production")


def _gated(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if _trace_enabled():
            return fn(*args, **kwargs)
        return None
    return wrapper
# ============================================================
# FILE: src/handlers/common/debug.py
# ============================================================

import sys
import json
import os


@_gated
def debug_payload_ids(payload):
    """Debug payload IDs - silent unless error."""
    pass


@_gated
def debug_loaded_context(patient, doctor, assistant=None):
    """Show loaded context clearly - prints even in test mode for visibility."""
    
    # Always print in test mode for debugging context issues
    is_test = os.environ.get("SARA_TEST_MODE") == "true"
    
    print("\n" + "=" * 80, flush=True)
    print("📋 LOADED CONTEXT FROM DATABASE", flush=True)
    print("=" * 80, flush=True)
    
    # Patient context - print ALL attributes
    print("\n👤 PATIENT (from get_patient_context):", flush=True)
    if patient:
        # Get all attributes from the PatientView object
        patient_dict = patient.model_dump() if hasattr(patient, 'model_dump') else vars(patient)
        for key, value in sorted(patient_dict.items()):
            # Skip private attributes and None values for cleaner output
            if not key.startswith('_') and value is not None:
                print(f"   {key:25s}: {value}", flush=True)
    else:
        print("   No patient data loaded", flush=True)
    
    # Doctor context - print ALL attributes
    print("\n👨‍⚕️ DOCTOR (from get_doctor_context):", flush=True)
    if doctor:
        # Get all attributes from the doctor object
        doctor_dict = doctor.model_dump() if hasattr(doctor, 'model_dump') else vars(doctor)
        for key, value in sorted(doctor_dict.items()):
            # Skip private attributes and None values for cleaner output
            if not key.startswith('_') and value is not None:
                print(f"   {key:25s}: {value}", flush=True)
    else:
        print("   No doctor data loaded", flush=True)
    
    if assistant:
        print(f"\n🤖 Assistant:    {assistant}", flush=True)
    
    print("=" * 80 + "\n", flush=True)


@_gated
def debug_conversation_history(history, assistant=None, source="recent_messages"):
    """Print conversation history passed to the agent."""

    label = "DB (inactive)" if source == "db" else "client rolling window"
    print("\n" + "=" * 80, flush=True)
    print(f"💬 AGENT HISTORY ({label})", flush=True)
    print("=" * 80, flush=True)
    
    if not history:
        print("   No conversation history", flush=True)
    else:
        print(f"   Total messages in history: {len(history)}", flush=True)
        print("-" * 80, flush=True)
        
        for idx, msg in enumerate(history, 1):
            if isinstance(msg, dict):
                role = msg.get("role", "unknown").upper()
                content = msg.get("content", {})
                
                # Determine emoji based on role
                if role == "USER":
                    emoji = "👤"
                elif role == "ASSISTANT":
                    emoji = "🤖"
                elif role == "SYSTEM":
                    emoji = "⚙️"
                else:
                    emoji = "📝"
                
                print(f"\n   [{idx}] {emoji} {role}", flush=True)
                print("   " + "-" * 76, flush=True)
                
                # Extract text content
                text_content = ""
                if isinstance(content, dict):
                    text_content = content.get("text_io", "") or str(content)
                elif isinstance(content, str):
                    text_content = content
                else:
                    text_content = str(content)
                
                # Print content with wrapping
                if text_content:
                    lines = text_content.split('\n')
                    for line in lines:
                        if line.strip():
                            print(f"      {line}", flush=True)
                else:
                    print("      (empty content)", flush=True)
                    
            elif isinstance(msg, str):
                print(f"\n   [{idx}] 📝 {msg[:100]}{'...' if len(msg) > 100 else ''}", flush=True)
            else:
                print(f"\n   [{idx}] 📝 {str(msg)[:100]}{'...' if len(str(msg)) > 100 else ''}", flush=True)
    
    if assistant:
        print(f"\n   Assistant: {assistant}", flush=True)
    
    print("=" * 80 + "\n", flush=True)


@_gated
def debug_turn_header(turn, text):
    # Skip in test mode to prevent duplicate printing
    if os.environ.get("SARA_TEST_MODE") == "true":
        return

    print(f"\n{'='*80}", file=sys.stderr, flush=True)
    print(f"TURN {turn}", file=sys.stderr, flush=True)
    print(f"[USER] {text}", file=sys.stderr, flush=True)
    print(f"{'='*80}\n", file=sys.stderr, flush=True)


@_gated
def debug_agent_result(result):
    """Show tool calls with nicely formatted parameters."""
    # Skip in test mode to prevent duplicate printing
    if os.environ.get("SARA_TEST_MODE") == "true":
        return

    # Handle string input (from streaming) - just log it
    if isinstance(result, str):
        print(f"[SARA] {result[:200]}{'...' if len(result) > 200 else ''}", file=sys.stderr, flush=True)
        return

    # Handle None or missing new_items
    if result is None or not hasattr(result, 'new_items'):
        return

    # Types to exclude from debug logging (they have incompatible structures)
    EXCLUDED_TYPES = {"ResponseFunctionWebSearch"}
    # Tool names to exclude
    EXCLUDED_TOOLS = {"web_search", "WebSearchTool"}

    tool_calls = []
    for idx, item in enumerate(result.new_items or []):
        print(f"[DEBUG] Item {idx}: type={getattr(item, 'type', None)}", file=sys.stderr, flush=True)

        if getattr(item, "type", None) == "tool_call_item":
            raw = item.raw_item
            print(f"[DEBUG] Tool call found: raw_type={type(raw).__name__}", file=sys.stderr, flush=True)

            # Skip excluded types (e.g., WebSearch has different structure)
            if type(raw).__name__ in EXCLUDED_TYPES:
                print(f"[DEBUG] Skipping excluded type: {type(raw).__name__}", file=sys.stderr, flush=True)
                continue
            # Skip if no name attribute
            if not hasattr(raw, "name"):
                print(f"[DEBUG] Skipping: no name attribute", file=sys.stderr, flush=True)
                continue
            # Skip excluded tools by name
            if raw.name in EXCLUDED_TOOLS:
                print(f"[DEBUG] Skipping excluded tool: {raw.name}", file=sys.stderr, flush=True)
                continue

            print(f"[DEBUG] Processing tool: {raw.name}", file=sys.stderr, flush=True)
            try:
                # Parse arguments if string
                args = json.loads(raw.arguments) if isinstance(raw.arguments, str) else raw.arguments
                tool_calls.append((raw.name, args))
                print(f"[DEBUG] Tool added successfully: {raw.name}", file=sys.stderr, flush=True)
            except Exception as e:
                print(f"[DEBUG] Exception parsing args: {e}", file=sys.stderr, flush=True)
                tool_calls.append((raw.name, raw.arguments))

    print(f"[DEBUG] Total tool_calls collected: {len(tool_calls)}", file=sys.stderr, flush=True)

    if tool_calls:
        print("\n[TOOLS CALLED]", file=sys.stderr, flush=True)
        for name, args in tool_calls:
            print(f"  → {name}", file=sys.stderr, flush=True)
            # Format parameters with nice indentation
            try:
                formatted = json.dumps(args, indent=4, ensure_ascii=False)
                for line in formatted.split('\n'):
                    print(f"    {line}", file=sys.stderr, flush=True)
            except (TypeError, ValueError):
                # Skip formatting if args can't be serialized
                print(f"    {args}", file=sys.stderr, flush=True)
        print("", file=sys.stderr, flush=True)
    else:
        print("[DEBUG] No tool calls to display", file=sys.stderr, flush=True)
