const {test,expect}=require('@playwright/test');

const auth=String.raw`window.supabase={createClient:()=>({
 auth:{
  getSession:async()=>({data:{session:{user:{id:'home-shelf-qa-member',email:'member@afterlogue.test'}}},error:null}),
  getUser:async()=>({data:{user:{id:'home-shelf-qa-member',email:'member@afterlogue.test'}},error:null}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
 },
 from:(table)=>{
  const query=()=>{
   const val=()=>({data:table==='watchlist'&&localStorage.getItem('__qa_watchlist')==='1'
     ?[{title_key:'tmdb-movie-900'}]:[],error:null});
   const q=Promise.resolve(val());
   q.eq=()=>q;
   q.order=async()=>val();
   q.maybeSingle=async()=>({data:table==='profiles'
     ?{discovery_country:null,discovery_language:null}:null,error:null});
   return q;
  };
  return {select:()=>query()};
 },
 storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:'https://example.com/member.jpg'}})})}
})};`;

const fixtures=(media)=>Array.from({length:60},(_,i)=>({
 id:(media==='movie'?900:1900)+i,media,
 title:(media==='movie'?'Cinema':'Television')+' discovery '+(i+1),
 year:2000+i%26,
 poster:'https://image.tmdb.org/t/p/w500/demo.jpg',
 synopsis:'An original and verified story about ordinary days and relationships.'
}));

async function configure(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:auth
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  const data=JSON.parse(route.request().postData()||'{}');
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({items:data.mode==='discover'?fixtures(data.media):[]})});
 });
 await page.route('**/film-details.html?*',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><html><body><h1>Film details</h1><a id="details-back" href="discover.html">Back to Home</a></body></html>'
 }));
}
const posters=page=>page.locator('#discovery-results .discovery-poster');
const titles=page=>posters(page).evaluateAll(list=>list.map(el=>el.getAttribute('aria-label')));

test('On iOS-style Home navigation, return to the exact fourth five-card shelf, not the first',async({page})=>{
 await configure(page);
 await page.goto('discover.html');
 await expect(posters(page)).toHaveCount(5,{timeout:35000});
 const seen=new Set(await titles(page));
 for(let i=0;i<3;i++){
  await page.locator('#discover-again').click();
  await expect(posters(page)).toHaveCount(5);
  for(const name of await titles(page)){
   expect(seen.has(name)).toBe(false);
   seen.add(name);
  }
 }
 const current=await titles(page);
 await expect(page.locator('.discovery-section-header p')).toContainText('004');
 // The Home Screen process can discard tab/session storage when reopening.
 await posters(page).first().click();
 await expect(page.locator('#details-back')).toBeVisible();
 await page.evaluate(()=>sessionStorage.clear());
 await page.locator('#details-back').click();
 await expect(posters(page)).toHaveCount(5,{timeout:35000});
 expect(await titles(page)).toEqual(current);
 await expect(page.locator('.discovery-section-header p')).toContainText('004');

 // Discover Again must now produce new stories, never replay any of the first
 // four rows just to reach the last page again.
 await expect.poll(async()=>
   await page.evaluate(()=>discoveryCatalogState.movies)).toBe('ready',{timeout:35000});
 await page.locator('#discover-again').click();
 await expect(posters(page)).toHaveCount(5);
 const fifth=await titles(page);
 for(const name of fifth)expect(seen.has(name)).toBe(false);
 await expect(page.locator('.discovery-section-header p')).toContainText('005');
});

test('Changed collection invalidates stale shelf but retains no-repeat history',async({page})=>{
 await configure(page);
 await page.goto('discover.html');
 await expect(posters(page)).toHaveCount(5,{timeout:35000});
 const first=await titles(page);
 await posters(page).first().click();
 await expect(page.locator('#details-back')).toBeVisible();
 // Simulate Watchlist changed from film details / another view. The prior
 // selection is no longer valid but it cannot send the user back through it.
 await page.evaluate(()=>{
  localStorage.setItem('__qa_watchlist','1');
  sessionStorage.clear();
 });
 await page.locator('#details-back').click();
 await expect(posters(page)).toHaveCount(5,{timeout:35000});
 const now=await titles(page);
 for(const name of now)expect(first.includes(name)).toBe(false);
});
