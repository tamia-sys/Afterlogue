const {test,expect}=require('@playwright/test');

async function openMood(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body: 'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null})}})};'
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  const ids=body.mode==='mood'?(body.offset===0?[101,102,103,104,105]:
    body.offset===1?[201,202]:body.offset===2?[203]:[]):[];
  const items=ids.map(id=>({
   id,title:'Story '+id,year:2020,media:'movie',
   poster:'https://image.tmdb.org/t/p/w500/test.jpg',
   moodReason:'A verified story in this mood.',matchedFilters:[]
  }));
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})});
 });
 await page.goto('explore.html?guest=1');
 await page.locator('.mood-card[data-mood="yearning"] .mood-open').click();
 await page.locator('.choice[data-value="movies"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="medium"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5,{timeout:30000});
}

test('Mood action buttons are centered immediately below each poster',async({page})=>{
 await openMood(page);
 const first=page.locator('#explore-picks .explore-pick').first();
 const classes=await first.locator(':scope > *').evaluateAll(nodes=>nodes.map(n=>n.className));
 expect(classes[0]).toBe('explore-art');
 expect(classes[1]).toBe('explore-pick-actions');
 await expect(first.locator('.explore-mood-save')).toBeVisible();
 await expect(first.locator('.afterlogue-seen-eye')).toBeVisible();
 await expect(first.locator('a.explore-global-detail')).toHaveCount(0);
});

test('Another selection preserves five cards when the catalog only returns partial fresh results',async({page})=>{
 await openMood(page);
 await page.locator('#explore-again').click();
 // Requests to offsets 1 and 2 return only three verified results combined.
 await expect(page.locator('#explore-results-detail')).toContainText('Your current picks are still here',{timeout:30000});
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5);
 await expect(page.locator('#explore-picks .explore-pick').first()).toContainText('Story 101');
 await expect(page.locator('#explore-again')).toBeEnabled();
 await expect(page.locator('#explore-results-detail')).not.toContainText('filters');
});

test('Film detail actions keep Seen outside the Watchlist feedback wrapper',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null})}})};'
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({items:[]})
 }));
 await page.goto('film-details.html?title=perfect-days&from=discover');
 await expect(page.locator('#film-content')).toBeVisible({timeout:30000});
 await expect(page.locator('.film-hero-actions > .film-seen-action')).toHaveCount(1);
 await expect(page.locator('.film-watchlist-control .film-seen-action')).toHaveCount(0);
 const feedback=page.locator('#film-watchlist-feedback');
 await expect(feedback).toHaveCSS('position','static');
});
