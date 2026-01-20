# Rejected Ideas for AI Dashboard

## From Kilo Code Analysis

**Note**: These ideas were rejected because they were not selected for implementation. They may still be valuable for future consideration but are not currently prioritized.

**Rejection Criteria**: We generally reject ideas that the user can already do just by asking the agent (e.g., estimating costs for a use case, summarizing content manually). We prioritize features that add new interactive capabilities or streamline workflows that are otherwise cumbersome.

---

### 1. Model Comparison Arena with Side-by-Side Testing

**Rationale**: Users want to compare models directly rather than just viewing stats side-by-side. An interactive arena where users can select models and see them compared visually would be more engaging and useful.

**Implementation Outline**:
- Create new `/compare-arena` page (HTML already exists in static/compare-arena.html)
- Add backend API endpoint `/api/compare-arena` that accepts model IDs and fetches their data
- Implement frontend JavaScript to:
  - Allow selecting 2-4 models from any category
  - Display side-by-side cards with key metrics
  - Generate comparison charts using existing Plotly integration
  - Include a "Quick Recommendation" section showing which model wins for each use case
- Add "Compare" button to each model card that adds to comparison list
- Store comparison state in localStorage for persistence

**Files to modify**: `static/compare-arena.html`, `server.py` (add endpoint), `static/script.js` (add comparison logic)

**Estimated Effort**: 4-6 hours

---

## From Codex Repo Scan (Not Selected)

### Saved Analyses Library (Search + Open + Export)

**Rationale**: Analyses are already cached to disk under `analyses/`, but there's no first-class UX to browse/search/reopen them. A library turns one-off analysis into a reusable knowledge base.

**Implementation Outline**:
- Add `GET /api/analyses` (list metadata) and `GET /api/analyses/<id>` (read) backed by `analyses/`
- Add an "Analyses" tab with search + sort (by recency/source/model) and "Open / Copy Markdown / Download"
- Reuse the existing analysis modal rendering logic (show cached analysis without requiring an OpenRouter key)

**Files to modify**: `server.py`, `templates/index.html`, `static/script.js`, `static/styles.css`

---

### Model Permalinks (Deep-Link to a Specific Card + Optional Analysis)

**Rationale**: Sharing currently works for sections/views, not for a specific model. Permalinks make collaboration and "come back later" workflows much easier.

**Implementation Outline**:
- Encode `{section, source/category, stable model identifier}` into URL params (ex: `?section=openrouter-models&model=openai/gpt-5`)
- On load, auto-navigate to the tab and open the model modal
- Add "Copy link" inside the modal and keep URL state in sync on open/close
- If no OpenRouter key is present, still show non-AI details and cached analysis if available

**Files to modify**: `static/script.js`, `templates/index.html`

---

### Other Codex Ideas Already Covered Above

- **Pins 2.0 (collections + notes + edit UX)**: overlaps with "Model Collections & Custom Dashboards" (see the "Model Collections & Custom Dashboards" entry in `rejectedideas.md`).
- **Recently Viewed**: already listed as "Recently Viewed Models".
- **Cost / Usage Estimator**: already listed as "Price Calculator / Usage Estimator" / "Model Cost Calculator & Budget Planner".
- **Bulk actions / multi-select**: already listed as "Bulk Select for Comparison".

---

### 2. Model Trend Tracker & History Visualization

**Rationale**: Users want to see how models have evolved over time - which models are improving, which are falling behind, and what new releases are trending. This would help users make informed decisions about which models to adopt.

**Implementation Outline**:
- Create new `/trends` page with timeline visualization
- Add backend endpoint `/api/trends` that:
  - Aggregates historical data from `analyses/` directory (JSON files with timestamps)
  - Calculates trend metrics (improvement rate, popularity changes)
  - Returns time-series data for visualization
- Implement frontend with Chart.js or Plotly to show:
  - Quality score trends for top models over time
  - Price evolution charts
  - New model release timeline
  - Provider comparison trends
- Add "Trending Up/Down" badges on model cards based on recent performance changes
- Include "What's New" section showing models added in last 30 days

**Files to create**: `static/trends.html`, `static/trends.js`
**Files to modify**: `server.py` (add trends endpoint), `static/index.html` (add Trends nav button)

**Estimated Effort**: 12-16 hours

---

### 3. Smart Model Recommender Quiz

**Rationale**: Users often don't know which model to choose for their specific use case. A guided quiz that asks about their needs (budget, latency requirements, quality priorities, use case) and recommends best model would be very valuable.

