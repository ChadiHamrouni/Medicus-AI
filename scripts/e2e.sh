#!/usr/bin/env bash
# End-to-end tests against a local stack: start it, load the demo data, run tests/e2e.
#
#   ./scripts/e2e.sh                 # everything that needs no LLM (a few minutes)
#   ./scripts/e2e.sh -m llm          # real assistant turns against the model in .env (slow)
#   ./scripts/e2e.sh -k security -x  # any other pytest arguments
#
# Needs Docker, Python 3.10+ and a filled-in .env (cp .env.example .env).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "No .env found. Create one first: cp .env.example .env" >&2
    exit 1
fi

docker compose up -d --wait postgres redis mailpit user convo ai notification gateway
docker compose --profile demo run --rm seed-demo        # idempotent: skips when already loaded

python -c "import httpx, pytest" 2>/dev/null || python -m pip install -q -r tests/e2e/requirements.txt
python -m pytest tests/e2e "$@"
