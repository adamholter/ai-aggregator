"""
Experimental Pydantic AI Agent.

A more reliable agent implementation using Pydantic AI for typed tool calling.
Uses OpenRouter as the LLM provider.

NOTE: This module creates agents dynamically at runtime to defer API key requirement.
"""
import os
import json
from typing import Any
from dataclasses import dataclass
from datetime import datetime

import httpx
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext


# Agent dependencies - injected at runtime
@dataclass
class AgentDependencies:
    """Dependencies for the agent."""
    api_key: str
    model_id: str = "x-ai/grok-4-fast"
    base_url: str = ""  # For fetching dashboard data


# Tool result types
class FeedItem(BaseModel):
    """A single item from a feed."""
    title: str = ""
    summary: str = ""
    url: str = ""
    source: str = ""
    timestamp: str = ""
    provider: str = ""


class FeedResult(BaseModel):
    """Result from fetching a feed."""
    items: list[FeedItem] = Field(default_factory=list)
    total: int = 0
    query: str = ""


# Helper functions
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
    
    lines = [f"## {label}\n"]
    for item in items:
        title = item.get("title") or item.get("name") or "Untitled"
        url = item.get("link") or item.get("url") or ""
        summary = item.get("summary") or item.get("description") or ""
        provider = item.get("provider") or item.get("source") or ""
        
        link_part = f" [link]({url})" if url else ""
        provider_part = f" ({provider})" if provider else ""
        
        lines.append(f"- **{title}**{provider_part}{link_part}")
        if summary:
            lines.append(f"  {summary[:200]}{'...' if len(summary) > 200 else ''}")
    
    return "\n".join(lines)


