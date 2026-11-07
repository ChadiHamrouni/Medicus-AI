#!/usr/bin/env bash
set -e

# Explicit Python binary inside container
export PYTHONPATH=/app

/usr/bin/python3 /app/MedicusAI/src/services/coding/batch_procedures_coding.py

