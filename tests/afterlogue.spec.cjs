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
  // Wait for the *searched title*, not any stale tile from the prior page.
  const moonlight = page.locator('#catalog-grid .catalog-tile').filter({
    has: page.locator('.catalog-tile-title', { hasText: /^Moonlight$/i }),
  }).first();
  await expect(moonlight).toBeVisible({ timeout: 60_000 });
  await moonlight.click();
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
  // Surface the real sign-in error promptly instead of waiting 45 seconds
  // and reporting only "page never navigated".
  const outcome = await expect.poll(async () => {
    if (/\/(discover|log)\.html(?:[?#]|$)/.test(page.url())) return 'signed-in';
    const message = (await page.locator('#signup-message').textContent() || '').trim();
    // The page never writes credentials here; report only an auth message.
    return message ? 'auth error: ' + message : 'waiting for sign-in';
  }, { timeout: 25_000, intervals: [500, 1000, 2000] });
  await outcome.toBe('signed-in');
});

test('Signed-in member finds a saved movie in the private Log', async ({ page }) => {
  const email = process.env.AFTERLOGUE_TEST_EMAIL;
  const password = process.env.AFTERLOGUE_TEST_PASSWORD;
  test.skip(!email || !password, 'Sign-in secrets are required for this member check.');

  await page.goto('signup.html?mode=signin');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('.signup-submit').click();
  await expect(page).toHaveURL(/\/(discover|log)\.html(?:[?#]|$)/, { timeout: 30_000 });

  // Test against the dedicated QA account only, never anyone's real profile.
  await page.goto('film-details.html?title=moonlight&from=log');
  const save = page.locator('#film-watchlist');
  await expect(save).toBeVisible({ timeout: 35_000 });
  await expect(save).not.toContainText('Sign in to save');

  const alreadySaved = await save.getAttribute('aria-pressed') === 'true';
  let addedByTest = false;
  try {
    if (!alreadySaved) {
      await save.click();
      await expect(save).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });
      addedByTest = true;
    }
    await page.goto('my-log.html');
    await page.locator('[data-archive-tab="watchlist"]').click();
    await page.locator('[data-archive-category="movies"]').click();
    const moonlight = page.locator('#archive-grid .archive-card').filter({
      has: page.locator('.archive-card-title', { hasText: /^Moonlight$/i }),
    });
    await expect(moonlight).toBeVisible({ timeout: 35_000 });
    await page.reload();
    await page.locator('[data-archive-tab="watchlist"]').click();
    await expect(page.locator('#archive-grid .archive-card-title', { hasText: /^Moonlight$/i }))
      .toBeVisible({ timeout: 35_000 });
  } finally {
    // Leave the test account as it was before running this smoke check.
    if (addedByTest) {
      await page.goto('film-details.html?title=moonlight&from=log');
      const button = page.locator('#film-watchlist');
      await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'false', { timeout: 20_000 });
    }
  }
});
