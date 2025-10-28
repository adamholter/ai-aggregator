## Reset Checklist
- Review `server.py`, focusing on the agent tool loop (`agent_tool_loop_generator`), `fetch_data_for_categories`, and the new blog helpers near the top (pagination + WP transforms).
- Skim `static/index.html` and `static/script.js` for the experimental tabs (Hype + new Blog tab), plus cached data structures and sorting logic.

## Outstanding Issues
1. **Agent Response Parsing Failure**  
   - Trace snapshot:  
     ```
     data: {"type": "traces", "traces": [
       {"step": "Dataset Fetch", "description": "Loaded datasets: ...", "tool": "fetch_data (7 categories)", "status": "success"},
       {"step": "Response Generation", "description": "Failed to parse language model response.", "tool": "Gemini 2.5 Flash Lite Preview", "status": "failed"}]}
     data: {"type": "status", "status": {"stage": "LLM Request", "message": "Parsing error: not enough values to unpack (expected 3, got 2)", ...}}
     data: {"type": "error", "error": "Failed to parse language model response: not enough values to unpack (expected 3, got 2)"}
     ```
   - Root cause suspected in tool-call handling: OpenRouter is returning a tool-call payload that our parser doesn’t understand. Verify `fetch_non_stream_content` return shape, `tool_calls` unpacking, and the fallback section for unsupported tools.
   - Reproduce by asking the agent for “Best LLMs” with experimental mode enabled; ensure the loop properly re-prompts after executing `FETCH_DATA`.

2. **Blog Tab Hidden / Incomplete**  
   - Experimental mode should expose a “Blog” tab that fetches posts from `https://adam.holter.com/wp-json/wp/v2/posts?page=1&per_page=100` (paginate additional pages).  
   - Current state: nav button added, but no client fetch logic yet; tab doesn’t appear because experimental toggle suppresses all `[data-experimental]` elements by default. After implementing the fetch/display logic in `static/script.js`, confirm `applyExperimentalMode` reveals both Hype and Blog tabs.

## Next Steps
1. Fix tool-call parsing in the agent loop so OpenRouter responses never trigger the unpack error.
2. Implement the blog fetch pipeline (client-side request + optional server proxy) and render cards similar to Hype.
3. Retest experimental mode end-to-end (agent + Hype + Blog).