**Implementation Outline**:
- Create new `/recommender` page with interactive quiz
- Quiz questions covering:
  - Use case (coding, writing, image generation, etc.)
  - Budget constraints (free tier, low cost, no limit)
  - Speed requirements (instant, moderate, not important)
  - Quality priority (highest quality, balanced, cost-effective)
  - Context length needs
- Implement recommendation algorithm in backend:
  - Weight model scores based on quiz answers
  - Filter by constraints (budget, speed, context)
  - Return top 3 recommendations with explanations
- Display results with:
  - Primary recommendation with detailed justification
  - Alternative options for different trade-offs
  - "Compare" button to see side-by-side
  - "Pin" button to save for later
- Save quiz results to localStorage for future reference

**Files to create**: `static/recommender.html`, `static/recommender.js`
**Files to modify**: `server.py` (add recommendation endpoint), `static/index.html` (add Recommender nav button)

**Estimated Effort**: 6-8 hours

---

### 4. Model Collections & Custom Dashboards

**Rationale**: Users want to organize models into custom collections (e.g., "Best for Coding", "Budget Options", "My Favorites") and switch between different views based on their current project or interest.

**Implementation Outline**:
- Add "Collections" feature to existing Pinned system
- Create backend endpoints:
  - `POST /api/collections` - Create new collection
  - `GET /api/collections` - List user's collections
  - `PUT /api/collections/:id` - Add/remove models from collection
  - `DELETE /api/collections/:id` - Delete collection
- Store collections in `data/collections.json` with structure:
  ```json
  {
    "user_id": {
      "collections": [
        {"id": "uuid", "name": "Best for Coding", "models": [...]},
        {"id": "uuid", "name": "Budget Options", "models": [...]}
      ]
    }
  }
  ```
- Add UI elements:
  - "Collections" dropdown in header
  - "Add to Collection" option in model card context menu
  - Collections panel in Pinned section
  - Quick switch between collections
- Support collection sharing via URL (similar to existing shared views)

**Files to modify**: `server.py` (add collection endpoints), `static/script.js` (add collection UI logic), `static/index.html` (add Collections UI)

**Estimated Effort**: 12-16 hours

---

### 5. Real-Time Model Status & Health Monitor

**Rationale**: Users need to know if models are currently operational, experiencing downtime, or degraded performance. A status dashboard would help them choose reliable models for production use.

**Implementation Outline**:
- Create new `/status` page with health monitoring
- Add backend endpoint `/api/status` that:
  - Pings model APIs (OpenRouter, Replicate, fal.ai) periodically
  - Records response times and success rates
  - Stores status history in `data/status_history.json`
  - Returns current status with last 24h uptime percentage
- Display status information:
  - Overall dashboard health indicator
  - Per-provider status (OpenRouter, Replicate, fal.ai, AA)
  - Per-model status for top models
  - Response time charts
  - Incident log with timestamps and descriptions
- Add status badges to model cards:
  - Green dot = operational
  - Yellow dot = degraded
  - Red dot = down
- Implement automatic status refresh every 60 seconds

**Files to create**: `static/status.html`, `static/status.js`
**Files to modify**: `server.py` (add status monitoring and endpoint), `static/index.html` (add Status nav button)

**Estimated Effort**: 12-16 hours

---

### 6. Enhanced Agent with Saved Conversations & Templates

**Rationale**: Users frequently ask similar questions (e.g., "best model for coding under $5/month"). Saved conversation templates and history would save time and provide better starting points.

**Note**: The "Saved Conversations" portion of this idea was selected and moved to GOODIDEAS.MD. This entry remains here only for the "Templates" portion.

**Implementation Outline** (Templates only):
- Extend existing experimental agent with template system
- Add backend endpoints:
  - `POST /api/agent/templates` - Create template
  - `GET /api/agent/templates` - List templates
  - `DELETE /api/agent/templates/:id` - Delete template
- Add UI elements:
  - "Templates" sidebar with quick-start options
  - "Save as Template" button in agent
- Pre-built templates:
  - "Best model for coding on budget"
  - "Compare top 3 image models"
  - "Fastest LLM under $10/1M tokens"
  - "Best model for long context"

**Files to modify**: `static/experimental-agent.html`, `server.py` (add template endpoints)

**Estimated Effort**: 4-6 hours

---

### 7. Model Cost Calculator & Budget Planner

**Rationale**: Users need to estimate costs for their specific use cases. A calculator that lets them input expected usage and see projected costs across models would help with budgeting.

