from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Dict, List


def _normalize_name(value: str) -> str:
    text = (value or "").lower().strip()
    text = re.sub(r"\([^)]*\)", "", text)
    text = text.replace("/", " ")
    text = re.sub(r"[^a-z0-9.\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _score(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize_name(a), _normalize_name(b)).ratio()


def build_umi(model_name: str, candidates: List[Dict[str, Any]], llm_summary: Dict[str, Any] | None = None) -> Dict[str, Any]:
    norm_target = _normalize_name(model_name)
    matched = []
    for item in candidates:
        name = item.get("name") or item.get("title") or item.get("id") or ""
        if not name:
            continue
        similarity = _score(model_name, name)
        if norm_target in _normalize_name(name) or similarity >= 0.62:
            enriched = dict(item)
            enriched["_similarity"] = round(similarity, 3)
            matched.append(enriched)

    matched.sort(key=lambda x: x.get("_similarity", 0), reverse=True)

    canonical_name = model_name
    provider = "Unknown"
    pricing = {}
    benchmarks = {}
    links: Dict[str, str] = {}

    for item in matched:
        if not provider or provider == "Unknown":
            provider = item.get("provider") or item.get("vendor") or item.get("owner") or provider
        if not pricing:
            p = item.get("pricing")
            if isinstance(p, dict):
                pricing = p
        evals = item.get("evaluations") or {}
        if isinstance(evals, dict):
            if evals.get("artificial_analysis_intelligence_index") is not None:
                benchmarks["intelligence_index"] = evals.get("artificial_analysis_intelligence_index")
            if evals.get("artificial_analysis_coding_index") is not None:
                benchmarks["coding_index"] = evals.get("artificial_analysis_coding_index")
        if item.get("display_url"):
            links["openrouter"] = item.get("display_url")
        if item.get("url") and "announcement" not in links:
            links["announcement"] = item.get("url")

    summary = ""
    if llm_summary and isinstance(llm_summary, dict):
        canonical_name = llm_summary.get("canonical_name") or canonical_name
        provider = llm_summary.get("provider") or provider
        summary = llm_summary.get("summary") or ""

    variants = []
    for item in matched[:20]:
        variants.append(
            {
                "source": item.get("source") or item.get("_source") or "unknown",
                "id": item.get("id") or item.get("slug") or item.get("name"),
                "name": item.get("name") or item.get("title") or item.get("id"),
                "metrics": {
                    "intelligence_index": (item.get("evaluations") or {}).get("artificial_analysis_intelligence_index"),
                    "coding_index": (item.get("evaluations") or {}).get("artificial_analysis_coding_index"),
                    "output_speed": item.get("median_output_tokens_per_second"),
                },
                "pricing": item.get("pricing") if isinstance(item.get("pricing"), dict) else None,
            }
        )

    return {
        "canonical_name": canonical_name,
        "provider": provider,
        "variants": variants,
        "summary": summary or f"Unified identity generated from {len(variants)} matched records.",
        "links": links,
        "pricing": pricing,
        "benchmarks": benchmarks,
    }
