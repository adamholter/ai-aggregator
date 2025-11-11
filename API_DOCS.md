# API Documentation

## `GET /api/fetch`
Provides compressed dataset snapshots and metadata for categories/tabs that can also be fetched via the agent/tooling.

**Query parameters**

- `categories` / `category` / `tabs` / `tab`: comma-delimited list of category ids (e.g., `llms,openrouter`) or tab aliases; at least one required.
- `limit`: positive integer limit per category.
- `recency`: `day`, `week`, `month`, or `year` to filter datasets by recent activity.
- `timeframe`: alternate alias for `recency`.
- `include_hype`: boolean (`1`, `true`, `yes`, `on`) to blend Hype data when supported.
- `fal_category` / `falCategory`: fal.ai category filter (see `FAL_CATEGORY_OPTIONS` in `server.py`).

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

Errors return `400` for bad input or `500` if fetching fails.

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
  "raw": {...} // the complete parsed payload (fallbacks to raw text when parsing fails)
}
```

Returns `400` when parameters are missing/malformed, `502` when the upstream call fails.

## `GET /latest`
Existing endpoint that generates the latest feed aggregated from multiple sources.

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
