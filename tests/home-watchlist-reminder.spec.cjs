const {test,expect}=require('@playwright/test');

// Never use a real account in tests. These six titles exist only in this
// stubbed viewer's Watchlist; no Supabase writes or private data are fetched.
const fakeSupabase=String.raw`
(()=>{
 const viewer={id:'qa-collection-owner',email:'example@invalid.test'};
 const saved=[
  {title_key:'the-farewell',category:'movies',created_at:'2026-01-06'},
  {title_key:'before-sunrise',category:'movies',created_at:'2026-01-05'},
  {title_key:'moonlight',category:'movies',created_at:'2026-01-04'},
  {title_key:'perfect-days',category:'movies',created_at:'2026-01-03'},
  {title_key:'atlanta',category:'tv',created_at:'2026-01-02'},
  {title_key:'fleabag',category:'tv',created_at:'2026-01-01'}
 ];
 const stubCount=new URLSearchParams(location.search).get('stub_count');
 if(stubCount!==null)saved.splice(Math.max(0,Number(stubCount)||0));
 const isGuest=new URLSearchParams(location.search).get('guest')==='1';
 function query(table){
  const q={
   select(){return q;},eq(){return q;},order(){return q;},
   limit(){return q;},
   maybeSingle:async()=>({data:null,error:null}),
   single:async()=>({data:null,error:null}),
   then(resolve,reject){
    const rows=table==='watchlist'?saved:table==='user_catalog_titles'?[]:[];
    return Promise.resolve({data:rows,error:null}).then(resolve,reject);
   }
  };
  return q;
 }
 window.supabase={
  createClient:()=>({
   auth:{
    getUser:async()=>({data:{user:isGuest?null:viewer},error:null}),
    getSession:async()=>({data:{session:isGuest?null:{user:viewer}},error:null}),
    signOut:async()=>({error:null})
   },
   from:query
  })
 };
})();
`;

async function setup(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({items:[],hasMore:false})
 }));
}
test('Home spacing separates the hero and the five-title discovery section',async({page})=>{
 await setup(page);
 await page.setViewportSize({width:1280,height:900});
 await page.goto('discover.html');
 const hero=await page.locator('.discover-hero').boundingBox();
 const section=await page.locator('#discovery-selections').boundingBox();
 expect(hero).toBeTruthy();expect(section).toBeTruthy();
 expect(section.y-(hero.y+hero.height)).toBeGreaterThan(45);
 await expect(page.locator('#watchlist-reminder-content')).toBeHidden();
 await expect(page.locator('#watchlist-reminder-toggle')).toBeVisible();
});
test('Three actual saved titles appear on request, another three do not immediately repeat',async({page})=>{
 await setup(page);
 await page.goto('discover.html');
 await page.locator('#watchlist-reminder-toggle').click();
 const posters=page.locator('#watchlist-reminder-grid .watchlist-reminder-card');
 await expect(posters).toHaveCount(3,{timeout:20000});
 const titles=await posters.locator('.watchlist-reminder-card-title').allTextContents();
 const allowed=new Set(['The Farewell','Before Sunrise','Moonlight','Perfect Days','Atlanta','Fleabag']);
 expect(titles.every(x=>allowed.has(x))).toBe(true);
 await expect(page.locator('#watchlist-reminder-next')).toBeVisible();
 await page.locator('#watchlist-reminder-next').click();
 await expect(posters).toHaveCount(3);
 const nextTitles=await posters.locator('.watchlist-reminder-card-title').allTextContents();
 expect(nextTitles.filter(name=>titles.includes(name))).toHaveLength(0);
 await expect(page.locator('.watchlist-reminder-all')).toHaveAttribute('href','my-log.html?tab=watchlist');
});
test('Guest collection reminder invites sign-in, not invented saved films',async({page})=>{
 await setup(page);
 await page.goto('discover.html?guest=1');
 await page.locator('#watchlist-reminder-toggle').click();
 await expect(page.locator('#watchlist-reminder-status')).toContainText('Sign in');
 await expect(page.locator('#watchlist-reminder-grid .watchlist-reminder-card')).toHaveCount(0);
 await expect(page.locator('.watchlist-reminder-all')).toHaveAttribute('href','signup.html?mode=signin');
});

test('A short Watchlist shows only the saved titles instead of inventing a third',async({page})=>{
 await setup(page);
 await page.goto('discover.html?stub_count=2');
 await page.locator('#watchlist-reminder-toggle').click();
 await expect(page.locator('#watchlist-reminder-grid .watchlist-reminder-card')).toHaveCount(2,{timeout:20000});
 await expect(page.locator('#watchlist-reminder-next')).toBeHidden();
});
test('Empty Watchlist has a useful prompt and no sample films',async({page})=>{
 await setup(page);
 await page.goto('discover.html?stub_count=0');
 await page.locator('#watchlist-reminder-toggle').click();
 await expect(page.locator('#watchlist-reminder-grid .watchlist-reminder-card')).toHaveCount(0,{timeout:20000});
 await expect(page.locator('#watchlist-reminder-status')).toContainText('Nothing in your Watchlist');
 await expect(page.locator('#watchlist-reminder-next')).toBeHidden();
});
