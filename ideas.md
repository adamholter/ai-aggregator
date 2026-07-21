# Product Ideas Log

Single source for feature ideas and shipped UX changes.

## Implemented

### Data + discovery
- Global search across tabs with jump-to-card behavior.
- Compare tray + chart modal workflow.
- "What's New" change detection and toast notices.
- Latest feed preview + background full fetch pattern.
- Pinned items with local/session fallback and server sync.

### Agent
- Embedded Agent tab with streaming responses.
- Agent inspector command center (local/internal only).
- Agent model matching + analysis tooling.

### Settings UX
- Tabbed settings variant for cleaner organization.
- Priority-first settings flow for first-time setup.

## Proposed

### Performance + loading UX
- Progressive section caching per tab (beyond current preview cache), including invalidation policy by source freshness.
- Incremental hydration for large catalog tabs (render top cards, stream in remainder in chunks).

### Navigation + density
- Sticky section controls so search/sort always stay visible.
- Compact list-density mode for high-volume scanning.
- Sidebar/nav grouping with visual separators.

### Feed scanning
- Source-colored left borders for Hype/Latest cards for faster source recognition.
- Command palette activation with keyboard-first navigation (`Cmd/Ctrl+K`).

### Comparison experience
- Dedicated "Comparison Arena" page with AI-assisted chart/text editing.
- Export presets for common comparison templates (quality/cost/speed bundles).

## Rejected / parked
- None currently recorded.

## Notes
- Keep this file as the only running ideas backlog in-repo.
- Ephemeral handoff docs should not be reintroduced.
