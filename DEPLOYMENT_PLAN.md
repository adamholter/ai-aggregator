# Deployment Plan for AI Model Analysis Dashboard

This document outlines a practical path to self-host the dashboard so users can browse the aggregated model data for free, and optionally supply their own OpenRouter key to enable AI analysis or agent chat. It assumes you will reuse the existing Flask backend and static frontend in this repo.

---

## 1. Hosting Strategy Overview

| Concern | Recommendation |
| --- | --- |
| **Runtime** | Use a low-cost container host (e.g., [Fly.io](https://fly.io), [Render](https://render.com), or [Railway](https://railway.app)). They support Python + static assets, free SSL, and easy deploys. Fly.io offers generous free-tier credits and persistent volumes if we need caching. |
| **Static assets** | Let Flask continue to serve the `static/` directory. If you prefer a CDN later, you can front it with Cloudflare, but it isn’t required initially. |
| **Persistent storage** | No database needed for public read-only data. Cached responses and persisted analyses already write to disk. Mount a small persistent volume so the `analyses/` and `data/` directories survive restarts. |
| **Environment secrets** | Host should provide environment variable management; we need to configure API keys there (see section 2). |
| **Scaling** | A single Fly/Render instance (512 MB RAM) is sufficient. Configure auto-suspend on idle to stay in the free tier and scale up later if needed. |

---

## 2. Environment Variables & Secrets

| Variable | Purpose | Deployment Value |
| --- | --- | --- |
| `ARTIFICIAL_ANALYSIS_API_KEY` | Fetch Artificial Analysis datasets. | Your existing key (keep server-side). |
| `OPENROUTER_API_KEY` | Enables default OpenRouter calls. | Leave blank in production so the app does not provide free inference. Only use for testing. |
| `FAL_API_KEY`, `REPLICATE_API_KEY` | If any endpoints rely on them, supply keys in the host’s secret store. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (optional) | If you later add user auth or usage logging. Not required now. |

On Fly.io: `fly secrets set ARTIFICIAL_ANALYSIS_API_KEY=... REPLICATE_API_KEY=...` etc.

---

## 3. Client-Supplied OpenRouter Key Flow

1. **Settings UI**: we already surface settings in the dashboard. Extend the settings modal to accept an optional OpenRouter token.
2. **Client storage & security**:
   - Do **not** send user-provided keys to the server.
   - Store the key client-side using `localStorage` (simpler than cookies and still scoped to the origin). Encrypting in browser adds little value because the attacker already controls client JS.
   - When the agent tab issues a fetch to `/api/model-analysis`, check for a locally stored key:
     ```js
     const userKey = localStorage.getItem('user-openrouter-key');
     const headers = userKey ? { Authorization: `Bearer ${userKey}` } : {};
     ```
   - Update backend endpoints that call OpenRouter to read the key from an `Authorization` header only when present; otherwise, return a 402-style response prompting the user to add their key.
3. **Settings storage**: reuse existing logic that persists configuration in localStorage; add secure UX copy clarifying the key never leaves the browser.

---

## 4. Backend Adjustments Before Deploy

1. **Configuration**:
   - Convert hard-coded API keys in `server.py` to read from `os.environ`.
   - Add guard rails: if no server-side key is available, skip inference endpoints and log a warning.
2. **CORS/Headers**:
   - Ensure CORS remains restricted to the deployed origin (`CORS(app, resources={r"/api/*": {"origins": allowed_origin}})`).
   - If exposing personal endpoints, consider rate-limiting (Flask-Limiter) and request logging via Supabase/Postgres.
3. **Logging**:
   - Configure gunicorn / uWSGI for production (Fly/Render will run `gunicorn server:app --preload --bind 0.0.0.0:${PORT}`).
   - Use structured logging for API errors (stdout is fine for host logs).
4. **HTTPS**:
   - Fly and Render manage TLS automatically. No extra work required.

---

## 5. Deployment Steps (Fly.io example)

1. **Install tools**: `brew install flyctl` (macOS).
2. **Initialize app**:
   ```bash
   fly launch --name ai-dashboard --region sjc --no-deploy
   ```
   - Choose Docker; set the internal port to 8080 (match your Flask run port).
3. **Create Dockerfile** (a minimal example):
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   ENV PORT=8080
   CMD ["gunicorn", "--bind", "0.0.0.0:8080", "server:app"]
   ```
4. **Set secrets**:
   ```bash
   fly secrets set ARTIFICIAL_ANALYSIS_API_KEY=xxx REPLICATE_API_KEY=yyy
   ```
5. **Configure persistence (optional)**:
   ```bash
   fly volumes create dashboard_data --size 1 --region sjc
   ```
   Update `fly.toml` to mount `/data` and point your app to use it for `analyses/` storage.
6. **Deploy**:
   ```bash
   fly deploy
   ```
7. **Verify**:
   - Load the app via the Fly-generated URL.
   - Confirm data sections load using the server-managed keys.
   - Test providing a personal OpenRouter key in Settings and confirm inference works.

Alternative hosts (Render/Railway) have similar flows: define a Dockerfile or `render.yaml`, set environment variables, and deploy.

---

## 6. Future Enhancements

- **Stripe integration**: create paid tiers that unlock a managed OpenRouter key. Use Stripe Checkout + a Supabase table to store customer entitlements. The client can exchange a Stripe session for temporary API access tokens stored server-side.
- **User authentication**: Supabase Auth or Clerk can secure settings if you move beyond localStorage keys.
- **Analytics & Monitoring**: Add Sentry for error reporting; integrate Fly Log Drains or Render log exports to monitor API usage.
- **Caching**: If API quotas are tight, add a server cache invalidated daily and expose a “refresh” button behind rate limits.

---

## 7. Launch Checklist

1. Refactor keys to environment variables and ensure defaults are safe (no public inference).
2. Update Settings modal + frontend storage for user-supplied OpenRouter key.
3. Adjust backend to honor per-request `Authorization` headers (and reject when absent).
4. Add friendly messaging in the UI explaining the difference between data-only mode and inference-enabled mode.
5. Create infrastructure (Fly/Render) with secrets configured and persistent storage mounted.
6. Deploy, smoke test, and monitor logs.
7. Document how users can add their OpenRouter key in `README.md` or a new `USAGE.md`.

Following this plan gives you a secure, low-cost deployment that serves the dataset explorer for free while letting power users supply their own inference key until you decide to integrate Stripe or managed billing. ***!
