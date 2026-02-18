# UI Ideas — Settings Modal

## Status Legend
- `proposed` — awaiting approval
- `approved` — approved, not yet implemented
- `implemented` — live as a variant
- `rejected` — not going forward

---

## Current State Assessment

The settings modal has **5 sections stacked vertically** in a single scrolling column (max-width 520px):
1. AI Agent Configuration — 2 model-search combo inputs
2. Analysis Configuration — 2 model-search combo inputs
3. API Access — 1 password input
4. Experimental Features — 1 toggle
5. Filtering Defaults — 2 text inputs

**Pain points:**
- All 4 model pickers look and feel the same; their purpose distinctions ("speed mode" vs "analysis model" vs "fallback") require reading help text to understand
- Sections 1, 2, and 5 are all about model configuration but have separate names that obscure their relationship
- Save/Cancel live at the bottom of a scroll — invisible on first render
- API Access is buried between model sections despite being the most critical first-time setting
- "Filtering Defaults" (rarely changed) gets equal visual weight as core settings

---

## Proposed Ideas

### A. Tabbed Settings (`status: implemented`)

**Rationale:** Split the 5 sections into 3 logical tabs — *Models*, *API & Auth*, *Advanced* — eliminating scroll entirely and grouping settings by how often they're changed. Tabs appear as a pill row below the modal title.

**Implementation:**
- Add a `<div class="settings-tabs">` row with 3 `<button class="settings-tab">` pills below the modal header
- Add `data-tab` attributes to each settings-section div
- JS: ~10 lines to show/hide sections on tab click, persist active tab in memory
- CSS: tab pill styles (~20 lines), active state
- Move Save/Cancel into a sticky `position: sticky; bottom: 0` bar so it's always visible

Tab groupings:
- **Models**: AI Agent Configuration + Analysis Configuration
- **API & Auth**: API Access
- **Advanced**: Experimental Features + Filtering Defaults

---

### B. Two-Column Sidebar Layout (`status: proposed`)

**Rationale:** A System Preferences–style layout where a narrow left sidebar lists section names and the right pane shows the active section's fields. Widens the modal to ~680px, but the extra width is used productively: the nav rail takes ~160px and the content area stays comfortable. Feels authoritative and easy to navigate.

**Implementation:**
- Restructure `.modal-body` to `display: flex` with a `.settings-nav` sidebar (160px) and `.settings-pane` content area
- `.settings-nav` lists section names as buttons with `font-size: 13px`, active state highlighted
- `.settings-pane` shows only the active section's content via JS show/hide
- Modal max-width bumped to 680px
- Save/Cancel move into the content pane as a sticky footer
- ~30 lines CSS, ~15 lines JS

---

### C. Compact Summary Cards (`status: proposed`)

**Rationale:** Keep the single-column layout but collapse each section into a card that shows the current value as a one-line summary (e.g., "Speed model: gemini-flash-lite — 3 available models"). Clicking a card expands it to reveal the full editor. This dramatically shrinks the initial view and focuses editing on one section at a time.

**Implementation:**
- Wrap each `.settings-section` in a `.settings-card` with a clickable header row showing label + summary text
- Summary text generated dynamically from current localStorage values on open
- Click toggles `.settings-card.open` class; only one card open at a time
- CSS: card border-radius, collapsed/expanded transitions, chevron icon in header
- JS: ~20 lines for collapse/expand + summary generation
- Save/Cancel stay at bottom but become visible much faster (collapsed state is short)

---

### D. Priority-First with Progressive Disclosure (`status: implemented` — merged with A as "Smart" variant)

**Rationale:** Reorganize by importance rather than category: show the API key and the available-models picker at the top (the two settings that actually block usage), then put everything else under an expandable "More settings" section. First-time users see exactly what they need; returning users can expand the rest.

