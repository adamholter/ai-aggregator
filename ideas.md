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

---

### 7) Interactive Model Comparison Arena (Artificial Analysis-style Charts)

**Rationale:** Artificial Analysis has a great charting experience where users can select specific models to visualize and compare. Building a dedicated comparison page with auto-generated charts powered by AA, OpenRouter, and cross-matched data would give users the same power for custom model selections.

**Implementation outline:**
- Add a new “Compare” tab with a main chart area and model selection sidebar
- Use cached data from multiple sources:
  - AA LLMs (intelligence, speed, pricing)
  - AA media models (ELO scores)
  - OpenRouter catalog (pricing, context length)
  - Cross-match AA ↔ OpenRouter using deterministic string matching (fallback to fuzzy match)
- Default to a curated set of popular models (e.g., GPT-5, Claude, Gemini, Grok) so the page isn't empty on first load
- Chart types using Plotly.js (already loaded):
  - Bar charts: Intelligence index, output speed, cost comparison
  - Scatter plots: Speed vs Cost (log scale), Quality vs Price
  - Radar charts: Multi-metric comparison for 2-4 selected models
  - Line charts: Pricing trends if historical data available
- Model selection UI:
  - Searchable multi-select dropdown (with checkboxes)
  - Group by: Provider/Vendor (OpenAI, Anthropic, Google, Meta, xAI, etc.)
  - Filter by: Price range, Context length, Modalities
  - Quick presets: “Top 5 by Intelligence”, “Fastest under $10/1M”, “Best value”
- When models are selected, auto-generate relevant charts and update in real-time
- Show data source badges (AA, OpenRouter, fal.ai) with tooltips explaining provenance
- “Share this comparison” button using existing `/api/shared-views` infrastructure
- Export options: “Copy as Markdown table”, “Download CSV”, “Save chart image”
- Responsive: On mobile, charts stack vertically; selection panel collapses into drawer
- Main section focused on LLMs initially, but add category switcher for:
  - LLMs (AA benchmarks)
  - Text-to-Image (AA ELO + standardized fal.ai pricing)
  - Text-to-Video (AA ELO + standardized pricing)
  - Use `scripts/standardize_fal_pricing.py` patterns for media model pricing normalization

**Data flow:**
1. Page loads → fetch from `/api/llms`, `/api/openrouter-models`, `/api/fal-models`
2. Cross-match models in-memory on page load (build lookup map)
3. User selects models → re-render charts with selected subset
4. Charts use Plotly.js with existing `plotly-2.27.0.min.js` CDN

---

### 8) Onboarding Tour for First-Time Users

**Rationale:** The dashboard has many tabs, data sources, and features. New users need guided discovery to understand what's available and how to get value quickly.

**Implementation outline:**
- Create tour configuration array: `[{target (selector), title, content, position}]`
- Implement lightweight tour overlay in `static/script.js`:
  - Dark backdrop with highlighted element cutout
  - Tooltip with title, content, prev/next/close buttons
  - Keyboard shortcuts: Escape to close, arrows to navigate
  - Store progress in `localStorage` (`onboarding_completed`, `last_step_index`)
- Tour stops (7 stops, ~2 minutes total):
  1. **Welcome** → Overview: “AI Model Analysis Dashboard aggregates benchmarks, pricing, and news across multiple sources”
  2. **Navigation** → Explain tabs: LLMs, Text-to-Image, Agent, Pinned, Latest, Hype, etc.
  3. **Global Search** → Cmd/Ctrl+K to search across all tabs and sources
  4. **Model Cards** → Double-click for AI-powered analysis, pin for later, add to compare
  5. **Compare Tray** → Select models, click Compare button for charts and tables
  6. **Agent Tab** → Ask questions about models, get recommendations with live tool traces
  7. **Settings** → Configure API keys, available models, filter defaults
- Trigger tour on first visit (check `localStorage` flag)
- Add “Start tour” link in:
  - Empty Pinned state
  - Settings modal footer
  - About page
- Dismissible “Show me around” toast on first load (auto-dismiss after 10 seconds)
- Uses existing modal overlay CSS patterns for consistency
- Mobile-aware: smaller tooltips, positioned to avoid virtual keyboard
