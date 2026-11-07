# Build from the repository root:  docker build -f MedicusUser/Dockerfile .
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
RUN pip install "/opt/medicus-common${COMMON_EXTRAS:+[$COMMON_EXTRAS]}"

WORKDIR /app
COPY MedicusUser/requirements.txt .
RUN pip install -r requirements.txt
COPY MedicusUser/ .

RUN useradd --create-home --uid 10001 medicus && mkdir -p /data/storage && chown -R medicus /app /data
USER medicus

ENV PORT=8002
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/api/MedicusUser/health" || exit 1
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