**Implementation:**
- Reorder sections: API Access first, then Available Models from Agent section
- All remaining settings move into a `<details>` element with a `<summary>More settings →</summary>`
- JS persists the expanded/collapsed state of the details element in localStorage
- Save/Cancel get a sticky footer treatment
- ~15 lines CSS, minimal JS (details element is native HTML)
- The details open state persists between opens via `data-expanded` attribute written on close

---

---

# General Application UI Ideas

### E. Sticky Section Controls (`status: proposed`)

**Rationale:** When browsing 100+ models, the sort dropdown and search field scroll off screen immediately. You have to scroll all the way back to the top just to change the sort order — a high-friction loop. Making the `.section-header` sticky fixes this without any layout rethinking.

**Implementation:**
- Add `position: sticky; top: 0; z-index: 50; background: var(--bg-color)` to `.section-header`
- Add a slight `padding-top: 16px` and `margin-top: -16px` trick so it doesn't pop abruptly from the top edge
- Add a subtle `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` that appears only while stuck (via IntersectionObserver sentinel div, or just always-on)
- No JS required beyond one optional sentinel div per section

---

### F. Compact List View Toggle (`status: proposed`)

**Rationale:** The card grid (350px min-width) shows maybe 6–8 cards at once. Power users who want to compare or scan many models have to scroll a lot. A density toggle switches the `.data-container` from grid to a compact list — one row per model, key metrics inline — without losing any data.

**Implementation:**
- Add a density icon button to section headers (grid icon ↔ list icon) in the HTML templates
- Toggle class `.compact-view` on the `.data-container`
- CSS for `.compact-view`: `grid-template-columns: 1fr`, cards become `flex-direction: row`, height ~56px, metrics shown as small inline pills
- Persist preference in localStorage per section
- ~40 lines CSS, ~10 lines JS

---

### G. Nav Rail Visual Grouping (`status: proposed`)

**Rationale:** 17 navigation items with no visual breaks is cognitively heavy. There are natural clusters: model types (LLMs through OpenRouter), discovery feeds (Hype through Testing Catalog), and tools (Agent, About, Monitor). A subtle separator between groups helps users orient without restructuring anything.

**Implementation:**
- Wrap nav buttons in 3 group `<div>`s in `templates/partials/navigation.html`
- CSS: `.nav-group + .nav-group { border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px; }`
- In expanded rail state, optionally show a muted 10px group label above each group
- Pure HTML + ~10 lines CSS, no JS

---

### H. Source Color Left-Border on Hype/Latest Cards (`status: proposed`)

**Rationale:** In the Hype and Latest feeds, cards from GitHub, HuggingFace, Replicate, Reddit, and Blog are visually identical except for a small source pill in the header. At a glance, you can't tell where something comes from. A 3px colored left border keyed to source (matching the existing pill colors) makes the feed scannable by source at a glance.

**Implementation:**
- When building hype/latest cards in JS, add `data-source="github"` (etc.) to the card element
- CSS: `.hype-card[data-source="github"] { border-left: 3px solid #6b7280; }` etc., using the same hue family already used for source pills
- Applies to `.hype-card`, `.latest-card`, `.blog-card`
- ~10 lines JS (setting the attribute on card creation), ~15 lines CSS

---

### I. Activate the Command Palette (`status: proposed`)

**Rationale:** `command_palette.html` is fully built (input, results container, keyboard hint) but completely dead — no JS connects to it. Wiring it up with Cmd+K to jump between sections and search model names would make it a genuinely powerful feature. The structure is already there; it just needs the logic.

**Implementation:**
- Add `keydown` listener for `Cmd+K` / `Ctrl+K` to show the palette overlay
- Populate results with: all 17 nav sections (instant jump), plus fuzzy-search over currently loaded model names from `openRouterModels`/the cached model data
- Keyboard: ↑↓ to navigate, Enter to select (jump to section or scroll to model card), Esc to close
- ~60 lines JS — no backend needed, all data already in memory

---

## Rejected Ideas

*(none yet)*
