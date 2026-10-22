const {test,expect}=require('@playwright/test');

async function mockVerifiedSession(page,completed){
 const fakeScript=[
  "window.supabase={createClient:()=>({",
  "auth:{verifyOtp:async()=>({data:{session:{user:{id:'qa-confirmed-member'}}},error:null})},",
  "from:table=>{",
  "if(table==='profiles')return{select:()=>({eq:()=>({maybeSingle:async()=>({data:{onboarding_completed:"+completed+"},error:null})})})};",
  "if(table==='watchlist')return{insert:async entry=>{sessionStorage.setItem('__qa_saved_film',JSON.stringify(entry));return{error:null}}};",
  "throw Error('Unexpected table: '+table);",
  "}})};"
 ].join("\n");
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeScript
 }));
 await page.route('**/film-details.html?*',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<!doctype html><title>Saved title</title><h1>Film successfully opened</h1>'
 }));
}
async function saveGuestIntent(page){
 await page.goto('index.html');
 await page.addScriptTag({url:'pending-watchlist.js?v=1'});
 const remembered=await page.evaluate(()=>window.AfterloguePendingWatchlist.remember({
  key:'tmdb-movie-12345',category:'movies',title:'Sample Title',year:2025,
  poster:'https://image.tmdb.org/t/p/w500/demo.jpg',
  url:'film-details.html?tmdb=12345&type=movie&from=all-films'
 }));
 expect(remembered).toBe(true);
}
async function confirm(page){
 await page.goto('confirm.html?type=email&token_hash='+'a'.repeat(64));
 await page.evaluate(()=>{
  window.AfterlogueCatalogMetadata={save:async(_client,user,title)=>{
   sessionStorage.setItem('__qa_saved_metadata',JSON.stringify({user,title}));
  }};
 });
 await page.locator('#confirm-submit').click();
}

test('A returning verified member gets the saved guest film, not generic Discover',async({page})=>{
 await mockVerifiedSession(page,true);
 await saveGuestIntent(page);
 await confirm(page);
 await expect(page).toHaveURL(/\/film-details\.html\?tmdb=12345&type=movie&from=all-films&watchlist_saved=1$/,{timeout:15000});
 await expect(page.locator('h1')).toHaveText('Film successfully opened');
 const handoff=await page.evaluate(()=>({
  saved:JSON.parse(sessionStorage.getItem('__qa_saved_film')||'null'),
  metadata:JSON.parse(sessionStorage.getItem('__qa_saved_metadata')||'null'),
  pending:localStorage.getItem('afterlogue.pending-watchlist.v1')
 }));
 expect(handoff.saved).toEqual({
  user_id:'qa-confirmed-member',title_key:'tmdb-movie-12345',category:'movies'
 });
 expect(handoff.metadata.title.title).toBe('Sample Title');
 expect(handoff.pending).toBeNull();
});

test('A newly verified account keeps the pending film for after First Impressions',async({page})=>{
 await mockVerifiedSession(page,false);
 await page.route('**/log.html',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<!doctype html><h1>First Impressions</h1>'
 }));
 await saveGuestIntent(page);
 await confirm(page);
 await expect(page).toHaveURL(/\/log\.html$/,{timeout:15000});
 await expect(page.locator('h1')).toHaveText('First Impressions');
 const record=await page.evaluate(()=>
  JSON.parse(localStorage.getItem('afterlogue.pending-watchlist.v1')||'null'));
 expect(record?.key).toBe('tmdb-movie-12345');
 expect(await page.evaluate(()=>sessionStorage.getItem('__qa_saved_film'))).toBeNull();
});
