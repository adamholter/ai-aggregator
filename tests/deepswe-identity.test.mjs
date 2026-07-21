import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalDeepConfig,
  findCombinedDeepSweRow,
  findDeepSweRow,
} from "../scripts/lib/deepswe_identity.mjs";

const rows = [
  { model: "gpt-5-6-sol", reasoning_effort: "max", config: "mini_swe_agent_gpt_5_6_sol_max", pass_at_1: 0.726 },
  { model: "gpt-5-6-sol", reasoning_effort: "high", config: "mini_swe_agent_gpt_5_6_sol_high", pass_at_1: 0.694 },
  { model: "claude-fable-5", reasoning_effort: "max", config: "mini_swe_agent_claude_fable_5_max", pass_at_1: 0.697 },
  { model: "grok-4-5", reasoning_effort: "high", config: "mini_swe_agent_grok_4_5_high", pass_at_1: 0.537 },
];

test("matches each reasoning variant to its own DeepSWE row", () => {
  assert.equal(findDeepSweRow("GPT-5.6 Sol (max)", rows)?.pass_at_1, 0.726);
  assert.equal(findDeepSweRow("GPT-5.6 Sol (high)", rows)?.pass_at_1, 0.694);
  assert.equal(findDeepSweRow("GPT-5.6 Sol (low)", rows), null);
});

test("ignores AA fallback wording while preserving effort", () => {
  assert.equal(
    findDeepSweRow("Claude Fable 5 (Adaptive Reasoning, Max Effort, Opus 4.8 Fallback)", rows)?.pass_at_1,
    0.697,
  );
});

test("matches punctuation and provider differences without model-specific aliases", () => {
  assert.equal(canonicalDeepConfig(rows[3]), "grok 4 5 high");
  assert.equal(findDeepSweRow("Grok 4.5 (high)", rows)?.pass_at_1, 0.537);
});

test("prefers v1.1 and falls back to v1", () => {
  const oldRows = [{ model: "gpt-5-6-sol", reasoning_effort: "max", config: "mini_swe_agent_gpt_5_6_sol_max", pass_at_1: 0.5 }];
  assert.deepEqual(findCombinedDeepSweRow("GPT-5.6 Sol (max)", rows, oldRows), { row: rows[0], version: "v1.1" });
  assert.equal(findCombinedDeepSweRow("GPT-5.6 Sol (max)", [], oldRows).version, "v1");
});
