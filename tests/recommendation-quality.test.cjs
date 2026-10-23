// AFTERLOGUE / recommendation quality lab.
// Synthetic viewers and titles: no member ratings, logs, or private data.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','recommendation-engine.js'),'utf8'),scope);
const engine=scope.window.AfterlogueRecommendationEngine;

function film(key,{genres=['drama'],themes=[],tones=[],pace=null,directors=[],writers=[],
 collectionId=null,position=0,category='movies',directMatches=[]}={}){
 return {key,title:key,category,position,collectionId,directMatches,
  facets:{genres,themes,tones,pace,directors,writers}};
}
function evaluate({sources=[],choices=[],ratings={},watchlist=[],seen=[],favorites=[]}={}){
 const entries=[...sources,...choices];
 const picks=Array.from(engine.rank({entries,category:'movies',impressions:ratings,
   watchlist,seen,favorites}));
 const shelf=Array.from(engine.balanceShelves({
   entries:picks,profileEntries:entries,impressions:ratings,favorites,category:'movies'
 })).slice(0,5);
 return {picks,shelf};
}

test('A mixed arthouse viewer receives different cinematic forms, not five animations',()=>{
 const sources=[
  film('quiet-loved',{themes:['routine','solitude'],tones:['reflective','tender'],pace:'slow'}),
  film('family-loved',{themes:['family','memory'],tones:['intimate'],pace:'slow'}),
  film('comedy-loved',{genres:['comedy'],themes:['friendship'],tones:['funny']}),
  film('thriller-liked',{genres:['thriller'],themes:['secrets'],tones:['unsettling']}),
  film('animation-liked',{genres:['animation'],themes:['connection'],tones:['tender']})
 ];
 const choices=[
  ...Array.from({length:8},(_,i)=>film('animation-'+i,{
   genres:['animation','drama'],themes:['family','memory'],tones:['intimate','tender'],position:i})),
  film('everyday-drama',{themes:['routine','solitude'],tones:['reflective'],pace:'slow',position:9}),
  film('intimate-romance',{genres:['romance'],themes:['family','memory'],tones:['intimate'],position:10}),
  film('dry-comedy',{genres:['comedy'],themes:['friendship'],tones:['funny'],position:11}),
  film('character-thriller',{genres:['thriller'],themes:['secrets'],tones:['unsettling'],position:12})
 ];
 const ratings={'quiet-loved':'Loved','family-loved':'Loved','comedy-loved':'Loved',
  'thriller-liked':'Liked','animation-liked':'Liked'};
 const {shelf}=evaluate({sources,choices,ratings});
 assert.equal(shelf.length,5);
 assert.ok(shelf.filter(x=>x.facets.genres.includes('animation')).length<=2,
  'Five-card shelves should not turn a mixed Log into an animation marathon');
 assert.ok(shelf.some(x=>!x.facets.genres.includes('animation')));
 assert.ok(shelf.every(x=>x.personalized));
});

test('A genuine animation enthusiast may receive predominantly animation',()=>{
 const sources=Array.from({length:9},(_,i)=>film('animated-loved-'+i,{
  genres:['animation'],themes:['friendship','growing-up'],tones:['wondrous']}));
 const choices=[
  ...Array.from({length:7},(_,i)=>film('animated-new-'+i,{genres:['animation'],
   themes:['friendship','growing-up'],tones:['wondrous'],position:i})),
  film('unrelated-drama',{themes:['routine'],tones:['melancholic'],position:9})
 ];
 const ratings=Object.fromEntries(sources.map(x=>[x.key,'Loved']));
 const {shelf}=evaluate({sources,choices,ratings});
 assert.ok(shelf.filter(x=>x.facets.genres.includes('animation')).length>=3,
  'Variety should not override an authentic, dominant preference');
});

test('Verified director connection is useful, but weaker than rich emotional fit',()=>{
 const sources=[film('loved',{themes:['routine','solitude'],tones:['quiet','reflective'],
  genres:['drama'],directors:['tmdb-person-51']})];
 const choices=[
  film('same-director-different-story',{genres:['horror'],themes:['survival'],
   tones:['intense'],directors:['tmdb-person-51'],position:0}),
  film('different-director-same-feeling',{genres:['drama'],themes:['routine','solitude'],
   tones:['quiet','reflective'],directors:['tmdb-person-88'],position:1})
 ];
 const {picks}=evaluate({sources,choices,ratings:{loved:'Loved'}});
 assert.equal(picks[0].key,'different-director-same-feeling');
 assert.ok(picks.find(x=>x.key==='same-director-different-story').why.includes('share a director'));
});