**Implementation Outline**:
- Create new `/calculator` page with cost estimation tool
- Add backend endpoint `/api/calculate-cost` that:
  - Accepts usage parameters (tokens/day, images/month, etc.)
  - Fetches current pricing from all data sources
  - Calculates monthly costs for each model
  - Returns sorted results with recommendations
- Implement calculator UI with:
  - Usage input sliders (tokens per day, images per month, etc.)
  - Use case presets (chatbot, content generation, image generation)
  - Real-time cost updates as inputs change
  - Breakdown by model category (LLMs, image, video)
  - "Best Value" highlighting
  - Export cost estimate as CSV/PDF
- Add "Calculate Cost" button to model cards that opens calculator pre-filled with that model

**Files to create**: `static/calculator.html`, `static/calculator.js`
**Files to modify**: `server.py` (add cost calculation endpoint), `static/index.html` (add Calculator nav button)

**Estimated Effort**: 6-8 hours

---

### 8. Advanced Search with Natural Language Queries

**Rationale**: The current search only does exact text matching. Users want to ask questions like "models under $5 with good coding ability" and get relevant results.

**Implementation Outline**:
- Enhance existing global search with semantic understanding
- Add backend endpoint `/api/search-semantic` that:
  - Accepts natural language query
  - Uses existing experimental agent tools to interpret query
  - Filters and ranks models based on criteria
  - Returns results with relevance scores
- Implement search UI with:
  - Natural language input (not just keyword search)
  - Query suggestions based on common patterns
  - Results grouped by category
  - "Why this result?" explanation for each match
  - Save search as filter option
- Add "Smart Search" toggle to existing search box
- Cache search results for common queries

**Files to modify**: `server.py` (add semantic search endpoint), `static/script.js` (enhance search UI), `static/index.html` (add Smart Search toggle)

**Estimated Effort**: 8-12 hours

---

### 9. Model Alerts & Watchlist

**Rationale**: Users want to be notified when models they care about change (price drops, new versions released, ranking changes). A watchlist with alerts would keep them informed without manual checking.

**Implementation Outline**:
- Add "Watch" feature to model cards
- Create backend endpoints:
  - `POST /api/watchlist` - Add model to watchlist
  - `GET /api/watchlist` - List watched models
  - `DELETE /api/watchlist/:id` - Remove from watchlist
  - `GET /api/watchlist/alerts` - Get recent alerts
- Store watchlist in `data/watchlist.json` with alert preferences:
  ```json
  {
    "user_id": {
      "models": [
        {"id": "model_id", "alerts": ["price_change", "new_version", "ranking_change"]}
      ]
    }
  }
  ```
- Implement alert checking:
  - Compare current model data with cached baseline
  - Generate alerts when thresholds exceeded
  - Store alerts in `data/alerts.json`
- Add UI elements:
  - "Watch" button on model cards
  - Watchlist panel in Pinned section
  - Alert notifications in header
  - Alert history page

**Files to modify**: `server.py` (add watchlist endpoints and alert checking), `static/script.js` (add watchlist UI), `static/index.html` (add Watch button and alert UI)

**Estimated Effort**: 12-16 hours

---

### 10. Interactive Model Playground (Demo)

**Rationale**: Users want to try models before committing. A playground that lets them test prompts across multiple models side-by-side would be very valuable for evaluation.

**Implementation Outline**:
- Create new `/playground` page with interactive testing
- Add backend endpoint `/api/playground/completions` that:
  - Accepts prompt and list of model IDs
  - Makes parallel API calls to OpenRouter for each model
  - Streams responses back to frontend
  - Handles rate limiting and timeouts
- Implement playground UI with:
  - Prompt input area
  - Model selection (multi-select from available models)
  - Side-by-side response panels
  - Response time display
  - Token count display
  - "Run All" button for parallel testing
  - "Compare" button to generate comparison chart
- Add "Try in Playground" button to model cards
- Save playground sessions to localStorage

**Files to create**: `static/playground.html`, `static/playground.js`
**Files to modify**: `server.py` (add playground endpoint), `static/index.html` (add Playground nav button)

**Note**: This requires user's OpenRouter API key, which app already supports via Settings.

**Estimated Effort**: 12-16 hours

---

### 11. Model Documentation Hub

**Rationale**: Each model has documentation, but it's scattered across provider sites. A centralized documentation hub with quick links and key information would improve discoverability.

**Implementation Outline**:
- Create new `/docs` page with documentation index
- Add backend endpoint `/api/docs` that:
  - Scrapes or fetches documentation links from provider APIs
  - Caches documentation metadata
  - Returns organized list by model
