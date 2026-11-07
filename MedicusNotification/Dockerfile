# Build from the repository root:  docker build -f MedicusNotification/Dockerfile .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ARG COMMON_EXTRAS=""
COPY MedicusCommon /opt/medicus-common
COPY MedicusNotification/sdk /opt/medicus-notification-sdk
RUN pip install "/opt/medicus-common${COMMON_EXTRAS:+[$COMMON_EXTRAS]}" /opt/medicus-notification-sdk

WORKDIR /app
COPY MedicusNotification/requirements.txt .
RUN pip install -r requirements.txt
COPY MedicusNotification/ .

RUN useradd --create-home --uid 10001 medicus && chown -R medicus /app
USER medicus

ENV PORT=8004
EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/health" || exit 1
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
