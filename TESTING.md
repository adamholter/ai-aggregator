# AI Dashboard Testing Guide

## Quick API Tests

Run these commands to verify AI features are working:

### 1. Test Agent API
```bash
curl -s -X POST http://127.0.0.1:8765/api/experimental-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENROUTER_KEY" \
  -d '{"question": "What is 2+2?", "deeper_mode": false}'
```
Expected: JSON with `response` field containing an answer.

### 2. Test Smart Filter API
```bash
curl -s -X POST http://127.0.0.1:8765/api/experimental-filter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENROUTER_KEY" \
  -d '{"query": "fast models", "category": "llms", "items": [...]}'
```
Expected: JSON with `filtered_items` array.

---

## Manual UI Test Checklist

### Data Sources
- [ ] LLMs tab loads and shows models from Artificial Analysis
- [ ] OpenRouter tab loads models
- [ ] Replicate tab loads models  
- [ ] fal.ai tab loads models
- [ ] Testing Catalog tab loads
- [ ] Blog tab loads
- [ ] Latest Activity aggregates from all sources

### Global Search
- [ ] Search bar appears in header
- [ ] Typing shows search results dropdown
- [ ] Clicking a result navigates to correct tab/card
- [ ] Keyboard navigation works (up/down arrows, enter)

### Compare Feature
- [ ] "Compare" button appears on model cards
- [ ] Clicking adds model to compare tray at bottom
- [ ] Compare tray shows selected items as chips
- [ ] "Compare" button in tray opens Compare Modal
- [ ] Compare Modal shows table with model data
- [ ] "Analyze with AI" button appears
- [ ] AI analysis returns meaningful comparison
- [ ] Empty columns are hidden
- [ ] "Clear" button removes all items from tray

### Pin Feature
- [ ] "Pin" button appears on model cards
- [ ] Clicking Pin opens styled modal (not browser prompt)
- [ ] Can enter collection name and note
- [ ] Pinned tab shows pinned items by collection
- [ ] "Edit pin" button opens modal to edit
- [ ] Can delete pins
- [ ] Pins persist after page refresh

### Views Widget
- [ ] Views widget appears in section headers
- [ ] Eye and save icons are visible (SVG icons)
- [ ] Clicking save icon opens modal to name view
- [ ] Saved views appear in dropdown
- [ ] Selecting a view applies filters
- [ ] Can delete saved views

### Theme Toggle
- [ ] Theme toggle button in header works
- [ ] Dark mode applies correctly
- [ ] Theme persists after refresh

### Settings
- [ ] Settings button opens modal
- [ ] Can enter OpenRouter API key
- [ ] Can configure model selections
- [ ] Settings persist after refresh

---

## Test Results Log

| Date | Test | Result | Notes |
|------|------|--------|-------|
| 2025-12-13 | Agent API | ✅ Pass | Returns JSON response correctly |
| 2025-12-13 | Filter API | 🔄 Testing | Requires category parameter |

---

## Environment Setup

Required environment variables for full functionality:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
ARTIFICIAL_ANALYSIS_API_KEY=aa_...
REPLICATE_API_KEY=r8_...
HYPE_SUPABASE_API_KEY=...
HYPE_SUPABASE_BEARER=...
GOOGLE_SHEETS_API_KEY=...
```

Start server:
```bash
python3 server.py
# Runs on http://127.0.0.1:8765
```