test('Watched and watchlisted titles are excluded from recommendations',()=>{
 const sources=[film('loved',{themes:['memory'],tones:['tender']}),
  film('watchlisted',{themes:['memory'],tones:['tender']}),
  film('watched',{themes:['memory'],tones:['tender']})];
 const choices=[film('fresh',{themes:['memory'],tones:['tender']})];
 const {picks}=evaluate({sources,choices,ratings:{loved:'Loved'},
  watchlist:['watchlisted'],seen:['watched']});
 assert.deepEqual(picks.map(x=>x.key),['fresh']);
});

test('Watchlist curiosity cannot overpower a strong Loved preference',()=>{
 const sources=[
  film('loved',{genres:['drama'],themes:['solitude','routine'],tones:['quiet','reflective']}),
  film('saved',{genres:['animation'],themes:['adventure'],tones:['wondrous']})
 ];
 const choices=[
  film('aligned-with-loved',{genres:['drama'],themes:['solitude','routine'],tones:['quiet','reflective']}),
  film('aligned-with-watchlist',{genres:['animation'],themes:['adventure'],tones:['wondrous']})
 ];
 const {picks}=evaluate({sources,choices,ratings:{loved:'Loved'},watchlist:['saved']});
 assert.equal(picks[0].key,'aligned-with-loved');
});

test('Known franchise parts do not dominate a mixed five-card shelf',()=>{
 const sources=[
  film('sci-fi-loved',{genres:['science fiction'],themes:['identity'],tones:['reflective']}),
  film('drama-loved',{genres:['drama'],themes:['family'],tones:['intimate']}),
  film('comedy-loved',{genres:['comedy'],themes:['friendship'],tones:['funny']})
 ];
 const choices=[
  ...Array.from({length:6},(_,i)=>film('series-'+i,{
   genres:['science fiction'],themes:['identity'],tones:['reflective'],
   collectionId:43210,position:i})),
  film('another-drama',{genres:['drama'],themes:['family'],tones:['intimate'],position:7}),
  film('another-comedy',{genres:['comedy'],themes:['friendship'],tones:['funny'],position:8}),
  film('second-scifi',{genres:['science fiction'],themes:['identity'],tones:['reflective'],position:9}),
  film('third-drama',{genres:['drama'],themes:['family'],tones:['intimate'],position:10}),
  film('third-comedy',{genres:['comedy'],themes:['friendship'],tones:['funny'],position:11})
 ];
 const {shelf}=evaluate({sources,choices,ratings:{
  'sci-fi-loved':'Loved','drama-loved':'Loved','comedy-loved':'Loved'}});
 assert.equal(shelf.length,5);
 assert.ok(shelf.filter(x=>x.collectionId===43210).length<=1,
  'One verified collection should not occupy multiple slots when other good options exist');
});

test('Large Logs retain older live-action discovery seeds despite recent animation',()=>{
 const sources=[
  ...Array.from({length:16},(_,i)=>({title:'Historical Drama '+i,rating:'Loved',
   timestamp:'2025-08-01',facets:{genres:['drama']}})),
  ...Array.from({length:12},(_,i)=>({title:'Historical Comedy '+i,rating:'Liked',
   timestamp:'2025-09-01',facets:{genres:['comedy']}})),
  ...Array.from({length:22},(_,i)=>({title:'Recent Animation '+i,rating:'Loved',
   timestamp:'2026-10-01',facets:{genres:['animation']}}))
 ];
 const seeds=Array.from(engine.selectSeeds({sources,category:'movies',limit:4,rotation:0}));
 assert.equal(seeds.length,4);
 assert.ok(seeds.some(x=>x.startsWith('Historical')),
  'Recent activity must not erase older independent interests from retrieval');
 assert.equal(new Set(seeds).size,4);
});

test('Ranking is deterministic and never invents extra candidates',()=>{
 const sources=[film('loved',{themes:['identity'],tones:['reflective']})];
 const choices=[
  film('candidate-a',{themes:['identity'],tones:['reflective']}),
  film('candidate-b',{genres:['animation'],themes:['identity']}),
  film('candidate-c',{genres:['comedy'],tones:['reflective']})
 ];
 const args={sources,choices,ratings:{loved:'Loved'}};
 const first=evaluate(args).picks.map(x=>x.key);
 const second=evaluate(args).picks.map(x=>x.key);
 assert.deepEqual(first,second);
 assert.equal(first.length,3);
 assert.equal(new Set(first).size,3);
 assert.ok(first.every(key=>choices.some(x=>x.key===key)));
});
