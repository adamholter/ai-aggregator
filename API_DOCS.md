# AI Dashboard API Documentation

## Base URL
- **Local**: `http://localhost:8765`
- **Production**: `https://ai-dashboard-bp.onrender.com`

---

## Core Data APIs

### GET `/api/fetch`
Fetch data from multiple tabs at once.

**Query Parameters:**
- `tabs` (string): Comma-separated list of tab IDs to fetch
- `limit` (int, optional): Max items per tab (default: 50)
- `recency` / `timeframe` (string, optional): `day`, `week`, `month`, or `year` to constrain results for time-sensitive tabs
- `days` (int, optional): Override the Latest tab window with an exact day count (for example, `days=14`)
- `include_hype` (bool, optional): Blend hype signals into supported tabs (Latest/Hype)

**Tab IDs:**
- `llms` - LLM benchmarks from Artificial Analysis
- `openrouter` - OpenRouter models
- `text-to-image`, `image-editing`, `text-to-speech`, `text-to-video`, `image-to-video` - Media models
- `fal-models` - Fal.ai models
- `replicate-models` - Replicate models
- `testing-catalog` - Testing Catalog items
- `blog` - Blog posts
- `hype` - Hype signals
- `latest` - Combined activity feed from all sources
- `monitor` - Monitor feed updates

**Example:**
```
GET /api/fetch?tabs=llms,openrouter&limit=20
```

---

### GET `/api/llm-data`
Fetch LLM benchmark data from Artificial Analysis.

**Response:**
```json
{
  "providers": [...],
  "models": [...],
  "timestamp": "2024-12-14T..."
}
```

---

### GET `/api/openrouter-models`
Fetch OpenRouter model catalog.

**Query Parameters:**
- `search` (string, optional): Search term
- `limit` (int, optional): Max results

---

### GET `/api/fal-models`
Fetch Fal.ai model catalog.

---

### GET `/api/replicate-models`
Fetch Replicate model catalog with caching.

---

## Agent APIs

### POST `/api/experimental-agent`
AI agent with tools for model analysis.

**Request Body:**
```json
{
  "question": "What are the best LLMs for coding?",
  "model": "anthropic/claude-3.5-sonnet",
  "history": [],
  "deeper_mode": false,
  "image": null
}
```

**Response:** JSON with `response`, `tool_calls`, `error` fields.

**Notes:**
- Max iterations: 15 (normal) or 20 (deeper_mode)
- Timeout: 600 seconds

---

### POST `/api/agent-exp`
Streaming agent with SSE events.

**Request Body:** Same as `/api/experimental-agent`

**Response:** Server-Sent Events stream with types:
- `status` - Progress updates
- `tool_start`, `tool_result` - Tool execution
- `content` - AI response chunks
- `done` - Completion signal

---

## Chart APIs

### POST `/api/charts/model-comparison`
Generate comparison charts.

**Request Body:**
```json
{
  "models": [
    {"name": "GPT-4o", "quality_index": 90, "tokens_per_second": 100, ...},
    ...
  ],
  "chart_type": "bar" | "radar" | "scatter",
  "metrics": ["quality", "speed", "price"],
  "title": "Optional title"
}
```

**Response:**
```json
{
  "plotly_data": [...],
  "plotly_layout": {...},
  "models_included": [...],
  "metrics_shown": [...]
}
```

**Supported Metrics:**
| Metric | Expected Fields |
|--------|-----------------|
| `quality` | `quality_index`, `quality`, `overall_quality`, `score` |
| `speed` | `tokens_per_second`, `speed`, `output_speed` |
| `price` | `pricing.prompt`, `pricing.completion`, `blended_price_per_1m` |
| `latency` | `latency_ms`, `latency`, `time_to_first_token` |
| `context_length` | `context_length`, `context_window`, `max_context` |

---

## User Data APIs

### GET `/api/pins`
Get user's pinned items.

### POST `/api/pins`
Add a pin.

### DELETE `/api/pins`
Remove a pin.

---

## Utility APIs

### POST `/api/smart-search`
AI-powered search across all data sources.

### GET `/api/latest-preview`
Preview of the Latest activity feed (limited results for fast UI load).

### GET `/latest`
Latest activity feed across Blog, OpenRouter, Replicate, fal.ai, and optional Hype entries.

**Query Parameters:**
- `timeframe` (string, optional): Time window for results. Options:
  - `day` (default) - Last 24 hours
  - `week` - Last 7 days
  - `month` - Last 30 days
  - `year` - Last 365 days (no item limit)
- `days` (int, optional): Override the window with an exact number of days (e.g. `days=14`)
- `cache_bust` (bool, optional): Force fresh aggregation
- `include_hype` (bool, optional): Blend in Hype signals

**Examples:**
```bash
# Get last 24 hours
GET /latest

# Get last week
GET /latest?timeframe=week

# Get full year - returns all items, no limit
GET /latest?timeframe=year

# Custom: last 14 days
GET /latest?days=14

# Include hype signals
GET /latest?timeframe=month&include_hype=true
```

**Response:**
```json
{
  "entries": [...],
  "metadata": {
    "window_days": 365,
    "total_entries": 2000,
    "sources": ["blog", "openrouter", "fal", "replicate"]
  }
}
```

### GET `/api/hype-feed`
Trending AI topics and signals.

---

## Error Responses
All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "details": "Optional additional info"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad request
- `401` - Unauthorized
- `500` - Server error
