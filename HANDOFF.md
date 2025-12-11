# Handoff / Ground Rules

## What the next agent must know (TL;DR)
- **Workflow:** Every change must be committed and pushed to `main`, then trigger the Render deploy hook: `https://api.render.com/deploy/srv-d3p4d4fdiees73cdjqk0?key=KkLyUbGA60s`.
- **Start protocol:**
  - Make sure to read the code and any documentation within the code before beginning any changes to make sure you understand the repository. If the user has just started this task and asked you to read this file, then that's what they want you to do. After reading this file, rebuild the context on the full repo.

## Setup prompt you can hand to another agent
Use this when spinning up a new helper so they follow house rules:

```
You are working in the AI Model Analysis Dashboard repo.
Rules:
- Every change: git add -> git commit -> git push origin main.
- After pushing, trigger deploy: curl -X POST "https://api.render.com/deploy/srv-d3p4d4fdiees73cdjqk0?key=KkLyUbGA60s".
- Never revert user changes. Keep edits ASCII unless the file already uses Unicode.
```

## Current open concerns
- The latest tab doesn't reliably get all the information that is new on platforms like Replicate and OpenRouter as soon as it's out, even though it does show up in those tabs.

## UI sync reminder
If frontend assets change, ensure the built files under `static/` are updated and the browser cache is refreshed. A stale bundle can mask fixes.

## Completed tasks
- Global search across tabs with jump-to-card.
- Compare tray + modal for side-by-side evaluation.
- "New since last visit" badges + new-only filter.
- Per-tab saved views and sharable deep links.
- Optional background refresh scheduler.
- Pinned collections with notes (local metadata).
- Agent preview actions: Pin/Open/Compare.
