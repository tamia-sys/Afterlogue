/* Simulate TMDB at the network boundary while running the real Edge Function.
 * This checks candidate counts and pace differentiation without a live API key.
 * Run with: node --experimental-strip-types --test tests/fall-edge-behavior.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
let handler;
const details=new Map();
function idFor(media,title){
 let h=2166136261;
 for(const char of media+':'+title)h=Math.imul(h^char.charCodeAt(0),16777619);
 return 10000+(h>>>0)%1000000;
}
const fallbackOverview='At the start of the autumn school year, a university student navigates campus life, friendships and secrets as the leaves change.';
function entry(media,title,id,origin='US'){
 return {
  id:id||idFor(media,title),name:title,title,
  overview:fallbackOverview,
  poster_path:'/poster.jpg',backdrop_path:'/backdrop.jpg',
  release_date:'2021-10-01',first_air_date:'2021-10-01',
  vote_count:300,vote_average:7.9,genre_ids:[18,9648],adult:false,video:false,
  original_language:origin==='JP'?'ja':origin==='KR'?'ko':origin==='FR'?'fr':'en',
  origin_country:[origin]
 };
}
globalThis.Deno={env:{get:()=> 'fake-tmdb-token'},serve:fn=>{handler=fn;}};
globalThis.fetch=async(input)=>{
 const url=new URL(String(input));
 const media=url.pathname.includes('/tv')?'tv':'movie';
 let items=[];
 if(url.pathname.includes('/search/')){
  const title=url.searchParams.get('query')||'';
  const item=entry(media,title);
  details.set(media+':'+item.id,item);
  items=[item];
 }else if(url.pathname.includes('/discover/')){
  const page=Number(url.searchParams.get('page')||1);
  items=Array.from({length:20},(_,i)=>{
   const origin=['US','JP','FR','KR','GB','DK'][i%6];
   const item=entry(media,media+' story '+page+'-'+i,400000+page*100+i,origin);
   details.set(media+':'+item.id,item);
   return item;
  });
 }else if(['movie','tv'].includes(url.pathname.split('/')[2])&&Number.isInteger(Number(url.pathname.split('/')[3]))){
  const mediaType=url.pathname.split('/')[2],id=Number(url.pathname.split('/')[3]);
  const item=details.get(mediaType+':'+id);
  if(!item)return new Response(JSON.stringify({status_message:'missing'}),{status:404});
  const full={
   ...item,status:'Released',runtime:115,production_companies:[{id:1,name:'Studio'}],
   production_countries:[{iso_3166_1:item.origin_country[0]}],
   networks:[{id:1,name:'Network'}],genres:[{id:18,name:'Drama'},{id:9648,name:'Mystery'}],
   keywords:{keywords:[],results:[]},release_dates:{results:[]},content_ratings:{results:[]}
  };
  return new Response(JSON.stringify(full),{status:200});
 }
 return new Response(JSON.stringify({results:items}),{status:200});
};
const ready=import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/afterlogue-catalog/index.ts')).href);
async function getPicks(media,pace,excludeIds=[]){
 await ready;
 assert.equal(typeof handler,'function');
 const reply=await handler(new Request('https://example.supabase.co/functions/v1/afterlogue-catalog',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({mode:'mood',mood:'fall',media,pace,offset:0,excludeIds})
 }));
 assert.equal(reply.status,200);
 const data=await reply.json();
 assert.equal(data.filters.countries.length,0);
 assert.equal(data.filters.ratings.length,0);
 assert.ok(data.items.length>=5,'Fall '+media+'/'+pace+' should find at least five verified titles');
 assert.equal(new Set(data.items.map(x=>x.id)).size,data.items.length);
 assert.ok(data.items.every(x=>x.poster&&x.moodReason),'Each result needs poster and mood evidence');
 return data.items;
}
test('Fall film and TV requests find five stories from a broad unfiltered pool',async()=>{
 for(const media of ['movie','tv']){
  const slow=await getPicks(media,'slow');
  const energetic=await getPicks(media,'energetic');
  const slowNames=slow.slice(0,5).map(x=>x.title);
  const energeticNames=energetic.slice(0,5).map(x=>x.title);
  assert.ok(slowNames.some(name=>!energeticNames.includes(name)),
   'Pace choice should change the top-five recommendations for '+media);
  const fresh=await getPicks(media,'energetic',slow.slice(0,5).map(x=>x.id));
  assert.ok(fresh.slice(0,5).every(x=>!slow.slice(0,5).some(y=>x.id===y.id)),
   'A previously shown title must stay excluded when the viewer changes pace');
 }
});
