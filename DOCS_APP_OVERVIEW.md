# AI Model Analysis Dashboard — Feature Overview

## What It Is
- Web dashboard that unifies multiple frontier model catalogs (Artificial Analysis, OpenRouter, Fal.ai, Replicate) in one interface.
- Built with **Flask** backend + vanilla JS/CSS frontend; deployable on Render/other PaaS.
- Provides both read-only data exploration and optional, user-supplied AI analysis/tooling.

## Data Sources & Tabs
- **LLMs (Artificial Analysis)**: intelligence/speed/price benchmarks, filtering & sorting.
- **Text-to-Image / Image Editing / Text-to-Speech / Text-to-Video / Image-to-Video**: media models from Artificial Analysis with performance metrics and source badges.
- **Fal.ai**: latest model catalog with categories, filters, and normalized URLs.
- **Replicate**: official collection models fetched with pagination (`page`, `page_size`) to avoid timeouts; categorized heuristically (image/video/audio/etc).
- **OpenRouter**: full model index with provider filters, search, metadata, and cross-source matching.
- **AI Agent**: conversational assistant that references cached datasets and (optionally) performs web search/fetch-data tooling.
- **About**: branded profile for Adam Holter with links, portrait, and support CTAs.

## Backend Highlights (`server.py`)
- Environment-driven configuration:
  - `ARTIFICIAL_ANALYSIS_API_KEY`, `REPLICATE_API_KEY`, `OPENROUTER_API_KEY` (catalog only), optional `MAX_REPLICATE_MODELS`.
- User-supplied OpenRouter key enforcement:
  - Agent, analysis, model-match, intelligent query endpoints require `Authorization: Bearer <user-key>` header.
  - Server key used only for `/api/openrouter-models`.
- Data caching layer with file persistence for analyses and model matches.
- Streaming support via SSE for model analyses and Replicate pagination.
- CLI args (`--port`, `--host`, `--debug`) override env defaults for local runs.

## Frontend Highlights (`static/`)
- **Settings modal**:
  - Manage available/fallback OpenRouter models.
  - Collects user OpenRouter key (stored in `localStorage`, never sent to server except in request header).
  - Toast notifications for missing key or API errors.
- Section navigation with lazy data loading and local caching.
- Modal-based model view with overview, OpenRouter data, AI analysis tab (supports cached data + regenerate flow).
- Responsive theming (light/dark/source); theme toggle cycles states.
- Toast + streaming UI helpers for contextual feedback.

## AI Analysis & Agent Flow
1. User selects model → front-end checks cached analysis.
2. Missing or regenerate requests call `/api/model-analysis` (requires user OpenRouter key).
3. Backend fetches relevant datasets, builds prompt, streams OpenRouter response.
4. Results persisted in `analyses/` (JSON + timestamped Markdown) for quick reuse.
5. AI Agent uses same key requirements; can call `FETCH_DATA` and optional web search tool.

## Deployment Notes
- `requirements.txt` pinned to versions compatible with Python 3.13 (Render default) plus `gunicorn`.
- `runtime.txt` set to `python-3.11.9` (optional; Render still using 3.13).
- Start command: `gunicorn server:app`.
- Environment variables must be configured on Render (no secrets in repo).
- Replicate endpoint uses paginated requests to avoid worker timeouts; further pages fetched via query params.

## Security & Privacy
- User OpenRouter keys stored client-side only; server refuses inference requests without header.
- Server-side keys limited to catalog access, not inference.
- Toast warnings help ensure users know when a key is required.

## Known Considerations
- Large Replicate catalog requires multiple paged requests for full coverage.
- Cached analyses may display even without user key (read-only); regenerating requires key.
- OpenRouter `/models` fetch still depends on server key; rotate as needed.

## Useful Files
- `server.py`: API routes, caching, analysis orchestration.
- `static/index.html` / `static/script.js` / `static/styles.css`: UI/UX.
- `run_server.sh`: helper script for local startup.
- `DEPLOYMENT_PLAN.md`: step-by-step hosting guide.
- `requirements.txt` & `runtime.txt`: deployment dependencies.
