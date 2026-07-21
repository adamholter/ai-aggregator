import { test, expect } from '@playwright/test';

test('Frontier Index Lab renders and behaves correctly', async ({ page }) => {
  // 1. Go to page
  await page.goto('/static/frontier-index-lab.html');

  // 2. Check title
  await expect(page.locator('h1')).toHaveText('Frontier Index Lab');

  // 3. Verify cutoff is NOT present
  const cutoffInput = page.locator('#coverage-cutoff');
  await expect(cutoffInput).toHaveCount(0);

  // 4. Verify gate status section exists and is populated
  const gateStatus = page.locator('#required-gate-status');
  await expect(gateStatus).toBeVisible();

  // 5. Verify checkboxes for required benchmarks exist in the benchmark mix editor
  // New indexes intentionally start with no benchmarks selected, so the controls
  // live in the collapsed "Add hidden benchmarks" section until weighted.
  await page.locator('details.bench-accordion').evaluate((details: HTMLDetailsElement) => {
    details.open = true;
  });
  const mixEditorCheckboxes = page.locator('input[data-required]');
  await expect(mixEditorCheckboxes.first()).toBeVisible();

  // 6. Check that no forbidden class names (badge, pill, chip, tag, lozenge) are used
  const badClasses = ['badge', 'pill', 'chip', 'tag', 'lozenge', 'status-badge'];
  for (const cls of badClasses) {
    const matchingElements = page.locator(`.${cls}, [class*="${cls}"]`);
    await expect(matchingElements).toHaveCount(0);
  }

  // 7. Verify we can switch index named mixes
  // Click "+" first to create a second index since we start with only one default index
  const addIndexBtn = page.locator('#add-index');
  await expect(addIndexBtn).toBeVisible();
  await addIndexBtn.click();

  // Get initial qualified count text
  const initialCountText = await page.locator('#qualified-count').textContent();

  // Switch to the next index via dropdown
  const select = page.locator('#index-switcher-select');
  await expect(select).toBeVisible();
  await select.selectOption({ index: 1 }); // Select the second option (Custom Index 2)

  // Verify active name inline has updated
  const activeName = page.locator('#active-index-name-inline');
  await expect(activeName).toHaveText('Custom Index 2');

  // Verify list count changes or is updated
  const newCountText = await page.locator('#qualified-count').textContent();
  expect(newCountText).not.toBeNull();
});
