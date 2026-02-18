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
{heavy_mode_note}
"""

    if custom_append and custom_append.strip():
        prompt += "\n\nUser custom instructions:\n" + custom_append.strip()

    return prompt
