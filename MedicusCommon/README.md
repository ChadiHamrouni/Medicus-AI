# medicus-common

Shared Python package (`medicus_common`) used by every backend service.

| Module | Purpose |
|---|---|
| `core/` | Settings, database pool (asyncpg), logging, CSRF middleware, exceptions |
| `llm/` | Provider-neutral LLM layer: OpenAI, OpenAI-compatible (Ollama, vLLM, …) and LiteLLM; per-role models; structured output with JSON-mode fallback; speech |
| `storage/` | Object storage backends (local, S3, Azure Blob), signed keys, object-level access checks |
| `email.py` | SMTP / Azure Communication Services / console backends |
| `models/` | Pydantic request/response models shared across services |
| `services/` | Shared data access helpers |

Install for development:

```bash
pip install -e "./MedicusCommon[dev]"          # add ,ai for the agents SDK, ,litellm / ,s3 / ,azure as needed
```

The service Dockerfiles install it from this folder. Overview: root [README](../README.md).