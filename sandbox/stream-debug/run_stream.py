#!/usr/bin/env python3
"""
Standalone harness to reproduce / debug the OpenRouter streaming behaviour used by the AI agent.

It mimics the server-side streaming logic, collects partial chunks, and optionally compares
the streamed content against a follow-up non-stream completion to detect truncation.
"""

import os
import json
import time
from textwrap import dedent

import requests


OPENROUTER_KEY = os.environ.get(
    "OPENROUTER_API_KEY",
    "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",
)

PROMPT = dedent(
    """
    Best cheap+fast models for coding under 50 cents per 1M tokens. Chart price as dot size
    and coding intelligence vs speed. Y and X axis respectively. Make sure the points are
    labeled and that the scales make sense.
    """
).strip()


def stream_request():
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost/debug",
        "X-Title": "Streaming Debug Harness",
    }
    payload = {
        "model": "anthropic/claude-3-5-sonnet",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": PROMPT},
        ],
        "stream": True,
        "max_tokens": 4096,
    }

    print("=== Streaming request ===")
    with requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        stream=True,
        timeout=(10, 180),
    ) as response:
        print("Status:", response.status_code)
        if response.status_code >= 400:
            print("Error payload:", response.text[:400])
            return response.status_code, ""

        assistant_text = ""
        finish_reason = None
        started = time.time()
        for raw_line in response.iter_lines(decode_unicode=True):
            if raw_line is None or not raw_line.strip():
                continue
            if raw_line.startswith(":"):
                continue
            if raw_line.strip() == "data: [DONE]":
                print("Received [DONE]")
                break

            if not raw_line.startswith("data: "):
                print("Skipping non data line:", raw_line[:80])
                continue

            payload_line = raw_line[6:]
            try:
                parsed = json.loads(payload_line)
            except json.JSONDecodeError as exc:
                print("JSON decode error:", exc, "line:", payload_line[:120])
                continue

            choice = (parsed.get("choices") or [{}])[0]
            finish_reason = choice.get("finish_reason") or finish_reason
            delta = choice.get("delta") or {}
            content_piece = delta.get("content")
            if content_piece:
                assistant_text += content_piece
                print(f"[chunk] ({len(content_piece)} chars) -> total {len(assistant_text)}")

        duration = time.time() - started
        print(f"Streaming finished in {duration:.2f}s; finish_reason={finish_reason!r}")
        return response.status_code, assistant_text


def non_stream_request():
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost/debug",
        "X-Title": "Streaming Debug Harness",
    }
    payload = {
        "model": "anthropic/claude-3-5-sonnet",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": PROMPT},
        ],
        "stream": False,
        "max_tokens": 4096,
    }

    print("\n=== Non-stream request ===")
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=180,
    )
    print("Status:", response.status_code)
    if response.status_code >= 400:
        print("Error payload:", response.text[:400])
        return response.status_code, ""

    data = response.json()
    content = (
        (data.get("choices") or [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    print(f"Received {len(content)} chars from non-stream request")
    return response.status_code, content


def main():
    stream_status, stream_text = stream_request()
    non_stream_status, non_stream_text = non_stream_request()

    if stream_status == 200 and non_stream_status == 200:
        if stream_text == non_stream_text:
            print("\nResult: stream and non-stream content match exactly.")
        else:
            print("\nResult: content diverges by "
                  f"{len(non_stream_text) - len(stream_text)} characters.")
            snippet = non_stream_text[len(stream_text): len(stream_text) + 500]
            print("First divergent snippet:", repr(snippet))


if __name__ == "__main__":
    main()

