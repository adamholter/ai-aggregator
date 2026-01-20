# Implemented Ideas

Features that have been implemented and shipped.

---

## 1. "What's New" Toast Notifications

**Status**: Implemented

**Rationale:** Users want to know what changed since their last visit—new models, pricing updates, context window changes—without navigating to a separate alerts view or setting up watch rules.

**Implementation:**
- On page load, background-fetch the latest data from all sources
- Compare against a locally-stored snapshot from the previous visit (persistent in localStorage)
- Detect: new models added, pricing changes (up/down), context length changes, new ELO rankings
- Display a toast notification: "3 new models, 2 price changes since your last visit" with clickable items
- Toast persists until dismissed or items are clicked
- Snapshot updates after each session; stores minimal data (model IDs, prices, timestamps)

---

## 2. Interactive Model Comparison Arena (Composable with AI Assistant)

**Status**: Implemented

**Rationale:** Artificial Analysis has excellent charting for model comparisons. A dedicated, composable comparison page that combines data from multiple sources—augmented with an AI assistant that can modify the page in real-time—would give users powerful analysis capabilities.

**Key features:**
- Dedicated comparison page with charts and model selection
- Sidebar AI assistant with full context of the page that can:
  - Write and edit explanatory text sections
  - Add, modify, or remove charts
  - Answer questions about the data being shown
  - Suggest new comparisons based on Artificial Analysis patterns
- Multi-source data: Artificial Analysis benchmarks, OpenRouter catalog, cross-matched fal.ai models
- Standardized pricing for media models (using existing standardization patterns)
- Shareable and exportable

---

## 3. Onboarding Tour for First-Time Users

**Status**: Implemented

**Rationale:** The dashboard has many tabs, data sources, and features. New users need guided discovery to understand what's available and how to get value quickly.

**Implementation:**
- Step-by-step guided tour overlay that highlights key UI elements
- Covers: navigation, search, model cards and interactions (pin, compare, analyze), the agent tab, settings
- Progress tracking so users can resume or skip
- Triggered automatically for first-time visitors; accessible on-demand from settings
- Mobile-responsive with appropriate positioning
