const {test,expect}=require('@playwright/test');

test('Landing leads with the film tagline and identifies personalized film and TV discovery',async({page})=>{
 await page.goto('index.html');
 await expect(page.locator('#welcome-title')).toHaveText("A film ends. The conversation doesn’t.");
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
 const frances=page.locator('[data-preview-key="frances"]');
 const loved=page.locator('[data-preview-rating="Loved"]');
 await expect(loved).toBeDisabled();
 await expect(moonlight).not.toHaveClass(/is-rated/);
 await moonlight.click();
 await expect(loved).toBeEnabled();
 await loved.click();
 await expect(moonlight).toHaveClass(/is-rated/);
 await expect(moonlight.locator('.journey-check')).toBeVisible();
 await expect(boyhood).not.toHaveClass(/is-rated/);
 await expect(frances).not.toHaveClass(/is-rated/);
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
 const fallen=page.locator('[data-preview-detail="fallen-leaves"]');
 const fallenSrc=await fallen.locator('img').getAttribute('src');
 await fallen.click();
 await expect(page.locator('.lp-details-title')).toHaveText('Fallen Leaves');
 await expect(page.locator('.lp-details-image')).toHaveAttribute('src',fallenSrc);
 await expect(page.locator('.lp-details-synopsis')).toContainText('Helsinki');
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
 await expect(page.locator('[data-preview-detail="past-lives"]')).toBeVisible();
 await page.locator('[data-preview-detail="past-lives"]').click();
 await expect(page.locator('.lp-details-title')).toHaveText('Past Lives');
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

test('The original feature columns stay above three horizontal bordered demo cards',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('index.html');
 await expect(page.locator('.features .feature')).toHaveCount(3);
 await expect(page.locator('.feature h2')).toHaveText(['Personalized','Explore','Discuss']);
 const cards=page.locator('.how .steps > .step');
 await expect(cards).toHaveCount(3);
 await expect(page.locator('#preview-impressions .step-intro h3')).toHaveText('Share your taste.');
 await expect(page.locator('#preview-discovery .step-intro h3')).toHaveText('Discover something new.');
 await expect(page.locator('#preview-log .step-intro h3')).toHaveText('Keep your collection.');
 await expect(page.locator('#preview-impressions .journey-poster')).toHaveCount(3);
 await expect(page.locator('#preview-discovery .journey-poster')).toHaveCount(3);
 await expect(page.locator('#preview-log .journey-poster')).toHaveCount(3);
 await expect(page.locator('#preview-impressions [data-preview-key="frances"]')).toHaveCount(1);
 await expect(page.locator('#preview-discovery [data-preview-detail="fallen-leaves"]')).toHaveCount(1);
 await expect(page.locator('#preview-discovery [data-preview-detail="past-lives"]')).toHaveCount(1);
 const layout=await page.evaluate(()=>{
  const feature=document.querySelector('.feature-wrap').getBoundingClientRect();
  const cards=[...document.querySelectorAll('.how .steps > .step')].map(x=>x.getBoundingClientRect());
  const cta=document.querySelector('.landing-final-invitation').getBoundingClientRect();
  return{featureEnd:feature.bottom,cardTop:cards[0].top,cardBottom:cards[0].bottom,
   cardYs:cards.map(x=>x.top),ctaTop:cta.top,borders:cards.map(x=>getComputedStyle(x).borderTopWidth)};
 });
 expect(layout.cardTop).toBeGreaterThan(layout.featureEnd);
 expect(Math.max(...layout.cardYs)-Math.min(...layout.cardYs)).toBeLessThan(3);
 expect(layout.ctaTop).toBeGreaterThan(layout.cardBottom);
 expect(layout.borders).toEqual(['1px','1px','1px']);
});

test('Start discovering banner is below cards and points to guest First Impressions',async({page})=>{
 await page.goto('index.html');
 await expect(page.locator('.landing-final-invitation h2')).toHaveText('Your next five picks are waiting.');
 const start=page.locator('.landing-final-button');
 await expect(start).toHaveText('Start discovering');
 await expect(start).toHaveAttribute('href','log.html?guest=1');
 await expect(page.locator('.landing-final-invitation')).toBeVisible();
 await expect(page.locator('.landing-final-eyebrow')).toHaveCount(0);
 const frame=await page.locator('.landing-final-invitation').evaluate(el=>{
  const c=getComputedStyle(el);
  return {border:c.borderTopWidth,image:c.backgroundImage,color:c.backgroundColor};
 });
 expect(frame.border).toBe('1px');
 expect(frame.image).toBe('none');
 expect(frame.color).toBe('rgba(0, 0, 0, 0)');
 await expect(page.locator('.landing-final-button')).not.toContainText('→');
 const typography=await page.evaluate(()=>{
  const logo=getComputedStyle(document.querySelector('.brand'));
  const hero=getComputedStyle(document.querySelector('#welcome-title'));
  const card=getComputedStyle(document.querySelector('.how .step-intro h3'));
  const sentence=getComputedStyle(document.querySelector('.landing-final-invitation h2'));
  const button=getComputedStyle(document.querySelector('.landing-final-button'));
  const container=getComputedStyle(document.querySelector('.landing-final-invitation'));
  return{
   logoFamily:logo.fontFamily,heroFamily:hero.fontFamily,cardFamily:card.fontFamily,
   cardWeight:card.fontWeight,headingWeight:hero.fontWeight,
   sentenceSize:parseFloat(sentence.fontSize),
   divider:container.borderTopWidth,
   buttonColor:button.color,buttonBackground:button.backgroundColor,
   buttonImage:button.backgroundImage,buttonFontSize:button.fontSize,
   buttonFontFamily:button.fontFamily,buttonHeight:parseFloat(button.minHeight)
  };
 });
 expect(typography.cardFamily).toBe(typography.logoFamily);
 expect(typography.cardFamily).toBe(typography.heroFamily);
 expect(typography.cardWeight).toBe(typography.headingWeight);
 expect(typography.sentenceSize).toBeLessThanOrEqual(25);
 expect(typography.divider).toBe('1px');
 expect(typography.buttonColor).toBe('rgb(33, 27, 22)');
 expect(typography.buttonBackground).toBe('rgb(234, 216, 188)');
 expect(typography.buttonImage).toBe('none');
 expect(typography.buttonFontSize).toBe('12px');
 expect(typography.buttonHeight).toBe(43);

});
test('Narrow screens keep a horizontal swipeable three-card rail',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('index.html');
 const metrics=await page.locator('.how .steps').evaluate(el=>({
  scroller:el.scrollWidth>el.clientWidth,
  display:getComputedStyle(el).display
 }));
 expect(metrics.scroller).toBe(true);
 expect(metrics.display).toBe('flex');
 await expect(page.locator('.landing-final-button')).toBeVisible();
});
