from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AgentSettings:
    model: str = "anthropic/claude-sonnet-4"
    umi_model: str = "google/gemini-2.5-flash"
    web_search_model: str = "perplexity/sonar-pro"
    mode: str = "quick"
    temperature: float = 0.3
    max_iterations: int = 20
    api_key: Optional[str] = None
    system_prompt_override: str = ""


@dataclass
class AgentMessage:
    role: str
    content: str


@dataclass
class AgentToolCallLog:
    iteration: int
    tool_name: str
    status: str
    args: Dict[str, Any] = field(default_factory=dict)
    result_preview: str = ""
    error: str = ""
    raw_result: Any = None


@dataclass
class AgentRunResult:
    response: str
    messages: List[Dict[str, Any]]
    logs: List[AgentToolCallLog] = field(default_factory=list)
    error: Optional[str] = None
