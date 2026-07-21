#!/usr/bin/env node
/*
  Non-blocking fallback utility for pricing gaps in fal llms.txt metadata.
  Usage:
    node scripts/fal_pricing_scraper_playwright.js "https://fal.ai/models/fal-ai/flux/dev"
*/

const { chromium } = require('playwright');

async function scrape(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const result = { url, pricingText: null, matchedSnippets: [] };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1500);

    const text = await page.evaluate(() => document.body?.innerText || '');
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const matches = lines.filter((line) => /\$|credit|price|pricing|per\s+request|token/i.test(line));

    result.matchedSnippets = matches.slice(0, 30);
    result.pricingText = matches[0] || null;
  } finally {
    await browser.close();
  }

  return result;
}

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Missing model URL argument.');
    process.exit(1);
  }

  try {
    const data = await scrape(url);
    process.stdout.write(JSON.stringify(data, null, 2));
  } catch (error) {
    process.stderr.write(String(error?.stack || error));
    process.exit(1);
  }
})();
