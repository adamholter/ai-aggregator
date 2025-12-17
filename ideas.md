# Product Ideas (Approved)

This document captures the product features you approved for implementation next. It is intentionally specific enough to guide end-to-end work in this repo.

---

## 1) Command Palette + Hotkeys (Power User Navigation)

**Goal:** Make the dashboard feel “fast” for advanced users via keyboard-first control.

**User value (why it matters):**
- Jump between tabs, search, pin/compare, open analysis, and toggle UI modes without hunting for buttons.
- Discoverability via a single palette and a help overlay.

**Proposed UX:**
- `Ctrl+K` / `Cmd+K`: open a command palette.
- `?`: open a hotkeys/help overlay.
- `Esc`: close palette/modals.
- Arrow keys + Enter: palette navigation/execute.

**Initial action set:**
- Navigation: go to tab (LLMs, OpenRouter, Replicate, fal.ai, Latest, etc.).
- Search: focus global search; optionally “search within current tab”.
- Compare: open compare modal; clear compare tray; add/remove focused card.
- Pins: pin/unpin focused card; open Pinned tab.
- Analysis: open model analysis modal for focused card (and optionally “force refresh”).
- Refresh: refresh current tab; refresh all datasets.
- UI: toggle theme; open Settings; open Agent tab.

**Implementation outline:**
- Define a normalized “focus model” concept (keyboard focus ring on cards + roving tabindex).
- Add a palette modal that lists actions + dynamic items (e.g., tab list, recent models, pinned collections).
- Add a lightweight keybinding manager that is context-aware (doesn’t fire while typing in inputs).
- Persist last-used actions and show “recent commands” at the top.

---

## 2) Unified Model Identity + Persisted Cross-Source Matching

**Goal:** When we discover that “Model X” in one source corresponds to “Model Y” in another, we persist that mapping so future views automatically connect those datasets (LLMs and image/media models).

### Current behavior (baseline)
- When a user opens a model modal, the app attempts to find a cross-source match (e.g., Artificial Analysis → OpenRouter and vice versa).
- If a match is found, it’s used to fetch related data, but the connection is effectively ephemeral.

### Desired behavior (approved)
- If a match is found (or user confirms a match), it should be written to a persistent match store so the connection is reused automatically in the future.
- This should work for:
  - **LLMs**: Artificial Analysis ↔ OpenRouter
  - **Image/media models**: Artificial Analysis ELO leaderboards ↔ fal.ai ↔ Replicate (and potentially OpenRouter if relevant)

### User value (why it matters)
- A “single model page” experience: benchmarks + availability + pricing + links across sources without repeated matching work.
- Better compare and search because entities become stable.
- Improves over time as the dashboard learns matches.

### Data model proposal (matches)
Use (and extend if needed) the existing `data/model_matches.json` as the canonical mapping store.

**Key requirements:**
- Support matches between any pair of sources: `artificial-analysis`, `openrouter`, `fal`, `replicate` (and any future ones).
- Store both directions (or store once and derive the reverse).
- Store metadata: `confidence`, `method` (heuristic/confirmed/manual), timestamps, optional user note.

**Example conceptual schema (illustrative):**
- `source`: `"artificial-analysis"`
- `target`: `"openrouter"`
- `source_model`: `{ id/name/provider/... }`
- `target_model`: `{ id/name/provider/... }`
- `confidence`: `0..1`
- `method`: `"auto" | "user-confirmed" | "manual"`
- `saved_at`: ISO timestamp

### UX proposal (unified identity)
- In the model modal, add a “Connections” area:
  - Shows linked entities by source (AA / OpenRouter / fal / Replicate).
  - “Confirm match” button when an auto-match is found.
  - “Search & link…” flow to manually pick the correct counterpart when auto-match fails.
  - “Unlink” option (admin/advanced) to remove bad matches.
- When a match exists in the store, the modal automatically loads the connected source data and displays it consistently.

### Implementation outline (backend + frontend)
- **Backend**
  - Add/extend endpoints to read/write model matches safely (e.g., `GET /api/model-match`, `POST /api/model-match` already exist for AA↔OR; extend for fal/replicate/media categories).
  - Normalize a shared “source identifier” vocabulary across the app.
  - Persist on successful match discovery (auto) and on user confirmation (manual).
  - Add guardrails: validate payloads, rate-limit writes, and de-duplicate entries.
- **Frontend**
  - On modal open:
    - Attempt to resolve connections via persisted matches first.
    - If not present, attempt auto-match; if it succeeds, prompt “Save this connection?” and persist on confirm (or auto-save depending on preference).
  - Add manual linking UI:
    - Search across candidate lists from target source (OpenRouter models, fal models, Replicate models, etc.).
    - Save the selected connection back to the store.
  - Ensure the unified view is consistent across model types (LLM vs image/video).

---

## 3) Local Notes (and Tags) on Cards

**Goal:** Let advanced users annotate models and feeds with personal context, searchable and optionally exportable.

**User value:**
- Captures “tribal knowledge” (strengths/weaknesses, preferred use, gotchas).
- Enables personal workflows (shortlists, labels, reminders).

**Implementation outline:**
- Store notes/tags in `localStorage` keyed by a stable identifier (preferably the unified model identity key once available; otherwise fall back to `(source, model_id/name)`).
- UI:
  - Notes area in model modal.
  - Optional tag chips visible on cards.
  - Filter-by-tag in pinned/unified views.
- Export: include notes/tags in JSON export and optionally in Markdown export.

---

## 4) Shareable Deep Links (Stateful URLs)

**Goal:** Copy/paste a URL that restores the dashboard state for someone else (or future you).

**State to encode:**
- Current tab/section.
- Filters/sorts/search query (global + per-tab).
- Compare tray selections.
- Optional: open modal state (which model is open and which sub-tab in the modal).

**Implementation outline:**
- Define a compact URL format (query params or hash state).
- Add “Copy Link” action in header and in compare modal.
- On page load:
  - Parse URL state.
  - Apply state before initial data render (or re-apply after data loads with a retry strategy).
- Include versioning in the state payload so older links fail gracefully.

---

## 5) Export Everywhere (Practical Sharing/Archival)

**Goal:** One-click export of what advanced users already copy/paste.

**Exports to support:**
- **Current tab**: export filtered list as JSON and CSV.
- **Compare**: export comparison table as JSON/CSV and optionally “Markdown table” for docs.
- **Pinned**: export pins including metadata (and notes/tags if enabled).
- **Latest**: export current window as JSON/CSV.

**Implementation outline:**
- Implement client-side exporters (no new infra required).
- Ensure exports include a `generated_at` timestamp and relevant parameters (tab, filters, timeframe).
- For CSV: normalize nested structures (or provide a “flattened” export option).

---

## Suggested build order (for later implementation)
1. Unified identity + persisted matches (foundation for stable IDs).
2. Notes/tags (keyed off the stable IDs).
3. Deep links (share stable IDs + state).
4. Export everywhere (include IDs + notes).
5. Command palette/hotkeys (ties everything together for speed).

