const {test,expect}=require('@playwright/test');

const supabaseStub=String.raw`window.supabase={createClient:()=>({
 auth:{
  getUser:async()=>({data:{user:null},error:null}),
  getSession:async()=>({data:{session:null},error:null})
 },
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})
})};`;
async function offline(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:supabaseStub
 }));
}
function stories(body){
 const offset=Number(body.offset)||0;
 return Array.from({length:10},(_,i)=>({
  id:41000+offset*100+i,
  media:'tv',title:'Autumn series '+offset+'-'+i,year:2020,
  poster:'https://image.tmdb.org/t/p/w500/sample.jpg',
  moodReason:'Its documented fall school setting fits the selected pace.',
  matchedFilters:[],moodFit:12
 })).filter(item=>!(body.excludeIds||[]).includes(item.id));
}
async function chooseFallTV(page){
 await page.goto('explore.html?guest=1');
 await page.locator('.mood-card[data-mood="fall"] .mood-open').click();
 await page.locator('.choice[data-value="tv"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="slow"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5);
}
test('Explore prepares exactly one next shelf and uses it without refetching the same offset',async({page})=>{
 await offline(page);
 const requests=[];
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  if(body.mode!=='mood')return route.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});
  requests.push(body);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:stories(body)})});
 });
 await chooseFallTV(page);
 await expect.poll(()=>requests.filter(x=>x.mode==='mood').length).toBeGreaterThanOrEqual(2);
 expect(requests.filter(x=>x.offset===1)).toHaveLength(1);
 expect(await page.locator('#explore-picks .explore-pick h3').first().innerText()).toBe('Autumn series 0-0');
 await page.locator('#explore-again').click();
 await expect(page.locator('#explore-picks .explore-pick h3').first()).toHaveText('Autumn series 1-0');
 expect(requests.filter(x=>x.offset===1)).toHaveLength(1);
 await expect.poll(()=>requests.filter(x=>x.offset===2).length).toBe(1);
});
test('Explore keeps the five original picks visible while background next shelf loads',async({page})=>{
 await offline(page);
 let release;
 const nextGate=new Promise(resolve=>{release=resolve;});
 let waiting=false;
 await page.route('**/functions/v1/afterlogue-catalog',async route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  if(body.mode!=='mood')return route.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});
  if(body.offset===1){waiting=true;await nextGate;}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:stories(body)})});
 });
 await chooseFallTV(page);
 await expect.poll(()=>waiting).toBe(true);
 await page.locator('#explore-again').click();
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5);
 await expect(page.locator('#explore-picks .explore-pick h3').first()).toHaveText('Autumn series 0-0');
 release();
 await expect(page.locator('#explore-picks .explore-pick h3').first()).toHaveText('Autumn series 1-0');
});
test('Where to Watch appears before Cast & Crew and both tabs remain accessible',async({page})=>{
 await offline(page);
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:'{"items":[]}'
 }));
 await page.goto('film-details.html?title=perfect-days');
 await expect(page.locator('#film-content')).toBeVisible();
 const tabs=await page.locator('.film-tab').evaluateAll(nodes=>nodes.map(x=>x.dataset.tab));
 expect(tabs).toEqual(['overview','watch','cast','discuss']);
 await page.locator('#film-tab-watch').click();
 await expect(page.locator('#film-panel-watch')).toBeVisible();
 await expect(page.locator('#film-justwatch')).toHaveAttribute('href',/justwatch/);
 await page.locator('#film-tab-cast').click();
 await expect(page.locator('#film-panel-cast')).toBeVisible();
});
test('Watch trailer opens a muted autoplay-ready player on the actual details page',async({page})=>{
 await offline(page);
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:'{"items":[]}'
 }));
 await page.route('https://www.youtube-nocookie.com/embed/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><body>Video player</body>'
 }));
 await page.goto('film-details.html?title=perfect-days');
 await expect(page.locator('#film-trailer')).toBeVisible();
 await page.locator('#film-trailer').click();
 await expect(page.locator('#film-trailer-modal')).toBeVisible();
 // First click uses the already loaded muted video rather than restarting it.
 await expect.poll(()=>page.locator('#film-trailer-player').getAttribute('src')).toContain('autoplay=0');
 const src=await page.locator('#film-trailer-player').getAttribute('src');
 const embed=new URL(src);
 expect(embed.hostname).toBe('www.youtube-nocookie.com');
 expect(embed.searchParams.get('mute')).toBe('1');
 expect(embed.searchParams.get('playsinline')).toBe('1');
 expect(embed.searchParams.get('enablejsapi')).toBe('1');
 await page.locator('#film-trailer-close').click();
 await expect(page.locator('#film-trailer-player')).not.toHaveAttribute('src',/.+/);
});

test('Preloaded trailer starts muted with the very first Watch trailer click',async({page})=>{
 await offline(page);
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:'{"items":[]}'
 }));
 await page.route('https://www.youtube-nocookie.com/embed/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><html><body data-play="no"><script>'+
   'window.addEventListener("message",event=>{'+
   'let data;try{data=JSON.parse(event.data)}catch(_){return;}'+
   'if(data.event==="listening")window.parent.postMessage(JSON.stringify({event:"onReady"}),"*");'+
   'if(data.event==="command"&&data.func==="playVideo"){'+
   'document.body.dataset.play="yes";'+
   'window.parent.postMessage(JSON.stringify({event:"onStateChange",info:1}),"*");'+
   '}'+
   '});<\/script></body></html>'
 }));
 await page.goto('film-details.html?title=perfect-days');
 const player=page.frameLocator('#film-trailer-player');
 await expect(player.locator('body')).toHaveAttribute('data-play','no');
 await expect(page.locator('#film-trailer-player')).toHaveAttribute('src',/autoplay=0/);
 await page.locator('#film-trailer').click();
 await expect(player.locator('body')).toHaveAttribute('data-play','yes');
 await expect(page.locator('#film-trailer-status')).toContainText('Playing muted');
 await expect(page.locator('#film-trailer-player')).toHaveAttribute('src',/autoplay=0/);
 await page.locator('#film-trailer-close').click();
 await expect(page.locator('#film-trailer-player')).not.toHaveAttribute('src',/.+/);
});
test('Blocked autoplay provides an accurate explanation and manual fallback',async({page})=>{
 await offline(page);
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:'{"items":[]}'
 }));
 await page.route('https://www.youtube-nocookie.com/embed/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><html><body><script>'+
   'window.addEventListener("message",event=>{'+
   'let data;try{data=JSON.parse(event.data)}catch(_){return;}'+
   'if(data.event==="listening")window.parent.postMessage(JSON.stringify({event:"onReady"}),"*");'+
   'if(data.event==="command"&&data.func==="playVideo")'+
   'window.parent.postMessage(JSON.stringify({event:"onAutoplayBlocked"}),"*");'+
   '});<\/script></body></html>'
 }));
 await page.goto('film-details.html?title=perfect-days');
 await page.locator('#film-trailer').click();
 await expect(page.locator('#film-trailer-status')).toContainText('browser blocked automatic playback');
 await expect(page.locator('#film-trailer-external')).toHaveAttribute('href',/youtube\.com\/watch\?v=/);
});
