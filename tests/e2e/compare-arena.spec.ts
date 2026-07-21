import { test, expect } from '@playwright/test';

test('Comparison Arena normalizes LLM payloads and supports compare/remove/export', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/api/openrouter-models', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 'openai/test-one', name: 'Test One', pricing: { prompt: '0.000001', completion: '0.000002' }, context_length: 100000 },
      { id: 'anthropic/test-two', name: 'Test Two', pricing: { prompt: '0.000003', completion: '0.000004' }, context_length: 200000 },
    ]),
  }));
  await page.route('**/api/llms', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ name: 'Benchmark Three', model_creator: { name: 'Lab' }, evaluations: {}, pricing: {} }] }),
  }));

  await page.goto('/compare-arena');
  for (const query of ['Test One', 'Test Two']) {
    await page.locator('#modelSearch').fill(query);
    await page.locator('#modelDropdown .model-option[data-id]').first().click();
  }

  await expect(page.locator('.model-chip')).toHaveCount(2);
  await expect(page.locator('.data-table tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Copy Markdown' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Test One');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  await expect((await downloadPromise).suggestedFilename()).toBe('model-comparison.csv');

  await page.locator('.model-chip button').first().click();
  await expect(page.locator('.model-chip')).toHaveCount(1);
  await expect(page.locator('.data-table')).toHaveCount(0);
});
