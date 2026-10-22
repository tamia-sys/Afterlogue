/* Run the real Supabase Edge Function against an in-memory TMDB stand-in.
 * No fake cards are added to the production catalog by this test.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const refs={
 "Spring, Summer, Fall, Winter... and Spring":2003,
 "Columbus":2017,"Beauty Shop":2005,"Just Wright":2010,
 "Three Colors: White":1994,"A Ghost Story":2017,
 "Perfect Days":2023,"Paterson":2016,
 "Nomadland":2020,"Ikiru":1952,"Amélie":2001
};
const details=new Map();
let handler;
const contemplative='A quiet contemplative drama about a family, the passing of time and daily routines in a small town.';
function make(title,id,year=2017,language='en'){
 const result={id,title,name:title,overview:contemplative,poster_path:'/abc.jpg',
 backdrop_path:'/b.jpg',release_date:year+'-03-22',
 first_air_date:year+'-03-22',adult:false,video:false,genre_ids:[18],
 original_language:language,origin_country:[language==='ko'?'KR':language==='ja'?'JP':'US'],
 vote_count:250,vote_average:7.3};
 details.set('movie:'+id,result);
 return result;
}
globalThis.Deno={env:{get:()=> 'fake-tmdb-token'},serve:fn=>{handler=fn;}};
globalThis.fetch=async url=>{
 const u=new URL(String(url)),segments=u.pathname.split('/').filter(Boolean);
 const media=segments[1]==='tv'?'tv':'movie';
 if(segments[1]==='search'){
  const name=u.searchParams.get('query')||'Unknown';
  const year=refs[name]||2020;
  let hash=0;for(const c of name)hash=(hash*31+c.charCodeAt(0))|0;
  const item=make(name,10000+(hash>>>0)%200000,year);
  return new Response(JSON.stringify({results:[item]}),{status:200});
 }
 if(segments[1]==='discover'){
  const p=Number(u.searchParams.get('page')||1);
  const items=Array.from({length:20},(_,i)=>make('Worldwide contemplative film '+p+'-'+i,
   400000+p*100+i,2008+(i%15),['en','ko','ja','fr','hi'][i%5]));
  return new Response(JSON.stringify({results:items}),{status:200});
 }
 if(segments[1]==='movie'&&segments[3]==='similar'){
  const id=Number(segments[2]);
  const titles=Array.from({length:20},(_,i)=>make('New life portrait '+id+'-'+i,
   650000+(id%1000)*20+i,2005+(i%17),['fr','ja','ko','en'][i%4]));
  return new Response(JSON.stringify({results:titles}),{status:200});
 }
 if(segments[1]==='movie'&&Number.isSafeInteger(Number(segments[2]))){
  const item=details.get('movie:'+Number(segments[2]));
  if(!item)return new Response('{}',{status:404});
  return new Response(JSON.stringify({
   ...item,status:'Released',runtime:115,production_companies:[{id:1,name:'Cinema'}],
   production_countries:[{iso_3166_1:item.origin_country[0]}],
   genres:[{id:18,name:'Drama'}],keywords:{keywords:[]},
   release_dates:{results:[]},networks:[],content_ratings:{results:[]}
  }),{status:200});
 }
 return new Response(JSON.stringify({results:[]}),{status:200});
};
const load=import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/afterlogue-catalog/index.ts')).href);
async function find(offset=0,excludeIds=[]){
 await load;assert.equal(typeof handler,'function');
 const response=await handler(new Request('https://example.supabase.co/functions/v1/afterlogue-catalog',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({mode:'mood',mood:'winding',media:'movie',pace:'slow',offset,excludeIds})
 }));
 assert.equal(response.status,200);
 return response.json();
}
test('Winding Down uses user examples as guides and also returns verified new cinema',async()=>{
 const data=await find();
 assert.ok(data.items.length>=5,'should produce five eligible films');
 const firstFive=data.items.slice(0,5);
 assert.ok(firstFive.filter(x=>x.windingReference).length<=2,
  'Example references must not monopolize a result row');
 assert.ok(firstFive.filter(x=>!x.windingReference).length>=3,
  'At least three genuinely new catalogue discoveries when suitable candidates exist');
 assert.ok(firstFive.every(x=>x.moodFit>=5&&x.poster&&x.moodReason));
 assert.ok(firstFive.some(x=>x.language==='ja'||x.language==='ko'||x.language==='fr'),
  'Global catalog should not be reduced to English originals');
 const another=await find(1,firstFive.map(x=>x.id));
 assert.ok(another.items.slice(0,5).every(x=>!firstFive.some(old=>old.id===x.id)),
  'Another selection must exclude the first five');
});
