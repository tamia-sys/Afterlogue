const {test,expect}=require('@playwright/test');
const fakeSupabase=String.raw`window.supabase={createClient:()=>({
 auth:{
  getUser:async()=>({data:{user:null},error:null}),
  getSession:async()=>({data:{session:null},error:null})
 }
})};`;
test('Guest who loved Korean-titled films sees five film recommendations, not an empty shelf',async({page})=>{
 const logged=[];
 await page.addInitScript(()=>{
  const films=[
   {id:101,key:'tmdb-movie-101',title:'기생충'},
   {id:102,key:'tmdb-movie-102',title:'극한직업'}
  ];
  for(const item of films){
   localStorage.setItem('afterlogue-'+item.key,'Loved');
   localStorage.setItem('afterlogue.onboarding.tmdb.'+item.key,JSON.stringify({
    key:item.key,title:item.title,category:'movies',year:2019,
    poster:'https://image.tmdb.org/t/p/w500/test.jpg'
   }));
  }
  sessionStorage.setItem('afterlogue.onboarding.country','KR');
  sessionStorage.setItem('afterlogue.onboarding.language','ko');
 });
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  logged.push(body);
  const items=body.mode==='recommend'&&body.media==='movie'?
   Array.from({length:5},(_,i)=>({
    id:501+i,media:'movie',title:'한국 영화 '+i,year:2016+i,
    poster:'https://image.tmdb.org/t/p/w500/cover.jpg',
    synopsis:'An original Korean film with a meaningful drama narrative, family relationships and social themes.',
    matched:['기생충'],matchMethod:'shared_genre',matchedGenres:['Drama'],
    genres:['Drama'],countries:['KR'],originalLanguage:'ko',filterVerified:true
   })):[];
  return route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({items})
  });
 });
 await page.goto('discover.html?guest=1');
 await expect(page.locator('#discovery-results .discovery-card')).toHaveCount(5,{timeout:25000});
 // Home intentionally presents posters without redundant titles below them.
 // Validate the readable poster aria-labels rather than hidden caption text.
 const titles=await page.locator('#discovery-results .discovery-poster')
   .evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
 expect(titles.join(' ')).toContain('한국 영화');
 expect(logged.some(q=>q.mode==='recommend'&&q.media==='movie'&&
   q.country==='KR'&&q.originalLanguage==='ko'&&
   q.titles.includes('기생충'))).toBe(true);
});
