const EFFORT_WORDS = new Set(["xhigh", "max", "high", "medium", "low", "none"]);

export function canonicalModel(value, { keepEffort = false } = {}) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/@reasoning=/g, " ")
    .replace(/[_/.-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => ![
      "anthropic", "openai", "google", "xai", "meta", "mistral", "alibaba", "moonshot",
      "swe", "agent", "preview", "latest", "instruct", "chat", "reasoning", "thinking",
      "adaptive", "effort", "fallback", "default",
    ].includes(token))
    .filter((token) => keepEffort || !EFFORT_WORDS.has(token))
    .join(" ");
}

export function extractReasoningEffort(value) {
  const text = String(value ?? "").toLowerCase();
  if (/\bxhigh\b|x-high|extra high/.test(text)) return "xhigh";
  if (/\bmax\b|maximum/.test(text)) return "max";
  if (/\bmedium\b/.test(text)) return "medium";
  if (/\blow\b|minimal/.test(text)) return "low";
  if (/\bhigh\b/.test(text)) return "high";
  if (/\bnone\b|non reasoning|non-reasoning/.test(text)) return "none";
  return "";
}

export function canonicalDeepConfig(row) {
  const raw = row?.config || [row?.harness, row?.model, row?.reasoning_effort].filter(Boolean).join(" ");
  return canonicalModel(raw.replace(/^mini[_-]swe[_-]agent[_-]?/i, ""), { keepEffort: true });
}

export function canonicalAaForDeep(name) {
  const base = String(name ?? "").replace(/\s*\([^)]*\)/g, " ");
  const effort = extractReasoningEffort(name);
  return [canonicalModel(base), effort].filter(Boolean).join(" ");
}

export function findDeepSweRow(name, rows) {
  const target = canonicalAaForDeep(name);
  if (!target) return null;

  const exact = rows.find((row) => canonicalDeepConfig(row) === target);
  if (exact) return exact;

  const baseTarget = canonicalModel(name);
  const targetEffort = extractReasoningEffort(name);
  return rows.find((row) => {
    const hasExplicitEffort = Boolean(row.reasoning_effort);
    return !hasExplicitEffort
      && (!targetEffort || targetEffort === "max")
      && canonicalModel(row.model || row.config) === baseTarget;
  }) ?? null;
}

export function findCombinedDeepSweRow(name, v11Rows, v1Rows) {
  const v11 = findDeepSweRow(name, v11Rows);
  if (v11) return { row: v11, version: "v1.1" };
  const v1 = findDeepSweRow(name, v1Rows);
  if (v1) return { row: v1, version: "v1" };
  return { row: null, version: null };
}
