const { test, expect } = require('@playwright/test');

test('Explore shows multi-select age classifications', async ({ page }) => {
  await page.goto('explore.html');
  const rating = page.locator('details[data-facet="ratings"]');
  await expect(rating.locator('summary')).toBeVisible();
  await rating.locator('summary').click();
  await rating.locator('input[value="R"]').check();
  await rating.locator('input[value="PG-13"]').check();
  await expect(rating.locator('input[value="R"]')).toBeChecked();
  await expect(rating.locator('input[value="PG-13"]')).toBeChecked();
});

test('All Films title returns to the expanded catalog with search intact', async ({ page }) => {
  await page.goto('explore.html');
  await page.locator('#catalog-open').click();
  await expect(page.locator('#afterlogue-global-catalog')).toBeVisible({ timeout: 45_000 });
  await page.locator('#catalog-search').fill('Moonlight');
  await expect(page.locator('#catalog-grid .catalog-tile').first()).toBeVisible({ timeout: 60_000 });
  await page.locator('#catalog-grid .catalog-tile').first().click();
  await expect(page.locator('#film-back')).toContainText('All Films', { timeout: 60_000 });
  await page.locator('#film-back').click();
  await expect(page.locator('#afterlogue-global-catalog')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('#catalog-search')).toHaveValue('Moonlight');
});

test('Mood film details return to the exact prior recommendations', async ({ page }) => {
  await page.goto('explore.html');
  await page.locator('.mood-card[data-mood="yearning"] .mood-open').click();
  await page.locator('.choice[data-value="movies"]').click();
  await page.locator('#explore-next').click();
  await page.locator('.choice[data-value="medium"]').click();
  await page.locator('#explore-next').click();
  const firstCard = page.locator('#explore-picks .explore-pick').first();
  await expect(firstCard).toBeVisible({ timeout: 110_000 });
  const title = await firstCard.locator('h3').innerText();
  await firstCard.locator('a.explore-global-detail').click();
  await expect(page.locator('#film-back')).toContainText('your five stories', { timeout: 60_000 });
  await page.locator('#film-back').click();
  await expect(page.locator('#explore-results')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('#explore-picks .explore-pick').first().locator('h3')).toHaveText(title);
});

test('Test member can sign in (only after GitHub secrets are added)', async ({ page }) => {
  const email = process.env.AFTERLOGUE_TEST_EMAIL;
  const password = process.env.AFTERLOGUE_TEST_PASSWORD;
  test.skip(!email || !password, 'Create the QA account and add repository secrets first.');
  await page.goto('signup.html?mode=signin');
  await expect(page.locator('.signup-submit')).toContainText('Sign in');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('.signup-submit').click();
  await expect(page).toHaveURL(/\/(discover|log)\.html(?:[?#]|$)/, { timeout: 45_000 });
});
