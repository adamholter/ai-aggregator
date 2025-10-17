# Completed Task Log
This file tracks items that have been delivered and removed from `NEXT_STEPS.md`.
## Recent Updates
- Source mode theme toggle restored the Light → Dark → Source cycle and added a legend explaining provider colours.
- Agent defaults now hydrate from `config/model_config.json`, with OpenRouter catalogue data backfilling friendly names.
- OpenRouter section renders catalogue cards with trimmed excerpts, consistent titles, and optional parameter details behind a collapsible panel.
- Removed the unused Replicate “Advanced Filters” UI and unified loading states across sections with centered spinners.
- Persisted model analyses to disk so previously generated reports reopen instantly after the initial stream.
- Simplified section loading UI to a single centered spinner (no rotating text), including the OpenRouter tab.
- OpenRouter tab now refreshes on demand, renders catalog cards immediately, and hides its loader once data appears.
