import { test, expect } from '@playwright/test';

function sse(events: unknown[]) {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dashboard-user-openrouter-key', 'sk-test');
  });
});

test('agent shell renders current UI', async ({ page }) => {
  await page.goto('/static/agent.html');

  await expect(page.locator('.header-brand')).toHaveText('Agent');
  await expect(page.locator('#input')).toBeVisible();
  await expect(page.locator('#tsb-panel')).toContainText('Activity');
});

test('streamed completion renders response and activity summary', async ({ page }) => {
  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        { type: 'status', stage: 'start', mode: 'quick' },
        { type: 'tool_start', iteration: 1, tool_name: 'get_llm_leaderboard', args: { limit: 5 } },
        { type: 'tool_result', iteration: 1, tool_name: 'get_llm_leaderboard', status: 'done', result_preview: 'ok' },
        { type: 'content_chunk', delta: '# Answer\n\n' },
        { type: 'content_chunk', delta: 'hello world' },
        { type: 'done', response: '# Answer\n\nhello world' },
      ]),
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#input').fill('best coding models');
  await page.locator('#send-btn').click();

  await expect(page.locator('.agent-response h1')).toHaveText('Answer');
  await expect(page.locator('.agent-response')).toContainText('hello world');
  await expect(page.locator('.trace-pill')).toContainText('Activity');
});

test('truncated stream still finalizes with partial response instead of spinning forever', async ({ page }) => {
  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        { type: 'status', stage: 'start', mode: 'quick' },
        { type: 'tool_start', iteration: 1, tool_name: 'web_search', args: { query: 'ai trends' } },
        { type: 'tool_result', iteration: 1, tool_name: 'web_search', status: 'done', result_preview: 'results' },
        { type: 'content_chunk', delta: 'Partial answer' },
      ]),
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#input').fill('find a trend');
  await page.locator('#send-btn').click();

  await expect(page.locator('.agent-response')).toContainText('Partial answer');
  await expect(page.locator('.loading-row')).toHaveCount(0);
  await page.locator('#input').fill('second prompt');
  await expect(page.locator('#send-btn')).toBeEnabled();
});
