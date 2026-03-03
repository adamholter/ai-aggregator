# AI Model Dashboard

Flask + vanilla JS dashboard for browsing and comparing AI models and feeds across:
- Artificial Analysis
- OpenRouter
- fal.ai
- Replicate
- Blog / Latest / Hype / Monitor / TestingCatalog feeds

## Run locally

```bash
pip install -r requirements.txt
python3 server.py
```

Default URL: `http://localhost:8765`

Alternative helper:

```bash
./run_server.sh
```

## Key frontend files
- `templates/index.html`
- `templates/partials/*.html`
- `static/script.js`
- `static/styles.css`

## Key backend files
- `server.py`
- `backend/app/db.py`
- `backend/app/migrations/`

## Core capabilities
- Model cards with search/sort/filter
- Agent chat + streaming (`/api/agent-exp`, `/api/agent-v2/chat/stream`)
- Model analysis and model matching endpoints
- Pins (local when logged out, server-backed when logged in)
- Shared views
- Stripe billing + promo redemption

## Environment
Copy `.env.example` to `.env` and set required values.

Minimum for most features:
- `APP_SECRET_KEY`
- `OPENROUTER_API_KEY`

For auth + billing:
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Stripe variables (`STRIPE_*`)

For Turso persistence:
- `TURSO_DB_URL`
- `TURSO_AUTH_TOKEN`

## Testing

```bash
PYTHONPATH=. pytest -q tests/test_server.py tests/test_testing_catalog_scrape.py
```

## Deployment
The repo includes `Procfile` for Gunicorn-based deployment.
