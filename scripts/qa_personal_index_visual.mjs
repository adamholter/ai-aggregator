import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.DASHBOARD_URL || 'http://127.0.0.1:3000';
const outputDir = new URL('../outputs/personal-index-visual/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cacheBust = `qa=${Date.now()}`;

async function seedIndex(page) {
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);
  await page.evaluate(() => {
    const ids = ['deepswe', 'artificial_analysis_intelligence_index', 'bsbench_v2', 'terminalbench_v2_1'];
    ids.forEach((id, index) => {
      const control = document.querySelector(`[data-weight-number="${id}"]`);
      if (!control) throw new Error(`Missing benchmark control ${id}`);
      control.value = String([35, 30, 20, 15][index]);
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.getByRole('button', { name: 'Index page' }).click();
  await page.waitForSelector('#idx-intel-cost canvas');
}

async function verifyBuilderVisualizations(page) {
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);
  await page.evaluate(() => {
    const ids = ['deepswe', 'artificial_analysis_intelligence_index', 'bsbench_v2', 'terminalbench_v2_1'];
    ids.forEach((id, index) => {
      const control = document.querySelector(`[data-weight-number="${id}"]`);
      if (!control) throw new Error(`Missing benchmark control ${id}`);
      control.value = String([35, 30, 20, 15][index]);
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  const leaderboard = await page.evaluate(() => {
    const option = window.frontierState.charts['pareto-chart'].getOption();
    return {
      title: document.querySelector('#distribution-title')?.textContent,
      xType: option.xAxis?.[0]?.type,
      yType: option.yAxis?.[0]?.type,
      seriesType: option.series?.[0]?.type,
      rows: option.yAxis?.[0]?.data?.length,
      firstBenchmarks: [...document.querySelectorAll('#active-bench-controls [data-weight-number], #all-bench-controls [data-weight-number]')]
        .map(control => control.dataset.weightNumber)
        .filter((id, index, all) => all.indexOf(id) === index)
        .slice(0, 5),
    };
  });
  assert.equal(leaderboard.title, 'Index leaderboard');
  assert.equal(leaderboard.xType, 'value');
  assert.equal(leaderboard.yType, 'category');
  assert.equal(leaderboard.seriesType, 'bar');
  assert.ok(leaderboard.rows > 0);
  assert.deepEqual(leaderboard.firstBenchmarks, ['deepswe', 'artificial_analysis_intelligence_index', 'bsbench_v2', 'terminalbench_v2_1', 'hle']);

  await page.getByRole('button', { name: 'Cost frontier' }).click();
  const frontier = await page.evaluate(() => {
    const option = window.frontierState.charts['pareto-chart'].getOption();
    return {
      title: document.querySelector('#distribution-title')?.textContent,
      xType: option.xAxis?.[0]?.type,
      xName: option.xAxis?.[0]?.name,
      lineType: option.series?.[0]?.lineStyle?.type,
      scatterType: option.series?.[1]?.type,
    };
  });
  assert.equal(frontier.title, 'Cost vs intelligence frontier');
  assert.equal(frontier.xType, 'log');
  assert.match(frontier.xName, /DeepSWE cost per task/);
  assert.equal(frontier.lineType, 'dotted');
  assert.equal(frontier.scatterType, 'scatter');
  return { leaderboard, frontier };
}

async function verifyDarkTheme(page) {
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.refreshPersonalIndexTheme();
  });
  await page.waitForTimeout(100);

  const result = await page.evaluate(() => {
    const parseRgb = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = value => {
      const [r, g, b] = parseRgb(value).map(channel => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a, b) => {
      const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const activeButton = document.querySelector('#show-histogram');
    const activeStyles = getComputedStyle(activeButton);
    const inputStyles = getComputedStyle(document.querySelector('[data-weight-number]'));
    const legend = document.querySelector('#mix-legend');
    const legendText = legend.textContent;
    const mixOption = window.frontierState.charts['mix-chart'].getOption();
    const rankingOption = window.frontierState.charts['pareto-chart'].getOption();
    const optionValue = value => Array.isArray(value) ? value[0] : value;
    return {
      rootBackground: getComputedStyle(document.body).backgroundColor,
      rootText: getComputedStyle(document.body).color,
      inputBackground: inputStyles.backgroundColor,
      inputText: inputStyles.color,
      activeContrast: contrast(activeStyles.backgroundColor, activeStyles.color),
      inputContrast: contrast(inputStyles.backgroundColor, inputStyles.color),
      legendItems: legend.querySelectorAll('.mix-legend-item').length,
      legendOverflow: legend.scrollWidth - legend.clientWidth,
      malformedLegendText: /&(?:amp|#\d+);|â|Â|�/.test(legendText),
      decodedFixture: window.displayText('Cost &amp; speed â€“ balanced'),
      pieLabelsShown: mixOption.series?.[0]?.label?.show,
      chartTextColor: optionValue(rankingOption.textStyle)?.color,
      axisTextColor: rankingOption.xAxis?.[0]?.axisLabel?.color,
      axisLineColor: rankingOption.xAxis?.[0]?.axisLine?.lineStyle?.color,
    };
  });
  assert.notEqual(result.rootBackground, 'rgb(255, 255, 255)');
  assert.notEqual(result.inputBackground, 'rgb(255, 255, 255)');
  assert.ok(result.activeContrast >= 4.5, `active control contrast ${result.activeContrast}`);
  assert.ok(result.inputContrast >= 4.5, `input contrast ${result.inputContrast}`);
  assert.ok(result.legendItems >= 4);
  assert.ok(result.legendOverflow <= 1, `legend overflows by ${result.legendOverflow}px`);
  assert.equal(result.malformedLegendText, false);
  assert.equal(result.decodedFixture, 'Cost & speed – balanced');
  assert.equal(result.pieLabelsShown, false);
  assert.equal(result.chartTextColor, '#aeb8c8');
  assert.equal(result.axisTextColor, '#8490a2');
  assert.equal(result.axisLineColor, '#273140');
  return result;
}

async function verifyPersistence(page) {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);
  await page.evaluate(() => localStorage.removeItem('ai-dashboard:personal-index:v1'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);

  await page.locator('#add-index').click();
  await page.locator('#active-index-name-inline').dblclick();
  await page.locator('#active-index-name-input').fill('Reload Survivor');
  await page.locator('#active-index-name-input').press('Enter');
  await page.evaluate(() => {
    const weight = document.querySelector('[data-weight-number="deepswe"]');
    if (!weight) throw new Error('Missing DeepSWE weight control');
    weight.value = '37';
    weight.dispatchEvent(new Event('input', { bubbles: true }));
    const required = document.querySelector('[data-required="deepswe"]');
    if (!required) throw new Error('Missing DeepSWE required control');
    required.checked = true;
    required.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Cost frontier' }).click();

  const saved = await page.evaluate(() => {
    const payload = JSON.parse(localStorage.getItem('ai-dashboard:personal-index:v1'));
    return {
      indexes: payload.indexes.length,
      activeName: payload.indexes.find(index => index.id === payload.activeId)?.name,
      weight: payload.indexes.find(index => index.id === payload.activeId)?.weights?.deepswe,
      required: payload.indexes.find(index => index.id === payload.activeId)?.required,
      chartMode: payload.chartMode,
      savedAt: payload.savedAt,
      status: document.querySelector('#save-status')?.textContent,
    };
  });
  assert.equal(saved.indexes, 2);
  assert.equal(saved.activeName, 'Reload Survivor');
  assert.equal(saved.weight, 37);
  assert.ok(saved.required.includes('deepswe'));
  assert.equal(saved.chartMode, 'pareto');
  assert.ok(saved.savedAt);
  await page.waitForFunction(() => document.querySelector('#save-status')?.textContent === 'Saved to app storage');
  saved.status = await page.locator('#save-status').textContent();
  assert.equal(saved.status, 'Saved to app storage');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);
  const restored = await page.evaluate(() => {
    const active = window.frontierState.indexes.find(index => index.id === window.frontierState.activeId);
    return {
      indexes: window.frontierState.indexes.length,
      activeName: active?.name,
      weight: active?.weights?.deepswe,
      required: active?.required,
      chartMode: window.frontierState.chartMode,
      inputWeight: Number(document.querySelector('[data-weight-number="deepswe"]')?.value),
      title: document.querySelector('#distribution-title')?.textContent,
    };
  });
  assert.equal(restored.indexes, 2);
  assert.equal(restored.activeName, 'Reload Survivor');
  assert.equal(restored.weight, 37);
  assert.equal(restored.inputWeight, 37);
  assert.ok(restored.required.includes('deepswe'));
  assert.equal(restored.chartMode, 'pareto');
  assert.equal(restored.title, 'Cost vs intelligence frontier');

  await page.evaluate(() => localStorage.removeItem('ai-dashboard:personal-index:v1'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.frontierState?.models?.length > 20);
  await page.waitForFunction(() => document.querySelector('#save-status')?.textContent === 'Restored from app storage');
  const restoredFromAppStorage = await page.evaluate(() => {
    const active = window.frontierState.indexes.find(index => index.id === window.frontierState.activeId);
    return {
      indexes: window.frontierState.indexes.length,
      activeName: active?.name,
      weight: active?.weights?.deepswe,
      required: active?.required,
      chartMode: window.frontierState.chartMode,
      status: document.querySelector('#save-status')?.textContent,
    };
  });
  assert.equal(restoredFromAppStorage.indexes, 2);
  assert.equal(restoredFromAppStorage.activeName, 'Reload Survivor');
  assert.equal(restoredFromAppStorage.weight, 37);
  assert.ok(restoredFromAppStorage.required.includes('deepswe'));
  assert.equal(restoredFromAppStorage.chartMode, 'pareto');
  assert.equal(restoredFromAppStorage.status, 'Restored from app storage');
  assert.deepEqual(pageErrors, []);
  return { saved, restored, restoredFromAppStorage };
}

async function verifyCharts(page) {
  const result = await page.evaluate(() => {
    const styles = getComputedStyle(document.querySelector('.panel'));
    const indexOptions = Object.fromEntries(Object.entries(window.frontierState.indexCharts).map(([id, chart]) => [id, chart.getOption()]));
    return {
      bodyBackgroundImage: getComputedStyle(document.body).backgroundImage,
      panelRadius: styles.borderRadius,
      panelShadow: styles.boxShadow,
      chartCount: Object.keys(indexOptions).length,
      speedAxisType: indexOptions['idx-intel-speed']?.xAxis?.[0]?.type,
      overviewSpeedAxisType: indexOptions['idx-cost-speed']?.xAxis?.[0]?.type,
      frontierLineType: indexOptions['idx-intel-cost']?.series?.[0]?.lineStyle?.type,
      modelLabelsShown: indexOptions['idx-intel-cost']?.series?.[1]?.label?.show,
      modelLabelLinesShown: indexOptions['idx-intel-cost']?.series?.[1]?.labelLine?.show,
      costBarHeight: document.querySelector('#idx-cost-bar')?.getBoundingClientRect().height,
      costBarCanvasHeight: document.querySelector('#idx-cost-bar canvas')?.getBoundingClientRect().height,
    };
  });
  assert.equal(result.bodyBackgroundImage, 'none');
  assert.equal(result.panelRadius, '0px');
  assert.equal(result.panelShadow, 'none');
  assert.equal(result.chartCount, 6);
  assert.equal(result.speedAxisType, 'log');
  assert.equal(result.overviewSpeedAxisType, 'log');
  assert.equal(result.frontierLineType, 'dotted');
  assert.equal(result.modelLabelsShown, true);
  assert.equal(result.modelLabelLinesShown, true);
  assert.ok(result.costBarHeight >= 400);
  assert.equal(result.costBarCanvasHeight, result.costBarHeight);
  return result;
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await desktop.goto(`${baseUrl}/static/frontier-index-lab.html?${cacheBust}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
const builderResult = await verifyBuilderVisualizations(desktop);
await desktop.getByRole('button', { name: 'Leaderboard' }).click();
await desktop.waitForTimeout(100);
await desktop.locator('#pareto-chart').screenshot({ path: new URL('builder-leaderboard.png', outputDir).pathname });
const desktopDarkResult = await verifyDarkTheme(desktop);
await desktop.screenshot({ path: new URL('builder-dark.png', outputDir).pathname, fullPage: true });
await seedIndex(desktop);
const desktopResult = await verifyCharts(desktop);
await desktop.locator('#index-content').screenshot({ path: new URL('desktop.png', outputDir).pathname });

const persistenceContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const persistencePage = await persistenceContext.newPage();
let appStorageState = null;
if (!process.env.REAL_APP_STORAGE) {
  await persistencePage.route('**/api/personal-index-state', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: appStorageState, scope: 'device' }) });
      return;
    }
    if (request.method() === 'POST') {
      appStorageState = request.postDataJSON().state;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true, scope: 'device', updatedAt: new Date().toISOString() }) });
      return;
    }
    await route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed' }) });
  });
}
await persistencePage.goto(`${baseUrl}/static/frontier-index-lab.html?${cacheBust}-persistence`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
const persistenceResult = await verifyPersistence(persistencePage);
await persistenceContext.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto(`${baseUrl}/static/frontier-index-lab.html?${cacheBust}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await verifyBuilderVisualizations(mobile);
const mobileDarkResult = await verifyDarkTheme(mobile);
await seedIndex(mobile);
const mobileResult = await verifyCharts(mobile);
await mobile.screenshot({ path: new URL('mobile.png', outputDir).pathname, fullPage: true });

let frameSizing = null;
if (!process.env.SKIP_SHELL_QA) {
  const shell = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await shell.goto(`${baseUrl}/?${cacheBust}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const dashboard = await shell.waitForEvent('framenavigated', {
    predicate: frame => /\/dashboard(?:\.html)?(?:[?#]|$)/.test(frame.url()),
    timeout: 15_000,
  }).catch(() => shell.frames().find(frame => /\/dashboard(?:\.html)?(?:[?#]|$)/.test(frame.url())));
  assert.ok(dashboard, 'dashboard frame should load');
  await dashboard.locator('[data-section="personal-index"]').click();
  const lab = await shell.waitForEvent('framenavigated', {
    predicate: frame => /\/static\/frontier-index-lab(?:\.html)?(?:[?#]|$)/.test(frame.url()),
    timeout: 5_000,
  }).catch(() => shell.frames().find(frame => /\/static\/frontier-index-lab(?:\.html)?(?:[?#]|$)/.test(frame.url())));
  assert.ok(lab, 'Personal Index frame should load');
  await lab.waitForFunction(() => window.frontierState?.models?.length > 20);
  await lab.evaluate(() => {
    const controls = [...document.querySelectorAll('[data-weight-number]')].slice(0, 4);
    controls.forEach((control, index) => {
      control.value = String([35, 30, 20, 15][index]);
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await dashboard.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await lab.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const embeddedDark = await lab.evaluate(() => {
    const chart = window.frontierState.charts['pareto-chart'].getOption();
    const legend = document.querySelector('#mix-legend');
    return {
      background: getComputedStyle(document.body).backgroundColor,
      inputBackground: getComputedStyle(document.querySelector('[data-weight-number]')).backgroundColor,
      axisTextColor: chart.xAxis?.[0]?.axisLabel?.color,
      legendOverflow: legend.scrollWidth - legend.clientWidth,
      malformedLegendText: /&(?:amp|#\d+);|â|Â|�/.test(legend.textContent),
    };
  });
  assert.equal(embeddedDark.background, 'rgb(11, 15, 20)');
  assert.equal(embeddedDark.inputBackground, 'rgb(11, 15, 20)');
  assert.equal(embeddedDark.axisTextColor, '#8490a2');
  assert.ok(embeddedDark.legendOverflow <= 1);
  assert.equal(embeddedDark.malformedLegendText, false);
  await lab.getByRole('button', { name: 'Index page' }).click();
  await dashboard.waitForFunction(() => {
    const frame = document.querySelector('iframe[title="Personal benchmark index builder"]');
    return frame?.getBoundingClientRect().height > 4_000;
  });
  const childHeight = await lab.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  frameSizing = await dashboard.evaluate(() => {
    const frame = document.querySelector('iframe[title="Personal benchmark index builder"]');
    return {
      frameHeight: frame.getBoundingClientRect().height,
      containerHeight: frame.closest('.personal-index-iframe-container').getBoundingClientRect().height,
    };
  });
  frameSizing.embeddedDark = embeddedDark;
  assert.ok(frameSizing.frameHeight >= childHeight - 2);
  assert.equal(frameSizing.frameHeight, frameSizing.containerHeight);
}

console.log(JSON.stringify({ builder: builderResult, dark: { desktop: desktopDarkResult, mobile: mobileDarkResult }, persistence: persistenceResult, desktop: desktopResult, mobile: mobileResult, frameSizing }, null, 2));
await browser.close();
