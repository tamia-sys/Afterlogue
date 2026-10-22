const {test,expect}=require('@playwright/test');

test('Landing leads with the film tagline and identifies personalized film and TV discovery',async({page})=>{
 await page.goto('index.html');
 await expect(page.locator('#welcome-title')).toHaveText("A film ends. The conversation doesn't.");
 await expect(page.locator('.intro .welcome-eyebrow')).toHaveText('PERSONALIZED FILM & TV DISCOVERY');
 await expect(page.locator('.intro .welcome-description')).toHaveText('Discover films and shows shaped by your taste.');
 await expect(page.locator('.intro .welcome-create')).toHaveText('Get started →');
 await expect(page.locator('.intro .welcome-create')).toHaveAttribute('href','log.html?guest=1');
 await expect(page.locator('.intro .welcome-tagline')).toHaveCount(0);
});

test('Interactive impressions gray and check only the corresponding rated film',async({page})=>{
 await page.goto('index.html');
 const moonlight=page.locator('[data-preview-key="moonlight"]');
 const boyhood=page.locator('[data-preview-key="boyhood"]');
 const manchester=page.locator('[data-preview-key="manchester"]');
 const loved=page.locator('[data-preview-rating="Loved"]');
 await expect(loved).toBeDisabled();
 await expect(moonlight).not.toHaveClass(/is-rated/);
 await moonlight.click();
 await expect(loved).toBeEnabled();
 await loved.click();
 await expect(moonlight).toHaveClass(/is-rated/);
 await expect(moonlight.locator('.journey-check')).toBeVisible();
 await expect(boyhood).not.toHaveClass(/is-rated/);
 await expect(manchester).not.toHaveClass(/is-rated/);
 await expect(page.locator('#lp-rating-status')).toContainText('Moonlight');
 await boyhood.click();
 await page.locator('[data-preview-rating="Okay"]').click();
 await expect(boyhood).toHaveClass(/is-rated/);
 await expect(page.locator('#lp-rating-status')).toContainText('Boyhood');
 await moonlight.click();
 await expect(loved).toHaveClass(/chosen/);
 await page.reload();
 await expect(moonlight).not.toHaveClass(/is-rated/);
});

test('Discovery demo opens matching poster and synopsis and buttons only light up',async({page})=>{
 await page.goto('index.html');
 const poster=page.locator('[data-preview-detail="perfect-days"]');
 const src=await poster.locator('img').getAttribute('src');
 await poster.click();
 await expect(page.locator('#lp-modal')).toBeVisible();
 await expect(page.locator('.lp-details-title')).toHaveText('Perfect Days');
 await expect(page.locator('.lp-details-image')).toHaveAttribute('src',src);
 await expect(page.locator('.lp-details-synopsis')).toContainText('Hirayama');
 await expect(page.locator('.lp-details-actions .lp-demo-action')).toHaveCount(5);
 await expect(page.locator('.lp-details-actions button')).toHaveCount(0);
 await page.locator('.lp-details-actions .lp-demo-action').first().click();
 await expect(page.locator('#lp-modal')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#lp-modal')).toBeHidden();
 await page.locator('[data-preview-detail="sentimental-value"]').click();
 await expect(page.locator('.lp-details-title')).toHaveText('Sentimental Value');
 await expect(page.locator('.lp-details-image')).toHaveAttribute('src','sentimental-value.jpg');
 await expect(page.locator('.lp-details-synopsis')).toContainText('sisters');
 await page.locator('#lp-modal-close').click();
});

test('Log demo shows the exact selected film, year and impression',async({page})=>{
 await page.goto('index.html');
 await page.locator('[data-preview-log="normal-people"]').click();
 await expect(page.locator('#lp-modal')).toBeVisible();
 await expect(page.locator('.lp-log-title')).toHaveText('Normal People');
 await expect(page.locator('.lp-log-meta')).toHaveText('2020 · TV series');
 await expect(page.locator('.lp-log-impression')).toContainText('Okay');
 const poster=await page.locator('[data-preview-log="normal-people"] img').getAttribute('src');
 await expect(page.locator('.lp-log-image')).toHaveAttribute('src',poster);
 await expect(page.locator('.lp-log-actions .lp-demo-action')).toHaveCount(4);
 await expect(page.locator('.lp-log-actions button')).toHaveCount(0);
 await page.locator('#lp-modal-close').click();
 await page.locator('[data-preview-log="blue"]').click();
 await expect(page.locator('.lp-log-title')).toHaveText('Three Colors: Blue');
 await expect(page.locator('.lp-log-meta')).toHaveText('1993 · Film');
 await expect(page.locator('.lp-log-impression')).toContainText('Loved');
});

test('Interactive previews work on narrow mobile screens',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('index.html');
 await expect(page.locator('[data-preview-detail="worst-person"]')).toBeVisible();
 await page.locator('[data-preview-detail="worst-person"]').click();
 await expect(page.locator('.lp-details-title')).toHaveText('The Worst Person in the World');
 await expect(page.locator('.lp-details-image')).toBeVisible();
 await expect(page.locator('#lp-modal-close')).toBeVisible();
 await page.locator('#lp-modal-close').click();
 await page.locator('[data-preview-log="severance"]').click();
 await expect(page.locator('.lp-log-title')).toHaveText('Severance');
 await expect(page.locator('.lp-log-impression')).toContainText('Not for me');
});

test('Korean landing headline is localised and rating preview is usable',async({page})=>{
 await page.goto('index.html');
 await page.locator('.afterlogue-language-select').selectOption('ko');
 await expect(page.locator('#welcome-title')).toHaveText('영화가 끝나도, 이야기는 계속됩니다.');
 await expect(page.locator('.intro .welcome-description')).toHaveText('취향에 맞는 영화와 시리즈를 발견해 보세요.');
 await page.locator('[data-preview-key="boyhood"]').click();
 await page.locator('[data-preview-rating="Loved"]').click();
 await expect(page.locator('#lp-rating-status')).toContainText('정말 좋았어요');
});
