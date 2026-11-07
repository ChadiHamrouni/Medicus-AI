# Build from the repository root:  docker build -f MedicusAI/Dockerfile .
# Extra model providers / storage backends: --build-arg COMMON_EXTRAS=ai,litellm,s3
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ffmpeg: audio normalisation before speech-to-text
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ARG COMMON_EXTRAS="ai"
COPY MedicusCommon /opt/medicus-common
COPY MedicusNotification/sdk /opt/medicus-notification-sdk
RUN pip install "/opt/medicus-common[${COMMON_EXTRAS}]" /opt/medicus-notification-sdk

WORKDIR /app
COPY MedicusAI/requirements.txt .
RUN pip install -r requirements.txt
COPY MedicusAI/ .

RUN useradd --create-home --uid 10001 medicus && mkdir -p /data/storage && chown -R medicus /app /data
USER medicus

ENV PORT=8000
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/api/MedicusAI/health/live" || exit 1
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
