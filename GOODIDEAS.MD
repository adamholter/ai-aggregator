# Good Ideas for AI Dashboard

## From Kilo Code Analysis

### 1. [x] Mobile-Optimized Interface

**Rationale**: The current interface works on mobile but isn't optimized. A dedicated mobile view with bottom navigation and swipe gestures would significantly improve mobile UX.

**Implementation Outline**:
- Add mobile-specific CSS with media queries
- Implement bottom navigation bar for mobile:
  - Tab icons instead of text
  - Swipe gestures for tab switching
  - Floating action button for common actions
- Optimize model cards for mobile:
  - Tap to expand (instead of double-click)
  - Swipe actions (pin, share, watch)
  - Compact view option
- Add mobile-specific features:
  - Pull-to-refresh for data
  - Hamburger menu for settings
  - Touch-friendly controls
- Detect mobile and auto-switch layout
- Horizontal scrollable tab bar with visual scroll indicators (arrows or fade) to show more tabs exist
- Ensure minimum 44px touch targets on all interactive elements per Apple HIG

**Files to modify**: `static/styles.css` (add mobile styles), `static/script.js` (add touch handlers), `static/index.html` (add mobile UI elements)

---

### 2. [x] Enhanced Agent with Saved Conversations & History

**Rationale**: Users frequently ask similar questions (e.g., "best model for coding under $5/month"). Saved conversation history would save time and provide better starting points.

**Implementation Outline**:
- Extend existing experimental agent with:
  - Conversation history saved to `data/conversations.json`
  - Conversation search and filtering
  - Ability to resume past conversations
- Add backend endpoints:
  - `POST /api/agent/conversations` - Save conversation
  - `GET /api/agent/conversations` - List saved conversations
  - `GET /api/agent/conversations/:id` - Get specific conversation
  - `DELETE /api/agent/conversations/:id` - Delete conversation
- Add UI elements:
  - "Save Conversation" button in agent
  - Conversation history panel with search
  - "Resume" button to continue from saved conversation
  - "Fork" button to create new conversation from existing one
- Auto-save conversations periodically
- Support conversation sharing via URL (similar to existing shared views)

**Files to modify**: `static/experimental-agent.html`, `server.py` (add conversation endpoints), `static/script.js` (add conversation UI logic)

**Estimated Effort**: 8-12 hours

---

### 3. [x] Consolidate Source Mode into Light/Dark Themes

**Rationale**: Currently Source Mode exists as a separate third option, but it should be a core part of the application. Light Mode should become "Light Source Mode" with source-colored accents, and Dark Mode should gain source colors too. This makes the source-coding a universal feature rather than an afterthought.

**Implementation Outline**:
- Merge Source Mode styling into Light theme (Light Mode = Light Source Mode)
- Add source color coding to Dark theme (new Dark Source Mode)
- Remove the separate "Source Mode" toggle option
- Keep only Light/Dark toggle (both now have source colors)
- Add "auto" option that follows system preference (`prefers-color-scheme`)
- Ensure all source legend colors have sufficient contrast in both themes
- Update CSS variables so source colors work universally

**Files to modify**: `static/styles.css` (merge source mode into both themes), `static/script.js` (simplify theme toggle logic)

---

### 4. [x] Fix Broken Filters

**Rationale**: Several filters are broken, especially in the OpenRouter tab and possibly other sections. These need systematic testing and fixing to ensure users can actually filter the data.

**Implementation Outline**:
- Audit all filter controls across every tab (LLMs, OpenRouter, Replicate, fal.ai, etc.)
- Test each filter option to identify which ones don't work
- Document the broken filters and their symptoms
- Fix the underlying filter logic in `script.js`
- Ensure filter state is properly maintained when switching tabs
- Add defensive checks for missing/null data that might break filters
- Test sort options as well since they share similar code paths

**Files to modify**: `static/script.js` (fix filter functions), potentially `server.py` (if backend filtering is involved)

---

### 5. [x] Try this model in Agent Mode

**Rationale**: To truly evaluate a model, users need to interact with it. Currently, switching to the Agent tab and manually searching for a model is high-friction. Users should be able to jump from "browsing" to "testing" instantly.

**Implementation Outline**:
- Add a "Try in Agent Mode" button to model cards (LLMs and OpenRouter tabs) that have a valid OpenRouter ID.
- Logic:
  - Switches the active tab to "Agent".
  - Updates the `agentConfig.model` state to the selected model.
  - Pre-fills a system notification or updates the UI to show the new model is active.
- Seamlessly bridges the gap between the "LLMs" catalog and the "Agent" playground.


---

## From Codex Repo Scan

### 5. [x] Offline-Friendly Dataset Cache + Freshness Badges

**Rationale**: External APIs can fail, rate-limit, or be slow. Persisting last-known-good payloads makes browsing reliable and fast, and "freshness" UI keeps users informed about staleness.

**Implementation Outline**:
- Persist successful dataset payloads to `data/cache/<category>.json` with `fetched_at`
- On upstream failure, serve cached payload with `stale: true` (plus `cached_at`)
- Add UI badges like "Cached 2h ago" / "Stale" in each tab's results-info area
- Keep cache bounded (overwrite per-category; optional max-age pruning)

**Files to modify**: `server.py` (disk cache read/write + stale fallback), `static/script.js` (surface cached/stale metadata)

---

### 6. [x] Fix `python3 server.py` Parity Issues (Local Run vs Gunicorn)

**Rationale**: Local `python3 server.py` behavior can diverge from production and can break features because the `__main__` runner occurs mid-file and startup copies root assets into `static/`, potentially overwriting newer built assets.

**Implementation Outline**:
- Move the `if __name__ == '__main__'` runner to the true end of `server.py` (after all defs)
- Stop overwriting `static/` assets at startup (or gate behind an explicit dev flag)
- Update docs/scripts so local start uses the same port/env behavior as deploys

**Files to modify**: `server.py`, `README.md` (port/start guidance), `run_server.sh` (optional)
