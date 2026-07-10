from backend.app.agent.tool_executors import AgentToolExecutors


def _executor():
    return AgentToolExecutors(
        fetch_categories=lambda *args, **kwargs: {},
        load_openrouter_models=lambda *args, **kwargs: [],
        load_monitor_feed=lambda *args, **kwargs: [],
        fetch_hype_feed_payload=lambda *args, **kwargs: {},
        fetch_blog_posts=lambda *args, **kwargs: {},
        fetch_testing_catalog_feed=lambda *args, **kwargs: {},
        load_category_items_simple=lambda *args, **kwargs: [],
        openrouter_base_url="https://openrouter.ai/api/v1",
    )


def _endpoint(provider, throughput, output_price, latency=500):
    return {
        "provider_name": provider,
        "name": f"{provider} endpoint",
        "tag": provider.lower(),
        "pricing": {"prompt": "0.0000005", "completion": str(output_price / 1_000_000)},
        "throughput_last_30m": throughput,
        "latency_last_30m": {"p50": latency},
        "uptime_last_30m": 99.9,
    }


def test_get_model_endpoints_ranks_provider_specific_throughput(monkeypatch):
    executor = _executor()
    monkeypatch.setattr(executor, "_load_model_endpoints", lambda model_id, api_key: [
        _endpoint("DefaultSlow", {"p50": 50, "p90": 80}, 1.0),
        _endpoint("FastProvider", {"p50": 300, "p90": 340}, 2.0),
    ])

    result = executor.tool_get_model_endpoints(
        {"model_id": "z-ai/glm-5.2", "percentile": "p50", "sort_by": "throughput"},
        {"api_key": "sk-test"},
    )

    assert result["endpoints"][0]["provider_name"] == "FastProvider"
    assert result["endpoints"][0]["throughput_tps"] == 300
    assert result["endpoints"][0]["model_id"] == "z-ai/glm-5.2"


def test_search_fast_endpoints_does_not_invent_200_tps_threshold(monkeypatch):
    executor = _executor()
    fixtures = {
        "z-ai/glm-5.2": [_endpoint("ValueProvider", {"p50": 95}, 1.2)],
        "other/model": [_endpoint("FasterExpensive", {"p50": 210}, 12.0)],
    }
    monkeypatch.setattr(executor, "_load_model_endpoints", lambda model_id, api_key: fixtures[model_id])

    unbounded = executor.tool_search_fast_model_endpoints(
        {"model_ids": list(fixtures), "percentile": "p50"}, {"api_key": "sk-test"}
    )
    assert {row["model_id"] for row in unbounded["endpoints"]} == set(fixtures)

    affordable = executor.tool_search_fast_model_endpoints(
        {"model_ids": list(fixtures), "percentile": "p50", "max_output_price_1m": 2},
        {"api_key": "sk-test"},
    )
    assert [row["model_id"] for row in affordable["endpoints"]] == ["z-ai/glm-5.2"]

