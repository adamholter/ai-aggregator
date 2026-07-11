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


def test_get_model_endpoints_ranks_arbitrary_provider_variants(monkeypatch):
    executor = _executor()
    monkeypatch.setattr(executor, "_load_model_endpoints", lambda model_id, api_key: [
        _endpoint("Provider A", {"p50": 74, "p90": 118}, 1.0),
        _endpoint("Provider B", {"p50": 163, "p90": 207}, 2.0),
    ])

    result = executor.tool_get_model_endpoints(
        {"model_id": "vendor/unseen-model", "percentile": "p50", "sort_by": "throughput"},
        {"api_key": "sk-test"},
    )

    assert result["endpoints"][0]["provider_name"] == "Provider B"
    assert result["endpoints"][0]["throughput_tps"] == 163
    assert result["endpoints"][0]["model_id"] == "vendor/unseen-model"


def test_unbounded_comparison_keeps_candidates_until_explicit_constraints_filter_them(monkeypatch):
    executor = _executor()
    fixtures = {
        "vendor/alpha": [_endpoint("ValueProvider", {"p50": 81}, 1.2)],
        "vendor/beta": [_endpoint("FasterExpensive", {"p50": 177}, 12.0)],
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
    assert [row["model_id"] for row in affordable["endpoints"]] == ["vendor/alpha"]


def test_catalog_discovery_is_generic_paginated_and_reports_coverage(monkeypatch):
    catalog = [
        {"id": "maker/alpha", "name": "Alpha general"},
        {"id": "maker/beta", "name": "Beta general"},
        {"id": "maker/gamma", "name": "Gamma specialist"},
        {"id": "invalid-without-owner", "name": "Ignored"},
    ]
    executor = AgentToolExecutors(
        fetch_categories=lambda *args, **kwargs: {},
        load_openrouter_models=lambda *args, **kwargs: catalog,
        load_monitor_feed=lambda *args, **kwargs: [],
        fetch_hype_feed_payload=lambda *args, **kwargs: {},
        fetch_blog_posts=lambda *args, **kwargs: {},
        fetch_testing_catalog_feed=lambda *args, **kwargs: {},
        load_category_items_simple=lambda *args, **kwargs: [],
        openrouter_base_url="https://openrouter.ai/api/v1",
    )
    monkeypatch.setattr(executor, "_load_model_endpoints", lambda model_id, api_key: [
        _endpoint(f"provider-for-{model_id}", {"p50": len(model_id) * 10}, 1.5)
    ])

    first = executor.tool_search_fast_model_endpoints(
        {"query": "general", "max_models": 1, "offset": 0}, {"api_key": "sk-test"}
    )
    second = executor.tool_search_fast_model_endpoints(
        {"query": "general", "max_models": 1, "offset": first["coverage"]["next_offset"]},
        {"api_key": "sk-test"},
    )

    assert first["coverage"] == {
        "mode": "catalog", "query": "general", "catalog_matches": 2,
        "evaluated_models": 1, "offset": 0, "next_offset": 1,
    }
    assert second["coverage"]["next_offset"] is None
    assert {first["endpoints"][0]["model_id"], second["endpoints"][0]["model_id"]} == {
        "maker/alpha", "maker/beta"
    }


def test_missing_metrics_remain_unknown_and_do_not_pass_numeric_filters(monkeypatch):
    executor = _executor()
    incomplete = _endpoint("UnknownMetrics", {}, 1.0)
    incomplete["throughput_last_30m"] = {"p90": 140}
    monkeypatch.setattr(executor, "_load_model_endpoints", lambda model_id, api_key: [incomplete])

    unfiltered = executor.tool_search_fast_model_endpoints(
        {"model_ids": ["vendor/model"], "percentile": "p50"}, {"api_key": "sk-test"}
    )
    filtered = executor.tool_search_fast_model_endpoints(
        {"model_ids": ["vendor/model"], "percentile": "p50", "min_tps": 1}, {"api_key": "sk-test"}
    )

    assert unfiltered["endpoints"][0]["throughput_tps"] is None
    assert filtered["endpoints"] == []
