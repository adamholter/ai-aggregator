---
name: model-comparison
description: Compare AI models across benchmarks, pricing, and capabilities. Use when the user asks to compare models, evaluate trade-offs, or pick the best model for a task.
---

# Model Comparison Skill

## Step 1 — Parallel data fetch (do all three simultaneously)

Call these three tools at the same time in your first tool invocation:

1. `fetch_llm_benchmarks` — quality index, speed, pricing from Artificial Analysis
2. `search_openrouter_models` — API availability and exact per-token pricing
3. `ask_perplexity` — web search for practical community sentiment

For the Perplexity query, use something like:
> "What do developers and practitioners say about using [Model A] vs [Model B] in real projects? Include coding quality, reliability, speed feel, and value for money."

## Step 2 — Synthesize

Build a comparison table with columns: Model, Provider, Intelligence Index, Speed (tok/s), Input $/1M, Output $/1M.

Then add:
- **Trade-off callouts**: quality vs speed vs cost — be explicit about where each model wins and loses
- **Practical notes**: 2–3 sentences per model from what real users say (from Perplexity)
- **Chart block** if comparing 3+ models

## Step 3 — Recommend

End with a concrete recommendation based on user constraints. If they haven't specified constraints, ask one clarifying question (e.g. "Are you optimizing for quality, speed, or cost?").

## Output checklist

- At least one numeric metric per model (with units: tok/s, $ / 1M tokens)
- Perplexity findings summarized, not just listed
- Chart included for visual comparison when 3+ models
- Final recommendation is specific, not hedged
