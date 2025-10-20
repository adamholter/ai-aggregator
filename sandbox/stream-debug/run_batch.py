#!/usr/bin/env python3
"""
Batch-stream harness to detect intermittent truncation when using OpenRouter's streaming API.

It runs a set of prompts multiple times, records finish_reason, streamed length, retry status,
and whether the stream delivered any content at all.
"""

import os
import json
import time
from pathlib import Path
from collections import defaultdict

import requests


OPENROUTER_KEY = os.environ.get(
    "OPENROUTER_API_KEY",
    "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",
)

HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://localhost/stream-debug",
    "X-Title": "Streaming Batch Harness",
}

PROMPTS = {
    "summary": (
        "Summarize the key considerations when selecting an LLM for enterprise coding support. "
        "Include pros/cons and end with a recommendation paragraph."
    ),
    "table": (
        "Produce a markdown table comparing Claude 4.5 Sonnet, GPT-5 mini, "
        "Mistral Large, and Gemini 2.5 Pro with columns Model, Context window, "
        "Speed, Price, and Best use cases."
    ),
    "quickchart": (
        "Generate a QuickChart scatter plot comparing coding models under $0.50 per 1M tokens. "
        "Use price as bubble size, coding intelligence on Y, and speed on X. "
        "Include the markdown image link only, no additional commentary."
    ),
}


def stream_once(prompt: str):
    payload = {
        "model": "anthropic/claude-3-5-sonnet",
        "messages": [
            {"role": "system", "content": "You are a concise, reliable assistant."},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
        "max_tokens": 2048,
    }

    streamed_text = ""
    finish_reason = None
    chunks = 0
    start = time.time()
    try:
        with requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=HEADERS,
            json=payload,
            stream=True,
            timeout=(10, 120),
        ) as response:
            status = response.status_code
            if status >= 400:
                return {
                    "status": status,
                    "error": response.text[:400],
                    "chunks": 0,
                    "length": 0,
                    "finish_reason": None,
                    "duration": time.time() - start,
                }

            for raw_line in response.iter_lines(decode_unicode=True):
                if not raw_line or raw_line.startswith(":"):
                    continue
                if raw_line.strip() == "data: [DONE]":
                    break
                if not raw_line.startswith("data: "):
                    continue
                payload_line = raw_line[6:]
                try:
                    parsed = json.loads(payload_line)
                except json.JSONDecodeError:
                    continue
                choice = (parsed.get("choices") or [{}])[0]
                finish_reason = choice.get("finish_reason") or finish_reason
                delta = choice.get("delta") or {}
                piece = delta.get("content")
                if piece:
                    streamed_text += piece
                    chunks += 1

    except requests.exceptions.RequestException as exc:
        return {
            "status": None,
            "error": repr(exc),
            "chunks": chunks,
            "length": len(streamed_text),
            "finish_reason": finish_reason,
            "duration": time.time() - start,
        }

    return {
        "status": status,
        "error": None,
        "chunks": chunks,
        "length": len(streamed_text),
        "finish_reason": finish_reason,
        "duration": time.time() - start,
        "text": streamed_text,
    }


def run_batch(iterations=10):
    results = defaultdict(list)
    for name, prompt in PROMPTS.items():
        print(f"\n=== Prompt: {name} ===")
        for i in range(iterations):
            info = stream_once(prompt)
            results[name].append(info)
            status = info["status"]
            finish = info["finish_reason"]
            chunks = info["chunks"]
            length = info["length"]
            duration = info["duration"]
            if info["error"]:
                print(
                    f"[{i}] status={status} chunks={chunks} len={length} "
                    f"finish={finish} duration={duration:.2f}s ERROR={info['error']}"
                )
            else:
                print(
                    f"[{i}] status={status} chunks={chunks} len={length} "
                    f"finish={finish} duration={duration:.2f}s"
                )
    summary_path = Path("sandbox/stream-debug/batch_results.json")
    summary_path.write_text(json.dumps(results, indent=2))
    print(f"\nDetailed results written to {summary_path}")


if __name__ == "__main__":
    run_batch(iterations=5)

