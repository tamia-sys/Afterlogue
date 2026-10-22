const {test,expect}=require('@playwright/test');

const serverItems=Array.from({length:12},(_,i)=>({
 id:8101+i,media:'movie',title:'Reflective film '+(i+1),year:2012+i,
 poster:'https://image.tmdb.org/t/p/w500/placeholder.jpg',
 moodReason:'A patient study of subtle human moments.',matchedFilters:[],moodFit:14
}));

function mockCatalog(page,requests){
 return page.route('**/functions/v1/afterlogue-catalog',route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  if(body.mode==='mood')requests.push(body);
  const items=body.mode==='mood'?serverItems.filter(item=>
    !(body.excludeIds||[]).includes(item.id)).slice(0,10):[];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})});
 });
}
async function chooseWinding(page){
 await page.locator('.mood-card[data-mood="winding"] .mood-open').click();
 await page.locator('.choice[data-value="movies"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="slow"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5,{timeout:30000});
}
test('Returning from Log preserves the exact five picks and pace automatically',async({page})=>{
 const requests=[];
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null})},from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})})};'
 }));
 await mockCatalog(page,requests);
 await page.goto('explore.html?guest=1');
 await chooseWinding(page);
 const titles=await page.locator('#explore-picks .explore-pick h3').allTextContents();
 await page.goto('my-log.html?guest=1');
 await page.goto('explore.html?guest=1');
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5);
 await expect(page.locator('#explore-results-label')).toContainText('WINDING DOWN');
 expect(await page.locator('#explore-picks .explore-pick h3').allTextContents()).toEqual(titles);
 expect(requests[0].pace).toBe('slow');
 expect(requests.length).toBeLessThanOrEqual(3);
});

test('Already-rated, Watched and Watchlist films are excluded before rendering',async({page})=>{
 const requests=[];
 const fake='window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:"test-user"}}},error:null}),getUser:async()=>({data:{user:{id:"test-user",email:"test@example.com"}},error:null}),signOut:async()=>({error:null})},from:table=>({select:()=>({eq:async()=>({data:table==="watchlist"?[{title_key:"tmdb-movie-8101"}]:table==="impressions"?[{title_key:"tmdb-movie-8102",rating:"Loved"}]:table==="seen_entries"?[{title_key:"tmdb-movie-8103"}]:table==="log_entries"?[{title_key:"tmdb-movie-8104"}]:[],error:null})}),insert:async()=>({error:null})})})};';
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fake
 }));
 await mockCatalog(page,requests);
 await page.goto('explore.html');
 await chooseWinding(page);
 const titles=await page.locator('#explore-picks .explore-pick h3').allTextContents();
 for(const blocked of ['Reflective film 1','Reflective film 2','Reflective film 3','Reflective film 4'])
  expect(titles).not.toContain(blocked);
 expect(requests[0].excludeIds).toEqual(expect.arrayContaining([8101,8102,8103,8104]));
});


test('From a film detail, return to five picks without flashing the Explore gallery',async({page})=>{
 const requests=[];
 const fake='window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:"return-user"}}},error:null}),getUser:async()=>{await new Promise(resolve=>setTimeout(resolve,1300));return {data:{user:{id:"return-user",email:"test@example.com"}},error:null}},signOut:async()=>({error:null})},from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})})};';
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fake
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  if(body.mode==='detail')
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({title:'Reflective film 1',poster:'https://image.tmdb.org/t/p/w500/placeholder.jpg',
     year:2012,synopsis:'Everyday life and a contemplative personal journey.'})});
  if(body.mode==='mood')requests.push(body);
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({items:serverItems.filter(item=>
     !(body.excludeIds||[]).includes(item.id)).slice(0,10)})});
 });
 await page.goto('explore.html');
 await chooseWinding(page);
 const before=await page.locator('#explore-picks h3').allTextContents();
 await page.locator('#explore-picks .explore-art').first().click();
 await expect(page).toHaveURL(/film-details\.html/);
 await expect(page.locator('#film-back')).toHaveAttribute('href','explore.html#mood-results');
 // The back link should not reopen the gallery while session + Seen load.
 await page.locator('#film-back').click();
 await expect(page).toHaveURL(/explore\.html#mood-results/);
 await expect(page.locator('html')).toHaveClass(/explore-restoring/);
 await expect(page.locator('#explore-gallery-wrap')).toBeHidden();
 await expect(page.locator('#explore-return-status')).toBeVisible();
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5,{timeout:30000});
 expect(await page.locator('#explore-picks h3').allTextContents()).toEqual(before);
 await expect(page.locator('#explore-return-status')).toBeHidden();
 await expect(page.locator('#explore-gallery-wrap')).toBeHidden();
});
