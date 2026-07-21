import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findCombinedDeepSweRow } from "./lib/deepswe_identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readJson = async (relative) =>
  JSON.parse(await readFile(path.join(root, relative), "utf8"));
const readJsonOptional = async (relative) => {
  try { return await readJson(relative); } catch { return null; }
};

const artificialAnalysis = await readJson("data/aa_llms.json");
const deepSweV1 = await readJson("static/frontier-data/deepswe-v1-leaderboard.json");
const deepSweV11 = await readJson("static/frontier-data/deepswe-v1.1-leaderboard.json");
const bsBench = await readJson("static/frontier-data/bsbench-v2.json");
const eqBench = await readJsonOptional("static/frontier-data/raw/eq-bench-3.json");
const lmArenaText = await readJsonOptional("static/frontier-data/raw/lmarena-text.json");

const labels = {
  artificial_analysis_intelligence_index: "Artificial Analysis Intelligence Index",
  artificial_analysis_coding_index: "Artificial Analysis Coding Index",
  artificial_analysis_math_index: "Artificial Analysis Math Index",
  mmlu_pro: "MMLU-Pro",
  gpqa: "GPQA Diamond",
  hle: "Humanity's Last Exam",
  livecodebench: "LiveCodeBench",
  scicode: "SciCode",
  math_500: "MATH-500",
  aime: "AIME",
  aime_25: "AIME 2025",
  ifbench: "IFBench",
  lcr: "Long Context Reasoning",
  terminalbench_hard: "Terminal-Bench Hard",
  terminalbench_v2_1: "Terminal-Bench 2.1",
  tau2: "τ²-Bench",
  tau_banking: "τ-Bench Banking",
};

const plannedSources = [
  ["eq_bench_3", "EQ-Bench 3", "EQ-Bench", "https://eqbench.com/"],
  ["prinzbench", "PrinzBench", "PrinzBench", null],
  ["opus_magnum", "Opus Magnum Bench", "Opus Magnum Bench", "https://opusmagnumbench.com/"],
  ["arc_agi_1", "ARC-AGI-1", "ARC Prize", "https://arcprize.org/leaderboard"],
  ["arc_agi_2", "ARC-AGI-2", "ARC Prize", "https://arcprize.org/leaderboard"],
  ["arc_agi_3", "ARC-AGI-3", "ARC Prize", "https://arcprize.org/leaderboard"],
  ["simplebench", "SimpleBench", "SimpleBench", "https://simple-bench.com/"],
  ["vendingbench_2", "Vending-Bench 2", "Andon Labs", "https://andonlabs.com/evals/vending-bench-2"],
  ["vendingbench_arena", "Vending-Bench Arena", "Andon Labs", "https://andonlabs.com/evals/vending-bench-2"],
  ["cursorbench", "CursorBench", "Cursor", null],
  ["frontiercode", "FrontierCode", "Cognition", null],
  ["kernelbench", "KernelBench", "Stanford", "https://github.com/ScalingIntelligence/KernelBench"],
  ["posttrainbench", "PostTrainBench", "PostTrainBench", null],
  ["skatebench", "SkateBench", "Theo", null],
  ["voxelbench", "VoxelBench", "VoxelBench", null],
  ["agent_arena", "Agent Arena", "LMArena", "https://lmarena.ai/leaderboard"],
  ["lmarena_text", "LMArena Text", "LMArena", "https://lmarena.ai/leaderboard"],
  ["weird_ml", "Weird ML", "Weird ML", null],
];

