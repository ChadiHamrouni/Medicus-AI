# ============================================================
# FILE: src/handlers/meditext/timing.py
# ============================================================

import sys
import os


def log_timing(handler: str, timing: dict, total: float, error: str | None = None):
    # Skip timing output in test mode to prevent duplicate printing
    if os.environ.get("SARA_TEST_MODE") == "true":
        return

    print(
        f"\n[{handler}] {'ERROR' if error else 'OK'} total={total:.2f}s",
        file=sys.stderr,
        flush=True,
    )
    for k, v in timing.items():
        print(f"  {k:<12} {v:.2f}s", file=sys.stderr, flush=True)
    if error:
        print(f"  error={error}", file=sys.stderr, flush=True)
