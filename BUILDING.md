# Building Medicus from source

This guide covers the supported, easiest build (Docker Compose), building the
backend images individually, and running a backend service from a local Python
environment. For app configuration and choosing an LLM, see the root
[README](./README.md).

## What you are building

Medicus is a set of backend services plus an Expo mobile app:

- `MedicusUser`, `MedicusConvo`, `MedicusAI` and `MedicusNotification` are
  separate Python services.
- `MedicusCommon` is a shared Python package imported by the backend services.
  It is not a separate service or container.
- `MedicusNotification/sdk` is a Python client package used by other services
  to publish notification events.
- `MediApp` is the React Native / Expo client.

The backend Dockerfiles copy `MedicusCommon` into each image and install it
during the image build. The AI and notification images also install the
notification SDK. Therefore, build backend images **from the repository root**:
their Docker build context needs to include these shared folders.

## Prerequisites

For the full stack:

- Git
- Docker Engine with Docker Compose v2 (Docker Desktop is suitable)
- About 4 GB of free RAM, plus sufficient disk space for images and data
- An API key for a hosted LLM, or a separately running local model such as
  Ollama

For local backend development, also install Python 3.11 or newer. The provided
images use Python 3.12.

For the mobile app, install Node.js and npm. Native iOS builds require macOS
with Xcode; Android builds require the Android SDK. The app uses native modules,
so Expo Go is not a substitute for a development or release build.

## Recommended: build and run the complete backend with Compose

From the repository root:

1. Copy `.env.example` to `.env`.
2. Replace the `CHANGE_ME` values for `JWT_SECRET_KEY`,
   `INTERNAL_API_KEY` and `POSTGRES_PASSWORD`. For example, generate each with
   `openssl rand -hex 32`.