const canonicalKey = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\b(anthropic|openai|google|meta|mistral|deepseek|xai)\b/g, " ")
    .replace(/\b(reasoning|thinking|adaptive|effort|max|high|medium|low|xhigh|none)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const rows = artificialAnalysis.data ?? [];
const aaKeys = [...new Set(rows.flatMap((row) => Object.keys(row.evaluations ?? {})))];
const benchmarks = aaKeys.map((id) => ({
  id,
  label: labels[id] ?? id.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  source: "Artificial Analysis",
  sourceUrl: "https://artificialanalysis.ai/leaderboards/models",
  status: "available",
  direction: "higher",
  coverage: rows.filter((row) => Number.isFinite(row.evaluations?.[id])).length,
}));

benchmarks.push(
  {
    id: "deepswe",
    label: "DeepSWE",
    source: "DataCurve",
    sourceUrl: deepSweV11.scrape_source_url ?? deepSweV1.scrape_source_url,
    status: "available",
    direction: "higher",
    versionPolicy: "v1.1 preferred; v1 fallback",
    coverage: 0,
  },
  {
    id: "bsbench_v2",
    label: "BSBench V2",
    source: "Peter Gostev",
    sourceUrl: bsBench.viewer_url,
    status: "available",
    direction: "higher",
    coverage: 0,
  },
  ...plannedSources.map(([id, label, source, sourceUrl]) => ({
    id,
    label,
    source,
    sourceUrl,
    status: "collector_pending",
    direction: "higher",
    coverage: 0,
  })),
);

const models = rows.map((row) => ({
  id: row.slug || row.id,
  name: row.name,
  creator: row.model_creator?.name ?? "Unknown",
  canonicalKey: canonicalKey(row.name),
  releaseDate: row.release_date ?? null,
  inputPrice: row.pricing?.price_1m_input_tokens ?? null,
  outputPrice: row.pricing?.price_1m_output_tokens ?? null,
  blendedPrice: row.pricing?.price_1m_blended_3_to_1 ?? null,
  speed: row.median_output_tokens_per_second ?? null,
  latency: row.median_time_to_first_token_seconds ?? null,
  scores: Object.fromEntries(
    Object.entries(row.evaluations ?? {}).filter(([, value]) => Number.isFinite(value)),
  ),
  scoreMetadata: {},
}));

const modelLookup = new Map();
for (const model of models) {
  const key = model.canonicalKey;
  if (!modelLookup.has(key)) modelLookup.set(key, model);
}

function findModel(name) {
  const key = canonicalKey(name);
  if (modelLookup.has(key)) return modelLookup.get(key);
  const candidates = models.filter((model) =>
    model.canonicalKey.includes(key) || key.includes(model.canonicalKey),
  );
  return candidates.sort((a, b) => Math.abs(a.canonicalKey.length - key.length) - Math.abs(b.canonicalKey.length - key.length))[0];
}

for (const model of models) {
  const { row, version } = findCombinedDeepSweRow(
    model.name,
    deepSweV11.rows ?? [],
    deepSweV1.rows ?? [],
  );
  if (!row) continue;
  model.scores.deepswe = row.pass_at_1 ?? row.pass_rate;
  model.scoreMetadata.deepswe = {
    version,
    reasoningEffort: row.reasoning_effort ?? null,
    costPerTask: row.mean_cost_usd ?? row.median_cost_usd ?? row.cost_per_task ?? row.avg_cost ?? null,
    outputTokens: row.mean_output_tokens ?? row.median_output_tokens ?? null,
    agentSteps: row.mean_agent_steps ?? row.median_agent_steps ?? null,
    sourceGeneratedAt: version === "v1.1" ? deepSweV11.generated_at ?? null : deepSweV1.generated_at ?? null,
    sourceScrapedAt: version === "v1.1" ? deepSweV11.scraped_at ?? null : deepSweV1.scraped_at ?? null,
  };
}

for (const row of bsBench.rows ?? []) {
  const model = findModel(row.model_base ?? row.model);
  const score = row.green_rate ?? row.avg_score;
  if (!model || !Number.isFinite(score)) continue;
  const normalized = score > 1 ? score / 100 : score;
  if (!Number.isFinite(model.scores.bsbench_v2) || normalized > model.scores.bsbench_v2) {
    model.scores.bsbench_v2 = normalized;
    model.scoreMetadata.bsbench_v2 = { reasoning: row.reasoning ?? null };
  }
}

for (const row of eqBench?.rows ?? []) {
  const model = findModel(row.model_name);
  const score = Number(row.elo_norm);
  if (!model || !Number.isFinite(score)) continue;
  model.scores.eq_bench_3 = score;
  model.scoreMetadata.eq_bench_3 = {
    rubricScore: Number.isFinite(Number(row.rubric_0_100)) ? Number(row.rubric_0_100) : null,
    confidenceLow: Number.isFinite(Number(row.ci_low_norm)) ? Number(row.ci_low_norm) : null,
    confidenceHigh: Number.isFinite(Number(row.ci_high_norm)) ? Number(row.ci_high_norm) : null,
  };
}

for (const row of lmArenaText?.models ?? []) {
  const model = findModel(row.model);
  const score = Number(row.score);
  if (!model || !Number.isFinite(score)) continue;
  model.scores.lmarena_text = score;
  model.scoreMetadata.lmarena_text = { rank: row.rank ?? null, confidenceInterval: row.ci ?? null, votes: row.votes ?? null };
}

for (const benchmark of benchmarks) {
  benchmark.coverage = models.filter((model) => Number.isFinite(model.scores[benchmark.id])).length;
  if (benchmark.coverage > 0) benchmark.status = "available";
}

const generatedAt = new Date().toISOString();
const collectionSummary = [
  {
    source: "Artificial Analysis",
    sourceUrl: "https://artificialanalysis.ai/leaderboards/models",
    status: "ok",
    rowCount: rows.length,
    rawPath: "data/aa_llms.json",
  },
  {
    source: "DeepSWE v1",
    sourceUrl: deepSweV1.scrape_source_url,
    status: "ok",
    rowCount: deepSweV1.rows?.length ?? 0,
    generatedAt: deepSweV1.generated_at ?? null,
    scrapedAt: deepSweV1.scraped_at ?? null,
    rawPath: "static/frontier-data/deepswe-v1-leaderboard.json",
  },
  {
    source: "DeepSWE v1.1",
    sourceUrl: deepSweV11.scrape_source_url,
    status: "ok",
    rowCount: deepSweV11.rows?.length ?? 0,
    generatedAt: deepSweV11.generated_at ?? null,
    scrapedAt: deepSweV11.scraped_at ?? null,
    rawPath: "static/frontier-data/deepswe-v1.1-leaderboard.json",
  },
  {
    source: "BSBench V2",
    sourceUrl: bsBench.source_url,
    status: "ok",
    rowCount: bsBench.rows?.length ?? 0,
    rawPath: "static/frontier-data/bsbench-v2.json",
  },
  ...(eqBench ? [{ source: "EQ-Bench 3", sourceUrl: eqBench.source_url, status: "ok", rowCount: eqBench.rows?.length ?? 0, rawPath: "static/frontier-data/raw/eq-bench-3.json" }] : []),
  ...(lmArenaText ? [{ source: "LMArena Text", sourceUrl: lmArenaText.meta?.source_url, status: "ok", rowCount: lmArenaText.models?.length ?? 0, rawPath: "static/frontier-data/raw/lmarena-text.json" }] : []),
  ...plannedSources.filter(([id]) => !(id === "eq_bench_3" && eqBench) && !(id === "lmarena_text" && lmArenaText)).map(([, label, , sourceUrl]) => ({
    source: label,
    sourceUrl,
    status: "collector_pending",
    rowCount: 0,
    rawPath: null,
  })),
];

const warehouse = {
  schemaVersion: 1,
  generatedAt,
  normalization: {
    method: "per-benchmark percentile rank across models with data",
    missing: "weighted denominator excludes missing benchmarks per model",
    variantPolicy: "reasoning variants remain separate AA rows; external variants attach as metadata",
  },
  benchmarks,
  models: models.filter((model) => Object.keys(model.scores).length > 0),
  collectionSummary,
};

const outputs = [
  "static/frontier-data/benchmark-warehouse.json",
  "agent-native-dashboard/data/benchmark-warehouse.json",
];
for (const relative of outputs) {
  const output = path.join(root, relative);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(warehouse, null, 2)}\n`);
}

console.log(JSON.stringify({ generatedAt, benchmarks: benchmarks.length, models: warehouse.models.length, outputs }, null, 2));
