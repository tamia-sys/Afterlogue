const {test,expect}=require('@playwright/test');

const fakeSupabase=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null},error:null}),
 getUser:async()=>({data:{user:null},error:null})},
 from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})
})};`;

test('Fall + TV + Take your time keeps FALL context and displays five verified shows',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  const items=body.mode==='mood'?Array.from({length:5},(_,i)=>({
   id:1000+i,media:'tv',title:['Gilmore Girls','Over the Garden Wall','Anne with an E',
     'Friday Night Lights','Only Murders in the Building'][i],
   year:2000+i,poster:'https://image.tmdb.org/t/p/w500/demo.jpg',
   moodReason:'Its documented setting fits the fall atmosphere.',
   matchedFilters:[],moodFit:12
  })):[];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})});
 });
 await page.goto('explore.html?guest=1');
 await page.locator('.mood-card[data-mood="fall"] .mood-open').click();
 await page.locator('.choice[data-value="tv"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="slow"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-results-label')).toContainText('FALL');
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5,{timeout:30000});
 await expect(page.locator('#explore-results-label')).not.toContainText('YEARNING');
 await expect(page.locator('#explore-results-label')).not.toContainText(' / EXPLORE');
});

test('Failed mood request never carries previous mood breadcrumb',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:503,contentType:'application/json',body:JSON.stringify({error:'unavailable'})
 }));
 await page.goto('explore.html?guest=1');
 await page.locator('.mood-card[data-mood="yearning"] .mood-open').click();
 await page.locator('.choice[data-value="movies"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="slow"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-results-label')).toContainText('YEARNING');
 await page.locator('#explore-results-back').click();
 await page.locator('.mood-card[data-mood="fall"] .mood-open').click();
 await page.locator('.choice[data-value="tv"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="slow"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-results-label')).toContainText('FALL');
 await expect(page.locator('#explore-results-label')).not.toContainText('YEARNING');
 await expect(page.locator('#explore-adjust')).toHaveText('Adjust choices');
 await expect(page.locator('#explore-another')).toHaveText('Explore another mood');
});

test('Get started is outline-only until hovered or focused',async({page})=>{
 await page.goto('index.html');
 const button=page.locator('.welcome-create');
 await expect(button).toHaveText('Get started');
 const before=await button.evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(before).toMatch(/rgba?(0, 0, 0, 0)/);
 await button.focus();
 await expect.poll(()=>button.evaluate(el=>getComputedStyle(el).backgroundColor))
  .not.toBe(before);
});

test('Mobile First Impressions returns to the top when moving to TV',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({items:[]})
 }));
 await page.setViewportSize({width:390,height:844});
 await page.goto('log.html?guest=1');
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await page.locator('#impressions-step-next').click();
 await expect(page.locator('#television')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeLessThan(5);
});

test('Guest catalog has a save intent helper ready for eventual authenticated save',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 await page.goto('explore.html?guest=1');
 const intent=await page.evaluate(()=>{
  const api=window.AfterloguePendingWatchlist;
  if(!api)return null;
  const good=api.remember({
   key:'tmdb-movie-12345',category:'movies',title:'Test Film',year:2025,
   url:'film-details.html?tmdb=12345&type=movie&from=all-films',poster:'poster.jpg'
  });
  const saved=api.read();
  api.discard();
  return {good,key:saved?.key,url:saved?.url};
 });
 expect(intent).toEqual({
  good:true,key:'tmdb-movie-12345',
  url:'film-details.html?tmdb=12345&type=movie&from=all-films'
 });
});
