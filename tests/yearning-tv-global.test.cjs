/* Run actual catalogue Edge Function with deterministic global TV metadata. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
let handler;
const lookup=new Map(),searches=[];
const territory={
 'Normal People':'IE','One Day':'GB','Fleabag':'GB','Bridgerton':'US',
 'The Summer I Turned Pretty':'US','NANA':'JP','Sex Education':'GB',
 'Outlander':'US','Nobody Wants This':'US','Jane the Virgin':'US',
 'Sense8':'US','Interview with the Vampire':'US','The Vampire Diaries':'US',
 'Felicity':'US','North & South':'GB','Downton Abbey':'GB','Little Dorrit':'GB',
 'Crash Landing on You':'KR','Hospital Playlist':'KR','One Tree Hill':'US',
 'Fellow Travelers':'US','Heartstopper':'GB','Sanditon':'GB','Younger':'US',
 'Strong Woman Do Bong-soon':'KR','Young Royals':'SE','My Liberation Notes':'KR',
 'The Red Sleeve':'KR','Eternal Love':'CN','The Returned':'FR',
 'The Hook Up Plan':'FR','SKAM France':'FR','Never Have I Ever':'US',
 'Ginny & Georgia':'US','Lovesick':'GB','Starstruck':'GB','Love Life':'US',
 'Twenty-Five Twenty-One':'KR','Our Beloved Summer':'KR',
 'Something in the Rain':'KR','When the Weather Is Fine':'KR',
 'A Perfect Story':'ES','Feel Good':'GB','Queen Charlotte: A Bridgerton Story':'US'
};
function mk(id,name,origin='US'){
 const langs={KR:'ko',JP:'ja',FR:'fr',SE:'sv',ES:'es'};
 const item={
  id,name,title:name,original_name:name,
  overview:'A long relationship shaped by first love and unspoken feelings, as friends reunite after years apart to reconsider what it means to love one another.',
  poster_path:'/real.jpg',backdrop_path:'/still.jpg',
  first_air_date:'2020-03-09',vote_count:180,
  vote_average:8.1,genre_ids:name==='NANA'?[16,18]:[18],
  original_language:langs[origin]||'en',origin_country:[origin],
  adult:false,video:false
 };
 lookup.set(id,item);return item;
}
globalThis.Deno={env:{get:()=> 'fake-key'},serve:fn=>{handler=fn;}};
globalThis.fetch=async urlString=>{
 const url=new URL(String(urlString)),p=url.pathname;
 if(p==='/3/search/keyword')return new Response(JSON.stringify({results:[]}));
 if(p==='/3/search/tv'){
  const name=url.searchParams.get('query');
  const id=10000+[...name].reduce((n,c)=>n+c.charCodeAt(0),0);
  return new Response(JSON.stringify({results:[mk(id,name,territory[name]||'US')]}));
 }
 if(p==='/3/discover/tv'){
  searches.push(url.searchParams.toString());
  const page=Number(url.searchParams.get('page'))||1;
  return new Response(JSON.stringify({results:Array.from({length:20},(_,i)=>{
    const origin=['US','GB','KR','FR','JP'][i%5];
    return mk(300000+page*100+i,'Unknown relationship series '+page+'-'+i,origin);
  })}));
 }
 if(/^\/3\/tv\/\d+$/.test(p)){
  const item=lookup.get(Number(p.split('/').pop()));
  if(!item)return new Response('{"status_message":"missing"}',{status:404});
  return new Response(JSON.stringify({
   ...item,genres:item.genre_ids.map(id=>({id,name:id===16?'Animation':'Drama'})),
   networks:[{name:'TV broadcaster'}],keywords:{results:[]},
   content_ratings:{results:[]}
  }));
 }
 return new Response('{"results":[]}');
};
const ready=import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/afterlogue-catalog/index.ts')).href);
async function picks(pace,excludeIds=[],countries=[]){
 await ready;
 const res=await handler(new Request('https://example.supabase.co/functions/v1/afterlogue-catalog',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({mode:'mood',mood:'yearning',media:'tv',pace,offset:0,
   excludeIds,countries,genres:[],decades:[],ratings:[]})
 }));
 assert.equal(res.status,200);
 return (await res.json()).items||[];
}
test('unfiltered slow yearning includes global series with individual reasons and no same-region monopoly',async()=>{
 const rows=await picks('slow');
 assert.ok(rows.length>=5,'Must find five real-verified series');
 assert.ok(rows.slice(0,5).every(x=>x.moodReason&&x.moodFit>=5));
 assert.ok(rows.slice(0,5).some(x=>x.originCountry==='US'),'Include American relationships');
 assert.ok(rows.slice(0,5).some(x=>['GB','IE','FR','SE'].includes(x.originCountry)),'Include European relationships');
 assert.ok(rows.slice(0,5).some(x=>['KR','JP','CN'].includes(x.originCountry)),'Include Asian relationships without making the entire shelf Asian');
 assert.ok(new Set(rows.slice(0,5).map(x=>x.moodReason)).size>=3,'Reasons should reflect distinct stories');
 assert.ok(searches.length>=6,'Unfamiliar story discovery must still search beyond example titles');
 const repeat=await picks('slow',rows.slice(0,5).map(x=>x.id));
 assert.ok(repeat.slice(0,5).every(x=>!rows.slice(0,5).some(y=>x.id===y.id)));
});
test('when South Korea is explicitly selected, regional diversity cannot override the filter',async()=>{
 const rows=await picks('slow',[],['KR']);
 assert.ok(rows.every(x=>x.matchedFilters.includes('Country: KR')));
});
