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

test('UI contract: streamed completion renders response and activity summary', async ({ page }) => {
  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        { type: 'status', stage: 'start', mode: 'quick' },
        { type: 'tool_start', iteration: 1, tool_name: 'get_llm_leaderboard', args: { limit: 5 } },
        { type: 'tool_result', iteration: 1, tool_name: 'get_llm_leaderboard', status: 'done', result_preview: 'ok' },
        { type: 'content_chunk', delta: '# Answer\n\n' },
        { type: 'content_chunk', delta: 'hello — 14.3–14.9; café €0.10' },
        { type: 'done', response: '# Answer\n\nhello — 14.3–14.9; café €0.10' },
      ]),
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#input').fill('best coding models');
  await page.locator('#send-btn').click();

  const liveActivity = page.locator('.msg-agent').last();
  await expect(liveActivity.locator('.live-hint')).toBeVisible();
  await liveActivity.locator('.live-hint').click();
  await expect(liveActivity.locator('.inline-activity')).toBeVisible();
  await expect(liveActivity.locator('.inline-activity')).toContainText('Thinking');
  await expect(page.locator('#tsb-panel')).not.toHaveClass(/open/);

  await expect(page.locator('.agent-response h1')).toHaveText('Answer');
  await expect(page.locator('.agent-response')).toContainText('hello — 14.3–14.9; café €0.10');
  await expect(page.locator('.agent-response')).not.toContainText('â');
  await expect(page.locator('.activity-summary')).toContainText('Activity');
  const completedActivity = page.locator('.activity-block').last();
  await expect(completedActivity.locator('.inline-activity')).toBeVisible();
  await expect(completedActivity).toContainText('llm leaderboard');
  await completedActivity.locator('.tsb-step').first().click();
  await expect(completedActivity.locator('.tsb-detail').first()).toBeVisible();
});

test('UI contract: truncated stream finalizes with partial response', async ({ page }) => {
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

test('UI contract: duplicate tool warnings show in activity', async ({ page }) => {
  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        { type: 'status', stage: 'start', mode: 'heavy' },
        { type: 'tool_start', iteration: 1, tool_name: 'read_skill', args: { skill_name: 'billing' } },
        { type: 'tool_result', iteration: 1, tool_name: 'read_skill', status: 'done', result_preview: 'skill body' },
        { type: 'tool_start', iteration: 2, tool_name: 'read_skill', args: { skill_name: 'billing' } },
        { type: 'tool_result', iteration: 2, tool_name: 'read_skill', status: 'duplicate', result_preview: 'Duplicate tool call blocked' },
        { type: 'done', response: 'Used the prior result.' },
      ]),
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#input').fill('loop once');
  await page.locator('#send-btn').click();

  await expect(page.locator('.agent-response')).toContainText('Used the prior result.');
  await page.locator('.activity-summary').click();
  const inlineTrace = page.locator('.activity-block .inline-activity');
  await expect(inlineTrace).toContainText('duplicate');
  await inlineTrace.locator('.tsb-step').last().click();
  await expect(inlineTrace).toContainText('Duplicate tool call blocked');
});

test('UI contract: typed 402 messages render specific paid-access guidance', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('dashboard-user-openrouter-key');
  });

  await page.route('**/api/agent-v2/chat/stream', async (route) => {
    await route.fulfill({
      status: 402,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'no_paid_plan',
        error: 'No paid plan with server-side OpenRouter access is active on this account. Add your own OpenRouter key or upgrade.',
      }),
    });
  });

  await page.goto('/static/agent.html');
  await page.locator('#input').fill('need access');
  await page.locator('#send-btn').click();

  await expect(page.locator('.error-box')).toContainText('does not have a paid plan');
  await expect(page.locator('.loading-row')).toHaveCount(0);
  await page.locator('#input').fill('try again');
  await expect(page.locator('#send-btn')).toBeEnabled();
});
