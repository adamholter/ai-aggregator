# GigaPotato Ideas for AI Dashboard

## 1. Model Comparison Arena with Enhanced Visualizations

**Rationale**: The existing compare-arena.html page provides a foundation for model comparisons, but it lacks integration with the backend API and advanced visualization options. Enhancing this feature would allow users to select models from any category and view detailed, interactive comparisons.

**Implementation Outline**:
- Complete the implementation of `/static/compare-arena.html`
- Add backend API endpoint `/api/compare-arena` that accepts model IDs and fetches their data
- Implement frontend JavaScript to:
  - Allow selecting 2-4 models from any category
  - Display side-by-side cards with key metrics
  - Generate comparison charts using existing Plotly integration (bar, radar, scatter plots)
  - Include a "Quick Recommendation" section showing which model wins for each use case
- Add "Compare" button to each model card that adds to comparison list
- Store comparison state in localStorage for persistence
- Integrate with existing chart generation API

**Files to modify**: `static/compare-arena.html`, `server.py` (add endpoint), `static/script.js` (add comparison logic)

---

## 2. Saved Analyses Library (Search + Open + Export)

**Rationale**: Analyses are already cached to disk under `analyses/`, but there's no first-class UX to browse/search/reopen them. A library turns one-off analysis into a reusable knowledge base.

**Implementation Outline**:
- Add `GET /api/analyses` (list metadata) and `GET /api/analyses/<id>` (read) backed by `analyses/`
- Add an "Analyses" tab with search + sort (by recency/source/model) and "Open / Copy Markdown / Download"
- Reuse the existing analysis modal rendering logic (show cached analysis without requiring an OpenRouter key)
- Display analysis metadata (model name, source, timestamp, length) in the library

**Files to modify**: `server.py`, `static/index.html`, `static/script.js`, `static/styles.css`

---

## 3. Model Permalinks (Deep-Link to a Specific Card + Optional Analysis)

**Rationale**: Sharing currently works for sections/views, not for a specific model. Permalinks make collaboration and "come back later" workflows much easier.

**Implementation Outline**:
- Encode `{section, source/category, stable model identifier}` into URL params (ex: `?section=openrouter-models&model=openai/gpt-5`)
- On load, auto-navigate to the tab and open the model modal
- Add "Copy link" inside the modal and keep URL state in sync on open/close
- If no OpenRouter key is present, still show non-AI details and cached analysis if available

**Files to modify**: `static/script.js`, `static/index.html`

---

## 4. Dark Mode with System Preference Detection

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

---

## 5. Keyboard Shortcuts & Command Palette

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

---

## 6. Export & Share Custom Views

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

---

## 7. Enhanced Trending Models Section

**Rationale**: The current "Hype" tab shows trending projects, but it could be enhanced to show trending models with more detailed metrics and visualization.

**Implementation Outline**:
- Create a new "Trending Models" section or enhance the existing "Hype" tab
- Add backend endpoint `/api/trending-models` that:
  - Aggregates data from multiple sources (OpenRouter, Replicate, fal.ai)
  - Calculates trend scores based on recent usage, price changes, and ranking movements
  - Returns list of trending models with trend indicators (up/down)
- Implement frontend with:
  - Trending models grid with visual indicators
  - Trend charts showing popularity over time
  - Filter by category (LLMs, image, video, etc.)
  - Sort by trend score, popularity, or recent changes

**Files to create**: `static/trending.html`, `static/trending.js`
**Files to modify**: `server.py` (add trending endpoint), `static/index.html` (add Trending nav button)

---

## 8. Model Documentation Hub

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
