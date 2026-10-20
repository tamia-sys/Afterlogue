const {test,expect}=require('@playwright/test');

// A separate signed-in editorial sample; only PUBLIC film data appears in logs.
test('Editorial sample: Winding Down, Fall and Something Unexpected',async({page})=>{
 test.setTimeout(300_000);
 const email=process.env.AFTERLOGUE_TEST_EMAIL;
 const password=process.env.AFTERLOGUE_TEST_PASSWORD;
 test.skip(!email||!password,'QA account secrets are required');
 await page.goto('signup.html?mode=signin');
 await page.locator('#signup-email').fill(email);
 await page.locator('#signup-password').fill(password);
 await page.locator('.signup-submit').click();
 await expect(page).toHaveURL(/\/(discover|log)\.html(?:[?#]|$)/,{timeout:35_000});
 for(const {mood,pace} of [{mood:'winding',pace:'slow'},{mood:'fall',pace:'medium'},{mood:'unexpected',pace:'energetic'}]){
  await page.goto('explore.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   ['afterlogue.explore.mood-filters.v1',
    'afterlogue.explore.seen-mood-titles.v3',
    'afterlogue.explore.pending-mood-picks.v1'].forEach(k=>sessionStorage.removeItem(k));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.mood-card[data-mood="'+mood+'"] .mood-open').click();
  await page.locator('.choice[data-value="movies"]').click();
  await page.locator('#explore-next').click();
  await page.locator('.choice[data-value="'+pace+'"]').click();
  await page.locator('#explore-next').click();
  await expect(page.locator('#explore-again')).toBeEnabled({timeout:115_000});
  const items=await page.locator('#explore-picks .explore-pick').evaluateAll(nodes=>
   nodes.map(n=>({title:n.querySelector('h3')?.textContent,
    why:n.querySelector('.explore-mood-why p')?.textContent,
    genres:n.querySelector('.explore-year')?.textContent})));
  const status=await page.locator('#explore-picks .explore-question').allTextContents();
  console.log('EDITORIAL_OTHER_MOOD:'+JSON.stringify({mood,pace,items,status}));
  expect(items.length,'Five matches required for '+mood+': '+status.join(' ')).toBe(5);
  expect(items.every(v=>String(v.why||'').length>20)).toBeTruthy();
 }
});
