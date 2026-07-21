"""models.dev catalogue loader and normalizer."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import requests

MODELS_DEV_API_URL = "https://models.dev/api.json"
MODELS_DEV_CACHE_TTL = timedelta(minutes=30)

_cache: dict[str, Any] = {
    "timestamp": None,
    "rows": None,
}


def _format_number(value: Any) -> str:
    if value is None:
        return ""
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return str(value)


def _format_cost(value: Any) -> str:
    if value is None:
        return ""
    try:
        return f"${float(value):.2f}"
    except (TypeError, ValueError):
        return str(value)


def _format_modalities(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item]


def _format_bool(value: Any) -> str:
    if value is None:
        return ""
    return "Yes" if bool(value) else "No"


def flatten_models_dev(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the provider keyed models.dev payload into dashboard rows."""
    rows: list[dict[str, Any]] = []

    if not isinstance(payload, dict):
        return rows

    for provider_id, provider in payload.items():
        if not isinstance(provider, dict):
            continue
        models = provider.get("models")
        if not isinstance(models, dict):
            continue

        for model_id, model in models.items():
            if not isinstance(model, dict):
                continue
            if model.get("status") == "alpha":
                continue

            limits = model.get("limit") if isinstance(model.get("limit"), dict) else {}
            cost = model.get("cost") if isinstance(model.get("cost"), dict) else {}
            modalities = model.get("modalities") if isinstance(model.get("modalities"), dict) else {}
            input_modalities = _format_modalities(modalities.get("input"))
            output_modalities = _format_modalities(modalities.get("output"))

            provider_name = provider.get("name") or provider_id
            model_name = model.get("name") or model_id
            search_parts = [
                provider_name,
                provider_id,
                model_name,
                model_id,
                model.get("family"),
                model.get("status"),
                " ".join(input_modalities),
                " ".join(output_modalities),
            ]

            rows.append({
                "id": f"{provider_id}/{model_id}",
                "provider_id": provider_id,
                "provider": provider_name,
                "provider_doc": provider.get("doc") or "",
                "provider_npm": provider.get("npm") or "",
                "provider_api": provider.get("api") or "",
                "model_id": model_id,
                "name": model_name,
                "family": model.get("family") or "",
                "status": model.get("status") or "",
                "release_date": model.get("release_date") or "",
                "last_updated": model.get("last_updated") or "",
                "knowledge": (model.get("knowledge") or "")[:10],
                "context_length": limits.get("context"),
                "input_limit": limits.get("input"),
                "output_limit": limits.get("output"),
                "input_cost": cost.get("input"),
                "output_cost": cost.get("output"),
                "cache_read_cost": cost.get("cache_read"),
                "cache_write_cost": cost.get("cache_write"),
                "reasoning_cost": cost.get("reasoning"),
                "input_audio_cost": cost.get("input_audio"),
                "output_audio_cost": cost.get("output_audio"),
                "attachment": bool(model.get("attachment")),
                "reasoning": bool(model.get("reasoning")),
                "tool_call": bool(model.get("tool_call")),
                "structured_output": model.get("structured_output"),
                "temperature": model.get("temperature"),
                "open_weights": bool(model.get("open_weights")),
                "input_modalities": input_modalities,
                "output_modalities": output_modalities,
                "context_display": _format_number(limits.get("context")),
                "output_limit_display": _format_number(limits.get("output")),
                "input_cost_display": _format_cost(cost.get("input")),
                "output_cost_display": _format_cost(cost.get("output")),
                "cache_read_cost_display": _format_cost(cost.get("cache_read")),
                "cache_write_cost_display": _format_cost(cost.get("cache_write")),
                "reasoning_display": _format_bool(model.get("reasoning")),
                "tool_call_display": _format_bool(model.get("tool_call")),
                "structured_output_display": _format_bool(model.get("structured_output")),
                "temperature_display": _format_bool(model.get("temperature")),
                "open_weights_display": "Open" if model.get("open_weights") else "Closed",
                "source": "models.dev",
                "search_text": " ".join(str(part) for part in search_parts if part).lower(),
            })

    rows.sort(key=lambda row: (row.get("last_updated") or "", row.get("name") or ""), reverse=True)
    return rows


def load_models_dev_catalog(force_refresh: bool = False, timeout: int = 20) -> list[dict[str, Any]]:
    """Fetch and cache normalized models.dev rows."""
    timestamp = _cache.get("timestamp")
    rows = _cache.get("rows")
    if (
        not force_refresh
        and isinstance(timestamp, datetime)
        and isinstance(rows, list)
        and datetime.utcnow() - timestamp < MODELS_DEV_CACHE_TTL
    ):
        return rows

    response = requests.get(MODELS_DEV_API_URL, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    rows = flatten_models_dev(payload)
    _cache["timestamp"] = datetime.utcnow()
    _cache["rows"] = rows
    return rows
