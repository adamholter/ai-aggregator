#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';

const DATASETS = [
  {
    version: 'v1',
    sourceUrl: 'https://deepswe.datacurve.ai/artifacts/v1/leaderboard-live.json',
    outputPath: new URL('../static/frontier-data/deepswe-v1-leaderboard.json', import.meta.url)
  },
  {
    version: 'v1.1',
    sourceUrl: 'https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json',
    outputPath: new URL('../static/frontier-data/deepswe-v1.1-leaderboard.json', import.meta.url)
  }
];

async function fetchDataset(dataset) {
  const response = await fetch(dataset.sourceUrl, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`DeepSWE ${dataset.version} fetch failed: HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.rows)) {
    throw new Error(`DeepSWE ${dataset.version} payload did not include rows[]`);
  }

  payload.version = dataset.version;
  payload.scrape_source_url = dataset.sourceUrl;
  payload.scraped_at = new Date().toISOString();

  await writeFile(dataset.outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  return {
    version: dataset.version,
    output: dataset.outputPath.pathname,
    rows: payload.rows.length,
    generated_at: payload.generated_at,
    scraped_at: payload.scraped_at
  };
}

await mkdir(new URL('../static/frontier-data/', import.meta.url), { recursive: true });

const results = [];
for (const dataset of DATASETS) {
  results.push(await fetchDataset(dataset));
}

console.log(JSON.stringify(results, null, 2));
