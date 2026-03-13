from __future__ import annotations

import json
import os
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List

import requests

from .model_identity import build_umi

OPENROUTER_CONNECT_TIMEOUT_SECONDS = 15
OPENROUTER_READ_TIMEOUT_SECONDS = 3600


class AgentToolExecutors:
    def __init__(
        self,
        fetch_categories: Callable[..., Dict[str, Any]],
        load_openrouter_models: Callable[..., List[Dict[str, Any]]],
        load_monitor_feed: Callable[..., List[Dict[str, Any]]],
        fetch_hype_feed_payload: Callable[..., Dict[str, Any]],
        fetch_blog_posts: Callable[..., Dict[str, Any]],
        fetch_testing_catalog_feed: Callable[..., Dict[str, Any]],
        load_category_items_simple: Callable[..., List[Dict[str, Any]]],
        openrouter_base_url: str,
    ):
        self.fetch_categories = fetch_categories
        self.load_openrouter_models = load_openrouter_models
        self.load_monitor_feed = load_monitor_feed
        self.fetch_hype_feed_payload = fetch_hype_feed_payload
        self.fetch_blog_posts = fetch_blog_posts
        self.fetch_testing_catalog_feed = fetch_testing_catalog_feed
        self.load_category_items_simple = load_category_items_simple
        self.openrouter_base_url = openrouter_base_url.rstrip("/")

    def execute(self, tool_name: str, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        try:
            fn = getattr(self, f"tool_{tool_name}", None)
            if not fn:
                raise RuntimeError(f"Unknown tool: {tool_name}")
            return {
                "ok": True,
                "tool": tool_name,
                "result": fn(args or {}, settings or {}),
            }
        except Exception as exc:
            return {
                "ok": False,
                "tool": tool_name,
                "error": {
                    "message": str(exc),
                    "stack": traceback.format_exc(),
                    "args": args or {},
                },
            }

    def _search_in_items(self, items: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        q = (query or "").lower().strip()
        if not q:
            return items
        out = []
        for item in items or []:
            haystack = " ".join(
                [
                    str(item.get("name", "")),
                    str(item.get("title", "")),
                    str(item.get("id", "")),
                    str(item.get("description", "")),
                    str(item.get("shortDescription", "")),
                    str(item.get("vendor", "")),
                    str(item.get("owner", "")),
                    str(item.get("source", "")),
                ]
            ).lower()
            if q in haystack:
                out.append(item)
        return out

    def tool_search_models(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        query = args.get("query", "")
        sources = args.get("sources") or ["artificial_analysis", "openrouter", "replicate", "fal"]
        source_map = {
            "artificial_analysis": "llms",
            "openrouter": "openrouter",
            "replicate": "replicate",
            "fal": "fal",
        }
        normalized_categories = [source_map[s] for s in sources if s in source_map]
        payload = self.fetch_categories(normalized_categories, limit_per_category=120, options={"cache_bust": False})
        datasets = payload.get("datasets") or {}
        matches = []
        for cat, items in datasets.items():
            for item in self._search_in_items(items if isinstance(items, list) else [], query)[:100]:
                matches.append(
                    {
                        "source": cat,
                        "id": item.get("id") or item.get("slug") or item.get("name"),
                        "name": item.get("name") or item.get("title") or item.get("id"),
                        "provider": item.get("vendor") or item.get("owner") or (item.get("model_creator") or {}).get("name"),
                        "preview": item.get("description") or item.get("shortDescription") or "",
                    }
                )
        return {"count": len(matches), "items": matches[:100]}

    def tool_get_model_details(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        model_id = str(args.get("model_id") or "").strip()
        source = args.get("source")
        if not model_id or not source:
            raise ValueError("model_id and source are required")

        source_to_cat = {
            "artificial_analysis": "llms",
            "openrouter": "openrouter",
            "replicate": "replicate",
            "fal": "fal",
        }
        cat = source_to_cat.get(source)
        if not cat:
            raise ValueError(f"Unsupported source '{source}'")

        if cat == "openrouter":
            items = self.load_openrouter_models(force_refresh=False)
        else:
            items = self.load_category_items_simple(cat, force_refresh=False)

        needle = model_id.lower()
        for item in items or []:
            candidate_ids = [
                str(item.get("id", "")).lower(),
                str(item.get("slug", "")).lower(),
                str(item.get("name", "")).lower(),
                str(item.get("title", "")).lower(),
            ]
            if needle in candidate_ids or needle == str(item.get("id", "")).lower() or needle in " ".join(candidate_ids):
                return item
        return {"message": "Model not found", "model_id": model_id, "source": source}

    def tool_get_llm_leaderboard(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        sort_by = (args.get("sort_by") or "intelligence").strip().lower()
        limit = int(args.get("limit") or 20)
        items = self.load_category_items_simple("llms", force_refresh=False)

        def metric(item: Dict[str, Any]) -> float:
            evals = item.get("evaluations") or {}
            pricing = item.get("pricing") or {}
            if sort_by == "coding":
                return float(evals.get("artificial_analysis_coding_index") or -1)
            if sort_by == "math":
                return float(evals.get("artificial_analysis_math_index") or -1)
            if sort_by == "speed":
                return float(item.get("median_output_tokens_per_second") or -1)
            if sort_by == "price":
                inp = pricing.get("price_1m_input_tokens")
                out = pricing.get("price_1m_output_tokens")
                if inp is None and out is None:
                    return 1e18
                vals = [x for x in [inp, out] if isinstance(x, (int, float))]
                return float(sum(vals) / max(len(vals), 1)) if vals else 1e18
            return float(evals.get("artificial_analysis_intelligence_index") or -1)

        reverse = sort_by != "price"
        sorted_items = sorted(items or [], key=metric, reverse=reverse)
        rows = []
        for item in sorted_items[: max(1, min(limit, 100))]:
            evals = item.get("evaluations") or {}
            pricing = item.get("pricing") or {}
            rows.append(
                {
                    "name": item.get("name"),
                    "provider": (item.get("model_creator") or {}).get("name"),
                    "intelligence_index": evals.get("artificial_analysis_intelligence_index"),
                    "coding_index": evals.get("artificial_analysis_coding_index"),
                    "math_index": evals.get("artificial_analysis_math_index"),
                    "output_speed": item.get("median_output_tokens_per_second"),
                    "ttft": item.get("median_time_to_first_token"),
                    "input_price_1m": pricing.get("price_1m_input_tokens"),
                    "output_price_1m": pricing.get("price_1m_output_tokens"),
                }
            )
        return {"sort_by": sort_by, "count": len(rows), "items": rows}

    def tool_get_media_models(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        category = (args.get("category") or "").strip()
        if category not in {"text-to-image", "image-editing", "text-to-speech", "text-to-video", "image-to-video"}:
            raise ValueError("Invalid category")
        items = self.load_category_items_simple(category, force_refresh=False)
        return {"category": category, "count": len(items or []), "items": (items or [])[:100]}

    def tool_get_openrouter_models(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        query = args.get("query") or ""
        limit = int(args.get("max_results") or 20)
        items = self.load_openrouter_models(force_refresh=False)
        matched = self._search_in_items(items, query)
        return {"count": len(matched), "items": matched[: max(1, min(limit, 200))]}

    def tool_get_monitor_news(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        keyword = (args.get("keyword") or "").strip().lower()
        limit = int(args.get("limit") or 20)
        days_back = int(args.get("days_back") or 7)
        cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, days_back))
        items = self.load_monitor_feed(force_refresh=False, limit=250, sanitize=True)

        out = []
        for item in items or []:
            if keyword:
                hay = f"{item.get('title','')} {item.get('excerpt','')}".lower()
                if keyword not in hay:
                    continue
            ts = item.get("timestamp")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if dt < cutoff:
                        continue
                except Exception:
                    pass
            out.append(item)
        return {"count": len(out), "items": out[: max(1, min(limit, 200))]}

    def tool_get_hype_data(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        source = (args.get("source") or "").strip().lower()
        limit = int(args.get("limit") or 20)
        payload = self.fetch_hype_feed_payload(limit=max(limit * 3, 40), window_days=14)
        items = payload.get("items") or []
        if source:
            items = [i for i in items if str(i.get("source", "")).lower() == source]
        return {"count": len(items), "items": items[: max(1, min(limit, 200))]}

    def tool_get_blog_posts(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        search = (args.get("search") or "").strip().lower()
        limit = int(args.get("limit") or 10)
        payload = self.fetch_blog_posts(force_refresh=False)
        posts = payload.get("posts") or []
        if search:
            posts = [p for p in posts if search in f"{p.get('title','')} {p.get('excerpt','')}".lower()]
        return {"count": len(posts), "items": posts[: max(1, min(limit, 200))]}

    def tool_get_testing_catalog(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        query = (args.get("query") or "").strip().lower()
        limit = int(args.get("limit") or 10)
        payload = self.fetch_testing_catalog_feed(force_refresh=False)
        items = payload.get("items") or []
        if query:
            items = [p for p in items if query in f"{p.get('title','')} {p.get('summary','')}".lower()]
        return {"count": len(items), "items": items[: max(1, min(limit, 200))]}

    def _skills_root(self) -> Path:
        return Path(os.getcwd()) / "skills"

    def tool_read_skill(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        skill_name = str(args.get("skill_name") or "").strip()
        if not skill_name:
            raise ValueError("skill_name is required")
        root = self._skills_root()
        skill_dir = (root / skill_name).resolve()
        if not str(skill_dir).startswith(str(root.resolve())):
            raise ValueError("Invalid skill path")
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            raise FileNotFoundError(f"Skill not found: {skill_name}")

        text = skill_md.read_text(encoding="utf-8")
        body = text
        if text.startswith("---"):
            parts = text.split("---", 2)
            if len(parts) >= 3:
                body = parts[2].strip()

        bundled = []
        for child in skill_dir.rglob("*"):
            if child.is_file() and child.name != "SKILL.md":
                bundled.append(str(child.relative_to(skill_dir)))

        return {"skill_name": skill_name, "body": body, "bundled_files": sorted(bundled)}

    def tool_create_model_identity(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        model_name = str(args.get("model_name") or "").strip()
        if not model_name:
            raise ValueError("model_name is required")

        combined = []
        aa = self.load_category_items_simple("llms", force_refresh=False)
        for item in aa or []:
            e = dict(item)
            e["source"] = "artificial_analysis"
            combined.append(e)

        for item in self.load_openrouter_models(force_refresh=False) or []:
            e = dict(item)
            e["source"] = "openrouter"
            combined.append(e)

        for item in self.load_category_items_simple("replicate", force_refresh=False) or []:
            e = dict(item)
            e["source"] = "replicate"
            combined.append(e)

        for item in self.load_category_items_simple("fal", force_refresh=False) or []:
            e = dict(item)
            e["source"] = "fal"
            combined.append(e)

        umi = build_umi(model_name, combined)
        return umi

    def tool_web_search(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        query = str(args.get("query") or "").strip()
        if not query:
            raise ValueError("query is required")
        api_key = (settings.get("api_key") or "").strip()
        if not api_key:
            raise RuntimeError("OpenRouter API key is required for web_search")

        model = (settings.get("web_search_model") or "perplexity/sonar-pro").strip()
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": query}],
            "temperature": 0.1,
        }

        response = requests.post(
            f"{self.openrouter_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=(OPENROUTER_CONNECT_TIMEOUT_SECONDS, OPENROUTER_READ_TIMEOUT_SECONDS),
        )
        response.raise_for_status()
        data = response.json()
        text = (((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
        return {"model": model, "query": query, "answer": text}

    def tool_send_final_response(self, args: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        response = str(args.get("response") or "").strip()
        if not response:
            raise ValueError("response is required")
        return {"response": response}


def list_skill_frontmatter(skills_root: str | os.PathLike) -> List[Dict[str, str]]:
    root = Path(skills_root)
    if not root.exists():
        return []

    out = []
    for skill_md in root.glob("*/SKILL.md"):
        text = skill_md.read_text(encoding="utf-8")
        name = skill_md.parent.name
        description = ""
        if text.startswith("---"):
            parts = text.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1]
                for line in frontmatter.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("name:"):
                        name = stripped.split(":", 1)[1].strip().strip('"')
                    elif stripped.startswith("description:"):
                        description = stripped.split(":", 1)[1].strip().strip('"')
        out.append({"name": name, "description": description})

    out.sort(key=lambda x: x.get("name") or "")
    return out
