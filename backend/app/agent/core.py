from __future__ import annotations

# API choice rationale:
# We use OpenRouter Chat Completions (/api/v1/chat/completions) for the core tool loop.
# This app already uses chat-completions patterns heavily and needs predictable tool-call message formatting.
# OpenRouter Responses API is still beta and can vary behavior around tool-calling edge cases.
# For reliability in a multi-step loop, chat completions is the safer default.

import json
import traceback
from typing import Any, Dict, List

import requests

from .tools import get_tool_definitions
from .types import AgentRunResult, AgentSettings, AgentToolCallLog


def _parse_tool_args(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {"_raw": raw}
    return {}


def _safe_json_text(value: Any) -> str:
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


def _openrouter_chat_completion(
    api_key: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    temperature: float,
) -> Dict[str, Any]:
    payload = {
        "model": model,
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "temperature": temperature,
    }

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    return response.json()


def run_agent(
    *,
    settings: AgentSettings,
    system_prompt: str,
    user_messages: List[Dict[str, str]],
    tool_executor,
) -> AgentRunResult:
    api_key = (settings.api_key or "").strip()
    if not api_key:
        return AgentRunResult(response="", messages=[], error="Missing OpenRouter API key.")

    mode = (settings.mode or "quick").lower()
    tools = get_tool_definitions(mode=mode)
    logs: List[AgentToolCallLog] = []

    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    messages.extend(user_messages)

    max_iterations = max(1, int(settings.max_iterations or 20))

    for iteration in range(1, max_iterations + 1):
        try:
            completion = _openrouter_chat_completion(
                api_key=api_key,
                model=settings.model,
                messages=messages,
                tools=tools,
                temperature=float(settings.temperature),
            )
        except Exception as exc:
            return AgentRunResult(
                response="",
                messages=messages,
                logs=logs,
                error=f"LLM API call failed at iteration {iteration}: {exc}\n{traceback.format_exc()}",
            )

        choice = (completion.get("choices") or [{}])[0]
        assistant_message = (choice.get("message") or {})
        content = assistant_message.get("content")
        tool_calls = assistant_message.get("tool_calls") or []

        safe_assistant = {"role": "assistant"}
        if content is not None:
            safe_assistant["content"] = content
        if tool_calls:
            safe_assistant["tool_calls"] = tool_calls
        messages.append(safe_assistant)

        if not tool_calls:
            if isinstance(content, str) and content.strip():
                return AgentRunResult(response=content, messages=messages, logs=logs)
            continue

        for call in tool_calls:
            tool_call_id = call.get("id")
            fn = call.get("function") or {}
            name = fn.get("name") or "unknown"
            args = _parse_tool_args(fn.get("arguments"))

            log = AgentToolCallLog(
                iteration=iteration,
                tool_name=name,
                status="running",
                args=args,
            )
            logs.append(log)

            tool_result = tool_executor.execute(name, args, {
                "api_key": api_key,
                "web_search_model": settings.web_search_model,
                "umi_model": settings.umi_model,
            })

            if name == "send_final_response" and tool_result.get("ok"):
                final_text = (tool_result.get("result") or {}).get("response") or ""
                log.status = "done"
                log.result_preview = (final_text or "")[:220]
                return AgentRunResult(response=final_text, messages=messages, logs=logs)

            if not tool_result.get("ok"):
                log.status = "error"
                log.error = (tool_result.get("error") or {}).get("message") or "Tool execution failed"
                payload = {
                    "ok": False,
                    "tool": name,
                    "error": tool_result.get("error") or {"message": "Unknown tool error"},
                }
            else:
                log.status = "done"
                log.raw_result = tool_result.get("result")
                log.result_preview = _safe_json_text(tool_result.get("result"))[:220]
                payload = {
                    "ok": True,
                    "tool": name,
                    "result": tool_result.get("result"),
                }

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": name,
                    "content": _safe_json_text(payload),
                }
            )

    return AgentRunResult(
        response="I reached the iteration limit before finishing. Please refine the request or increase max iterations.",
        messages=messages,
        logs=logs,
        error="Max iterations reached",
    )


