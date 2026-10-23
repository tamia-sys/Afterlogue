/* Exercise the live TypeScript Edge handler with mocked TMDB responses.
 * node --experimental-strip-types --test tests/taste-features-edge.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
let handler;
const requests=[];
globalThis.Deno={env:{get:()=> 'testing-tmdb'},serve:fn=>handler=fn};
globalThis.fetch=async urlString=>{
 const url=new URL(String(urlString));
 requests.push(url.pathname);
 if(url.pathname==='/3/movie/12')return new Response(JSON.stringify({
  id:12,title:'Gentle Story',adult:false,
  genres:[{name:'Drama'},{name:'Romance'}],
  keywords:{keywords:[{name:'first love'},{name:'grief'},{name:'independent film'}]},
  belongs_to_collection:{id:2048},credits:{crew:[{id:70,job:'Director'},{id:80,job:'Screenplay'}]}
 }));
 if(url.pathname==='/3/tv/20')return new Response(JSON.stringify({
  id:20,name:'Comedic Story',adult:false,
  genres:[{name:'Comedy'}],
  keywords:{results:[{name:'female friendship'},{name:'dark comedy'}]},
  credits:{crew:[{id:90,job:'Director'}]}
 }));
 return new Response(JSON.stringify({status_message:'Not found'}),{status:404});
};
const loaded=import(pathToFileURL(path.resolve(__dirname,
  '../supabase/functions/afterlogue-catalog/index.ts')).href);
async function invoke(keys,extra={}){
 await loaded;
 return handler(new Request('https://example.supabase.co/functions/v1/afterlogue-catalog',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({mode:'taste-features',keys,...extra})
 }));
}
test('Public identifiers produce verified genres and keyword-derived, not invented, themes',async()=>{
 const res=await invoke(['tmdb-movie-12','tmdb-tv-20','tmdb-movie-12','bad-key']);
 assert.equal(res.status,200);
 const {items}=await res.json();
 assert.equal(items.length,2);
 const film=items.find(x=>x.key==='tmdb-movie-12');
 const series=items.find(x=>x.key==='tmdb-tv-20');
 assert.deepEqual(film.genres,['drama','romance']);
 assert.deepEqual(film.themes.sort(),['first-love','loss']);
 assert.deepEqual(series.themes,['friendship']);
 assert.deepEqual(series.tones,['satirical']);
 assert.equal(film.title,'Gentle Story');
 assert.deepEqual(film.directors,['tmdb-person-70']);
 assert.deepEqual(film.writers,['tmdb-person-80']);
 assert.equal(film.collectionId,2048);
 assert.deepEqual(series.directors,['tmdb-person-90']);
 assert.equal(series.collectionId,null);
 assert.ok(!JSON.stringify(items).includes('independent film'),
  'Unmapped keywords must not be used to invent an emotional quality');
 assert.deepEqual(requests.sort(),['/3/movie/12','/3/tv/20'].sort());
 for(const row of items){
  for(const secret of ['user_id','private_note','rating','email'])assert.ok(!(secret in row));
 }
});
test('A malicious, overlarge request is bounded to 18 valid public identifiers',async()=>{
 requests.length=0;
 const ids=Array.from({length:24},(_,i)=>'tmdb-movie-'+(i+1));
 const res=await invoke(ids);
 assert.equal(res.status,200);
 assert.ok(requests.length<=18);
 assert.ok(requests.every(p=>/^\/3\/movie\/\d+$/.test(p)));
});