- Implement documentation UI with:
  - Searchable model documentation index
  - Quick links to official docs, API references, examples
  - Community resources (tutorials, blog posts)
  - Model-specific notes from dashboard's analyses
  - "Contribute" link to suggest documentation
- Add "Docs" button to model cards linking to model-specific documentation page

**Files to create**: `static/docs.html`, `static/docs.js`
**Files to modify**: `server.py` (add docs endpoint), `static/index.html` (add Docs nav button)

**Estimated Effort**: 8-12 hours

---

### 12. Performance Benchmark Comparison Tool

**Rationale**: Users want to see how models perform on specific benchmarks (MMLU, HumanEval, etc.) rather than just aggregate scores. A detailed benchmark comparison would help them choose models for their specific tasks.

**Implementation Outline**:
- Create new `/benchmarks` page with detailed benchmark data
- Add backend endpoint `/api/benchmarks` that:
  - Fetches detailed benchmark data from Artificial Analysis API
  - Parses individual benchmark scores (MMLU, HumanEval, GSM8K, etc.)
  - Returns structured data for comparison
- Implement benchmark comparison UI with:
  - Benchmark selector (MMLU, HumanEval, GSM8K, etc.)
  - Model selection (multi-select)
  - Radar charts showing multi-dimensional performance
  - Historical benchmark trends where available
  - Benchmark descriptions and what they measure
- Add "Benchmarks" section to model cards showing top 3 benchmark scores
- Add "Compare Benchmarks" button for side-by-side view

**Files to create**: `static/benchmarks.html`, `static/benchmarks.js`
**Files to modify**: `server.py` (add benchmarks endpoint), `static/index.html` (add Benchmarks nav button)

**Estimated Effort**: 12-16 hours

---

### 13. Dark Mode with System Preference Detection

**Rationale**: The current theme toggle requires manual switching. Automatically detecting and respecting user's system preference would improve UX.

**Implementation Outline**:
- Add CSS media query for `prefers-color-scheme: dark`
- Implement theme detection in JavaScript:
  - Check `window.matchMedia('(prefers-color-scheme: dark)')`
  - Listen for changes with `addEventListener('change', ...)`
  - Save preference to localStorage
  - Fall back to manual toggle if user explicitly sets preference
- Add "Auto" option to theme toggle dropdown
- Update existing theme toggle to cycle: Light → Dark → Auto → Light
- Ensure all components respect system theme in "Auto" mode

**Files to modify**: `static/styles.css` (add dark mode media queries), `static/script.js` (add system preference detection), `static/index.html` (update theme toggle)

**Estimated Effort**: 1-2 hours

---

### 14. Keyboard Shortcuts & Command Palette

**Rationale**: Power users want faster navigation. Keyboard shortcuts and a command palette (like VS Code) would significantly improve efficiency.

**Implementation Outline**:
- Implement keyboard shortcuts:
  - `Ctrl/Cmd + K` - Open command palette
  - `Ctrl/Cmd + /` - Focus search
  - `Ctrl/Cmd + 1-9` - Switch tabs
  - `Ctrl/Cmd + P` - Open pinned
  - `Ctrl/Cmd + A` - Open agent
  - `Esc` - Close modals
- Create command palette modal:
  - Searchable command list
  - Commands for navigation, actions, settings
  - Keyboard navigation within palette
- Add keyboard shortcut hints in UI (tooltips)
- Store custom shortcuts in localStorage
- Add command palette trigger button in header

**Files to create**: `static/command-palette.js`
**Files to modify**: `static/script.js` (add keyboard handlers), `static/index.html` (add command palette modal)

**Estimated Effort**: 2-4 hours

---

### 15. Export & Share Custom Views

**Rationale**: Users want to share their filtered/sorted views with others. The existing share feature only works for full page views. Custom view sharing would enable collaboration.

**Implementation Outline**:
- Extend existing shared views system to support custom filters
- Add "Share This View" button to each section:
  - Captures current filter state
  - Captures sort order
  - Captures selected models
  - Generates shareable URL with encoded state
- Implement view decoding:
  - Parse URL parameters on page load
  - Apply filters and sorting from shared view
  - Show "Viewing shared view" banner
- Add "Copy Share Link" to context menu
- Support view customization:
  - Add notes to shared view
  - Set expiration time
  - Password protection (optional)

**Files to modify**: `server.py` (extend shared views), `static/script.js` (add share view logic), `static/index.html` (add Share View button)

