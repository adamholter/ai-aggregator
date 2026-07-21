import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "static/frontier-data/raw");
await mkdir(outputDir, { recursive: true });

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "ai-dashboard-benchmark-collector/1.0" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function save(name, value) {
  const file = path.join(outputDir, name);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return path.relative(root, file);
}

const summaries = [];

try {
  const sourceUrl = "https://eqbench.com/eqbench3.js";
  const script = await fetchText(sourceUrl);
  const match = script.match(/leaderboardDataEQBench3\s*=\s*`([\s\S]*?)`;/);
  if (!match) throw new Error("embedded EQ-Bench 3 CSV was not found");
  const lines = match[1].trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(",");
  const rows = lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(",")[index] ?? ""])));
  const rawPath = await save("eq-bench-3.json", { source_url: "https://eqbench.com/", artifact_url: sourceUrl, collected_at: new Date().toISOString(), rows });
  summaries.push({ source: "EQ-Bench 3", sourceUrl, status: "ok", rowCount: rows.length, rawPath });
} catch (error) {
  summaries.push({ source: "EQ-Bench 3", sourceUrl: "https://eqbench.com/", status: "error", rowCount: 0, rawPath: null, error: error.message });
}

try {
  const artifactUrl = "https://api.wulong.dev/arena-ai-leaderboards/v1/leaderboard?name=text";
  const payload = JSON.parse(await fetchText(artifactUrl));
  const rawPath = await save("lmarena-text.json", { ...payload, artifact_url: artifactUrl, collected_at: new Date().toISOString() });
  summaries.push({ source: "LMArena Text", sourceUrl: payload.meta?.source_url ?? "https://arena.ai/leaderboard/text", artifactUrl, status: "ok", rowCount: payload.models?.length ?? 0, rawPath });
} catch (error) {
  summaries.push({ source: "LMArena Text", sourceUrl: "https://arena.ai/leaderboard/text", status: "error", rowCount: 0, rawPath: null, error: error.message });
}

await writeFile(path.join(outputDir, "collection-summary.json"), `${JSON.stringify({ collected_at: new Date().toISOString(), sources: summaries }, null, 2)}\n`);
console.log(JSON.stringify(summaries, null, 2));
