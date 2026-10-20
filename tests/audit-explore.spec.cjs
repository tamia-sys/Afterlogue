const { test, expect } = require('@playwright/test');

// Editorial QA: no private ratings, passwords, user identifiers, screenshots,
// session tokens, or personal details are included in the published logs.
// Public film names, summaries, matched reasons and navigation timing only.
test.describe.configure({ retries: 0 });

test('Live QA member walkthrough: mood, filters, catalog, and related titles', async ({ page }) => {
  test.setTimeout(540_000);
  const audit = { account: 'QA account signed in', moods: [], allFilms: [], issues: [] };
  const now = () => Date.now();
  const sleep = ms => page.waitForTimeout(ms);
  const moodCards = async () => await page.locator('#explore-picks .explore-pick')
    .evaluateAll(nodes => nodes.map(node => ({
      title: node.querySelector('h3')?.textContent?.trim() || '',
      meta: node.querySelector('.explore-year')?.textContent?.trim() || '',
      reason: node.querySelector('.explore-mood-why p')?.textContent?.trim() || '',
      matchingFilters: node.querySelector('.explore-mood-filter-proof p')?.textContent?.trim() || '',
      url: node.querySelector('a.explore-global-detail')?.getAttribute('href') || '',
      posterLoaded: Boolean(node.querySelector('img')?.naturalWidth),
    })));
  const synopsisAndRelated = async () => {
    const start = now();
    await expect(page.locator('#film-content')).toBeVisible({timeout:45_000});
    await page.waitForFunction(() => {
      const panel=document.querySelector('#film-related');
      const grid=document.querySelector('#film-related-grid');
      return grid?.children.length>0 && panel && !panel.hidden;
    }, null, {timeout:30_000}).catch(()=>{});
    return {
      title: (await page.locator('#film-title').textContent() || '').trim(),
      description: (await page.locator('#film-lead').textContent() || '').trim().slice(0,700),
      filmMeta: (await page.locator('#film-meta').textContent() || '').trim(),
      relatedVisible: await page.locator('#film-related').isVisible(),
      related: await page.locator('#film-related-grid .film-other-link').evaluateAll(nodes =>
        nodes.map(node=>({title:node.querySelector('span')?.textContent?.trim(),url:node.getAttribute('href')}))),
      relatedMessage: (await page.locator('#film-related-grid .film-watch-notice').allTextContents()).join(' ').trim(),
      galleryStills: await page.locator('#film-stills .film-still-frame').count(),
      loadWaitMs: now()-start,
    };
  };
  const startMood = async(mood, {format='movies',pace='medium',filters={}}={})=>{
    await page.goto('explore.html', {waitUntil:'domcontentloaded'});
    // Clear only QA browser's optional filters/history between independent scenarios.
    await page.evaluate(() => {
      for (const key of [
        'afterlogue.explore.mood-filters.v1',
        'afterlogue.explore.seen-mood-titles.v3',
        'afterlogue.explore.pending-mood-picks.v1',
        'afterlogue.explore.return-to-picks.v1',
      ]) sessionStorage.removeItem(key);
    });
    await page.reload({waitUntil:'domcontentloaded'});
    for(const [kind,value] of Object.entries(filters)){
      const values=Array.isArray(value)?value:[value];
      const menu=page.locator('details[data-facet="'+kind+'"]');
      await menu.locator('summary').click();
      for(const val of values)await menu.locator('input[value="'+val+'"]').check();
      await menu.locator('summary').click();
    }
    await page.locator('.mood-card[data-mood="'+mood+'"] .mood-open').click();
    const choose=async val=>{
      await page.locator('.choice[data-value="'+val+'"]').click();
      await page.locator('#explore-next').click();
    };
    await choose(format);
    await choose(pace);
    const started=now();
    await expect(page.locator('#explore-again')).toBeEnabled({timeout:150_000});
    await sleep(180);
    return {mood,format,pace,filters,initialMs:now()-started,
      options:await moodCards(),
      message:(await page.locator('#explore-picks .explore-question').allTextContents()).join(' ').trim(),
      action:(await page.locator('#explore-again').textContent() || '').trim()};
  };
  try{
    const email=process.env.AFTERLOGUE_TEST_EMAIL;
    const password=process.env.AFTERLOGUE_TEST_PASSWORD;
    test.skip(!email||!password,'QA credentials not yet configured in repository secrets.');
    await page.goto('signup.html?mode=signin');
    await page.locator('#signup-email').fill(email);
    await page.locator('#signup-password').fill(password);
    await page.locator('.signup-submit').click();
    await expect(page).toHaveURL(/\/(discover|log)\.html(?:[?#]|$)/,{timeout:35_000});
    console.log('EDITORIAL_AUDIT: login successful (no account identifiers recorded)');

    // 1: Unfiltered yearning and a follow-on selection.
    try {
      const yearning=await startMood('yearning');
      const original=yearning.options.map(v=>v.url);
      if(yearning.options.length){
        await page.locator('#explore-picks .explore-pick a.explore-global-detail').first().click();
        yearning.details=await synopsisAndRelated();
        yearning.relatedOverlaps=yearning.details.related.filter(v =>
          original.some(url=>new URL(url, 'https://afterlogue.test').searchParams.get('tmdb')===new URL(v.url, 'https://afterlogue.test').searchParams.get('tmdb'))
        ).map(v=>v.title);
        await page.locator('#film-back').click();
        await expect(page.locator('#explore-results')).toBeVisible({timeout:40_000});
        yearning.backPreserved=(await moodCards()).map(v=>v.url).join('|')===original.join('|');
        const t=now();
        await page.locator('#explore-again').click();
        await expect(page.locator('#explore-again')).toBeEnabled({timeout:155_000});
        yearning.nextMs=now()-t;
        yearning.nextOptions=await moodCards();
        yearning.nextMessage=(await page.locator('#explore-picks .explore-question').allTextContents()).join(' ').trim();
        yearning.nextOverlaps=yearning.nextOptions.filter(v=>original.includes(v.url)).map(v=>v.title);
      }
      audit.moods.push(yearning);
      console.log('EDITORIAL_AUDIT_MOOD_YEARNING:'+JSON.stringify(yearning));
    } catch(e) { audit.issues.push('Yearning: '+String(e).slice(0,350)); console.log('EDITORIAL_AUDIT_ERROR_YEARNING:'+String(e).slice(0,350)); }

    // 2: Friday night for an adult user: US films in English, rated R.
    try {
      const friday=await startMood('friday',{filters:{countries:'US',languages:'en',ratings:'R'}});
      if(friday.options.length){
        await page.locator('#explore-picks .explore-pick a.explore-global-detail').first().click();
        friday.details=await synopsisAndRelated();
        friday.relatedOverlaps=friday.details.related.filter(v=>
          friday.options.some(x=>new URL(x.url,'https://afterlogue.test').searchParams.get('tmdb')===new URL(v.url,'https://afterlogue.test').searchParams.get('tmdb'))
        ).map(v=>v.title);
      }
      audit.moods.push(friday);
      console.log('EDITORIAL_AUDIT_MOOD_FRIDAY:'+JSON.stringify(friday));
    } catch(e) { audit.issues.push('Friday: '+String(e).slice(0,350)); console.log('EDITORIAL_AUDIT_ERROR_FRIDAY:'+String(e).slice(0,350)); }

    // 3: Holidays – check whether the category still overweights Christmas.
    try {
      const holidays=await startMood('holidays');
      audit.moods.push(holidays);
      console.log('EDITORIAL_AUDIT_MOOD_HOLIDAYS:'+JSON.stringify(holidays));
    } catch(e) { audit.issues.push('Holidays: '+String(e).slice(0,350)); console.log('EDITORIAL_AUDIT_ERROR_HOLIDAYS:'+String(e).slice(0,350)); }

    // 4: All Films – French cinema with its actual original language.
    try {
      await page.goto('explore.html',{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>sessionStorage.removeItem('afterlogue.explore.all-films.v1'));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#catalog-open').click();
      await expect(page.locator('#afterlogue-global-catalog')).toBeVisible({timeout:45_000});
      await page.locator('#catalog-country').selectOption('FR');
      await page.locator('#catalog-language').selectOption('fr');
      const started=now();
      await page.waitForFunction(()=>document.querySelector('#catalog-message')?.textContent?.includes('Page'),null,{timeout:60_000});
      const titles=await page.locator('#catalog-grid .catalog-tile').evaluateAll(nodes=>nodes.map(n=>({
        title:n.querySelector('.catalog-tile-title')?.textContent?.trim(),
        year:n.querySelector('.catalog-tile-year')?.textContent?.trim(),
        url:n.getAttribute('href'),
      })));
      const sample={filters:{country:'FR',originalLanguage:'fr'},loadMs:now()-started,titles:titles.slice(0,12),
        resultsLabel:await page.locator('#catalog-message').textContent()};
      if(titles.length){
        await page.locator('#catalog-grid .catalog-tile').first().click();
        sample.details=await synopsisAndRelated();
        await page.locator('#film-back').click();
        await expect(page.locator('#afterlogue-global-catalog')).toBeVisible({timeout:35_000});
        sample.filtersPreserved={
          country:await page.locator('#catalog-country').inputValue(),
          language:await page.locator('#catalog-language').inputValue(),
        };
      }
      audit.allFilms.push(sample);
      console.log('EDITORIAL_AUDIT_ALLFILMS:'+JSON.stringify(sample));
    } catch(e) { audit.issues.push('All Films: '+String(e).slice(0,350)); console.log('EDITORIAL_AUDIT_ERROR_ALLFILMS:'+String(e).slice(0,350)); }
  } finally {
    console.log('EDITORIAL_AUDIT_SUMMARY:'+JSON.stringify({
      moods:audit.moods.map(v=>({mood:v.mood,initialCount:v.options.length,nextCount:v.nextOptions?.length,
        waitingMessage:v.message||v.nextMessage||'',loadMs:v.initialMs,nextMs:v.nextMs,
        relatedCount:v.details?.related.length,relatedOverlap:v.relatedOverlaps||[],
        restore:v.backPreserved})),
      allFilms:audit.allFilms.map(v=>({filters:v.filters,returned:v.titles.length,relatedCount:v.details?.related.length,filtersPreserved:v.filtersPreserved})),
      issues:audit.issues
    }));
  }
});

test('Investigate France + original French catalog results, waiting for exact network request', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('explore.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(()=>sessionStorage.removeItem('afterlogue.explore.all-films.v1'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#catalog-open').click();
  await expect(page.locator('#afterlogue-global-catalog')).toBeVisible({timeout:45_000});
  await page.locator('#catalog-country').selectOption('FR');
  const waiter=page.waitForResponse(res=>{
    if(!res.url().includes('/functions/v1/afterlogue-catalog')||res.request().method()!=='POST')return false;
    try{
      const b=res.request().postDataJSON();
      return b.mode==='discover'&&b.country==='FR'&&b.originalLanguage==='fr';
    }catch(_){return false;}
  },{timeout:70_000});
  await page.locator('#catalog-language').selectOption('fr');
  const response=await waiter;
  const payload=await response.json();
  // If old results are still on screen at this moment, give the display time
  // to catch up with the specific FR+fr response before judging it.
  await page.waitForTimeout(750);
  const titles=await page.locator('#catalog-grid .catalog-tile-title').allTextContents();
  const responseTitles=(payload.items||[]).map(x=>x.title);
  console.log('EDITORIAL_AUDIT_FR_FRENCH_NETWORK:'+JSON.stringify({
    success:response.ok(),status:response.status(),
    submitted:{country:'FR',originalLanguage:'fr'},
    totalResponse:responseTitles.length,returned:responseTitles.slice(0,25),
    displayed:titles.slice(0,25),
    appearsEnglishOnly:responseTitles.filter(t=>['The Fifth Element','Léon: The Professional'].includes(t)),
  }));
  expect(response.ok()).toBeTruthy();
  expect(responseTitles).not.toContain('The Fifth Element');
  expect(responseTitles).not.toContain('Léon: The Professional');
});
