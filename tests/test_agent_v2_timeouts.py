from backend.app.agent.core import _openrouter_chat_completion
from backend.app.agent.tool_executors import (
    AgentToolExecutors,
    OPENROUTER_CONNECT_TIMEOUT_SECONDS as TOOL_CONNECT_TIMEOUT_SECONDS,
    OPENROUTER_READ_TIMEOUT_SECONDS as TOOL_READ_TIMEOUT_SECONDS,
)
import backend.app.agent.core as agent_core
import backend.app.agent.tool_executors as tool_executors


def test_openrouter_chat_completion_uses_long_read_timeout(monkeypatch):
    captured = {}

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "ok"}}]}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr(agent_core.requests, "post", fake_post)

    payload = _openrouter_chat_completion(
        api_key="sk-test",
        model="anthropic/claude-sonnet-4",
        messages=[{"role": "user", "content": "hello"}],
        tools=[],
        temperature=0.2,
    )

    assert payload["choices"][0]["message"]["content"] == "ok"
    assert captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["timeout"] == (
        agent_core.OPENROUTER_CONNECT_TIMEOUT_SECONDS,
        agent_core.OPENROUTER_READ_TIMEOUT_SECONDS,
    )


def test_web_search_uses_long_read_timeout(monkeypatch):
    captured = {}

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "search result"}}]}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr(tool_executors.requests, "post", fake_post)

    executor = AgentToolExecutors(
        fetch_categories=lambda *args, **kwargs: {},
        load_openrouter_models=lambda *args, **kwargs: [],
        load_monitor_feed=lambda *args, **kwargs: [],
        fetch_hype_feed_payload=lambda *args, **kwargs: {},
        fetch_blog_posts=lambda *args, **kwargs: {},
        fetch_testing_catalog_feed=lambda *args, **kwargs: {},
        load_category_items_simple=lambda *args, **kwargs: [],
        openrouter_base_url="https://openrouter.ai/api/v1",
    )

    result = executor.tool_web_search(
        {"query": "latest AI trends"},
        {"api_key": "sk-test", "web_search_model": "perplexity/sonar-pro"},
    )

    assert result["answer"] == "search result"
    assert captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["timeout"] == (
        TOOL_CONNECT_TIMEOUT_SECONDS,
        TOOL_READ_TIMEOUT_SECONDS,
    )
