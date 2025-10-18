# Streaming Debug Sandbox

Two Python harnesses that mimic the production agent’s streaming loop against the
OpenRouter API. Use them to investigate truncation/fallback behaviour without touching the main server.

## Files

- `run_stream.py`
  - Reproduces a single request (same chunk flush + sanitiser our server uses).
  - Optionally follows up with a non-stream call for diffing the outputs.
  - Prints chunk counts, lengths, and finish reasons.
- `run_batch.py`
  - Drives multiple prompts repeatedly, logging stats for each run.
  - Saves results to `batch_results.json` for later analysis.

## Usage

```bash
OPENROUTER_API_KEY=sk-or-... python3 sandbox/stream-debug/run_stream.py
OPENROUTER_API_KEY=sk-or-... python3 sandbox/stream-debug/run_batch.py
```

The scripts default to the testing key that Adam provided; override the env var as needed.
