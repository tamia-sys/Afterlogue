/* Validate the real catalogue Edge Function with representative Korean-film
 * feedback. The TMDB network boundary is mocked; no member data is read.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const sources=['기생충','극한직업'];
let handler;
const calls=[];
const overview='In a changing city, a family struggles with friendship, class, ambition, and secrets as they reconsider the meaning of their relationships and lives.';
const make=(id,title,language='ko',country='KR')=>({
 id,title,name:title,poster_path:'/korean-art.jpg',overview,
 original_language:language,origin_country:[country],genre_ids:[18,53],
 release_date:'2022-02-10',first_air_date:'2022-02-10',
 vote_count:220,vote_average:8.2,adult:false,video:false,popularity:25
});
globalThis.Deno={env:{get:()=> 'test-token'},serve:fn=>{handler=fn;}};
globalThis.fetch=async(input)=>{
 const url=new URL(String(input));
 const path=url.pathname.replace(/^\/3/,'');
 calls.push({path,params:Object.fromEntries(url.searchParams)});
 let items=[];
 if(path==='/search/movie'){
  const q=url.searchParams.get('query');
  const idx=sources.indexOf(q);
  items=idx<0?[]:[make(100+idx,sources[idx])];
 }else if(/\/movie\/\d+\/(similar|recommendations)$/.test(path)){
  items=Array.from({length:9},(_,i)=>make(300+i,'English-language film '+i,'en','US'));
 }else if(path==='/discover/movie'){
  const targeted=url.searchParams.get('with_original_language')==='ko'&&
    url.searchParams.get('with_origin_country')==='KR';
  const page=Number(url.searchParams.get('page')||1);
  items=Array.from({length:20},(_,i)=>targeted
   ?make(500+page*25+i,'한국 영화 '+page+' '+i)
   :make(300+page*25+i,'Worldwide film '+page+' '+i,'en','US'));
 }else if(/^\/movie\/\d+$/.test(path)){
  const id=Number(path.split('/')[2]);
  return new Response(JSON.stringify({
   production_countries:[{iso_3166_1:id>=500?'KR':'US'}],
   original_language:id>=500?'ko':'en',adult:false,
  }),{status:200});
 }
 return new Response(JSON.stringify({results:items}),{status:200});
};
const ready=import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/afterlogue-catalog/index.ts')).href);
test('Korean-titled source films return verified Korean film matches instead of zero',async()=>{
 await ready;
 assert.equal(typeof handler,'function');
 const response=await handler(new Request('https://example.supabase.co/functions/v1/afterlogue-catalog',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
   mode:'recommend',media:'movie',titles:sources,country:'KR',originalLanguage:'ko'
  })
 }));
 assert.equal(response.status,200,'Recommendation request must succeed');
 const body=await response.json();
 assert.ok(body.items.length>=5,'Korean source films should provide at least five verified matches');
 assert.ok(body.items.every(x=>x.filterVerified===true&&
   x.countries.includes('KR')&&x.originalLanguage==='ko'));
 assert.ok(body.items.every(x=>x.matched.length&&x.matchMethod==='shared_genre'),
   'Genre-linked titles must be explicitly labeled, not fabricated as directly related');
 assert.ok(body.items.some(x=>x.title.startsWith('한국 영화')),'Unicode titles must survive');
 assert.ok(calls.some(x=>x.path==='/discover/movie'&&
   x.params.with_origin_country==='KR'&&x.params.with_original_language==='ko'),
   'Discover must search Korea and Korean language before filtering');
});
test('Korean-only discovery requests an origin-country-filtered catalog',async()=>{
 await ready;
 calls.length=0;
 const r=await handler(new Request('https://example.supabase.co/functions/v1/afterlogue-catalog',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({mode:'discover',media:'movie',page:1,pageSize:60,
   sort:'discover',country:'KR',originalLanguage:'ko'})
 }));
 assert.equal(r.status,200);
 const body=await r.json();
 assert.ok(body.items.length>=5,'Filtered archive should offer verified Korean films');
 assert.ok(calls.some(x=>x.path==='/discover/movie'&&
   x.params.with_origin_country==='KR'&&x.params.with_original_language==='ko'));
});
