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

OPENROUTER_CONNECT_TIMEOUT_SECONDS = 15
OPENROUTER_READ_TIMEOUT_SECONDS = 3600
DUPLICATE_TOOL_CALL_LIMIT = 3


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


def _canonical_tool_signature(tool_name: str, args: Dict[str, Any]) -> str:
    return f"{tool_name}:{json.dumps(args or {}, sort_keys=True, ensure_ascii=False, separators=(',', ':'))}"


def _duplicate_tool_warning(tool_name: str, duplicate_count: int) -> str:
    return (
        f"Duplicate tool call blocked: `{tool_name}` with identical arguments already completed successfully earlier in this run. "
        "That result is still in context. Use the prior result, choose a different tool, or call `send_final_response`."
        f" Duplicate attempt #{duplicate_count}."
    )


def _loop_detected_message(tool_name: str) -> str:
    return (
        f"Loop detected: the agent repeated the identical `{tool_name}` tool call after being warned that the result was already in context."
    )


def _describe_llm_api_failure(exc: Exception, auth_source: str) -> str:
    if isinstance(exc, requests.exceptions.HTTPError):
        response = exc.response
        status_code = getattr(response, "status_code", None)
        if status_code in {401, 403}:
            if auth_source == "server_key":
                return "Upstream provider authentication failed while using server-side access. Please try again later."
            if auth_source == "user_key":
                return "Your OpenRouter API key was rejected by the upstream provider. Update your key in Settings and try again."
        if status_code == 402 and auth_source == "server_key":
            return "The upstream provider rejected this server-side request for billing reasons. Please try again later."
    return str(exc)


def _openrouter_chat_completion(
    api_key: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    temperature: float,
    reasoning_effort: str = "low",
) -> Dict[str, Any]:
    payload = {
        "model": model,
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "temperature": temperature,
    }
    normalized_effort = (reasoning_effort or "").strip().lower()
    if normalized_effort in {"none", "minimal", "low", "medium", "high", "xhigh"}:
        payload["reasoning"] = {"effort": normalized_effort}

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=(OPENROUTER_CONNECT_TIMEOUT_SECONDS, OPENROUTER_READ_TIMEOUT_SECONDS),
    )
    response.raise_for_status()
    return response.json()


