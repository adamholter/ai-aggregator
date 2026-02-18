import { test, expect } from '@playwright/test';

function sse(events: unknown[]) {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
}

test('New shell renders and activity pane is present', async ({ page }) => {
  await page.goto('/static/agent.html');
  await expect(page.getByRole('heading', { name: 'Model Analyst' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await expect(page.locator('#promptInput')).toBeVisible();
});

test('Settings save updates mode badge', async ({ page }) => {
  await page.goto('/static/agent.html');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#agentMode').selectOption('heavy');
  await page.locator('#saveSettingsBtn').click();
  await expect(page.locator('#modeBadge')).toContainText('Heavy Mode');
});

test('Streaming timeline is curated (no content_chunk spam items)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dashboard-user-openrouter-key', 'sk-test');
    localStorage.setItem('dashboard-agent-exp-model', 'anthropic/claude-sonnet-4');
  });

  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        { type: 'status', stage: 'start', mode: 'quick' },
        { type: 'status', stage: 'iteration_start', iteration: 1 },
        { type: 'tool_start', iteration: 1, tool_name: 'get_llm_leaderboard', args: { limit: 5 } },
        { type: 'tool_result', iteration: 1, tool_name: 'get_llm_leaderboard', status: 'done', result_preview: 'ok' },
        { type: 'content_chunk', delta: '# Answer\n\n' },
        { type: 'content_chunk', delta: 'hello world' },
        { type: 'done', response: '# Answer\n\nhello world' }
      ])
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#promptInput').fill('best coding models');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByRole('heading', { name: 'Answer' })).toBeVisible();
  await expect(page.locator('.action-feed .run-group')).toHaveCount(1);
  await expect(page.locator('.action-feed .event')).toHaveCount(5);
  await expect(page.locator('.action-feed .event .title')).toContainText([
    'Plan request',
    'Iteration 1',
    'get_llm_leaderboard',
    'Synthesize response',
    'Done'
  ]);
});

test('Stop cancels active request and shows Stopped state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dashboard-user-openrouter-key', 'sk-test');
    localStorage.setItem('dashboard-agent-exp-model', 'anthropic/claude-sonnet-4');
  });

  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await page.waitForTimeout(400);
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse([{ type: 'done', response: 'late' }]),
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#promptInput').fill('long run');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('#runState')).toContainText('Stopped');
  await page.waitForTimeout(500);
});

test('Main page iframe points at rebuilt agent UI', async ({ page }) => {
  await page.goto('/');
  const iframe = page.locator('iframe[title="Agent"]');
  await expect(iframe).toHaveAttribute('src', '/static/agent.html');
});
