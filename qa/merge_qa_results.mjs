import fs from "node:fs/promises";
import path from "node:path";

const [, , phase = "baseline", ...files] = process.argv;
if (!files.length || !["baseline", "regression"].includes(phase)) {
  throw new Error("Usage: node qa/merge_qa_results.mjs <baseline|regression> <result.json>...");
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const trackerPath = path.join(root, "qa/feature_status.json");
const rows = JSON.parse(await fs.readFile(trackerPath, "utf8"));
for (const row of rows) {
  if (row.baseline_status === "Pass" && !row.baseline_evidence) row.baseline_status = "Unverified";
  if (row.regression_status === "Pass" && !row.regression_evidence) row.regression_status = "Unverified";
}
const byId = new Map(rows.map(row => [row.id, row]));
const missing = [];
const allowedStatuses = new Set(["Pass", "Fail", "Blocked", "Not Tested"]);
const evidenceStatus = {
  "deployed-live": "Pass",
  "local-integration": "Local Pass",
  "contract": "Contract Pass",
  "mocked-ui": "Contract Pass",
  "unit": "Unit Pass",
};

function normalizeResult(result, payload, file) {
  const requestedStatus = result.status || "Not Tested";
  if (!allowedStatuses.has(requestedStatus)) {
    throw new Error(`${file}: invalid status '${requestedStatus}' for ${result.id}`);
  }
  const evidence = result.evidence_meta || payload.evidence_meta || {};
  const evidenceClass = evidence.class || "unverified";
  const passingStatus = evidenceStatus[evidenceClass];
  const status = requestedStatus === "Pass" ? (passingStatus || "Unverified") : requestedStatus;
  return {
    status,
    evidenceClass,
    target: evidence.target || null,
    command: evidence.command || null,
    runId: evidence.run_id || null,
    recordedAt: evidence.recorded_at || null,
  };
}

for (const file of files) {
  const payload = JSON.parse(await fs.readFile(path.resolve(root, file), "utf8"));
  const stories = Array.isArray(payload) ? payload : payload.stories || [];
  for (const result of stories) {
    const row = byId.get(result.id);
    if (!row) {
      missing.push(result.id);
      continue;
    }
    const normalized = normalizeResult(result, payload, file);
    const status = normalized.status;
    const detail = result.result || result.evidence || "";
    if (phase === "baseline") {
      row.baseline_status = status;
      row.baseline_result = detail;
      row.baseline_evidence = normalized;
    } else {
      row.regression_status = status;
      row.regression_result = detail;
      row.regression_evidence = normalized;
    }
  }
}

await fs.writeFile(trackerPath, `${JSON.stringify(rows, null, 2)}\n`);
console.log(JSON.stringify({ phase, merged: files.length, missing }));
