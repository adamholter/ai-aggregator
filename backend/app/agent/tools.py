from __future__ import annotations

from typing import Dict, List


def _fn(name: str, description: str, properties: Dict, required: List[str] | None = None) -> Dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required or []
            }
        }
    }


def get_tool_definitions(mode: str = "quick") -> List[Dict]:
    tools = [
        _fn(
            "search_models",
            "Search across loaded data sources for models by name or keyword.",
            {
                "query": {"type": "string", "description": "Model name or keyword to search."},
                "sources": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional source filter list. Example: ['openrouter','artificial_analysis','replicate','fal']"
                }
            },
            ["query"],
        ),
        _fn(
            "get_model_details",
            "Get full details for a model from a specific source.",
            {
                "model_id": {"type": "string", "description": "Model id/name from selected source."},
                "source": {
                    "type": "string",
                    "enum": ["artificial_analysis", "openrouter", "replicate", "fal"],
                    "description": "Data source"
                }
            },
            ["model_id", "source"],
        ),
        _fn(
            "get_llm_leaderboard",
            "Return LLM leaderboard data from Artificial Analysis.",
            {
                "sort_by": {
                    "type": "string",
                    "enum": ["intelligence", "coding", "math", "speed", "price"],
                    "description": "Sort metric"
                },
                "limit": {"type": "number", "description": "Max rows (default 20)"}
            }
        ),
        _fn(
            "get_media_models",
            "Return media models by category from Artificial Analysis.",
            {
                "category": {
                    "type": "string",
                    "enum": ["text-to-image", "image-editing", "text-to-speech", "text-to-video", "image-to-video"]
                }
            },
            ["category"],
        ),
        _fn(
            "get_openrouter_models",
            "Query OpenRouter model catalog.",
            {
                "query": {"type": "string"},
                "max_results": {"type": "number", "description": "Max rows (default 20)"}
            }
        ),
        _fn(
            "get_model_endpoints",
            "Get every OpenRouter provider endpoint for one model, including provider-specific rolling throughput, latency, uptime, quantization, and prices. Use this whenever speed or routing varies by provider.",
            {
                "model_id": {"type": "string", "description": "Exact OpenRouter model id from the catalog."},
                "sort_by": {"type": "string", "enum": ["throughput", "price", "latency", "uptime"], "description": "How to order providers (default throughput)."},
                "percentile": {"type": "string", "enum": ["p50", "p75", "p90", "p99"], "description": "Metric percentile (default p50)."}
            },
            ["model_id"],
        ),
        _fn(
            "search_fast_model_endpoints",
            "Discover and compare provider-specific OpenRouter endpoints. Supply model_ids for a known set, or omit them to evaluate the catalog. Unquantified multi-objective requests should use the Pareto frontier rather than an invented cutoff. The result reports exact discovery coverage.",
            {
                "model_ids": {"type": "array", "items": {"type": "string"}, "description": "Optional exact model ids. Omit for catalog discovery."},
                "query": {"type": "string", "description": "Optional catalog search applied before endpoint evaluation."},
                "offset": {"type": "number", "description": "Catalog offset for explicit pagination (default 0)."},
                "max_models": {"type": "number", "description": "Optional safety cap. Omit to evaluate every matching catalog model; maximum 500."},
                "percentile": {"type": "string", "enum": ["p50", "p75", "p90", "p99"], "description": "Throughput percentile (default p50)."},
                "sort_by": {"type": "string", "enum": ["pareto", "throughput", "input_price", "output_price"], "description": "Ranking method. Pareto is the default for unquantified price/speed tradeoffs."},
                "limit": {"type": "number", "description": "Maximum endpoint rows (default 25)."}
            },
            [],
        ),
        _fn(
            "get_monitor_news",
            "Fetch entries from the Monitor Google Sheet.",
            {
                "keyword": {"type": "string"},
                "limit": {"type": "number", "description": "Max rows (default 20)"},
                "days_back": {"type": "number", "description": "Only include last N days (default 7)."}
            }
        ),
        _fn(
            "get_hype_data",
            "Return trending items from Hype source.",
            {
                "source": {"type": "string", "enum": ["github", "huggingface", "reddit", "replicate"]},
                "limit": {"type": "number", "description": "Max rows (default 20)"}
            }
        ),
        _fn(
            "get_blog_posts",
            "Fetch blog posts from adam.holter.com.",
            {
                "search": {"type": "string"},
                "limit": {"type": "number", "description": "Max rows (default 10)"}
            }
        ),
        _fn(
            "get_testing_catalog",
            "Return testing catalog articles.",
            {
                "query": {"type": "string"},
                "limit": {"type": "number", "description": "Max rows (default 10)"}
            }
        ),
        _fn(
            "read_skill",
            "Read local SKILL.md body and list bundled files.",
            {"skill_name": {"type": "string", "description": "Skill folder name under skills/."}},
            ["skill_name"],
        ),
        _fn(
            "create_model_identity",
            "Build a Universal Model Identity by combining matches across sources.",
            {"model_name": {"type": "string", "description": "Model name to unify."}},
            ["model_name"],
        ),
        _fn(
            "web_search",
            "Get web-grounded results using the configured web-search model.",
            {"query": {"type": "string", "description": "Search query"}},
            ["query"],
        ),
        _fn(
            "create_artifact",
            "Display a self-contained artifact in a side panel. Use sparingly — only when the user explicitly asks for an artifact, OR when the output is clearly a full standalone document (e.g. a complete HTML app, an SVG diagram, a multi-section report). Charts and code belong inline in the response by default — do NOT use this for charts unless the user specifically asked for a chart artifact or a standalone chart to export. Do NOT use this to execute code or fetch data (use run_python for that).",
            {
                "type": {
                    "type": "string",
                    "enum": ["html", "markdown", "svg", "code", "chart"],
                    "description": "html=rendered iframe (supports Tailwind CDN and other CDN imports), markdown=rich rendered document, svg=vector graphic, code=syntax-highlighted snippet (only when user asked to see the code), chart=Chart.js config (only when user asked for a standalone exportable chart)"
                },
                "title": {"type": "string", "description": "Short descriptive title shown in the panel header."},
                "content": {"type": "string", "description": "Full artifact content. html: complete HTML doc. chart: JSON config with type/labels/datasets. code: raw code."},
                "language": {"type": "string", "description": "Language hint for code artifacts (e.g. python, javascript, sql). Optional."},
            },
            ["type", "title", "content"],
        ),
    ]

    if (mode or "quick").lower() == "heavy":
        tools.append(
            _fn(
                "send_final_response",
                "Call this when agent work is complete and you are ready to answer the user.",
                {"response": {"type": "string", "description": "Final markdown response for user."}},
                ["response"],
            )
        )

    return tools
