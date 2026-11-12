"""One /chat turn against the AI instance that test_agent_mock_llm.py runs on the mock LLM.

Runs inside the ai container. Reads {"url", "token", "body"} as JSON on stdin, clears the mock
log, posts the turn and prints {"status", "reply", "llm_requests"} as one JSON line.
"""

import json
import os
import sys
import urllib.error
import urllib.request

LOG = os.environ.get("MOCK_LLM_LOG", "/tmp/medicus_e2e_mock_llm.log")

job = json.load(sys.stdin)
open(LOG, "w").close()
request = urllib.request.Request(job["url"], data=json.dumps(job["body"]).encode(), method="POST",
                                 headers={"Content-Type": "application/json",
                                          "Authorization": f"Bearer {job['token']}"})
try:
    with urllib.request.urlopen(request, timeout=300) as r:
        status, raw = r.status, r.read().decode()
except urllib.error.HTTPError as e:
    status, raw = e.code, e.read().decode()
try:
    reply = json.loads(raw)
except ValueError:
    reply = raw
with open(LOG, encoding="utf-8") as f:
    llm_requests = [json.loads(line) for line in f if line.strip()]
print(json.dumps({"status": status, "reply": reply, "llm_requests": llm_requests}, default=str))