def _stream_openrouter_chat_completion(
    api_key: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    temperature: float,
    reasoning_effort: str = "low",
):
    """Yield live text/reasoning deltas followed by one assembled assistant message."""
    payload = {
        "model": model,
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "temperature": temperature,
        "stream": True,
    }
    normalized_effort = (reasoning_effort or "").strip().lower()
    if normalized_effort in {"none", "minimal", "low", "medium", "high", "xhigh"}:
        payload["reasoning"] = {"effort": normalized_effort}
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        stream=True,
        timeout=(OPENROUTER_CONNECT_TIMEOUT_SECONDS, OPENROUTER_READ_TIMEOUT_SECONDS),
    )
    response.raise_for_status()
    # OpenRouter streams UTF-8 JSON but some provider/proxy responses omit a
    # charset. requests otherwise falls back to ISO-8859-1 for text/* and turns
    # punctuation such as em dashes into mojibake (for example, "â€").
    response.encoding = "utf-8"
    content_parts: List[str] = []
    reasoning_parts: List[str] = []
    tool_calls_by_index: Dict[int, Dict[str, Any]] = {}
    for raw_line in response.iter_lines(decode_unicode=True):
        line = (raw_line or "").strip()
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if not data or data == "[DONE]":
            continue
        chunk = json.loads(data)
        delta = ((chunk.get("choices") or [{}])[0].get("delta") or {})
        text_delta = delta.get("content")
        if isinstance(text_delta, str) and text_delta:
            content_parts.append(text_delta)
            yield {"type": "content", "delta": text_delta}
        reasoning_delta = delta.get("reasoning")
        if isinstance(reasoning_delta, str) and reasoning_delta:
            reasoning_parts.append(reasoning_delta)
            yield {"type": "reasoning", "delta": reasoning_delta}
        for call_delta in delta.get("tool_calls") or []:
            index = int(call_delta.get("index") or 0)
            current = tool_calls_by_index.setdefault(index, {
                "id": "", "type": "function", "function": {"name": "", "arguments": ""}
            })
            if call_delta.get("id"):
                current["id"] = call_delta["id"]
            fn_delta = call_delta.get("function") or {}
            if fn_delta.get("name"):
                current["function"]["name"] += fn_delta["name"]
            if fn_delta.get("arguments"):
                current["function"]["arguments"] += fn_delta["arguments"]
    message: Dict[str, Any] = {"role": "assistant", "content": "".join(content_parts) or None}
    if reasoning_parts:
        message["reasoning"] = "".join(reasoning_parts)
    if tool_calls_by_index:
        message["tool_calls"] = [tool_calls_by_index[index] for index in sorted(tool_calls_by_index)]
    yield {"type": "message", "message": message}


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
    successful_tool_results: Dict[str, Dict[str, Any]] = {}
    duplicate_attempts: Dict[str, int] = {}

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
                reasoning_effort=settings.reasoning_effort,
            )
        except Exception as exc:
            return AgentRunResult(
                response="",
                messages=messages,
                logs=logs,
                error=f"LLM API call failed at iteration {iteration}: {_describe_llm_api_failure(exc, settings.auth_source)}\n{traceback.format_exc()}",
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
            signature = _canonical_tool_signature(name, args) if name != "send_final_response" else ""

            if signature and signature in successful_tool_results:
                prior = successful_tool_results[signature]
                duplicate_attempts[signature] = duplicate_attempts.get(signature, 0) + 1
                duplicate_count = duplicate_attempts[signature]
                warning_message = _duplicate_tool_warning(name, duplicate_count)
                log = AgentToolCallLog(
                    iteration=iteration,
                    tool_name=name,
                    status="duplicate",
                    args=args,
                    result_preview=warning_message[:220],
                    raw_result=prior.get("raw_result"),
                )
                logs.append(log)
                duplicate_payload = {
                    "ok": True,
                    "tool": name,
                    "duplicate_blocked": True,
                    "message": warning_message,
                    "prior_result": prior.get("result"),
                }
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "name": name,
                        "content": _safe_json_text(duplicate_payload),
                    }
                )
                if duplicate_count >= DUPLICATE_TOOL_CALL_LIMIT:
                    return AgentRunResult(
                        response="",
                        messages=messages,
                        logs=logs,
                        error=_loop_detected_message(name),
                    )
                continue

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
                if signature:
                    successful_tool_results[signature] = {
                        "result": tool_result.get("result"),
                        "raw_result": tool_result.get("result"),
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
    successful_tool_results: Dict[str, Dict[str, Any]] = {}
    duplicate_attempts: Dict[str, int] = {}

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
            assistant_message = None
            yield {"type": "status", "stage": "model_streaming", "iteration": iteration}
            for stream_event in _stream_openrouter_chat_completion(
                api_key=api_key,
                model=settings.model,
                messages=messages,
                tools=tools,
                temperature=float(settings.temperature),
                reasoning_effort=settings.reasoning_effort,
            ):
                if stream_event.get("type") == "content":
                    yield {"type": "content_chunk", "delta": stream_event.get("delta") or ""}
                elif stream_event.get("type") == "reasoning":
                    yield {"type": "reasoning_chunk", "delta": stream_event.get("delta") or ""}
                elif stream_event.get("type") == "message":
                    assistant_message = stream_event.get("message") or {}
        except Exception as exc:
            yield {
                "type": "error",
                "error": f"LLM API call failed at iteration {iteration}: {_describe_llm_api_failure(exc, settings.auth_source)}",
                "stack": traceback.format_exc(),
            }
            return

        assistant_message = assistant_message or {}
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
                "tool_call_id": tool_call_id,
                "tool_name": name,
                "args": args,
            }

            signature = _canonical_tool_signature(name, args) if name != "send_final_response" else ""
            if signature and signature in successful_tool_results:
                prior = successful_tool_results[signature]
                duplicate_attempts[signature] = duplicate_attempts.get(signature, 0) + 1
                duplicate_count = duplicate_attempts[signature]
                warning_message = _duplicate_tool_warning(name, duplicate_count)
                log.status = "duplicate"
                log.result_preview = warning_message[:220]
                log.raw_result = prior.get("raw_result")
                duplicate_payload = {
                    "ok": True,
                    "tool": name,
                    "duplicate_blocked": True,
                    "message": warning_message,
                    "prior_result": prior.get("result"),
                }
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": name,
                    "content": _safe_json_text(duplicate_payload),
                })
                yield {
                    "type": "tool_result",
                    "iteration": iteration,
                    "tool_call_id": tool_call_id,
                    "tool_name": name,
                    "status": "duplicate",
                    "result_preview": warning_message[:220],
                    "raw_result": prior.get("result"),
                }
                if duplicate_count >= DUPLICATE_TOOL_CALL_LIMIT:
                    yield {
                        "type": "error",
                        "error": _loop_detected_message(name),
                    }
                    return
                continue

            # create_artifact is handled client-side — emit event, skip executor
            if name == "create_artifact":
                artifact_data = {
                    "artifact_type": args.get("type", "code"),
                    "title": args.get("title", "Artifact"),
                    "content": args.get("content", ""),
                    "language": args.get("language", ""),
                }
                yield {"type": "artifact", "iteration": iteration, "artifact": artifact_data}
                log.status = "done"
                log.result_preview = f"Artifact '{artifact_data['title']}' shown to user"
                yield {
                    "type": "tool_result",
                    "iteration": iteration,
                    "tool_call_id": tool_call_id,
                    "tool_name": name,
                    "status": "done",
                    "result_preview": log.result_preview,
                }
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": name,
                    "content": _safe_json_text({"ok": True, "message": f"Artifact '{artifact_data['title']}' ({artifact_data['artifact_type']}) created and displayed to the user."}),
                })
                continue

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
                    "tool_call_id": tool_call_id,
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
                    "tool_call_id": tool_call_id,
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
                if signature:
                    successful_tool_results[signature] = {
                        "result": tool_result.get("result"),
                        "raw_result": tool_result.get("result"),
                    }
                yield {
                    "type": "tool_result",
                    "iteration": iteration,
                    "tool_call_id": tool_call_id,
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

    yield {
        "type": "done",
        "response": final_response,
        "logs": [log.__dict__ for log in logs],
    }