def create_agent(api_key: str, model_id: str = "x-ai/grok-4-fast") -> Agent:
    """
    Create a fresh agent instance with the given API key.
    
    This is needed because Pydantic AI requires the API key at agent creation.
    """
    # Set API key in environment before creating agent
    os.environ["OPENROUTER_API_KEY"] = api_key
    
    agent = Agent(
        f"openrouter:{model_id}",
        deps_type=AgentDependencies,
        system_prompt="""You are a helpful AI assistant that answers questions about AI models and news.
You have access to tools to fetch data from various sources like OpenRouter, Latest feeds, and benchmarks.
Use the tools to gather relevant information, then provide a clear, concise answer.
Keep responses scannable with bullet points when appropriate.
Always cite sources and include links when available."""
    )
    
    # Register tools on the agent
    @agent.tool
    async def fetch_latest_feed(
        ctx: RunContext[AgentDependencies],
        query: str = "",
        limit: int = 20
    ) -> str:
        """
        Fetch the latest AI news and updates.
        
        Args:
            query: Search terms to filter results (e.g., "Gemini", "GPT", "image generation")
            limit: Maximum number of items to return
        
        Returns:
            Markdown-formatted list of latest items
        """
        base_url = ctx.deps.base_url or "http://localhost:5001"
        params = {
            "tabs": "latest",
            "limit": min(limit, 40),
            "include_hype": "true"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/api/fetch", params=params)
            response.raise_for_status()
            data = response.json()
        
        items = _extract_items(data)
        filtered = _filter_items(items, query)
        return _items_to_markdown(filtered[:limit], "Latest Feed")

    @agent.tool
    async def search_openrouter_models(
        ctx: RunContext[AgentDependencies],
        query: str = "",
        limit: int = 20
    ) -> str:
        """
        Search OpenRouter's model catalog.
        
        Args:
            query: Search terms (e.g., "vision", "Claude", "cheap", "fast")
            limit: Maximum number of models to return
        
        Returns:
            Markdown-formatted list of matching models
        """
        base_url = ctx.deps.base_url or "http://localhost:5001"
        params = {
            "tabs": "openrouter",
            "limit": min(limit, 40),
            "recency": "week"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/api/fetch", params=params)
            response.raise_for_status()
            data = response.json()
        
        items = _extract_items(data)
        filtered = _filter_items(items, query)
        return _items_to_markdown(filtered[:limit], "OpenRouter Models")

    @agent.tool
    async def fetch_llm_benchmarks(
        ctx: RunContext[AgentDependencies],
        limit: int = 15
    ) -> str:
        """
        Get LLM benchmark data from Artificial Analysis.
        
        Args:
            limit: Maximum number of models to return
        
        Returns:
            Markdown-formatted list of LLM benchmarks
        """
        base_url = ctx.deps.base_url or "http://localhost:5001"
        params = {
            "tabs": "llms",
            "limit": min(limit, 30)
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/api/fetch", params=params)
            response.raise_for_status()
            data = response.json()
        
        items = _extract_items(data)
        return _items_to_markdown(items[:limit], "LLM Benchmarks")

    @agent.tool
    async def fetch_hype_feed(
        ctx: RunContext[AgentDependencies],
        query: str = "",
        limit: int = 20
    ) -> str:
        """
        Get trending AI repositories and releases from GitHub, HuggingFace, Reddit.
        
        Args:
            query: Search terms to filter
            limit: Maximum items to return
        
        Returns:
            Markdown-formatted list of trending items
        """
        base_url = ctx.deps.base_url or "http://localhost:5001"
        params = {
            "tabs": "hype",
            "limit": min(limit, 30)
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/api/fetch", params=params)
            response.raise_for_status()
            data = response.json()
        
        items = _extract_items(data)
        filtered = _filter_items(items, query)
        return _items_to_markdown(filtered[:limit], "Hype Feed")

    @agent.tool
    async def fetch_media_models(
        ctx: RunContext[AgentDependencies],
        category: str = "text-to-image",
        limit: int = 15
    ) -> str:
        """
        Get media generation models (image, video, speech).
        
        Args:
            category: One of 'text-to-image', 'text-to-video', 'image-to-video', 'text-to-speech'
            limit: Maximum items to return
        
        Returns:
            Markdown-formatted list of media models
        """
        valid_categories = ["text-to-image", "text-to-video", "image-to-video", "text-to-speech", "image-editing"]
        if category not in valid_categories:
            category = "text-to-image"
        
        base_url = ctx.deps.base_url or "http://localhost:5001"
        params = {
            "tabs": category,
            "limit": min(limit, 30)
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/api/fetch", params=params)
            response.raise_for_status()
            data = response.json()
        
        items = _extract_items(data)
        return _items_to_markdown(items[:limit], category.replace("-", " ").title())

    return agent


async def run_agent(
    question: str,
    api_key: str,
    model_id: str = "x-ai/grok-4-fast",
    base_url: str = ""
) -> dict:
    """
    Run the agent with a question.
    
    Args:
        question: User's question
        api_key: OpenRouter API key
        model_id: Model ID to use
        base_url: Base URL for the dashboard API
    
    Returns:
        Dict with 'response' and 'tool_calls' keys
    """
    deps = AgentDependencies(
        api_key=api_key,
        model_id=model_id,
        base_url=base_url
    )
    
    # Create agent dynamically with the API key
    agent = create_agent(api_key, model_id)
    
    result = await agent.run(question, deps=deps)
    
    # Extract tool calls from run
    tool_calls = []
    if hasattr(result, 'all_messages'):
        for msg in result.all_messages():
            if hasattr(msg, 'parts'):
                for part in msg.parts:
                    if hasattr(part, 'tool_name'):
                        tool_calls.append({
                            'tool': part.tool_name,
                            'args': getattr(part, 'args', {})
                        })
    
    return {
        "response": result.data,
        "tool_calls": tool_calls,
        "model": model_id
    }


async def run_agent_stream(
    question: str,
    api_key: str,
    model_id: str = "x-ai/grok-4-fast",
    base_url: str = ""
):
    """
    Run the agent with streaming, yielding events.
    
    Yields dicts with 'type' (tool_start, tool_end, text, done) and relevant data.
    """
    deps = AgentDependencies(
        api_key=api_key,
        model_id=model_id,
        base_url=base_url
    )
    
    # Create agent dynamically
    agent = create_agent(api_key, model_id)
    
    async with agent.run_stream(question, deps=deps) as result:
        async for text in result.stream_text():
            yield {"type": "text", "content": text}
        
        yield {"type": "done", "response": result.data if hasattr(result, 'data') else ""}
