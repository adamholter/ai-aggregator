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

### 1) Zero-Config “Demo Mode” + Graceful Fallbacks

**Rationale:** Right now, some tabs hard-fail without server env keys (notably Replicate + Hype + Artificial Analysis). A demo/fallback mode makes the dashboard usable immediately with no manual setup.

**Implementation outline:**
- Add a backend “capabilities” endpoint (e.g. `/api/capabilities`) that reports which integrations are live vs fallback.
- Make `/api/replicate-models` use the existing `data/fallback/replicate_models.json` when `REPLICATE_API_KEY` is missing or upstream fails.
- Make `/api/hype` return a safe empty payload + message when Supabase keys are missing (instead of 503), and optionally load a local fallback JSON file.
- For Artificial Analysis endpoints, add explicit “demo dataset” fallbacks (clearly labeled synthetic/sample) so LLM + media tabs can render without `ARTIFICIAL_ANALYSIS_API_KEY`.
- Frontend: show a non-intrusive banner when the app is in fallback/demo mode; link to a “Status” panel.

### 2) “Insights” Tab: Correlations, Outliers, and Value Picks (No AI Key Required)

**Rationale:** The backend already has `/api/correlation-analysis` and `/api/smart-insights`, but the UI doesn’t surface them. This unlocks data-science style discovery inside the dashboard.

**Implementation outline:**
- Add a new nav tab + section (e.g. “Insights”) in `static/index.html`.
- UI controls: dataset selector (LLMs/OpenRouter/Replicate/fal/etc), metric toggles, and a “Run analysis” button.
- Render: correlation table + top insights + optional Plotly scatter/heatmap visualizations (Plotly already loaded).
- Improve backend endpoints (if needed) to accept direct item payloads (so Insights works even if the cache isn’t warmed).
- Add tests for the new/updated endpoints using small synthetic datasets (no external calls).

### 3) Latest Feed Reliability Fix (“New stuff should show up”)

**Rationale:** `HANDOFF.md` flags that Latest sometimes misses new OpenRouter/Replicate items even when their tabs show them. Fixing this improves trust in the primary “what changed” view.

**Implementation outline:**
- Audit `generate_latest_feed_payload()` timestamp selection per source.
- Adjust “first-seen” timestamp assignment for items missing upstream dates so they don’t get placed outside short windows after long downtime.
- Add regression tests for Latest-window filtering with missing timestamps.

### 4) Account + Pins: Secure Auth + Auto-Sync Local Pins on Login

**Rationale:** The UI already supports login and server-backed pins, but registration stores plaintext passwords and local pins can be lost when a user signs in. Fixing both improves trust and cross-device continuity.

**Implementation outline:**
- Hash passwords at registration (`werkzeug.security.generate_password_hash`) and auto-migrate plaintext entries on successful login.
- Add a “Sync local pins” merge step after login: upload any local pins missing on the server, then optionally clear local pins.
- Add tests for register/login, password migration, and pin CRUD.

### 5) Snapshot Import/Export (Portable Dashboards)

**Rationale:** Sharing links is great, but a portable snapshot enables offline demos, reproducible comparisons, and long-term archiving without relying on server TTLs.

**Implementation outline:**
- Add “Export snapshot” (JSON) combining: current tab datasets (or all loaded datasets), pinned items, compare set, and saved view state.
- Add “Import snapshot” file upload to restore state entirely client-side.
- Optional: server endpoint to store snapshots for logged-in users, with cleanup.

### 6) Better Filtering UX: Numeric Ranges + “Value Score” Sorting

**Rationale:** The dashboard has search + sorting but limited constraint filtering. Adding numeric filters and composite ranking helps users converge on “best model for my budget/latency”.

**Implementation outline:**
- LLM tab: min intelligence/coding, max price (input/output), min speed, min context length.
- OpenRouter tab: price range, context length, modality toggles, vendor quick chips.
- Compute and display a “value score” (user-adjustable weights) and add as a sort option; persist weights in localStorage.

### 7) Developer/Deploy Quality: Make Local Runs Match Production

**Rationale:** `run_server.sh` is hardcoded to a local path, and `server.py` defines functions after the `__main__` `app.run()` call (so some endpoints can break when running via `python server.py`). Fixing this reduces “works on Render but not locally” bugs.

**Implementation outline:**
- Fix `run_server.sh` to use the repo directory (relative) and default to `PORT=8765` (or align docs).
- Move the `if __name__ == '__main__':` block to the end of `server.py` so all functions are defined before `app.run()`.
- Update README port/docs consistency if needed.