**Estimated Effort**: 4-6 hours

---

### 16. Mobile-Optimized Interface

**Note**: This idea was selected and moved to GOODIDEAS.MD. This entry remains here for reference.

**Estimated Effort**: 12-16 hours

---

### 17. Model Favorites with Quick Access

**Rationale**: Users have models they use frequently. A favorites system with keyboard shortcuts and one-click access would save time.

**Implementation Outline**:
- Add "Favorite" star to model cards
- Create backend endpoints:
  - `POST /api/favorites` - Add/remove favorite
  - `GET /api/favorites` - List favorites
- Store favorites in `data/favorites.json`
- Add UI elements:
  - Star icon on model cards
  - Favorites panel in header dropdown
  - Quick access shortcuts (Ctrl/Cmd + 1-5 for top 5 favorites)
  - Favorites section in Pinned tab
- Sort favorites by usage frequency
- Show favorite count on provider cards

**Files to modify**: `server.py` (add favorites endpoints), `static/script.js` (add favorites UI), `static/index.html` (add favorite stars)

**Estimated Effort**: 2-4 hours

---

### 18. Real-Time Data Updates with WebSocket

**Rationale**: Currently users must manually refresh to see new data. Real-time updates via WebSocket would keep the dashboard current automatically.

**Implementation Outline**:
- Add WebSocket support to Flask (using Flask-SocketIO)
- Create WebSocket events:
  - `data_updated` - Broadcast when new data arrives
  - `model_changed` - Broadcast when model data changes
  - `new_model` - Broadcast when new model is added
- Implement client-side WebSocket connection:
  - Connect on page load
  - Listen for update events
  - Refresh affected sections automatically
  - Show notification when data updates
- Add "Live Updates" indicator in header
- Allow users to disable auto-refresh in settings
- Implement optimistic UI updates with rollback on error

**Files to modify**: `requirements.txt` (add flask-socketio), `server.py` (add WebSocket support), `static/script.js` (add WebSocket client)

**Estimated Effort**: 16-20 hours

---

### 19. Model Comparison Matrix

**Rationale**: Users want to compare many models at once in a table format. A comparison matrix with sortable columns would be more efficient than clicking through individual cards.

**Implementation Outline**:
- Create new `/matrix` page with comparison table
- Add backend endpoint `/api/matrix` that:
  - Accepts list of model IDs
  - Fetches all metrics for each model
  - Returns matrix data with normalized values
- Implement matrix UI with:
  - Sortable columns (click header to sort)
  - Filterable rows (text search on any column)
  - Highlight best/worst values in each column
  - Heatmap coloring for quick visual comparison
  - Export to CSV/Excel
  - Column visibility toggle
- Add "Open in Matrix" button to model selection
- Support saving matrix configurations

**Files to create**: `static/matrix.html`, `static/matrix.js`
**Files to modify**: `server.py` (add matrix endpoint), `static/index.html` (add Matrix nav button)

**Estimated Effort**: 6-8 hours

---

### 20. Agent-Powered Model Insights

**Rationale**: Users want AI-generated insights about models beyond raw data. Automatic insights (strengths, weaknesses, best use cases) would add value.

**Implementation Outline**:
- Add "Insights" section to model analysis modal
- Create backend endpoint `/api/insights` that:
  - Takes model data as input
  - Calls OpenRouter API with prompt to generate insights
  - Returns structured insights (strengths, weaknesses, use cases)
- Implement insights display:
  - Strengths list with icons
  - Weaknesses list with icons
  - Best use cases with descriptions
  - Comparison to similar models
  - Confidence score for each insight
- Cache insights in `data/insights.json` with TTL
- Add "Generate Insights" button to model cards
- Show insight badges on cards (e.g., "Best for coding", "Fastest")

**Files to modify**: `server.py` (add insights endpoint), `static/script.js` (add insights display), `static/index.html` (add insights UI)

**Estimated Effort**: 12-16 hours

---

## From Claude Opus Analysis

### 21. Recently Viewed Models

**Rationale**: Users often revisit the same models repeatedly but have no way to quickly find them again. A "Recently Viewed" section would solve this.

**Implementation Outline**:
- Track model card double-clicks (analysis opens) in localStorage
- Store last 20 viewed models with timestamps
- Add "Recently Viewed" quick-access section above current tab content (collapsible)
- Show model name, category, and "X minutes ago" timestamp
- One-click to jump directly to that model's analysis
- Clear history button

**Estimated Effort**: 2-3 hours

