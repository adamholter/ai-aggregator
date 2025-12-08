"""
Experimental Agent v2 - Direct OpenRouter tool calling.

Simpler, more reliable approach using OpenRouter's native tool calling.
No Pydantic AI - direct control over the agent loop.
"""
import json
import httpx
from typing import Any, Callable
from dataclasses import dataclass, field


@dataclass
class ToolCall:
    """A tool call made by the agent."""
    tool: str
    args: dict
    result: str = ""
    status: str = "pending"  # pending, running, done, error


@dataclass 
class AgentRun:
    """Tracks a single agent run with all tool calls and events."""
    question: str
    model: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    response: str = ""
    error: str = ""


# Tool definitions for OpenRouter
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "fetch_latest_feed",
            "description": "Fetch the latest AI news and updates from multiple sources",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search terms to filter results (e.g., 'Gemini', 'GPT', 'image generation')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of items to return",
                        "default": 20
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_openrouter_models",
            "description": "Search OpenRouter's catalog of AI models",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search terms (e.g., 'vision', 'Claude', 'cheap', 'fast')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of models to return",
                        "default": 20
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_image_models",
            "description": "Get image generation models from text-to-image benchmarks",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of models to return",
                        "default": 15
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_llm_benchmarks",
            "description": "Get LLM benchmark data with quality scores and performance metrics",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of models to return",
                        "default": 15
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_hype_feed",
            "description": "Get trending AI repositories and releases from GitHub, HuggingFace, Reddit",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search terms to filter"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum items to return",
                        "default": 20
                    }
                },
                "required": []
            }
        }
    }
]


SYSTEM_PROMPT = """You are a helpful AI assistant that answers questions about AI models and news.
You have access to tools to fetch data from various sources. USE THE TOOLS to gather information before answering.
Keep responses scannable with bullet points when appropriate.
Always cite sources and include links when available."""


async def execute_tool(tool_name: str, args: dict, base_url: str) -> str:
    """Execute a tool and return the result as markdown."""
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if tool_name == "fetch_latest_feed":
                params = {"tabs": "latest", "limit": args.get("limit", 20), "include_hype": "true"}
                response = await client.get(f"{base_url}/api/fetch", params=params)
                response.raise_for_status()
                data = response.json()
                items = _extract_items(data)
                filtered = _filter_items(items, args.get("query", ""))
                return _items_to_markdown(filtered[:args.get("limit", 20)], "Latest Feed")
            
            elif tool_name == "search_openrouter_models":
                params = {"tabs": "openrouter", "limit": args.get("limit", 20), "recency": "week"}
                response = await client.get(f"{base_url}/api/fetch", params=params)
                response.raise_for_status()
                data = response.json()
                items = _extract_items(data)
                filtered = _filter_items(items, args.get("query", ""))
                return _items_to_markdown(filtered[:args.get("limit", 20)], "OpenRouter Models")
            
            elif tool_name == "fetch_image_models":
                params = {"tabs": "text-to-image", "limit": args.get("limit", 15)}
                response = await client.get(f"{base_url}/api/fetch", params=params)
                response.raise_for_status()
                data = response.json()
                items = _extract_items(data)
                return _items_to_markdown(items[:args.get("limit", 15)], "Image Generation Models")
            
            elif tool_name == "fetch_llm_benchmarks":
                params = {"tabs": "llms", "limit": args.get("limit", 15)}
                response = await client.get(f"{base_url}/api/fetch", params=params)
                response.raise_for_status()
                data = response.json()
                items = _extract_items(data)
                return _items_to_markdown(items[:args.get("limit", 15)], "LLM Benchmarks")
            
            elif tool_name == "fetch_hype_feed":
                params = {"tabs": "hype", "limit": args.get("limit", 20)}
                response = await client.get(f"{base_url}/api/fetch", params=params)
                response.raise_for_status()
                data = response.json()
                items = _extract_items(data)
                filtered = _filter_items(items, args.get("query", ""))
                return _items_to_markdown(filtered[:args.get("limit", 20)], "Trending AI")
            
            else:
                return f"Unknown tool: {tool_name}"
                
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"


def _extract_items(data: dict) -> list[dict]:
    """Extract items from API response."""
    datasets = data.get("datasets", {})
    first = next(iter(datasets.values()), [])
    if isinstance(first, list):
        return first
    if isinstance(first, dict) and "items" in first:
        return first["items"]
    return []


