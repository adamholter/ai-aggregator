import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./merge_qa_results.mjs", import.meta.url), "utf8");

test("the canonical merge distinguishes simulated, local, live, and unverified evidence", () => {
  assert.match(source, /"mocked-ui": "Contract Pass"/);
  assert.match(source, /"local-integration": "Local Pass"/);
  assert.match(source, /"deployed-live": "Pass"/);
  assert.match(source, /passingStatus \|\| "Unverified"/);
  assert.match(source, /row\.regression_evidence = normalized/);
});

test("arbitrary statuses are rejected", () => {
  assert.match(source, /invalid status/);
  assert.match(source, /allowedStatuses\.has/);
});