---

### 22. Quick Filter Presets for LLMs

**Rationale**: Users frequently want to find "cheapest", "fastest", or "best quality" models. Currently requires manual sorting and scrolling.

**Implementation Outline**:
- Add preset filter buttons above LLM grid: "Cheapest", "Fastest", "Best Quality", "Best Value" (quality/cost ratio)
- One click applies filter + sort
- "Best Value" calculates quality_index / cost ratio
- Visual indication of active preset
- Can be combined with search
- Extend to other categories where metrics exist (Text-to-Image ELO, etc.)

**Estimated Effort**: 2-4 hours

---

### 23. Price Calculator / Usage Estimator

**Rationale**: LLM pricing is confusing (per-token). Users want to know "how much will 1000 requests cost me?" without mental math.

**Implementation Outline**:
- Add calculator button/panel to LLM section
- Input fields: average input tokens, average output tokens, requests per day/month
- Shows estimated daily/monthly cost for currently visible models
- Comparison table: "Model A: $X/month, Model B: $Y/month"
- Can select specific models to compare costs
- Highlight cheapest option meeting quality threshold

**Note**: Similar to rejected idea #7 but simpler scope.

**Estimated Effort**: 4-6 hours

---

### 24. Export Pinned Items

**Rationale**: Users curate lists of models for projects/teams but can't export them. Useful for documentation, sharing, procurement discussions.

**Implementation Outline**:
- Add "Export" button to Pinned tab
- Export formats: JSON (full data), CSV (summary), Markdown (readable list)
- Include: model name, provider, key metrics, user notes, pin timestamp
- Option to export all pins or specific collection
- Import function to restore from JSON

**Estimated Effort**: 2-3 hours

---

### 25. Model Comparison Permalinks

**Rationale**: Users want to share model comparisons with teammates. Currently comparisons are session-only.

**Implementation Outline**:
- When compare modal opens, generate shareable URL with model IDs encoded
- URL format: `?compare=model1,model2,model3`
- On page load, detect compare param and auto-open comparison
- Copy link button in compare modal
- Works across all categories

**Estimated Effort**: 2-3 hours

---

### 26. Bulk Select for Comparison

**Rationale**: Adding models to compare tray one-by-one is tedious. Users should be able to checkbox multiple models and add all at once.

**Implementation Outline**:
- Add checkbox to each model card (subtle, top-left corner)
- Floating action bar appears when 2+ selected: "Compare Selected (N)" button
- Shift+click for range selection
- "Select all visible" option in section header
- Clear selection on tab change or explicit clear

**Estimated Effort**: 3-4 hours

---

### 27. "Similar Models" Suggestions

**Rationale**: When viewing a model's analysis, users often wonder "what else is like this?" Currently requires manual searching.

**Implementation Outline**:
- In model analysis modal, add "Similar Models" section
- Compute similarity based on: same category, similar quality_index (±10%), similar price range (±50%), same provider optional
- Show top 5 similar models with key differentiators highlighted
- One-click to view their analysis
- Works for LLMs initially, extend to image models using ELO

**Estimated Effort**: 3-4 hours

---

### 28. Collapsible Provider Sections

**Rationale**: OpenRouter, Replicate, and fal.ai tabs have many models. Users often want to focus on one provider's offerings.

**Implementation Outline**:
- Group models by provider within each tab
- Collapsible sections: "OpenAI (12 models)", "Anthropic (8 models)", etc.
- Expand/collapse all toggle
- Remember collapsed state in localStorage
- Provider filter dropdown as alternative

**Estimated Effort**: 3-4 hours

---

### 29. Model Statistics Dashboard

**Rationale**: Users lack a high-level view of the AI model landscape. "How many LLMs exist? What's the average price? How has this changed?"

**Implementation Outline**:
- Add "Stats" mini-section or modal accessible from header
- Aggregate stats: total models per category, price ranges, speed distributions
- Charts using existing Plotly: price histogram, quality vs cost scatter
- "Newest this week" count per category
- Provider breakdown pie chart

**Estimated Effort**: 4-6 hours

---

### 30. Live Latency Tester ("Ping the Provider")

**Rationale**: Static benchmarks are useful but don't reflect real-time conditions.

**Rejection Reason**: Can be approximated by asking the agent to "test response time" or just running a request.

---

### 31. Instant Content Insights

**Rationale**: Summarizing feed items inline.

**Rejection Reason**: Redundant with Agent capabilities. User can just copy-paste text to Agent or ask Agent to read the link.
