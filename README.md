# AI Model Analysis Dashboard

Build your own view of the AI model landscape instead of inheriting somebody else's ranking.

**Live demo:** [ai-model-analysis-dashboard.adamholter.chatgpt.site](https://ai-model-analysis-dashboard.adamholter.chatgpt.site/)

**Video demo:** [AI Model Analysis Dashboard — Build Your Own Model Index](https://youtu.be/SPIXdXGepuo)

The dashboard combines model, provider, benchmark, pricing, throughput, and news data from sources including Artificial Analysis, OpenRouter, fal.ai, Replicate, DeepSWE, BSBench, TerminalBench, and public benchmark artifacts.

## What it does

- **Personal Index:** choose benchmarks, assign weights, require minimum coverage, and immediately rank models using your own priorities. Indexes autosave in app storage.
- **Model comparison:** compare shared benchmarks with normalized radar charts and exact score tables.
- **Cost/performance exploration:** inspect horizontal leaderboards and Pareto frontiers for intelligence, task cost, token cost, and speed.
- **Model detail:** open any model to inspect benchmark coverage, pricing, latency, throughput, and provider data.
- **Live data surfaces:** browse LLM, media-generation, OpenRouter, fal.ai, Replicate, testing-catalog, latest-news, hype, and Monitor feeds.
- **Data-grounded agent:** ask questions across the dashboard's model and benchmark data.

The application is a Flask backend with a lightweight browser UI. Data collectors preserve raw source artifacts, normalize model identities and benchmark scales, and build query-ready static payloads.

## Run locally

```bash
pip install -r requirements.txt
python3 server.py
```

Open `http://localhost:8765`.

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

## Environment

Copy `.env.example` to `.env`. Never commit the populated file.

Most read-only dashboards work without private credentials. For agent generation and authenticated persistence, configure the applicable server-side variables:

- `APP_SECRET_KEY`
- `OPENROUTER_API_KEY`

Optional auth and billing:
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Stripe variables (`STRIPE_*`)

Optional Turso persistence:
- `TURSO_DB_URL`
- `TURSO_AUTH_TOKEN`

## Testing

```bash
PYTHONPATH=. pytest -q tests/test_server.py tests/test_testing_catalog_scrape.py
npm test
```

The live Personal Index visual and persistence checks can be run with:

```bash
DASHBOARD_URL=http://localhost:8765 node scripts/qa_personal_index_visual.mjs
```

## Built with Codex and GPT-5.6

Codex was the primary development environment for repository analysis, implementation, browser QA, scraper debugging, data normalization, test creation, and deployment verification. GPT-5.6 was used through Codex for the highest-complexity work: designing the Personal Index scoring model, reconciling model identities across benchmark sources, implementing chart normalization and persistence, investigating live-data failures, and exercising user stories against the deployed application.

The repository keeps those decisions testable: benchmark identity tests cover aliasing, server tests cover APIs and ranking behavior, Playwright flows cover important browser interactions, and the Personal Index QA script checks chart semantics, dark mode, responsive layout, and autosave restoration.

## Deployment

The repository includes a `Procfile` for Gunicorn deployment. The public demo uses the same application APIs behind a hosted frontend proxy.

## Security

- Secrets belong only in local or hosted environment variables.
- `.env`, local databases, test recordings, and generated QA artifacts are ignored.
- `.env.example` contains variable names only.
- Please report security issues privately instead of opening a public issue.

## License

MIT. See [LICENSE](LICENSE).
