"""Model selection and provider resolution (medicus_common.llm.settings)."""

import pytest

from medicus_common.llm.settings import ROLES, LLMSettings


def settings(**env) -> LLMSettings:
    return LLMSettings(_env_file=None, **env)


def test_single_model_serves_every_role():
    s = settings(LLM_PROVIDER="openai_compatible", LLM_MODEL="qwen3.5:9b")
    assert {s.model_for(role) for role in ROLES} == {"qwen3.5:9b"}


def test_role_specific_model_overrides_the_default():
    s = settings(LLM_PROVIDER="openai_compatible", LLM_MODEL="qwen3.5:9b", LLM_MODEL_VOICE="lfm3-omni")
    assert s.model_for("voice") == "lfm3-omni"
    assert s.model_for("tools") == "qwen3.5:9b"


def test_unknown_role_is_rejected():
    with pytest.raises(ValueError, match="Unknown model role"):
        settings(LLM_MODEL="m").model_for("painting")


def test_missing_model_for_self_hosted_provider_explains_the_fix():
    with pytest.raises(ValueError, match="LLM_MODEL"):
        settings(LLM_PROVIDER="openai_compatible").model_for("tools")


def test_llm_api_key_takes_precedence_over_openai_api_key():
    assert settings(LLM_API_KEY="a", OPENAI_API_KEY="b").resolved_api_key == "a"
    assert settings(OPENAI_API_KEY="b").resolved_api_key == "b"


@pytest.mark.parametrize("env, expected", [
    ({"STT_PROVIDER": "none"}, "none"),
    ({"LLM_PROVIDER": "openai_compatible", "STT_BASE_URL": "http://ollama:11434/v1"}, "openai_compatible"),
    ({"LLM_PROVIDER": "openai"}, "openai"),
    ({"LLM_PROVIDER": "openai_compatible"}, "none"),   # no speech server configured
])
def test_speech_to_text_provider_resolution(env, expected):
    assert settings(**env).resolved_stt_provider == expected


def test_text_to_speech_follows_its_own_base_url():
    s = settings(LLM_PROVIDER="openai_compatible", TTS_BASE_URL="http://ollama:11434/v1")
    assert s.resolved_tts_provider == "openai_compatible"


def test_reasoning_effort_accepts_only_known_values():
    assert settings(LLM_REASONING_EFFORT="none").reasoning_effort == "none"
    with pytest.raises(Exception):
        settings(LLM_REASONING_EFFORT="maximum")
