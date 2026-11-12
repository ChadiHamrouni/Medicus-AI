# Contributing to Medicus

Thanks for helping. Medicus handles health data, so changes are held to a few
firm rules (below); everything else is ordinary open-source practice.

## Before you start

- **Pick something.** The [Roadmap](README.md#roadmap) lists open work with the
  file where each item starts. Issues labelled **good first issue** are small.
- **Say so in the issue** before you write a lot of code, so two people don't do
  the same work and design questions are settled early.
- **Security problems** are never reported in public issues: see
  [SECURITY.md](SECURITY.md).

## Set up

Follow [BUILDING.md](BUILDING.md): copy `.env.example` to `.env`, fill in the
secrets and a language model, then `docker compose up -d --build` and load the
demo data. A local model through Ollama is enough for development.

## Make your change

| You are changing | Where | Notes |
|---|---|---|
| An API or business rule | `Medicus<Service>/src` | Authorize on the server; never trust an id the client sends |
| Shared models, LLM layer, storage, email | `MedicusCommon/medicus_common` | Used by every service: keep changes backward compatible |
| An assistant tool | `MedicusAI/src/tools` | Patient and doctor ids are injected by the tool guard, never chosen by the model |
| The database schema | `database/migrations` | Add a new migration; never edit one that has been released |
| The mobile app | `MediApp` | Configuration only through `utils/infrastructure/env.ts`; no hard-coded URLs |

Conventions:

- **Python:** type hints on public functions, small functions, no bare `except`.
  Match the style of the file you are in.
- **TypeScript:** run `npm run lint` and `npm run format` in `MediApp`.
- **No secrets, ever:** no keys, passwords, tokens or real hosts in code, tests
  or examples. Use `.env` (git-ignored) and `example.com` addresses.
  `EXPO_PUBLIC_*` values ship inside the app, so they must never hold a secret.
- **No real patient data** in code, tests, fixtures, screenshots or issues.
- **New configuration** goes into `.env.example` (or `MediApp/.env.example`) with
  a comment, and into the README tables if users need to know about it.

## Test it

| Change | Run |
|---|---|
| `MedicusCommon` | `cd MedicusCommon && pip install -e ".[dev,ai]" && pytest` |
| `MedicusNotification` | `cd MedicusNotification && python -m pytest tests` |
| Any backend service, API or tool | `./scripts/e2e.sh` (needs Docker; no LLM) |
| Assistant behaviour or prompts | `./scripts/e2e.sh -m llm -k <conversation type>` |
| `MediApp` dependencies | `cd MediApp && npx expo-doctor` |

Add tests with your change: unit tests next to the code (`<Service>/tests`),
and end-to-end tests in `tests/e2e` when the change crosses services. A bug fix
should come with a test that fails without it.

### Run focused end-to-end tests

Run the helper from the repository root with Docker running, Python 3.10+
available as `python`, and a configured `.env`. It starts the services, loads
the demo data, and forwards arguments to pytest:

```sh
./scripts/e2e.sh -k security -x
```

The default suite excludes tests marked `llm`. To run real-model tests, configure
the model in `.env` and opt in with `./scripts/e2e.sh -m llm`.

If the stack and demo data are already ready, run
`python -m pytest tests/e2e -k security -x` directly after installing
`tests/e2e/requirements.txt`. Check the skip reasons in the pytest summary:
an unreachable stack or missing demo data can cause tests to skip, so a run
with skipped tests does not verify those scenarios.

## Open a pull request

- One topic per pull request; keep it small enough to review.
- Describe what changed and why, how you tested it, and any migration or new
  setting.
- Screenshots for UI changes (demo data only).
- Commit messages: short imperative summary line, for example
  `Fix double booking when the slot spans midnight`.

## License

Medicus is licensed under the [Apache License 2.0](LICENSE). By contributing,
you agree that your contribution is licensed under the same terms (section 5
of the license).
