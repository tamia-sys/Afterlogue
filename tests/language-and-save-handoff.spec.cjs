const {test,expect}=require('@playwright/test');

test('A requested film survives a reload, saves once for the authenticated member, and returns to its details',async({page})=>{
 await page.goto('index.html');
 await page.addScriptTag({url:'pending-watchlist.js'});
 await page.evaluate(()=>{
  const intent=window.AfterloguePendingWatchlist.remember({
   key:'tmdb-movie-123',category:'movies',title:'A Saved Test Story',year:2025,
   poster:'https://image.tmdb.org/t/p/w500/test.jpg',
   url:new URL('film-details.html?tmdb=123&type=movie&from=discover',location.href).href
  });
  if(!intent)throw Error('Intent could not be stored');
 });
 await page.reload();
 await page.addScriptTag({url:'pending-watchlist.js'});
 const result=await page.evaluate(async()=>{
  const writes=[];
  const client={
   auth:{getUser:async()=>({data:{user:{id:'member-qa'}},error:null})},
   from:table=>({insert:async row=>(writes.push({table,row}),{error:null})})
  };
  window.AfterlogueCatalogMetadata={save:async(client,id,record)=>{
   writes.push({table:'user_catalog_titles',row:record,owner:id});
  }};
  const url=await window.AfterloguePendingWatchlist.complete(client);
  return{url,writes,left:window.AfterloguePendingWatchlist.read()};
 });
 expect(result.url).toContain('film-details.html?tmdb=123&type=movie');
 expect(result.url).toContain('watchlist_saved=1');
 expect(result.writes.map(r=>r.table)).toEqual(['user_catalog_titles','watchlist']);
 expect(result.writes[1].row.user_id).toBe('member-qa');
 expect(result.left).toBeNull();
});
test('Guest Save rejects an external redirect and expired intent',async({page})=>{
 await page.goto('index.html');
 await page.addScriptTag({url:'pending-watchlist.js'});
 const result=await page.evaluate(()=>{
  const api=window.AfterloguePendingWatchlist;
  const outside=api.remember({
   key:'tmdb-movie-12',category:'movies',title:'Test',
   url:'https://malicious.example/film-details.html?tmdb=12'
  });
  api.remember({key:'tmdb-movie-12',category:'movies',title:'Test',
   url:new URL('film-details.html?tmdb=12',location.href).href});
  const stale=JSON.parse(localStorage.getItem('afterlogue.pending-watchlist.v1'));
  stale.createdAt=Date.now()-48*60*1000;
  localStorage.setItem('afterlogue.pending-watchlist.v1',JSON.stringify(stale));
  return{outside,expired:api.read()};
 });
 expect(result.outside).toBe(false);
 expect(result.expired).toBeNull();
});
test('Changing landing page language persists into the sign-in page',async({page})=>{
 await page.goto('index.html');
 await expect(page.locator('.welcome-header .afterlogue-language-select')).toBeVisible();
 await page.locator('.afterlogue-language-select').selectOption('es');
 await expect(page.locator('#welcome-title')).toHaveText('Una película termina. La conversación continúa.');
 await expect(page.locator('html')).toHaveAttribute('lang','es');
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:
  'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null})}})};'
 }));
 await page.goto('signup.html?mode=signin');
 await expect(page.locator('.afterlogue-language-select')).toHaveValue('es');
 await expect(page.locator('.signup-container h1')).toHaveText('Te damos la bienvenida.');
 await page.locator('.afterlogue-language-select').selectOption('fr');
 await expect(page.locator('.signup-container h1')).toHaveText('Bon retour.');
});

test('Korean remains selected from landing through sign-in and back to English',async({page})=>{
 await page.goto('index.html');
 const selector=page.locator('.afterlogue-language-select');
 await expect(selector.locator('option[value="ko"]')).toHaveText('한국어');
 await selector.selectOption('ko');
 await expect(page.locator('html')).toHaveAttribute('lang','ko');
 await expect(page.locator('#welcome-title')).toHaveText('영화가 끝나도, 이야기는 계속됩니다.');
 await expect(page.locator('.welcome-start .welcome-create')).toHaveText('시작하기 →');
 await expect(page.locator('.welcome-start .welcome-create')).toHaveAttribute('href','log.html?guest=1');
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:
  'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null})}})};'
 }));
 await page.goto('signup.html?mode=signin');
 await expect(page.locator('.afterlogue-language-select')).toHaveValue('ko');
 await expect(page.locator('html')).toHaveAttribute('lang','ko');
 await expect(page.locator('.signup-container h1')).toHaveText('다시 오신 것을 환영해요.');
 await page.locator('.afterlogue-language-select').selectOption('en');
 await expect(page.locator('.signup-container h1')).toHaveText('Welcome back.');
});
test('Korean language selector remains accessible on phone-sized landing page',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('index.html');
 await page.locator('.afterlogue-language-select').selectOption('ko');
 await expect(page.locator('.welcome-header .afterlogue-language-select')).toBeVisible();
 await expect(page.locator('#welcome-title')).toHaveText('영화가 끝나도, 이야기는 계속됩니다.');
});
