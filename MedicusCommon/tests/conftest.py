"""Shared fixtures for the MedicusCommon unit tests.

The tests never touch a database, Redis or an LLM. Required settings get safe dummy values,
and any LLM configuration from the developer's environment is removed so results do not
depend on the machine running them.
"""

import os

import pytest

# Required by medicus_common.core.config.Settings (validated when first loaded).
os.environ.setdefault("POSTGRES_USER", "medicus_test")
os.environ.setdefault("POSTGRES_PASSWORD", "test-password-123")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("JWT_SECRET_KEY", "test-only-jwt-secret-0123456789abcdef")


def _clear_settings_caches() -> None:
    from medicus_common.core.config import get_settings
    from medicus_common.llm.settings import get_llm_settings

    get_settings.cache_clear()
    get_llm_settings.cache_clear()


@pytest.fixture(autouse=True)
def isolated_llm_env(monkeypatch, tmp_path):
    """Start every test with no LLM_*, STT_*, TTS_* or EMBEDDING_* variables set.

    Settings classes also read a `.env` from the working directory: run each test from an
    empty folder so a developer's real .env cannot leak into the results.
    """
    monkeypatch.chdir(tmp_path)
    for name in list(os.environ):
        if name.startswith(("LLM_", "STT_", "TTS_", "EMBEDDING_")) or name == "OPENAI_API_KEY":
            monkeypatch.delenv(name, raising=False)
    _clear_settings_caches()
    yield
    _clear_settings_caches()
