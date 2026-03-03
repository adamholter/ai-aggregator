# AI Dashboard API Docs

Base URL (local): `http://localhost:8765`

## Auth + Session
- `GET /api/me`
  Returns `{ authenticated, user }` with subscription + credit fields when logged in.
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/clerk-sync`

## Billing + Promo
- `POST /api/create-checkout-session`
  Body: `{ "price_key": "starter_monthly|starter_annual|pro_monthly|..." }`
- `POST /api/billing-portal`
- `POST /api/redeem-promo`
  Body: `{ "code": "YOURCODE" }`
- `POST /webhooks/stripe`

## Core Model Data
- `GET /api/llms`
- `GET /api/text-to-image`
- `GET /api/image-editing`
- `GET /api/text-to-speech`
- `GET /api/text-to-video`
- `GET /api/image-to-video`
- `GET /api/openrouter-models`
- `GET /api/fal-models`
- `GET /api/fal-llms-metadata`
- `GET /api/replicate-models`
- `GET /api/model-config`

## Feeds
- `GET /api/hype`
- `GET /api/latest-preview`
- `GET /latest`
- `GET /api/monitor`
- `GET /api/blog-posts`
- `GET /api/testing-catalog`

## Aggregation / Search
- `GET /api/fetch`
  Query: `tabs=llms,openrouter,...` plus optional `limit`, `timeframe`, `days`, `include_hype`.
- `POST /api/fetch-data`
- `GET /api/ask-perplexity`
- `POST /api/intelligent-query`

## Analysis + Matching
- `POST /api/model-analysis`
- `GET /api/model-analysis`
- `POST /api/model-match`
- `GET /api/model-match`
- `POST /api/model-card-lookup`
- Legacy aliases still supported: `/model-analysis`, `/model-match`

## Agent APIs
- `POST /api/ai-agent`
- `POST /api/agent-exp` (SSE stream)
- `POST /api/experimental-agent`
- `GET /api/experimental-agent/tools`
- `GET /api/agent-info`
- `POST /api/agent-execute-tool`
- `POST /api/agent-tools/search-models`
- `POST /api/agent-tools/top-models`
- `POST /api/agent-tools/compare-models`

### Agent v2
- `GET /api/agent-v2/skills`
- `GET /api/agent-v2/models`
- `POST /api/agent-v2/chat`
- `POST /api/agent-v2/chat/stream`
- `GET /api/agent-v2/inspector/config`
- `POST /api/agent-v2/inspector/test-tool`

## Pins + Shared Views
- `GET /api/pins`
- `POST /api/pins`
- `DELETE /api/pins/<pin_id>`
- `DELETE /api/pins?key=...`
- `POST /api/shared-views`
- `GET /api/shared-views/<view_id>`

## Experimental
- `POST /api/experimental-filter`
- `POST /api/correlation-analysis`
- `POST /api/smart-insights`
- `POST /api/debug/utf8`

## Admin (Internal)
- `POST /admin/create-promo`
- `POST /admin/cancel-subscription`

## Health / Diagnostics
- `GET /api/health`
- `GET /health`
- `GET /usage`

## Local-only UI endpoints
- `GET /agent-inspector` (localhost or `X-Admin-Secret` only)
- `GET /experimental-agent`
- `GET /agent-ui-variation` (legacy route, serves canonical agent UI)
- `GET /compare-arena`
