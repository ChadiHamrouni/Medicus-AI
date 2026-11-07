"""
Logging for all Medicus services.

  LOG_LEVEL          DEBUG | INFO (default) | WARNING | ERROR
  LOG_FORMAT         text (default in development) | json (default in production)
  LOG_FILE           optional path of a rotating log file
  LOG_HTTP_ENDPOINT  optional host:port of an HTTP log collector (Logstash, Vector, ...)

Logs go to stdout by default, which is what container platforms expect.
"""

import json
import logging
import logging.config
import logging.handlers
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict

APP_NAME = os.getenv("APP_NAME", "Medicus")
APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development"))


def _record_to_dict(record: logging.LogRecord, formatter: logging.Formatter) -> Dict[str, Any]:
    entry: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "level": record.levelname,
        "logger": record.name,
        "message": record.getMessage(),
        "module": record.module,
        "function": record.funcName,
        "line": record.lineno,
        "app": APP_NAME,
        "env": APP_ENV,
    }
    if record.exc_info:
        entry["exception"] = {
            "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
            "message": str(record.exc_info[1]) if record.exc_info[1] else None,
            "traceback": formatter.formatException(record.exc_info),
        }
    if hasattr(record, "extra_fields"):
        entry.update(record.extra_fields)
    return entry


class StructuredFormatter(logging.Formatter):
    """One JSON object per line."""

    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(_record_to_dict(record, self), ensure_ascii=False, default=str)


class JSONHTTPHandler(logging.handlers.HTTPHandler):
    """Ships records as JSON to an HTTP collector (enabled only when LOG_HTTP_ENDPOINT is set)."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            import http.client

            connection = http.client.HTTPConnection(self.host, timeout=2)
            body = json.dumps(_record_to_dict(record, logging.Formatter()), ensure_ascii=False, default=str)
            connection.request(self.method, self.url, body.encode("utf-8"), {"Content-type": "application/json"})
            connection.getresponse().read()
            connection.close()
        except Exception:
            self.handleError(record)

    def handleError(self, record: logging.LogRecord) -> None:
        # A collector outage must never break or spam the service.
        pass


def get_logging_config() -> Dict[str, Any]:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv("LOG_FORMAT", "json" if APP_ENV == "production" else "text")
    formatter = (
        {"()": "medicus_common.core.logging_config.StructuredFormatter"}
        if log_format == "json"
        else {"format": "%(asctime)s %(levelname)-7s %(name)s: %(message)s", "datefmt": "%Y-%m-%d %H:%M:%S"}
    )

    handlers: Dict[str, Any] = {
        "console": {"class": "logging.StreamHandler", "level": log_level, "formatter": "default", "stream": sys.stdout},
    }
    if os.getenv("LOG_FILE"):
        handlers["file"] = {
            "class": "logging.handlers.RotatingFileHandler", "level": log_level, "formatter": "default",
            "filename": os.environ["LOG_FILE"], "maxBytes": 10 * 1024 * 1024, "backupCount": 5, "encoding": "utf8",
        }
    if os.getenv("LOG_HTTP_ENDPOINT"):
        handlers["http"] = {
            "class": "medicus_common.core.logging_config.JSONHTTPHandler", "level": log_level,
            "host": os.environ["LOG_HTTP_ENDPOINT"], "url": "/", "method": "POST",
        }

    names = list(handlers)
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {"default": formatter},
        "handlers": handlers,
        "loggers": {
            "uvicorn": {"level": "INFO", "handlers": names, "propagate": False},
            "uvicorn.access": {"level": "INFO", "handlers": names, "propagate": False},
        },
        "root": {"level": log_level, "handlers": names},
    }


def setup_logging() -> None:
    if os.getenv("LOG_FILE"):
        os.makedirs(os.path.dirname(os.path.abspath(os.environ["LOG_FILE"])), exist_ok=True)
    logging.config.dictConfig(get_logging_config())
    for noisy in ("urllib3", "requests", "boto3", "botocore", "httpx", "azure"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


class ContextLogger(logging.LoggerAdapter):
    """
    Accepts arbitrary keyword fields, structlog-style:  logger.error("failed", user_id=3, error=str(e)).
    Fields become `extra_fields` (JSON output) and are appended as key=value in text output.
    """

    _STD_KWARGS = {"exc_info", "extra", "stack_info", "stacklevel"}

    def __init__(self, logger: logging.Logger):
        super().__init__(logger, {})

    def process(self, msg, kwargs):
        fields = {k: kwargs.pop(k) for k in list(kwargs) if k not in self._STD_KWARGS}
        if fields:
            extra = dict(kwargs.get("extra") or {})
            extra["extra_fields"] = {**extra.get("extra_fields", {}), **fields}
            kwargs["extra"] = extra
            if os.getenv("LOG_FORMAT", "json" if APP_ENV == "production" else "text") != "json":
                msg = f"{msg} " + " ".join(f"{k}={v}" for k, v in fields.items())
        return msg, kwargs

    def info_with_context(self, msg, **kwargs):
        self.info(msg, **kwargs)

    def warning_with_context(self, msg, **kwargs):
        self.warning(msg, **kwargs)

    def error_with_context(self, msg, **kwargs):
        self.error(msg, **kwargs)

    def debug_with_context(self, msg, **kwargs):
        self.debug(msg, **kwargs)


def get_logger(name: str) -> ContextLogger:
    return ContextLogger(logging.getLogger(name))


def log_audit_event(event_type: str, user_id: str, details: Dict[str, Any] = None) -> None:
    """Security/audit event (login, data access, permission change...)."""
    get_logger("audit").info_with_context(
        f"Audit event: {event_type}",
        event_type=event_type,
        user_id=user_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        details=details or {},
    )


logger = get_logger("medicus")
