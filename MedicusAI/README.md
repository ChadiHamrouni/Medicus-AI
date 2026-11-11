# MedicusAI

The assistant service: chat and voice turns for patients (**MediAid**) and doctors (**MediDoc**), backed by ~40 database tools.

| Path | What lives there |
|---|---|
| `src/api/` | `/chat` endpoint, live voice WebSocket (`live/`), MediBench evaluation API (off unless `MEDIBENCH_API_KEY` is set) |
| `src/assistants/` | The four agents and their instructions/skills (`mediaid`, `medisolo`, `medidoc`, `docsolo`) |
| `src/tools/` | Tools the agents call: records, booking, prescriptions, exams, procedures, support, triage |
| `src/tools/mediknowledge/` | Doctor knowledge base (RAG): ingestion, hybrid search, the `search_doctor_knowledge` tool, and the Elasticsearch ingestion pipeline. See the root [README](../README.md#doctor-knowledge-base-rag) |
| `src/api/knowledge.py` | Doctor-only API to add, list and delete knowledge documents |
| `src/security/` | `scope.py` (server-side conversation authorization) and `tool_guard.py` (identity injection, argument repair, error handling) |
| `src/handlers/` | Text, voice (speech-to-text) and attachment (MediScan) pipelines |

The model is configured entirely through `LLM_*` environment variables (OpenAI, any OpenAI-compatible server such as Ollama/vLLM, or LiteLLM). See the root [README](../README.md#choosing-a-language-model).

Run it as part of the stack: `docker compose up -d --build ai`. Tests: `tests/e2e/tool_harness.py` and `tests/e2e/chat_with_mock_llm.py` (via `scripts/e2e.sh`).