3. Configure an LLM provider in `.env` (see
   [Choosing a language model](./README.md#choosing-a-language-model)).
4. Build and start the stack:

   ```sh
   docker compose up -d --build
   ```

Compose builds all four backend images, including their installation of
`MedicusCommon`. It also starts PostgreSQL, Redis and the Nginx gateway, applies
database migrations, and loads reference data. You do not need to install
`MedicusCommon` separately when using this workflow.

Check service status and logs:

```sh
docker compose ps
docker compose logs -f user convo ai notification gateway
```

The API gateway is available at `http://localhost:8080` by default (change it
with `GATEWAY_PORT` in `.env`). To load sample doctor and patient accounts for
local testing, run:

```sh
docker compose --profile demo run --rm seed-demo
```

Demo accounts are for local testing only. Do not load demo data into a
production database. The seed is idempotent: running it again does nothing.

Optional services are behind Compose profiles and only start when asked for:

| Profile | Starts | Command |
|---|---|---|
| `demo` | the demo-data seed (one-off) | `docker compose --profile demo run --rm seed-demo` |
| `ollama` | a local Ollama server | `docker compose --profile ollama up -d` |
| `elasticsearch` | Elasticsearch for the MediKnowledge ingestion pipeline (about 1 GB RAM) | `docker compose --profile elasticsearch up -d elasticsearch` |

See the root [README](./README.md#quick-start) for model setup and app
configuration.

## Verify the build

Run the end-to-end tests against the stack you just started:

```sh
./scripts/e2e.sh
```

The script starts any missing services, loads the demo data and runs
`pytest tests/e2e` (164 tests, no LLM needed). On Windows, run it from Git Bash
or WSL, or run the same steps yourself:

```sh
docker compose up -d --wait postgres redis mailpit user convo ai notification gateway
docker compose --profile demo run --rm seed-demo
python -m pip install -r tests/e2e/requirements.txt
python -m pytest tests/e2e
```

Arguments after `./scripts/e2e.sh` go to pytest, for example `-k security` or
`-m llm` for the opt-in tests that use your configured model. See
[Testing](./README.md#testing) for the unit tests and what each suite checks.

## Build one backend image

Run these commands from the **repository root**. The final `.` is intentional:
it supplies the shared package and other files required by each Dockerfile.

```sh
docker build -f MedicusUser/Dockerfile -t medicus-user .
docker build -f MedicusConvo/Dockerfile -t medicus-convo .
docker build -f MedicusAI/Dockerfile -t medicus-ai .
docker build -f MedicusNotification/Dockerfile -t medicus-notification .
```

The AI image includes the default `ai` extra for `MedicusCommon`. To include
additional shared package integrations, pass the build arguments documented in
`.env.example`, for example:

```sh
docker build -f MedicusAI/Dockerfile \
  --build-arg COMMON_EXTRAS=ai,litellm,s3 \
  -t medicus-ai .
```

Building an image alone does not start its dependencies. Use Compose or your
deployment platform to provide the required environment variables, PostgreSQL,
Redis, storage, email and network access to the other services.

## Run a backend service from source

Each service has its own `requirements.txt`; install the shared package into the
same Python environment first. From the repository root, create and activate a
virtual environment, then install the packages for the service you want to run:

```sh
python -m venv .venv
```

Activate it (`.venv\Scripts\Activate.ps1` in PowerShell, or
`source .venv/bin/activate` in bash), then run **one** of the service command
blocks below. Each block is an alternative; create a fresh virtual environment
before installing another service's requirements.

```sh
# MedicusUser
python -m pip install -e ./MedicusCommon
python -m pip install -r MedicusUser/requirements.txt
python -m uvicorn main:app --app-dir MedicusUser --reload --port 8002
```

```sh
# MedicusConvo
python -m pip install -e ./MedicusCommon
python -m pip install -r MedicusConvo/requirements.txt
python -m uvicorn main:app --app-dir MedicusConvo --reload --port 8003
```

```sh
# MedicusAI
python -m pip install -e "./MedicusCommon[ai]"
python -m pip install -e ./MedicusNotification/sdk
python -m pip install -r MedicusAI/requirements.txt
python -m uvicorn main:app --app-dir MedicusAI --reload --port 8000
```

```sh
# MedicusNotification
python -m pip install -e ./MedicusCommon
python -m pip install -e ./MedicusNotification/sdk
python -m pip install -r MedicusNotification/requirements.txt
python -m uvicorn main:app --app-dir MedicusNotification --reload --port 8004
```

These commands install `MedicusCommon` in editable mode, so changes to the
shared package are available without reinstalling it. Use a separate virtual
environment per service if you are developing on multiple services with
different dependency requirements.

Local services also need their dependencies running. For example, start
PostgreSQL with `docker compose up -d postgres`, then apply database migrations
with `docker compose run --rm migrate`. PostgreSQL is published on
`localhost:5432`. Redis is not published to the host by the default Compose
configuration, so run Redis locally or add a local-only port mapping before
running a service outside Docker.

Configure each host-run service with the matching connection URLs and secrets
from `.env`. Compose supplies container-only hostnames such as `postgres`,
`redis`, `convo` and `notification`; host processes need host-accessible URLs.
For example, set the relevant database URL to use `localhost`, and set
`CONVO_SERVICE_URL` or `NOTIFICATION_SERVICE_URL` to the host port of the
service it calls. Review the settings for the service you are running before
starting it.

## Build the mobile app

From the app directory:

```sh
cd MediApp
npm ci
cp .env.example .env.local
```

Set `EXPO_PUBLIC_MEDICUS_API_BASE_URL` in `MediApp/.env.local` (git-ignored) to
the gateway URL as seen by the device. `localhost` works only when the app and
gateway share the same host network; for a physical device use the computer's
LAN IP, and for the Android emulator use `http://10.0.2.2:8080`. Every other
service URL derives from this one. All app settings are read in
`MediApp/utils/infrastructure/env.ts`; the optional ones (website, terms,
privacy, support email, store links) hide their screen entries when unset.
`EXPO_PUBLIC_*` values are bundled into the app and are visible to users; never
put API keys or other secrets in them. Restart Metro after changing them.

Check that the dependencies match the Expo SDK:

```sh
npx expo-doctor
```

Android builds need **JDK 17**; newer JDKs are not supported by the project's
Gradle version. With the required native toolchain installed, create a local
development build:

```sh
npx expo run:android
# or, on macOS with Xcode:
npx expo run:ios
```

For EAS builds, set `EXPO_OWNER`, `EAS_PROJECT_ID` and `APP_BUNDLE_ID` (read by
`app.config.js` at build time), and store the `EXPO_PUBLIC_*` values as EAS
environment variables. Each profile in `eas.json` uses the EAS environment of
the same name (`development`, `preview`, `production`):

```sh
npx eas-cli env:create --environment production --name EXPO_PUBLIC_MEDICUS_API_BASE_URL --value https://api.example.org --visibility plaintext
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

The production build needs valid app identifiers, signing credentials, and
production service URLs. Do not use the example localhost URL for a published
build.