def _filter_items(items: list[dict], query: str) -> list[dict]:
    """Filter items by query."""
    if not query:
        return items
    
    keywords = query.lower().split()
    filtered = []
    for item in items:
        haystack = " ".join([
            str(item.get("title", "")),
            str(item.get("name", "")),
            str(item.get("summary", "")),
            str(item.get("description", "")),
            str(item.get("provider", "")),
            str(item.get("source", ""))
        ]).lower()
        
        if any(kw in haystack for kw in keywords):
            filtered.append(item)
    
    return filtered if filtered else items


def _items_to_markdown(items: list[dict], label: str) -> str:
    """Convert items to markdown format."""
    if not items:
        return f"*No {label} items found.*"
    
    lines = [f"## {label} ({len(items)} items)\n"]
    for item in items[:10]:  # Limit preview
        title = item.get("title") or item.get("name") or "Untitled"
        url = item.get("link") or item.get("url") or ""
        summary = item.get("summary") or item.get("description") or ""
        provider = item.get("provider") or item.get("source") or ""
        
        link_part = f" [→]({url})" if url else ""
        provider_part = f" ({provider})" if provider else ""
        
        lines.append(f"- **{title}**{provider_part}{link_part}")
        if summary:
            lines.append(f"  {summary[:150]}{'...' if len(summary) > 150 else ''}")
    
    if len(items) > 10:
        lines.append(f"\n*...and {len(items) - 10} more*")
    
    return "\n".join(lines)


async def run_agent(
    question: str,
    api_key: str,
    model_id: str = "x-ai/grok-4-fast",
    base_url: str = "",
    on_event: Callable[[dict], None] = None
) -> AgentRun:
    """
    Run the agent with explicit tool calling loop.
    
    Args:
        question: User's question
        api_key: OpenRouter API key
        model_id: Model ID to use
        base_url: Base URL for the dashboard API
        on_event: Optional callback for streaming events
    
    Returns:
        AgentRun with all tool calls and final response
    """
    run = AgentRun(question=question, model=model_id)
    
    def emit(event_type: str, **data):
        if on_event:
            on_event({"type": event_type, **data})
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question}
    ]
    
    emit("start", question=question, model=model_id)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        max_iterations = 5
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            emit("llm_call", iteration=iteration)
            
            # Call OpenRouter
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model_id,
                        "messages": messages,
                        "tools": TOOL_DEFINITIONS,
                        "tool_choice": "auto"
                    }
                )
                response.raise_for_status()
                result = response.json()
            except Exception as e:
                run.error = str(e)
                emit("error", error=str(e))
                return run
            
            choice = result.get("choices", [{}])[0]
            message = choice.get("message", {})
            finish_reason = choice.get("finish_reason", "")
            
            # Check for tool calls
            tool_calls = message.get("tool_calls", [])
            
            if tool_calls:
                # Add assistant message with tool calls
                messages.append(message)
                
                for tc in tool_calls:
                    func = tc.get("function", {})
                    tool_name = func.get("name", "unknown")
                    try:
                        tool_args = json.loads(func.get("arguments", "{}"))
                    except:
                        tool_args = {}
                    
                    tool_call = ToolCall(tool=tool_name, args=tool_args, status="running")
                    run.tool_calls.append(tool_call)
                    
                    emit("tool_start", tool=tool_name, args=tool_args)
                    
                    # Execute the tool
                    tool_result = await execute_tool(tool_name, tool_args, base_url)
                    tool_call.result = tool_result
                    tool_call.status = "done"
                    
                    emit("tool_end", tool=tool_name, result=tool_result[:500])
                    
                    # Add tool result to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id", ""),
                        "content": tool_result
                    })
            
            elif message.get("content"):
                # Final response - no more tool calls
                run.response = message["content"]
                emit("response", content=message["content"])
                break
            
            else:
                # No content and no tool calls - something's wrong
                run.response = "Agent finished without response."
                break
        
        if not run.response and not run.error:
            run.response = "Agent reached maximum iterations."
    
    emit("done", response=run.response, tool_calls=[
        {"tool": tc.tool, "args": tc.args, "preview": tc.result[:200]} 
        for tc in run.tool_calls
    ])
    
    return run


async def run_agent_stream(
    question: str,
    api_key: str,
    model_id: str = "x-ai/grok-4-fast",
    base_url: str = ""
):
    """
    Generator version that yields events as they happen.
    """
    events = []
    
    def collect_event(event):
        events.append(event)
    
    run = await run_agent(question, api_key, model_id, base_url, on_event=collect_event)
    
    for event in events:
        yield event
