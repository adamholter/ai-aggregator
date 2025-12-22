## Repo Context (What this app is)

AI Model Analysis Dashboard: a Flask backend (`server.py`) serving a static HTML/JS frontend (`static/index.html`, `static/script.js`, `static/styles.css`). The app aggregates “model cards” across sources (Artificial Analysis leaderboards, OpenRouter catalog, fal.ai catalog, Replicate catalog, plus Blog/TestingCatalog/Monitor/Latest/Hype feeds), supports search/filter/sort, pins, shareable views, and chart-based comparisons. Optional AI features (agent chat, model analyses, AI filtering, model matching) use OpenRouter via a user-supplied key stored in localStorage.

### Main User Flows

- Browse tabs → search/sort/filter → click a card → modal with details (and optional AI analysis).
- Pin cards → view in Pinned tab (localStorage when logged out, server-backed when logged in).
- Share the current view via `/api/shared-views` → link opens the same view.
- Build a “compare set” of up to 8 models → open chart modal → render Plotly charts via `/api/charts/model-comparison`.
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

### 1) Alerts & Watchlists (keywords, vendors, models) + In‑Browser Notifications

**Rationale:** Users want to know when *something they care about* ships (e.g., “gpt-5”, “flux”, “gemini”, “video”). A watchlist turns the dashboard into an always-on radar without needing AI.

**Implementation outline:**
- Add an “Alerts” tab: create/edit watch rules (keyword include/exclude, source toggles, vendor/model id match), plus “Test against current Latest”.
- Background polling (configurable interval) against `/api/latest-preview` or `/latest` and local diffing with persistent “seen” IDs in `localStorage`.
- Toast + optional Notifications API (permission-gated); alerts list is clickable cards that deep-link to the relevant tab or external URL.

### 2) OpenRouter Cost Calculator + Budget Scenarios

**Rationale:** Model selection is often a budget question. A built-in calculator lets users turn pricing into “$/request/day/month” quickly, and compare multiple models side-by-side.

**Implementation outline:**
- Add a “Cost” tab: choose model(s) from cached OpenRouter catalog; enter prompt/output tokens + requests/day; show daily/monthly cost.
- Allow “copy as shareable link” (serialize scenario in query params) and export the comparison table to CSV/Markdown.

### 3) Change Tracker: “New Models” + “Pricing/Context Changes” Since Last Visit

**Rationale:** “What changed?” is more than new releases—pricing and context windows change too. A change tracker makes OpenRouter (and fal.ai) updates actionable.

**Implementation outline:**
- Store lightweight per-source snapshots in `localStorage` (e.g., `openrouter:id -> {pricing, context_length, modalities}`).
- Add a “Changes” view with filters: New, Changed, Price up/down, Context up/down; show diffs inline on cards.
- Optional: one-click “Add changed models to Compare”.

### 4) Cross-Source Linking Without AI Keys (“Where Can I Run This?”)

**Rationale:** The modal tries to cross-link AA ↔ OpenRouter but currently relies on `/api/model-match` (AI key). Users should get cross-source availability and pricing *without* needing an AI key.

**Implementation outline:**
- Implement deterministic matching fallback in `static/script.js` using the existing local similarity/index helpers (`findOpenRouterMatch`) when AI matching fails.
- In AA model modals: show best-match OpenRouter card + pricing + context + link; label as “heuristic match” with confidence.
- In OpenRouter modals: match back to any loaded AA data and show benchmark metrics when available.

### 5) Compare Report (Charts + Table + “Copy as Markdown”)

**Rationale:** Charts are useful, but decisions need a readable report. A compare report turns the compare set into something you can paste into a doc or share in Slack/email.

**Implementation outline:**
- Extend the existing chart modal to include a sortable metrics table (normalized units, highlight best/worst).
- Add export buttons: “Copy Markdown”, “Download CSV”, “Share compare link”.

### 6) Pinned Collections as Real Shortlists (notes, tags, share)

**Rationale:** Pins are currently binary. Turning pins into shortlists (collections + notes + lightweight scoring) supports real evaluation workflows.

**Implementation outline:**
- Add “Add to collection” + “note” UI on pin; filter Pinned by collection; quick search within Pinned.
- Add “Share collection” as a shared view snapshot; export collection to Markdown/CSV for handoff.
