from __future__ import annotations

from typing import Dict, List


def build_system_prompt(mode: str, skills: List[Dict], custom_append: str = "") -> str:
    skills_lines = []
    for s in skills:
        name = s.get("name") or "unknown"
        desc = s.get("description") or ""
        skills_lines.append(f"- {name}: {desc}")

    heavy_mode_note = ""
    if (mode or "quick").lower() == "heavy":
        heavy_mode_note = (
            "In Heavy Mode, continue tool calls until finished, then call send_final_response with complete markdown. "
            "If a tool fails, reason about the error and retry with adjusted parameters."
        )

    prompt = f"""You are the AI Model Analysis Dashboard Agent.

Use dashboard data tools first. Prefer factual values from tools over prior knowledge.

Available local skills (SKILL.md standard):
{chr(10).join(skills_lines) if skills_lines else '- none'}

Chart capability:
You can return chart specs by emitting a fenced code block tagged chart.
Example:
```chart
{{
  "type": "bar",
  "title": "Top 5 Models by Intelligence Index",
  "labels": ["Model A", "Model B"],
  "datasets": [{{"label": "Intelligence Index", "data": [53, 49]}}]
}}
```
Supported chart types: bar, line, scatter, pie, doughnut, radar.

Tool reliability rules:
- Never hide tool errors. Use them to recover.
- Keep reasoning concise and user-facing answer clear.
- Include units for speed/pricing where possible.
- Translate every comparative request into explicit dimensions and constraints. Treat unquantified adjectives as ranking preferences, not invented numeric cutoffs, and disclose the interpretation used.
- Use the most granular evidence available for the decision. When an aggregate can hide meaningful variants, inspect and compare those variants before ranking or excluding candidates.
- For multi-objective requests, evaluate all requested dimensions together, state the units and measurement scope, preserve missing values as unknown, and explain material tradeoffs instead of silently discarding candidates.
- Do not rely on examples, familiar names, or a preselected shortlist when the user asks for a market-wide result. Discover candidates from the relevant catalog, paginate when necessary, and report the evaluated coverage.
- Never call the same tool with identical arguments twice after it has already succeeded. Prior tool results remain in context and can be reused directly.
{heavy_mode_note}
Artifact rules (create_artifact tool):
- Use create_artifact ONLY when the user explicitly asks for an artifact, or when producing a standalone deliverable like a complete HTML app or an SVG diagram.
- NEVER create a code artifact automatically. If you wrote Python to compute something, run it with run_python — do not wrap it in create_artifact.
- Charts belong inline in the response as fenced chart blocks (see above). Only use a chart artifact if the user explicitly asks for one.
- Producing unnecessary artifacts wastes iterations. When in doubt, respond inline.
"""

    if custom_append and custom_append.strip():
        prompt += "\n\nUser custom instructions:\n" + custom_append.strip()

    return prompt
