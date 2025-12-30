## Repo Context (What this app is)

AI Model Analysis Dashboard: a Flask backend (`server.py`) serving a static HTML/JS frontend (`static/index.html`, `static/script.js`, `static/styles.css`). The app aggregates "model cards" across sources (Artificial Analysis leaderboards, OpenRouter catalog, fal.ai catalog, Replicate catalog, plus Blog/TestingCatalog/Monitor/Latest/Hype feeds), supports search/filter/sort, pins, shareable views, and chart-based comparisons. Optional AI features (agent chat, model analyses, AI filtering, model matching) use OpenRouter via a user-supplied key stored in localStorage.

### Main User Flows

- Browse tabs → search/sort/filter → click a card → modal with details (and optional AI analysis).
- Pin cards → view in Pinned tab (localStorage when logged out, server-backed when logged in).
- Share the current view via `/api/shared-views` → link opens the same view.
- Build a "compare set" of up to 8 models → open chart modal → render Plotly charts via `/api/charts/model-comparison`.
- Agent tab embeds `/experimental-agent` (separate UI in `static/agent.html` + `static/agent.js`) and streams via `/api/agent-exp`.

### Core Data Shapes (high-level)

- **LLM (Artificial Analysis)**: `{name, model_creator:{name}, evaluations:{...}, pricing:{price_1m_input_tokens, price_1m_output_tokens}, median_output_tokens_per_second, median_time_to_first_token_seconds, context_length...}`
- **AA media models**: `{name, model_creator:{name}, elo, rank, ci95, categories:[{style_category|subject_matter_category, elo...}]...}`
- **OpenRouter models**: `{id, name, base_name, vendor, created, created_at, description, context_length, pricing:{prompt, completion, request...}, architecture:{input_modalities...}...}`
- **fal.ai models**: `{id, title, category, date, licenseType, tags, modelUrl, creditsRequired...}`
- **Replicate models**: `{id, name, owner, description, run_count, created_at, latest_version_created_at...}`
- **Feed entries (Latest/Hype/Blog/TestingCatalog/Monitor)**: generally `{title/name, url/link, excerpt/summary, timestamp/created_at...}` with per-source extras.
- **Pins (server)**: stored in `data/pins.json` keyed by user id; entries include `{id, key, category, item, created_at, note?, collection?}` (front-end also keeps a local array under `dashboard-pinned-items`).
- **Shared views (server)**: stored in `data/shared_views.json` with TTL; created by `/api/shared-views` and loaded by `/api/shared-views/<id>`.

### Run / Deploy

- Local: `pip install -r requirements.txt` then `python3 server.py` (defaults to `PORT=8765`).
- Production: `gunicorn server:app ...` (see `Procfile`), typical Render-style deployment. `runtime.txt` pins Python `3.11.9`.

---

## Shippable Product Features (I can implement end-to-end here)

### 1) "What's New" Toast Notifications

**Rationale:** Users want to know what changed since their last visit—new models, pricing updates, context window changes—without navigating to a separate alerts view or setting up watch rules.

**Implementation outline:**
- On page load, background-fetch the latest data from all sources
- Compare against a locally-stored snapshot from the previous visit (persistent in localStorage)
- Detect: new models added, pricing changes (up/down), context length changes, new ELO rankings
- Display a toast notification: "3 new models, 2 price changes since your last visit" with clickable items
- Toast persists until dismissed or items are clicked
- Snapshot updates after each session; stores minimal data (model IDs, prices, timestamps)

### 2) Interactive Model Comparison Arena (Composable with AI Assistant)

**Rationale:** Artificial Analysis has excellent charting for model comparisons. A dedicated, composable comparison page that combines data from multiple sources—augmented with an AI assistant that can modify the page in real-time—would give users powerful analysis capabilities.

**Key features:**
- Dedicated comparison page with charts and model selection
- Sidebar AI assistant with full context of the page that can:
  - Write and edit explanatory text sections
  - Add, modify, or remove charts
  - Answer questions about the data being shown
  - Suggest new comparisons based on Artificial Analysis patterns
- Multi-source data: Artificial Analysis benchmarks, OpenRouter catalog, cross-matched fal.ai models
- Standardized pricing for media models (using existing standardization patterns)
- Shareable and exportable

### 3) Onboarding Tour for First-Time Users

**Rationale:** The dashboard has many tabs, data sources, and features. New users need guided discovery to understand what's available and how to get value quickly.

**Implementation outline:**
- Step-by-step guided tour overlay that highlights key UI elements
- Covers: navigation, search, model cards and interactions (pin, compare, analyze), the agent tab, settings
- Progress tracking so users can resume or skip
- Triggered automatically for first-time visitors; accessible on-demand from settings
- Mobile-responsive with appropriate positioning
