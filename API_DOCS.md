# API Documentation

## `GET /api/fetch`
Provides compressed dataset snapshots for the same categories and tabs that the agent/tooling supports (LLMs, OpenRouter, fal.ai, Replicate, media leaderboards, plus experimental feeds like Latest, Hype, Monitor, Blog, and Testing Catalog). Use the query parameters below to control the scope.

**Query parameters**

- `categories` / `category` / `tabs` / `tab`: comma-delimited list of category ids or tab aliases. Supported values include `llms`, `openrouter`, `fal`, `replicate`, `text-to-image`, `text-to-video`, and experimental tabs such as `latest`, `hype`, `monitor`, `blog`, and `testing-catalog`. At least one category/tab is required.
- `limit`: positive integer limit per category (defaults to the agent’s standard page size when omitted).
- `recency`: `day`, `week`, `month`, or `year` to restrict entries to recent activity.
- `timeframe`: alias for `recency` when you prefer that term.
- `include_hype`: boolean (`1`, `true`, `yes`, `on`) to blend hype signals into supported tabs.
- `fal_category` / `falCategory`: fal.ai category filter (Text-to-Image, Text-to-Speech, etc.); values must match the options enumerated in `FAL_CATEGORY_OPTIONS` (`server.py`).
- `cache_bust`: optional boolean (`true`/`1`) that, when present, forces the backend to build a fresh snapshot instead of returning cached data (most useful for `latest`, `hype`, and other frequently updating experimental tabs).

**Response** (JSON)

```json
{
  "categories": [...],           // metadata per category
  "structured": {...},           // structured summary returned by fetch_data
  "markdown": "...",           // markdown summary string
  "datasets": {...},             // raw dataset entries per category
  "compressed": "...",         // compressed text for agent prompts
  "generated_at": "2023-...",
  "errors": [...],               // optional warnings/errors
  "fal_category": "Text-to-Image" // human readable label when filtering
}
```

Errors return `400` for invalid input or `500` when the fetch pipeline fails.

**Example**

```
GET /api/fetch?tabs=latest&limit=20&recency=day&include_hype=true&cache_bust=1
```

Retrieves the Latest tab feed with hype signals (fresh data, not cached), limited to 20 entries.

## `GET /api/ask-perplexity`
Runs a Perplexity (web search) tool call and returns the response payload.

**Query parameters**

- `query` (required): natural-language question to send to Perplexity.
- `key` / `api_key` / `apiKey` / `openrouter_key` / `openrouterKey`: OpenRouter API key used for authentication (required).

**Response**

```json
{
  "query": "...",
  "model": "perplexity/...",
  "response": "...",
  "raw": {...} // the complete parsed payload (falls back to raw text when parsing fails)
}
```

Returns `400` when parameters are missing or malformed, `502` when the upstream call fails.

## `GET /latest`
Existing endpoint that generates the Latest feed aggregated from multiple sources (the same data you get from `/api/fetch?tabs=latest`).

**Query parameters**

- `timeframe`: `day`, `week`, `month`, or `year` (default `day`).
- `cache_bust` (`true|false`): bypass cached results.
- `include_hype` (`true|false`): include hype signal when supported.

**Response**

```json
{
  "timeframe": "day",
  "window_hours": 24,
  "generated_at": "2024-...Z",
  "count": 10,
  "sources": {...},
  "items": [...]
}
```

Errors return `503` for runtime issues or `500` for unexpected failures.
