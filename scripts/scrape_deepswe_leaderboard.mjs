#!/usr/bin/env node

import { mkdir, rename, writeFile } from 'node:fs/promises';

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
      accept: 'application/json',
      'cache-control': 'no-cache'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`DeepSWE ${dataset.version} fetch failed: HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
    throw new Error(`DeepSWE ${dataset.version} payload did not include non-empty rows[]`);
  }

  const configs = payload.rows.map((row) => row.config).filter(Boolean);
  if (new Set(configs).size !== configs.length) {
    throw new Error(`DeepSWE ${dataset.version} payload included duplicate config identities`);
  }

  if (payload.rows.some((row) => !row.model || !Number.isFinite(row.pass_at_1 ?? row.pass_rate))) {
    throw new Error(`DeepSWE ${dataset.version} payload included unresolved models or non-numeric scores`);
  }

  payload.version = dataset.version;
  payload.scrape_source_url = dataset.sourceUrl;
  payload.scraped_at = new Date().toISOString();
  payload.source_etag = response.headers.get('etag');
  payload.source_last_modified = response.headers.get('last-modified');

  const temporaryPath = new URL(`${dataset.outputPath.pathname}.tmp`, 'file://');
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`);
  await rename(temporaryPath, dataset.outputPath);

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
