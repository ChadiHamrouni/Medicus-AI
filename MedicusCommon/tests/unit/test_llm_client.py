"""Agent model construction and request settings (medicus_common.llm.client)."""

from types import SimpleNamespace

import pytest

from medicus_common.llm import client


def fn_call(name):
    return SimpleNamespace(type="function_call", name=name)


def tools(*names):
    return [SimpleNamespace(name=n) for n in names]


# --- tool-name repair ------------------------------------------------------------------

@pytest.mark.parametrize("sent", [
    "mediclinic.report_medical_vitals",     # made-up namespace
    "functions.report_medical_vitals",
    "functions:report_medical_vitals",
    "tools/report_medical_vitals",
])
def test_namespaced_tool_call_is_mapped_to_the_real_tool(sent):
    response = SimpleNamespace(output=[fn_call(sent)])
    client._repair_tool_names(response, tools("report_medical_vitals", "get_medications"))
    assert response.output[0].name == "report_medical_vitals"


def test_known_tool_names_are_left_untouched():
    response = SimpleNamespace(output=[fn_call("get_medications")])
    client._repair_tool_names(response, tools("get_medications"))
    assert response.output[0].name == "get_medications"


def test_unknown_tool_is_not_guessed():
    # No real tool matches the last segment: leave it for the SDK to report.
    response = SimpleNamespace(output=[fn_call("mediclinic.delete_everything")])
    client._repair_tool_names(response, tools("get_medications"))
    assert response.output[0].name == "mediclinic.delete_everything"


def test_non_tool_output_items_are_ignored():
    message = SimpleNamespace(type="message", name="mediclinic.get_medications")
    response = SimpleNamespace(output=[message])
    client._repair_tool_names(response, tools("get_medications"))
    assert message.name == "mediclinic.get_medications"


def test_self_hosted_models_get_tool_name_repair(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setenv("LLM_MODEL", "qwen3.5:9b")
    from agents import OpenAIChatCompletionsModel

    model = client.get_agent_model("tools")
    assert isinstance(model, OpenAIChatCompletionsModel)
    assert type(model).get_response is not OpenAIChatCompletionsModel.get_response


# --- model settings ---------------------------------------------------------------------

def test_reasoning_effort_is_sent_to_self_hosted_models(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_MODEL", "qwen3.5:9b")
    monkeypatch.setenv("LLM_REASONING_EFFORT", "none")
    s = client.get_model_settings("tools", temperature=0.2)
    assert s.extra_args == {"reasoning_effort": "none"}
    assert s.temperature == 0.2


def test_no_extra_arguments_without_reasoning_effort(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_MODEL", "qwen3.5:9b")
    assert not client.get_model_settings("tools").extra_args


def test_openai_reasoning_models_get_reasoning_instead_of_temperature(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_MODEL", "gpt-5-mini")
    s = client.get_model_settings("tools", temperature=0.2)
    assert s.reasoning is not None
    assert s.temperature is None


def test_tool_settings_follow_configuration(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_MODEL", "qwen3.5:9b")
    monkeypatch.setenv("LLM_FORCE_TOOL_USE", "true")
    monkeypatch.setenv("LLM_PARALLEL_TOOL_CALLS", "false")
    s = client.get_model_settings("tools", tools=True)
    assert s.tool_choice == "required"
    assert s.parallel_tool_calls is False
