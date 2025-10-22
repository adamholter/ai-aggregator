# Stream Stability Handoff

## What’s Wrong
Multi-step conversations still break: after the first reply the agent keeps re-issuing `FETCH_DATA` commands, loses track of prior answers, and never produces a follow-up response. The previous attempt to reuse cached datasets regressed, so the chat effectively restarts every turn instead of building on the history.

## What I Changed
- Added `ensure_quickchart_visualization` utilities so table-only responses get a QuickChart appended when possible.
- Hardened fallback logic: if the non-stream retry fails we emit an SSE `error` event immediately. Non-stream responses are chunked manually to preserve progressive updates.
- Updated sandbox harness (`sandbox/stream-debug/run_batch.py`) to re-run regression prompts after the change.

## How to Finish/Fix
1. **Trim agent prompts before calling OpenRouter.**
   - Implement conversation-history summarisation or a hard cut (keep latest N messages).
   - Compress dataset summaries; consider passing only the relevant slice for the asked category.
   - Target: total prompt + expected completion < 200k tokens.
2. **Handle SSE errors on the client.**
   - Update `script.js` streaming handler to listen for `type: "error"` and surface a toast + reset the spinner.
3. **Add automated tests.**
   - Extend `sandbox/stream-debug` to include multi-turn prompts and verify the response is delivered + UI-friendly error on failure.
   - Optional: add a playwright smoke test hitting the hosted version.
4. **(Optional) Cache/snapshot known-chart prompts.** If the same QuickChart isn’t required to be regenerated, reuse existing stored charts to reduce payload size.

## Commit/Lint Recipe
```bash
# from repo root
python3 -m py_compile server.py
python3 sandbox/stream-debug/run_batch.py  # sanity checks
npm run lint        # if front-end linting enabled
npm test            # placeholder for UI tests when added
```

## Status Summary
- Backend now guarantees a complete response or emits an explicit error; no silent hangs.
- Large prompts still push OpenRouter over its context window in follow-up requests; UI doesn’t expose the error to users yet.
- Next engineer should start with prompt slimming & front-end error surface adjustments.

_Last user report:_ follow-up prompt triggered `LLM request failed: ... maximum context length 200000 tokens`, causing the UI to hang because the frontend ignores the SSE error.
