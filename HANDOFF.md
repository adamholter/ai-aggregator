# Handoff: TestingCatalog History Persistence

## Problem summary

The new TestingCatalog archive still isn’t rendering in the UI, even though the backend now merges `history` with the latest scrape and exposes a combined `items` array. The tab only shows the two most recent stories when you reload, so the persisted file (`logs/testing_catalog_history.json`) is apparently not being read or injected into the payload that the browser receives. Please double-check both the server response and the static bundle to make sure they’re fully in sync before rerunning the tab; resetting the agent/clearing caches can help confirm the latest JS is loaded.

## Testing Catalog follow-up

1. Confirm `/api/testing-catalog` returns the merged `items` plus `history` even when the request is served from cache; every response should reorder the history items and serve them to the client.
2. Ensure `static/script.js` is rebuilt so `loadTestingCatalogData` consumes that merged list and not just the fresh `items`.
3. If you still see only two cards after reloading, clear the browser cache or manually re-open the tab—sometimes the old bundle sticks around and hides the persistent code.

## Experimental AI filter behavior

1. Remember that the AI filter just flags existing cards by name; the filter payload should not try to render new content or rely on raw IDs. Make sure the UI matches the returned names against its cached datasets so colors, metadata, and links stay consistent.
2. Validate that filtered lists remain display-only and that toggling the filter simply narrows which cards are shown, rather than introducing new layout blocks or duplicates.

## AI filtering display consistency

1. The filtered results should reuse the regular card layout (with each tab’s colors, badges, and metadata) instead of rendering a separate block of “filtered” items—this keeps the latest and hype tabs consistent.
2. Filtering must work purely by matching the names returned by the LLM with the cards the UI already has cached; when the filter runs it should hide the cards that were not selected and leave everything else untouched so links, sources, and pinned actions still behave as before.
3. Ensure the LLM response does not try to change titles (e.g., “Untitled project”) or introduce new fields; it should only list the names we want to keep and optionally their importance so the front-end can map them back to existing records.

## Git workflow reminder

1. Confirm `/api/testing-catalog` returns the merged `items` plus `history` even when the request is served from cache; every response should reorder the history items and serve them to the client.
2. Ensure `static/script.js` is rebuilt so `loadTestingCatalogData` consumes that merged list and not just the fresh `items`.
3. If you still see only two cards after reloading, clear the browser cache or manually re-open the tab—sometimes the old bundle sticks around and hides the persistent code.
4. Remember that the AI filter should only select which existing cards remain; the response lists the names of the desired entries, and the UI should match those names against the existing dataset so the colors/links are preserved rather than trusting LLM-supplied titles or new card layouts.

## Git workflow reminder

1. Stage the updated files with `git add <paths>` (e.g., `git add server.py static/script.js`).
2. Commit with a clear message: `git commit -m "Describe what changed"`.
3. Push to `origin main`: `git push origin main`.
4. Share the pushed commit details in your final report so the next agent can follow the trail.

## UI sync reminder

We previously saw the dashboard stale because the deployed JS/CSS bundle was not refreshed even after the backend stored the TestingCatalog history. The fix was to copy the latest `styles.css`/`script.js` into `static/` and ensure the browser pulled the new assets (you can clear caches or hard-refresh). Whenever you change UI-affecting code again, repeat that copy/publish step before claiming the tab shows new behavior so the rendered UI matches the source files.