def stream_agent(
    *,
    settings: AgentSettings,
    system_prompt: str,
    user_messages: List[Dict[str, str]],
    tool_executor,
):
    """
    Streaming variant that yields structured events for UI action timelines.
    Event examples:
    - {"type":"status","stage":"start",...}
    - {"type":"tool_start",...}
    - {"type":"tool_result",...}
    - {"type":"content_chunk","delta":"..."}
    - {"type":"done","response":"...","logs":[...]}
    - {"type":"error","error":"..."}
    """
    api_key = (settings.api_key or "").strip()
    if not api_key:
        yield {"type": "error", "error": "Missing OpenRouter API key."}
        return

    mode = (settings.mode or "quick").lower()
    tools = get_tool_definitions(mode=mode)
    logs: List[AgentToolCallLog] = []
    final_response = ""

    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    messages.extend(user_messages)

    max_iterations = max(1, int(settings.max_iterations or 20))

    yield {
        "type": "status",
        "stage": "start",
        "mode": mode,
        "model": settings.model,
        "max_iterations": max_iterations,
    }

    for iteration in range(1, max_iterations + 1):
        yield {"type": "status", "stage": "iteration_start", "iteration": iteration}
        try:
            completion = _openrouter_chat_completion(
                api_key=api_key,
                model=settings.model,
                messages=messages,
                tools=tools,
                temperature=float(settings.temperature),
            )
        except Exception as exc:
            yield {
                "type": "error",
                "error": f"LLM API call failed at iteration {iteration}: {exc}",
                "stack": traceback.format_exc(),
            }
            return

        choice = (completion.get("choices") or [{}])[0]
        assistant_message = (choice.get("message") or {})
        content = assistant_message.get("content")
        tool_calls = assistant_message.get("tool_calls") or []

        safe_assistant = {"role": "assistant"}
        if content is not None:
            safe_assistant["content"] = content
        if tool_calls:
            safe_assistant["tool_calls"] = tool_calls
        messages.append(safe_assistant)

        if not tool_calls:
            if isinstance(content, str) and content.strip():
                final_response = content
            break

        for call in tool_calls:
            tool_call_id = call.get("id")
            fn = call.get("function") or {}
            name = fn.get("name") or "unknown"
            args = _parse_tool_args(fn.get("arguments"))

            log = AgentToolCallLog(
                iteration=iteration,
                tool_name=name,
                status="running",
                args=args,
            )
            logs.append(log)

            yield {
                "type": "tool_start",
                "iteration": iteration,
                "tool_name": name,
                "args": args,
            }

            tool_result = tool_executor.execute(name, args, {
                "api_key": api_key,
                "web_search_model": settings.web_search_model,
                "umi_model": settings.umi_model,
            })

            if name == "send_final_response" and tool_result.get("ok"):
                final_text = (tool_result.get("result") or {}).get("response") or ""
                log.status = "done"
                log.result_preview = (final_text or "")[:220]
                final_response = final_text
                yield {
                    "type": "tool_result",
                    "iteration": iteration,
                    "tool_name": name,
                    "status": "done",
                    "result_preview": log.result_preview,
                    "raw_result": tool_result.get("result"),
                }
                break

            if not tool_result.get("ok"):
                log.status = "error"
                log.error = (tool_result.get("error") or {}).get("message") or "Tool execution failed"
                payload = {
                    "ok": False,
                    "tool": name,
                    "error": tool_result.get("error") or {"message": "Unknown tool error"},
                }
                yield {
                    "type": "tool_result",
                    "iteration": iteration,
                    "tool_name": name,
                    "status": "error",
                    "error": payload.get("error"),
                }
            else:
                log.status = "done"
                log.raw_result = tool_result.get("result")
                log.result_preview = _safe_json_text(tool_result.get("result"))[:220]
                payload = {
                    "ok": True,
                    "tool": name,
                    "result": tool_result.get("result"),
                }
                yield {
                    "type": "tool_result",
                    "iteration": iteration,
                    "tool_name": name,
                    "status": "done",
                    "result_preview": log.result_preview,
                    "raw_result": log.raw_result,
                }

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": name,
                    "content": _safe_json_text(payload),
                }
            )

        if final_response:
            break

    if not final_response:
        final_response = "I reached the iteration limit before finishing. Please refine the request or increase max iterations."

    # Simulate a human-readable stream at the UI layer by chunking final content.
    chunk_size = 48
    for index in range(0, len(final_response), chunk_size):
        yield {"type": "content_chunk", "delta": final_response[index:index + chunk_size]}

    yield {
        "type": "done",
        "response": final_response,
        "logs": [log.__dict__ for log in logs],
    }
