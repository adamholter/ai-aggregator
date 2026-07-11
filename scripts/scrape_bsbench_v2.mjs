#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://raw.githubusercontent.com/petergpt/bullshit-benchmark/main/data/v2/latest/leaderboard_with_launch.csv';
const OUTPUT_PATH = new URL('../static/frontier-data/bsbench-v2.json', import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows.filter(values => values.length === headers.length).map(values => Object.fromEntries(headers.map((header, idx) => [header, values[idx]])));
}

function number(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const response = await fetch(SOURCE_URL, { headers: { accept: 'text/csv' } });
if (!response.ok) throw new Error(`BSBench fetch failed: HTTP ${response.status}`);

const rows = parseCsv(await response.text()).map(row => ({
  rank: number(row.rank),
  model: row.model,
  model_base: row.model_base,
  org: row.org,
  reasoning: row.reasoning,
  avg_score: number(row.avg_score),
  green_rate: number(row.green_rate),
  red_rate: number(row.red_rate),
  refusal_rate: number(row.refusal_rate),
  clear_pushback: number(row.score_2),
  partial_challenge: number(row.score_1),
  accepted_nonsense: number(row.score_0),
  answered_count: number(row.answered_count),
  nonsense_count: number(row.nonsense_count),
  launch_date: row.launch_date || null,
  source_url: row.launch_evidence_url || null,
  open_model_status: row.open_model_status || null,
  total_params_b: number(row.total_params_b)
}));

const payload = {
  name: 'BullshitBench v2',
  short_name: 'BSBench V2',
  source_url: SOURCE_URL,
  viewer_url: 'https://petergpt.github.io/bullshit-benchmark/viewer/index.v2.html',
  github_url: 'https://github.com/petergpt/bullshit-benchmark',
  description: 'Measures whether models detect and push back on plausible-sounding nonsense instead of accepting invalid premises.',
  unit: 'green_rate is clear pushback rate over 100 v2 nonsense prompts.',
  domains: { software: 40, finance: 15, legal: 15, medical: 15, physics: 15 },
  rows,
  scraped_at: new Date().toISOString()
};

await mkdir(new URL('../static/frontier-data/', import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ output: OUTPUT_PATH.pathname, rows: rows.length, scraped_at: payload.scraped_at }, null, 2));
