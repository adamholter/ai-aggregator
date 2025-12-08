# Handoff / Ground Rules

## What the next agent must know (TL;DR)
- **Workflow:** Every change must be committed and pushed to `main`, then trigger the Render deploy hook: `https://api.render.com/deploy/srv-d3p4d4fdiees73cdjqk0?key=KkLyUbGA60s`.
- **Tools (agent runtime):**
  - `fetch_data(categories: list[str], recency?: day|week|month|year)` — cached datasets. Categories: `text-to-image`, `image-editing`, `text-to-video`, `image-to-video`, `text-to-speech`, `llms`, `openrouter`, `fal`, `replicate`, `latest`, `hype`, `monitor`, `blog`, `testing-catalog`.
  - `ask_perplexity(query: str)` — live web search.
  - Vision: the agent can see attached images; do not claim otherwise.
- **UI:** The right-hand “Data Sources” / “Agent Activity Log” column is sticky; the agent iframe has a fullscreen toggle.
- **Prompting:** The system prompt now includes a category cheat sheet and instructions to fetch only relevant categories (use recency when asked for “latest”).

## Setup prompt you can hand to another agent
Use this when spinning up a new helper so they follow house rules:

```
You are working in the AI Model Analysis Dashboard repo.
Rules:
- Every change: git add -> git commit -> git push origin main.
- After pushing, trigger deploy: curl -X POST "https://api.render.com/deploy/srv-d3p4d4fdiees73cdjqk0?key=KkLyUbGA60s".
- Never revert user changes. Keep edits ASCII unless the file already uses Unicode.
- Agent toolchain (server): fetch_data(categories, recency?) with categories [text-to-image, image-editing, text-to-video, image-to-video, text-to-speech, llms, openrouter, fal, replicate, latest, hype, monitor, blog, testing-catalog]; ask_perplexity(query) for web search. Agent can see images.
- Fetch only relevant categories; add recency for “latest” asks.
```

## Current open concerns
- Agent may still miss leaderboard #1 results if upstream caches lack them. If results look off, hit `/api/fetch?tabs=text-to-image` (or other tabs) to confirm payloads before blaming prompt logic.
- If the Testing Catalog ever regresses: confirm `/api/testing-catalog` includes merged `history`; ensure `static/script.js` consumes merged items; hard refresh if UI looks stale.

## UI sync reminder
If frontend assets change, ensure the built files under `static/` are updated and the browser cache is refreshed. A stale bundle can mask fixes.
