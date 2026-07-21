# AI Dashboard — Claude Instructions

## ⚠️ CRITICAL: Git Remote Safety

This repo has TWO remotes with very different consequences:

| Remote | Repo | Visibility |
|--------|------|------------|
| `origin` | `adamholter/ai-aggregator` | **PUBLIC** — open source fork |
| `private` | `adamholter/ai-dashboard` | Private — contains real config/keys |

**NEVER push to `origin`.** All commits must go to `private`:

```bash
# CORRECT
git push private <branch>

# WRONG — exposes secrets to the public internet
git push
git push origin <branch>
```

Before any push, verify with `git remote -v`. If you are about to run a bare
`git push` with no remote specified, STOP and use `git push private <branch>`
instead.

This rule exists because on 2026-02-21 a commit containing API keys was
accidentally pushed to the public `ai-aggregator` repo. The incident required
an emergency force-push, branch deletion, repo temporarily set to private, and
a GitHub support ticket to purge the dangling commit from their servers.

## Environment / Secrets

- Secrets live in `.env` and `.env.local` — both are gitignored, never commit them
- `.env.example` shows which variables are needed (no real values)
- A pre-commit hook (`.git/hooks/pre-commit`) will block commits that contain
  patterns matching real API keys
- `APP_SECRET_KEY` should be set in `.env` — if missing, a random key is
  generated at startup (sessions won't persist across restarts)

## Architecture

- `server.py` — monolithic Flask app (~11K lines)
- `templates/` — Jinja2 templates; `templates/index.html` contains the
  `<!-- dashboard-overrides -->` block for JS/CSS overrides
- `static/agent.html` — self-contained agent chat UI (loaded as iframe)
- `static/script.js` / `static/styles.css` — DO NOT edit directly; Syncthing
  reverts them to HEAD. Use the overrides block in `templates/index.html`
- `backend/app/agent/` — agent core, tools, system prompt, tool executors

## Server

Restart command:
```bash
/Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python server.py >> /tmp/ai-dashboard.log 2>&1 &
```
