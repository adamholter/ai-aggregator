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
