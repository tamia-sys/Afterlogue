const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const environment = { window: {} };
vm.runInNewContext(read('recommendation-engine.js'), environment);
const engine = environment.window.AfterlogueRecommendationEngine;

const facets = () => ({ themes: [], tones: [], genres: [], pace: null });
function entries() {
  return [
    {key:'editorial-old',title:'Old Editorial Pick',year:2001,category:'movies',position:0,
      facets:facets(),directMatches:[],synopsis:'This is just a plot synopsis.'},
    {key:'tmdb-movie-101',title:'A Movie I Love',year:2002,category:'movies',position:201,
      facets:facets(),directMatches:[]},
    {key:'tmdb-movie-202',title:'A New Discovery',year:2020,category:'movies',position:401,
      facets:facets(),directMatches:['a-movie-i-love'],reason:'Related to A Movie I Love.'}
  ];
}

test('A loved dynamic TMDB onboarding title can personalize a wider-catalog film', () => {
  const ranked=engine.rank({entries:entries(),category:'movies',
    impressions:{'afterlogue-tmdb-movie-101':'Loved'}});
  assert.equal(ranked[0].key,'tmdb-movie-202');
  assert.equal(ranked[0].personalized,true);
  assert.match(ranked[0].why,/^Because you loved A Movie I Love,/);
  assert.doesNotMatch(ranked[0].why,/plot synopsis/i);
});

test('A member with varied taste sees both animation and live-action across each five-card Home shelf',()=>{
 const entry=(key,genres,score)=>({key,title:key,category:'movies',score,
   facets:{genres,themes:[],tones:[],pace:null},personalized:true,
   matchMethod:'tmdb_related'});
 const films=[
   ...Array.from({length:8},(_,i)=>entry('animation-'+i,['animation','drama'],100-i)),
   entry('indie-drama',['drama'],83),entry('comedy',['comedy'],78),
   entry('thriller',['thriller'],74),entry('romance',['romance'],69),
   entry('horror',['horror'],64),entry('documentary',['documentary'],61)
 ];
 const profile=[
   entry('animated-loved',['animation'],0),entry('dramatic-loved',['drama'],0),
   entry('funny-loved',['comedy'],0),entry('mystery-loved',['thriller'],0),
   entry('romantic-liked',['romance'],0)
 ];
 const impressions=Object.fromEntries(profile.map((item,i)=>[item.key,i===4?'Liked':'Loved']));
 const balanced=Array.from(engine.balanceShelves({
   entries:films,profileEntries:profile,impressions,category:'movies'}));
 assert.equal(balanced.length,films.length,'Variety must never discard candidates');
 assert.equal(new Set(balanced.map(x=>x.key)).size,films.length);
 for(let offset=0;offset+5<=balanced.length;offset+=5){
   const shelf=balanced.slice(offset,offset+5);
   assert.ok(shelf.filter(item=>item.facets.genres.includes('animation')).length<=2,
     'A genuinely mixed-interest profile should not receive mostly animation');
 }
 assert.equal(balanced[0].key,'animation-0','Best matching film should remain');
 assert.ok(balanced.slice(0,5).some(x=>x.key==='indie-drama'));
 assert.ok(balanced.slice(0,5).some(x=>x.key==='comedy'));
});

test('Mixed tastes do not become five animations because animation scores are larger',()=>{
 const entries=[
  ...Array.from({length:10},(_,i)=>({
   key:'cartoon-'+i,title:'Cartoon '+i,category:'movies',
   facets:{genres:['animation','drama']},score:180-i,personalized:true
  })),
  {key:'drama',title:'Drama',category:'movies',facets:{genres:['drama']},
   score:42,personalized:true},
  {key:'romance',title:'Romance',category:'movies',facets:{genres:['romance']},
   score:39,personalized:true},
  {key:'comedy',title:'Comedy',category:'movies',facets:{genres:['comedy']},
   score:35,personalized:true}
 ];
 const log=Array.from({length:12},(_,i)=>({
   key:'rated-'+i,title:'Rated '+i,category:'movies',
   facets:{genres:i<3?['animation']:i<6?['drama']:i<9?['comedy']:['romance']}
 }));
 const impressions=Object.fromEntries(log.map(x=>[x.key,'Loved']));
 const picks=Array.from(engine.balanceShelves({
   entries,profileEntries:log,impressions,category:'movies'
 })).slice(0,5);
 assert.ok(picks.filter(x=>engine.storyLane(x)==='animation').length<=2);
 assert.ok(picks.some(x=>x.key==='drama'));
 assert.ok(picks.some(x=>x.key==='romance'));
 assert.ok(picks.every(x=>x.personalized));
});

test('Diversify recommendation SEED titles before an animation-only pool is retrieved',()=>{
 const all=[
  ...Array.from({length:7},(_,i)=>({title:'Animation '+i,
   rating:'Loved',facets:{genres:['animation']}})),
  ...Array.from({length:4},(_,i)=>({title:'Live drama '+i,
   rating:'Loved',facets:{genres:['drama']}})),
  ...Array.from({length:3},(_,i)=>({title:'Comedy '+i,
   rating:'Liked',facets:{genres:['comedy']}}))
 ];
 const mixed=Array.from(engine.selectSeeds({
   sources:all,category:'movies',limit:4,rotation:0
 }));
 assert.equal(mixed.length,4);
 assert.ok(mixed.filter(x=>x.startsWith('Animation')).length<=2);
 assert.ok(mixed.some(x=>x.startsWith('Live drama')));
 assert.equal(new Set(mixed).size,4);
 const unknown=Array.from(engine.selectSeeds({
   sources:all.map(({title,rating})=>({title,rating})),
   category:'movies',limit:4,rotation:0
 }));
 assert.deepEqual(unknown,all.slice(0,4).map(x=>x.title));
 const fan=all.slice(0,7).concat([
   {title:'Live drama',rating:'Loved',facets:{genres:['drama']}},
   {title:'Comedy',rating:'Loved',facets:{genres:['comedy']}},
   {title:'Another cartoon',rating:'Loved',facets:{genres:['animation']}}
 ]);
 const fanSeeds=Array.from(engine.selectSeeds({
   sources:fan,category:'movies',limit:4,rotation:0
 }));
 assert.equal(fanSeeds.filter(x=>x.startsWith('Animation')||x==='Another cartoon').length,4);
});

test('Home broadens discovery using logged-title genre evidence and expires old shelves',()=>{
 const home=read('discover.html');
 assert.match(home,/await Promise\.race\(\[tasteFeaturesPromise/);
 assert.match(home,/const sourceFeatureMap=new Map\(\)/);
 assert.match(home,/const firstMovieSources=movieSourceKeys\.slice\(0,2\)/);
 assert.match(home,/firstMovieSources\.push\(restMovies\[at\]\)/);
 assert.match(home,/if\(category==="movies"&&grouped\.movies\.length>=7&&historical\.length<2\)/);
 assert.match(home,/kind:"direct-breadth"/);
 assert.match(home,/sourceFeatureMap\.get\(x\.key\)/);
 assert.match(home,/facets:sourceFeatureMap\.get\(x\.key\)/);
 assert.match(home,/category,limit:grouped\[category\]\.length>=24\?8:4,/);
 assert.match(home,/algorithm:"verified-cinematic-v8"/);
 assert.match(home,/recommendation-engine\.js\?v=17/);
});

test('Strong, well-evidenced animation preference is allowed to dominate five selections',()=>{
 const entries=Array.from({length:8},(_,i)=>({
   key:'animated-'+i,title:'Animated '+i,category:'movies',score:100-i,
   facets:{genres:['animation']},personalized:true
 })).concat([{key:'drama-live',title:'Drama Live',category:'movies',score:80,
   facets:{genres:['drama']},personalized:true}]);
 const logged=Array.from({length:8},(_,i)=>({
   key:'log-'+i,title:'Log '+i,category:'movies',
   facets:{genres:i<7?['animation']:['drama']}
 }));
 const impressions=Object.fromEntries(logged.map(v=>[v.key,'Loved']));
 const picks=Array.from(engine.balanceShelves({
   entries,profileEntries:logged,impressions,category:'movies'}));
 assert.deepEqual(picks.slice(0,5).map(x=>x.key),entries.slice(0,5).map(x=>x.key));
});

test('Shelf diversity never invents unrelated titles, overrides evidence or treats unknown genres as proof',()=>{
 const source=Array.from({length:7},(_,i)=>({
   key:'a-'+i,title:'A'+i,category:'movies',score:100-i,personalized:true,
   facets:{genres:['animation']}
 }));
 const only=Array.from(engine.balanceShelves({entries:source,category:'movies'}));
 assert.deepEqual(only.map(x=>x.key),source.map(x=>x.key),
   'An animation-only qualified catalog must not invent live action');
 const withWeak=source.concat([
   {key:'weak-genre',title:'Weak candidate',category:'movies',score:2,personalized:true,
     facets:{genres:['comedy']}},
   {key:'unknown',title:'Missing genre',category:'movies',score:90,personalized:true,
     facets:{genres:[]}},
   {key:'fallback',title:'Unpersonalized filler',category:'movies',starter:true,
     facets:{genres:['comedy']}}
 ]);
 const balanced=Array.from(engine.balanceShelves({entries:withWeak,category:'movies'}));
 assert.equal(balanced.slice(0,5).filter(item=>item.key.startsWith('a-')).length,5,
   'Never promote very weak, unproven or archive picks for decorative genre mixing');
});

test('Home applies balanced shelf selection after personal filtering and invalidates old cache',()=>{
 const home=read('discover.html');
 assert.match(home,/const qualified=diversifyDiscoverResults/);
 assert.match(home,/const varied=window.AfterlogueRecommendationEngine\.balanceShelves\(/);
 assert.ok(home.indexOf('const varied=window.AfterlogueRecommendationEngine.balanceShelves(',
   home.indexOf('const qualified=diversifyDiscoverResults'))>
   home.indexOf('const expanded=selected.filter(entry=>'));
 assert.match(home,/algorithm:"verified-cinematic-v8"/);
 assert.match(home,/recommendation-engine\.js\?v=17/);
 assert.match(home,/genres:\(item\.genres\|\|\[\]\)\.map\(g=>g\.toLowerCase\(\)\)/);
});

test('Phase 2 profile learns multiple genres and themes from the whole rated Log', () => {
 const build=(key,genre,theme,tone)=>({key,title:key,category:'movies',
   facets:{genres:[genre],themes:[theme],tones:[tone],pace:'slow'},directMatches:[],position:1});
 const works=[
   build('slow-1','drama','connection','intimate'),
   build('slow-2','drama','connection','intimate'),
   build('funny-1','comedy','friendship','funny'),
   build('funny-2','comedy','friendship','funny'),
   build('frantic-1','thriller','crime','intense'),
   build('frantic-2','thriller','crime','intense')
 ];
 const impressions={
   'afterlogue-slow-1':'Loved','afterlogue-slow-2':'Liked',
   'afterlogue-funny-1':'Loved','afterlogue-funny-2':'Liked',
   'afterlogue-frantic-1':'Not for me','afterlogue-frantic-2':'Not for me'
 };
 const profile=engine.buildTasteProfile({entries:works,impressions});
 assert.equal(profile.logSignals,6);
 assert.equal(profile.covered,6);
 const dims=profile.dimensions;
 assert.ok(dims.themes.find(x=>x.tag==='connection').affinity>0);
 assert.ok(dims.tones.find(x=>x.tag==='funny').affinity>0);
 assert.ok(dims.genres.find(x=>x.tag==='thriller').affinity<0);
 assert.ok(engine.tasteMatch(profile,{genres:['comedy'],themes:['friendship'],tones:['funny']}).score>0);
 assert.ok(engine.tasteMatch(profile,{genres:['thriller'],themes:['crime'],tones:['intense']}).score<0);
});

test('Changing a Log opinion changes taste evidence; private notes do not enter scoring', () => {
 const titles=[
   {key:'one',title:'one',facets:{genres:['drama'],themes:['love'],tones:[],pace:null}},
   {key:'two',title:'two',facets:{genres:['comedy'],themes:['friendship'],tones:[],pace:null}}
 ];
 const first=engine.buildTasteProfile({entries:titles,impressions:{one:'Loved',two:'Not for me'}});
 const revised=engine.buildTasteProfile({entries:titles,impressions:{one:'Not for me',two:'Loved'}});
 assert.ok(engine.tasteMatch(first,{genres:['drama'],themes:['love']}).score>0);
 assert.ok(engine.tasteMatch(revised,{genres:['drama'],themes:['love']}).score<0);
 assert.ok(engine.tasteMatch(revised,{genres:['comedy'],themes:['friendship']}).score>0);
 const empty=engine.buildTasteProfile({entries:titles,impressions:{}});
 assert.equal(empty.covered,0);
 assert.equal(engine.tasteMatch(empty,{genres:['drama']}).score,0);
});

test('Phase 2 combines dynamic title genre evidence with recency without erasing old tastes',()=>{
 const base=Date.UTC(2026,9,22),old=Date.UTC(2022,4,10),prior='tmdb-movie-301',fresh='tmdb-movie-302';
 const items=[{
   key:prior,title:'Earlier Adventure',facets:{genres:['adventure'],themes:[],tones:[],pace:null}
 },{
   key:fresh,title:'New Dramatic Interest',facets:{genres:['drama'],themes:[],tones:[],pace:null}
 }];
 const taste=engine.buildTasteProfile({entries:items,now:base,
   impressions:{[prior]:'Loved',[fresh]:'Loved'},
   timestamps:{[prior]:new Date(old).toISOString(),[fresh]:new Date(base).toISOString()}});
 assert.ok(taste.dimensions.genres.find(x=>x.tag==='adventure').affinity>0,
   'Older preferences must remain in the profile');
 assert.ok(taste.dimensions.genres.find(x=>x.tag==='drama').affinity>
   taste.dimensions.genres.find(x=>x.tag==='adventure').affinity,
   'Recent Loved titles should have modest additional influence');
});

test('Phase 2 Home obtains dynamic title evidence without sharing member notes or identities',()=>{
 const backend=read('supabase/functions/afterlogue-catalog/index.ts');
 const home=read('discover.html');
 assert.match(backend,/if\(mode==="taste-features"\)/);
 const block=backend.split('if(mode==="taste-features"){')[1].split('if(mode==="collection"){')[0];
 assert.match(block,/slice\(0,18\)/,'Bound the public batch size');
 assert.doesNotMatch(block,/private_note|user_id|updated_at|impressions/);
 assert.match(home,/const tasteFeaturesPromise=loadTasteFeatures\(featureKeys,items=>/);
 assert.match(home,/tasteFeaturesPromise,candidatePromise/);
 assert.match(home,/const candidatePromise=loadTasteFeatures/);
 assert.match(home,/select\("title_key, rating, updated_at"\)/);
 assert.match(home,/timestamps:impressionDates/);
 assert.match(home,/ratingDates:Object\.entries\(impressionDates\)/);
});

test('Growing Logs rotate older positive titles without discarding recent Loved anchors', () => {
  const sources=Array.from({length:14},(_,i)=>({
    title:'Story '+String(i+1),
    rating:i<11?'Loved':'Liked'
  }));
  const daily=Array.from({length:14},(_,day)=>
    Array.from(engine.selectSeeds({sources,limit:4,rotation:day})));
  daily.forEach(picks=>{
    assert.equal(picks.length,4);
    assert.equal(new Set(picks).size,4);
    assert.deepEqual(picks.slice(0,2),['Story 1','Story 2']);
  });
  assert.notDeepEqual(daily[0].slice(2),daily[1].slice(2));
  assert.equal(new Set(daily.flat()).size,14,
    'Every older title must enter a seed window over time, not disappear behind the first four');
  const revised=engine.selectSeeds({sources:[
    {title:'Freshly logged',rating:'Loved'},...sources
  ],limit:4,rotation:0});
  assert.equal(revised[0],'Freshly logged');
  const duplicates=Array.from(engine.selectSeeds({sources:[
    {title:'Léon',rating:'Loved'},{title:'Leon',rating:'Liked'},
    {title:'A Different Film',rating:'Liked'}
  ],limit:4,rotation:0}));
  assert.equal(duplicates.length,2,'Unicode variants cannot consume multiple seed slots');
});

test('Home snapshot expires when Favorites, Watchlist, Seen or seed rotation changes', () => {
  const html=read('discover.html');
  const fingerprint=html.split('function discoveryFingerprint(){')[1].split('function rememberDiscovery(){')[0];
  for(const key of ['favorites:discoveryFavorites','watchlist:discoveryWatchlist',
      'seen:[...discoverySeen]','seedDay:Math.floor(Date.now()/86400000)']){
    assert.ok(fingerprint.includes(key),'Fingerprint must track '+key);
  }
  assert.match(html,/\.order\("updated_at",\{ascending:false\}\)/,
    'Recent ratings should be preferred when choosing taste anchors');
  assert.match(html,/selectSeeds\(\{/);
  assert.match(html,/rating!=="Not for me"&&rating!=="Okay"/,
    'An obsolete Favorite must not reverse a later neutral or negative reaction');
});

test('With no positive tastes, WHY THIS STORY does not pretend a synopsis is a reason', () => {
  const ranked=engine.rank({entries:entries(),category:'movies',impressions:{}});
  const editorial=ranked.find(x=>x.key==='editorial-old');
  assert.equal(editorial.personalized,false);
  assert.doesNotMatch(editorial.why,/This is just a plot synopsis/);
});

test('A rated film never recommends itself', () => {
  const ranked=engine.rank({entries:entries(),category:'movies',
    impressions:{'afterlogue-tmdb-movie-101':'Liked'}});
  assert.equal(ranked.some(x=>x.key==='tmdb-movie-101'),false);
});

test('Continue must save member impressions before navigating to Home', () => {
  const html=read('log.html');
  const save=html.indexOf('await window.saveFirstImpressions(window.afterlogueSupabase)');
  const handoff=html.indexOf('await window.AfterloguePendingWatchlist?.postLogin(',save);
  const leave=html.indexOf('location.assign(destination||"discover.html")',handoff);
  assert.ok(save!==-1&&handoff>save&&leave>handoff,'Complete onboarding, then pending save, before navigating');
  assert.match(html,/onboarding-sync\.js/);
});

test('Both rotating First Impressions cards and search cards use on-poster ratings', () => {
  const code=read('onboarding-catalog-search.js');
  assert.equal((code.match(/items\.map\(makeCard\)/g)||[]).length,2);
  assert.match(code,/impressions-more-rating-overlay/);
  assert.match(code,/impressions-more-check/);
  assert.doesNotMatch(code,/card\.append\(picture,name,year,buttons\)/);
});

test('Home shows only verified wider-catalog picks, not manually curated filler', () => {
  const html=read('discover.html');
  assert.doesNotMatch(html,/expanded\.slice\(0,3\),\.\.\.editorial\.slice\(0,2\)/);
  assert.match(html,/if\(!entry\.tmdb\|\|!entry\.personalized/);
  assert.match(html,/editorialTitles\.has\(key\)/);
  assert.match(html,/directlyLinked/);
  assert.match(html,/selected\.filter\(entry=>/);
});
test('Authenticated impressions come only from Supabase, not browser-local rating copies', () => {
  const home=read('discover.html');
  const beforeLoad=home.split('const savedImpressions = {}')[1].split('const impressionCount')[0];
  // The guest experience intentionally uses temporary browser storage;
  // signed-in users must fetch their own impressions from Supabase.
  assert.match(beforeLoad,/if\(isGuestMode\)/);
  assert.match(beforeLoad,/for\(let i=0;i<localStorage\.length;i\+\+\)/);
  assert.match(home,/\.from\("impressions"\)/);
  assert.match(home,/\.eq\("user_id", userData\.user\.id\)/);
  assert.match(home,/legacy rating cleanup unavailable/);
  const sync=read('onboarding-sync.js');
  assert.match(sync,/sessionStorage\.setItem|sessionStorage\.removeItem/);
  assert.match(sync,/localStorage\.removeItem/);
  const onboarding=read('log.html');
  assert.match(onboarding,/afterlogueSavedRatings/);
  assert.match(onboarding,/afterlogueImpressionDraftStore/);
  assert.match(onboarding,/window\.localStorage:window\.sessionStorage/);
  assert.match(read('auth-signup.js'),/importGuest=localStorage\.getItem/);
});

test('Explicit production country and original language are saved with member onboarding', () => {
  const sync=read('onboarding-sync.js');
  assert.match(sync,/discovery_country/);
  assert.match(sync,/discovery_language/);
  assert.match(sync,/sessionStorage\.getItem\(countryKey\)/);
  const discovery=read('discover.html');
  assert.match(discovery,/select\("discovery_country,discovery_language"\)/);
  assert.match(discovery,/country:discoveryPreferences\.country\|\|""/);
  assert.match(discovery,/originalLanguage:discoveryPreferences\.originalLanguage\|\|""/);
});

test('A one-medium snapshot restores the visible five and refreshes missing media',()=>{
 const html=read('discover.html');
 assert.match(html,/afterlogue\.discover\.shelf\.v2/);
 assert.match(html,/afterlogue\.discover\.return\.v1/);
 assert.match(html,/compactDiscoveryShelf\(snapshot\.shelves\?\.\[media\]\)/);
 assert.match(html,/discoveryExpandedEntries\.some\(item=>item\.category===media\)/);
 assert.match(html,/await populateExpandedRecommendations\(userData\.user\.id\)/);
});

test('International titles are never collapsed to blank ASCII-only movie identifiers',()=>{
 const backend=read('supabase/functions/afterlogue-catalog/index.ts');
 const home=read('discover.html'),engine=read('recommendation-engine.js');
 assert.match(backend,/replace\(\/\[\^\\p\{L\}\\p\{N\}\]\/gu,""\)/);
 assert.match(home,/replace\(\/\[\^\\p\{L\}\\p\{N\}\]\+\/gu,"-"\)/);
 assert.match(engine,/replace\(\/\[\^\\p\{L\}\\p\{N\}\]\+\/gu,"-"\)/);
 assert.match(home,/if\(entries\.length<5\)\{/);
 assert.match(home,/pageSize:60,sort:"discover",\.\.\.filters/);
});
test('Server verifies BOTH filters on production details, not merely search summaries', () => {
  const source=read('supabase/functions/afterlogue-catalog/index.ts');
  const recommend=source.split('if(mode==="recommend"){')[1].split('if(mode==="detail"){')[0];
  assert.match(recommend,/details\.production_countries/);
  assert.match(recommend,/details\.original_language/);
  assert.match(recommend,/if\(country&&!countries\.includes\(country\)\)continue/);
  assert.match(recommend,/if\(originalLanguage&&language!==originalLanguage\)continue/);
  assert.match(recommend,/filterVerified:true/);
  const home=read('discover.html');
  assert.match(home,/if\(scoped\)\{/);
  assert.match(home,/if\(!entry\.filterVerified\)return false/);
  assert.match(home,/if\(!entry\.tmdb\|\|!entry\.personalized/);
});

test('Explore presents existing moodboard first and full searchable library underneath',()=>{
 const html=read('explore.html'),catalog=read('catalog-browser.js');
 assert.match(html,/id="explore-gallery"/);
 assert.match(html,/id="afterlogue-global-catalog"/);
 assert.ok(html.indexOf('id="explore-gallery"')<html.indexOf('id="afterlogue-global-catalog"'));
 assert.match(html,/id="catalog-search"/);
 assert.doesNotMatch(html,/id="explore-search"/);
 assert.doesNotMatch(html,/explore-global-search\.js/);
 assert.doesNotMatch(html,/id="explore-all-films"/);
 assert.match(html,/catalog-browser\.js\?v=12/);
 assert.match(catalog,/IntersectionObserver/);
 assert.doesNotMatch(catalog,/\$\("catalog-open"\)/);
});
test('Surprise Me is a black wildcard card at the end of the existing rail',()=>{
 const html=read('explore.html');
 assert.match(html,/class="mood-card mood-wildcard"/);
 assert.match(html,/Leave it to chance\./);
 assert.match(html,/id="explore-surprise"/);
 assert.doesNotMatch(html,/id="explore-mystery"/);
 assert.match(html,/\.mood-card:not\(\.mood-wildcard\)/);
 assert.match(html,/pinGallery\.append\(\.\.\.sorted,pinGallery\.querySelector\("\.mood-wildcard"\)\)/);
});
test('Mood refinement offers only Country, Age rating, Decade and Genre',()=>{
 const html=read('explore.html'),script=read('explore-facets.js');
 assert.match(html,/id="explore-refine"/);
 assert.match(html,/Refine your mood/);
 assert.match(script,/const order=\["countries","ratings","decades","genres"\]/);
 assert.doesNotMatch(script,/languages:\[/);
 assert.doesNotMatch(html,/id="explore-format"/);
 assert.doesNotMatch(html,/id="explore-search"/);
 assert.match(html,/state\.stage===0/);
 assert.match(html,/const format=state\.format\|\|"either"/);
});

test('Explore returns one complete mood selection with no repeated Search further loops',()=>{
 const html=read('explore.html'),backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(html,/Promise\.allSettled\(media\.map/);
 assert.match(html,/if\(picks\.length!==desired\)/);
 assert.match(html,/rememberMoodTitles\(scope,picks\)/);
 assert.match(html,/paintMoodPicks\(picks\)/);
 assert.match(html,/Finding stories for your mood/);
 assert.doesNotMatch(html,/Search further ↗/);
 assert.match(backend,/while\(queue\.length&&verified\.length<\(mood==="winding"\?20:16\)\)/);
 assert.match(backend,/mood==="winding"&&pace==="slow"&&media==="movie"\?120:/);
 assert.match(backend,/mood==="winding"\?75:mood==="fall"&&\(countries\.length\|\|languages\.length\)\?120:90/);
});
test('All Films collects up to 70 actual filtered matches using cursor pagination',()=>{
 const client=read('catalog-browser.js');
 const backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(client,/const cursorPaging=filtered&&!simpleMixedSearch\(\)/);
 assert.match(client,/const pageSize=simpleMixedSearch\(\)\?20:filtered\?70:60/);
 assert.match(client,/const types=media==="all"\?\["movie","tv"\]:\[media\]/);
 assert.match(backend,/if\(Number\(input\.pageSize\)===70\)/);
 assert.match(backend,/if\(mode==="discover"&&country\)params\.set\("with_origin_country",country\)/);
 assert.match(backend,/const limit=70,found:/);
 assert.match(backend,/nextCursor=current\+":" \+index/);
 assert.match(backend,/totalPages:null,totalResults:null/);
 assert.match(client,/" · Page "\+page;/);
 assert.doesNotMatch(client,/filtered.*Page .* of "+pages/);
});
test('Filtered page 2 uses the next genuine matching-title cursor, not an unfiltered offset',()=>{
 const client=read('catalog-browser.js'),backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(client,/pageCursors\.set\(page\+1,nextCursor\)/);
 assert.match(client,/hasNext=Boolean\(nextCursor\)/);
 assert.match(client,/pageCursors\.get\(page\)/);
 assert.match(backend,/const rawCursor=typeof input\.cursor/);
 assert.match(backend,/const indexed=/);
 assert.match(backend,/const proof=verified\[j\]/);
});
test('All Films Next and Previous scroll to the top and load a new page',()=>{
 const browser=read('catalog-browser.js');
 assert.match(browser,/function turnPage\(direction\)/);
 assert.match(browser,/panel\.scrollIntoView\(\{block:"start",behavior:"instant"\}\)/);
 assert.doesNotMatch(browser,/window\.scrollTo\(\{top:0,behavior:"instant"\}\)/);
 assert.match(browser,/page=target/);
 assert.match(browser,/load\(\)/);
 assert.match(browser,/catalog-next"\)\.addEventListener\("click",\(\)=>turnPage\(1\)\)/);
});
test('Explore mood clicks work without removed or redundant search controls',()=>{
 const html=read('explore.html');
 assert.doesNotMatch(html,/\$\("explore-all-films-open"\)\.addEventListener/);
 assert.doesNotMatch(html,/searchField\.addEventListener/);
 assert.match(html,/document\.querySelectorAll\("\.mood-open"\)/);
 assert.match(html,/\$\("explore-surprise"\)\.addEventListener/);
 assert.match(html,/const facet=randomPick\?/);
 assert.match(html,/preloadAnotherMoodSelection\(\)/);
});

test('Film Details keeps the editorial heading as a question',()=>{
 const details=read('film-details.html');
 assert.match(details,/Another story, perhaps\?/);
 assert.doesNotMatch(details,/Another story, perhaps\.<\/h2>/);
});


test('Explore keeps the restrained moodboard layout and improves caption readability',()=>{
 const html=read('explore.html');
 assert.match(html,/A story for whatever you're feeling\.<\/p>/);
 assert.doesNotMatch(html,/Follow a mood, or search for something specific/);
 assert.match(html,/\.explore-body \.explore-gallery \.mood-bottom\{/);
 assert.match(html,/font-size:clamp\(11px,\.9vw,12\.5px\)!important/);
});
test('Discover is the default, with conventional sort choices still available',()=>{
 const html=read('explore.html'),client=read('catalog-browser.js');
 assert.match(html,/<option value="discover" selected>Discover<\/option>/);
 for(const sort of ['popular','newest','oldest'])assert.match(html,new RegExp('<option value="'+sort+'">'));
 assert.match(client,/sort="discover"/);
 assert.match(client,/afterlogue\.explore\.all-films\.v2/);
 assert.match(client,/const filtered=hasActiveFilters\(\)/);
 assert.match(client,/if\(filtered&&sort==="discover"\)/);
});
test('Discover draws from balanced decades, international cinema and under-seen work, not a popularity list',()=>{
 const code=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(code,/String\(input\.sort\)==="discover"/);
 for(const lane of ['archive','eighties-and-nineties','noughties','twenty-tens','recent','europe','asia-world','documentaries','animation','underseen']){
   assert.ok(code.includes('id:"'+lane+'"'),lane+' stream is missing');
 }
 assert.match(code,/with_original_language/);
 assert.match(code,/vote_count\.lte/);
 assert.match(code,/const mixed:Record<string,unknown>\[\]=\[\],used=new Set<number>\(\)/);
 assert.match(code,/if\(!item\|\|!Number\.isInteger\(id\)\|\|used\.has\(id\)\|\|mixed\.length>=60\)return/);
 assert.match(code,/eligible\(v,media,45\)/);
 assert.match(code,/selection:"discover"/);
});
test('All Films does not invent a capped total or block Next without its provider signal',()=>{
 const html=read('explore.html'),browser=read('catalog-browser.js');
 const backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(html,/catalog-browser\.js\?v=12/);
 assert.match(browser,/hasNext=results\.some\(response=>response\.hasMore===true\)/);
 assert.match(browser,/" · Page "\+page;/);
 assert.doesNotMatch(browser,/" of "\+pages/);
 assert.match(backend,/totalPages:null,totalResults:null/);
 assert.match(backend,/hasMore:page<100&&lanesReady\.some/);
});


test('Discover opening dozen mixes Curzon distribution with A24, NEON, Focus, LAIKA, Blumhouse and Skellington',()=>{
 const src=read('supabase/functions/afterlogue-catalog/index.ts');
 const start=src.indexOf('const EDITORIAL_FILMS:EditorialAnchor[]=[');
 const end=src.indexOf('];',start);
 assert.ok(start>0&&end>start);
 const films=src.slice(start,end).match(/\{title:"([^"]+)",year:(\d+),label:"([^"]+)",relation:"([^"]+)"\}/g)||[];
 assert.ok(films.length>=22,'A broad label-backed list should extend past page 1');
 const first=films.slice(0,12).join(' ');
 assert.ok((first.match(/label:"Curzon Film"/g)||[]).length>=3,'Curzon should have multiple opening slots');
 for(const label of ['A24','NEON','Focus Features','LAIKA','Blumhouse','Skellington Productions']){
   assert.ok(first.includes('label:"'+label+'"'),'Opening lineup lacks '+label);
 }
 assert.ok(src.includes('label:"Triumph Films / Sony"'),'Include legacy Triumph distributed releases');
 assert.ok(src.includes('relation:"distributed"'),'Distribution is distinct from production');
 assert.match(src,/eligible\(item,media,30\)/);
 assert.match(src,/yearOf\(media==="movie"\?item\.release_date:item\.first_air_date\)===anchor\.year/);
});
test('Discover supports A24 television and international/BBC/European television without inventing studio credits',()=>{
 const src=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(src,/const EDITORIAL_TELEVISION:EditorialAnchor\[\]=\[/);
 for(const title of ['Beef','Fleabag','Pachinko','My Brilliant Friend','Ramy','Normal People','The Bureau','I May Destroy You']){
   assert.ok(src.includes('title:"'+title+'"'),title+' missing from editorial television');
 }
 assert.match(src,/label:"A24 Television"/);
 assert.match(src,/media==="movie"\?EDITORIAL_FILMS:EDITORIAL_TELEVISION/);
});
test('Studio film anchors load concurrently with worldwide and decade discovery lanes',()=>{
 const src=read('supabase/functions/afterlogue-catalog/index.ts');
 const a=src.indexOf('const anchorJob=Promise.allSettled');
 const b=src.indexOf('const searched=await Promise.allSettled');
 const c=src.indexOf('const anchorMatches=await anchorJob');
 assert.ok(a>0&&b>a&&c>b,'Editorial seeds should be prefetched while the wider catalog loads');
 assert.match(src,/editorial\.forEach\(append\)/);
 assert.match(src,/for\(const lane of lanesReady\)append\(lane\.entries\[i\]\)/);
 assert.match(src,/const mixed:Record<string,unknown>\[\]=\[\],used=new Set<number>\(\)/);
 assert.match(src,/mixed\.length<60/);
});

test('One editorial Featured Collections gallery precedes one continuous poster wall',()=>{
 const html=read('explore.html');
 const mood=html.indexOf('id="explore-gallery"'),featured=html.indexOf('class="afterlogue-featured"');
 const archive=html.indexOf('id="catalog-grid"');
 assert.ok(mood>0&&featured>mood&&archive>featured);
 assert.equal((html.match(/class="afterlogue-featured-rail"/g)||[]).length,1);
 assert.equal((html.match(/id="catalog-grid"/g)||[]).length,1);
 assert.doesNotMatch(html,/RECENTLY ADDED|ICONIC WATCHES/);
 assert.match(html,/grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/);
 assert.match(html,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('Curated collection cards open actual titles within the same poster wall',()=>{
 const html=read('explore.html'),client=read('catalog-browser.js');
 for(const id of ['modern-classics','around-the-world','love-in-all-forms','animation-discoveries']){
  assert.match(html,new RegExp('data-collection="'+id+'"'));
  assert.match(client,new RegExp('"'+id+'":"'));
 }
 assert.match(client,/request\(\{mode:"collection",collection:activeCollection\}\)/);
 assert.match(client,/render\(result.items\|\|\[\]\)/);
 assert.match(client,/activeCollection=null/);
 assert.match(client,/clearCollectionButton\?\.addEventListener\("click"/);
 assert.match(html,/id="catalog-collection-clear"/);
});
test('Curated collections resolve verifiable TMDB titles and do not pretend genre tags are editorial selection',()=>{
 const server=read('supabase/functions/afterlogue-catalog/index.ts');
 for(const id of ['modern-classics','around-the-world','love-in-all-forms','animation-discoveries'])
  assert.ok(server.includes('"'+id+'":['),id+' missing');
 assert.match(server,/if\(mode==="collection"\)/);
 assert.match(server,/normalized\(item.title\)===normalized\(title.title\)/);
 assert.match(server,/yearOf\(item.release_date\)===title.year/);
 assert.match(server,/collection:key,items:found\.slice\(0,16\)\.map/);
 assert.match(server,/hasMore:false/);
});
test('Archive browsing and filters still use original source-based 60/70-title paging',()=>{
 const client=read('catalog-browser.js');
 assert.match(client,/const pageSize=simpleMixedSearch\(\)\?20:filtered\?70:60/);
 assert.match(client,/const cursor=cursorPaging/);
 assert.match(client,/panel.scrollIntoView\(\{block:"start",behavior:"instant"\}\)/);
 assert.match(client,/const stateKey="afterlogue.explore.all-films.v2"/);
 assert.match(client,/collection:activeCollection,cursors:/);
 assert.match(client,/if\(activeCollection\)return;/);
});

test('All four featured collections offer distinct films with no cross-collection repetition',()=>{
 const server=read('supabase/functions/afterlogue-catalog/index.ts');
 const start=server.indexOf('const EDITORIAL_COLLECTIONS:Record<string,CollectionTitle[]>={');
 const end=server.indexOf('\n};',start);
 assert.ok(start>0&&end>start,'Curated selection source must exist');
 const listings=server.slice(start,end);
 const ids=['modern-classics','around-the-world','love-in-all-forms','animation-discoveries'];
 const seen=new Map();
 for(const id of ids){
   const section=listings.match(new RegExp('"'+id+'":\\[([\\s\\S]*?)\\n \\]'));
   assert.ok(section,id+' collection must exist');
   const films=[...section[1].matchAll(/\{title:"([^"]+)",year:(\d+)\}/g)];
   assert.equal(films.length,18,id+' must contain 18 distinct curated candidates');
   for(const film of films){
     const normalized=film[1].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
     const key=normalized+':'+film[2];
     assert.ok(!seen.has(key),film[1]+' repeats in '+seen.get(key)+' and '+id);
     seen.set(key,id);
   }
 }
 assert.equal(seen.size,72,'Four collections should have 18 distinct eligible candidates, displaying up to 16 each');
});

test('First Impressions now displays up to 18 films and 18 TV series with filters and a search',()=>{
 const client=read('onboarding-catalog-search.js');
 const server=read('supabase/functions/afterlogue-catalog/index.ts');
 const html=read('log.html');
 assert.match(client,/items=\(payload.items\|\|\[\]\)\.filter\(item=>item.poster\)\.slice\(0,18\)/);
 assert.match(server,/const shortlist=balanced\.slice\(0,28\)/);
 assert.match(server,/items:verified\.slice\(0,18\)/);
 assert.match(html,/onboarding-catalog-search\.js\?v=10/);
 assert.match(client,/first-refresh/);
 assert.match(client,/impressions-search/);
});
test('Positive movie signals can seed TV and positive TV signals can seed films',()=>{
 const server=read('supabase/functions/afterlogue-catalog/index.ts');
 const home=read('discover.html');
 assert.match(server,/sourceMedia:Media=input.sourceMedia/);
 assert.match(server,/if\(sourceMedia!==media\)/);
 assert.match(server,/genreBridge:Record<string,number\[\]>/);
 assert.match(server,/matchMethod:"shared_genre"/);
 assert.match(server,/if\(country&&!nations\.includes\(country\)\)return null/);
 assert.match(server,/if\(originalLanguage&&language!==originalLanguage\)return null/);
 assert.match(home,/sourceMedia:otherCategory==="tv"\?"tv":"movie"/);
 assert.match(home,/plans\.push\(\{kind:"direct"/);
 assert.match(home,/plans\.push\(\{kind:"bridge"/);
 assert.match(home,/matchMethod==="shared_genre"/);
 assert.doesNotMatch(home,/No new films or shows from the wider catalog meet your current taste signals yet/);
});
test('No-signal guest shelves offer a labeled opening selection rather than false personal reasons',()=>{
 const home=read('discover.html');
 assert.match(home,/if\(!hasPositive\)\{/);
 assert.match(home,/x\.starter/);
 assert.match(home,/mode:"discover",media,page:1/);
 assert.match(home,/An opening selection from Afterlogue's cinema archive/);
 assert.match(home,/An opening selection\. Rate a few titles to make it yours/);
});
test('Cross-medium linked TV can rank from positively rated movie without reusing that movie',()=>{
 const input=[
  {key:'source-movie',title:'My Favourite Film',category:'movies',position:10,facets:facets(),directMatches:[]},
  {key:'tmdb-tv-208',title:'A Related Series',category:'tv',position:600,facets:facets(),directMatches:['my-favourite-film']}
 ];
 const selected=engine.rank({entries:input,category:'tv',impressions:{'afterlogue-source-movie':'Loved'}});
 assert.equal(selected[0].key,'tmdb-tv-208');
 assert.equal(selected[0].personalized,true);
 assert.match(selected[0].why,/Because you loved My Favourite Film/);
});

test('First Impressions instructions are readable and ratings are saved as watched',()=>{
 const html=read('log.html'),sync=read('onboarding-sync.js');
 assert.match(html,/font-size:16px;line-height:1\.55/);
 assert.match(html,/Start with films you know\./);
 assert.match(html,/id="impressions-step-next"/);
 assert.match(html,/id="impressions-rating-count"/);
 assert.match(html,/id="television"[^>]*hidden/);
 assert.match(html,/onboarding-guidance\.js\?v=3/);
 assert.match(html,/onboarding\.category/);
 assert.match(html,/onboarding-sync\.js\?v=7/);
 assert.match(sync,/\.from\("seen_entries"\)/);
 assert.match(sync,/\.upsert\(watched,\{onConflict:"user_id,title_key"\}\)/);
 assert.match(sync,/const watched=impressions\.map/);
 assert.match(sync,/onboarding\.category\./);
});
test('OAuth buttons actually initiate sign-in and support verified callback routing',()=>{
 const html=read('signup.html'),code=read('auth-signup.js');
 assert.match(html,/id="google-signin"/);
 assert.match(html,/id="apple-signin"/);
 assert.match(html,/id="signup-resend"/);
 assert.match(code,/signInWithOAuth/);
 assert.match(code,/provider,options:\{redirectTo:callbackUrl\}/);
 assert.match(code,/auth\.resend/);
 assert.match(code,/profile check unavailable|Profile check unavailable/);
 assert.match(code,/\/auth\/v1\/settings/);
});
test('Discover does not cycle back to the first five or let sequels and holiday titles dominate',()=>{
 const code=read('discover.html');
 assert.match(code,/const discoveryFranchise=item=>/);
 assert.match(read('recommendation-engine.js'),/"the hunger games"/);
 assert.match(code,/franchises\.has\(franchise\)/);
 assert.match(code,/isSeasonalDiscovery/);
 assert.match(code,/holidayCount>=1/);
 assert.doesNotMatch(code,/if \(getDiscoveryRecommendations\(category, nextPage\)\.length === 0\) \{\s*nextPage = 0;/);
});
test('Recommendations survive a film-details visit and keep guest routing and account isolation',()=>{
 const home=read('discover.html'),details=read('film-details.js');
 assert.match(home,/discoveryCacheKey="afterlogue\.discover\.shelf\.v2"/);
 assert.match(home,/sessionStorage\.setItem\(discoveryCacheKey/);
 assert.match(home,/snapshot\.owner!==owner/);
 assert.match(home,/snapshot\.fingerprint!==discoveryFingerprint\(\)/);
 assert.match(home,/if\(restoreDiscovery\("guest"\)\)/);
 assert.match(home,/if\(restoreDiscovery\(userData\.user\.id\)\)/);
 assert.match(home,/&guest=1/);
 assert.match(details,/origin==="discover"&&params\.get\("guest"\)==="1"/);
});
test('All Films lets members save immediately, without needing to open details',()=>{
 const code=read('catalog-browser.js'),html=read('explore.html');
 assert.match(code,/className="catalog-save"/);
 assert.match(code,/\.from\("watchlist"\)\.insert/);
 assert.match(code,/AfterlogueCatalogMetadata/);
 assert.match(code,/catalogWatchlist\.add\(watchKey\)/);
 assert.match(html,/catalog-browser\.js\?v=12/);
});
test('Film Details heart writes to the existing private Favorites table and artwork stays stable',()=>{
 const html=read('film-details.html'),code=read('film-details.js');
 assert.match(html,/id="film-favorite"/);
 assert.match(code,/favoriteButton\.addEventListener\("click"/);
 assert.match(code,/\.from\("log_entries"\)\.upsert/);
 assert.match(code,/Never replace artwork asynchronously after the first paint/);
 assert.doesNotMatch(code,/preview\.onload=\(\)=>\{hero\.src=url/);
 assert.match(html,/rel="preconnect" href="https:\/\/www\.youtube-nocookie\.com"/);
 assert.match(code,/trailerTimer=setTimeout/);
});
test('A weak recommendation result uses honestly labeled archive discoveries rather than erasing the shelf',()=>{
 const code=read('discover.html');
 assert.match(code,/An archive discovery that fits your selected catalog preferences, not a direct match to your rated titles/);
 assert.match(code,/diversifyDiscoverResults\(\[\.\.\.expanded,\.\.\.extras\],category\)/);
 assert.match(code,/priorCards&&container\.dataset\.category===category/);
});

test('Email confirmation requires a deliberate click before consuming the single-use token',()=>{
 const html=read('confirm.html');
 assert.match(html,/id="confirm-submit"/);
 assert.match(html,/token_hash/);
 assert.match(html,/verifyOtp\(/);
 assert.match(html,/type:"email"/);
 assert.match(html,/history\.replaceState/);
 assert.match(html,/content="no-referrer"/);
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script,'Confirmation flow must be implemented in the standalone page');
 assert.ok(script[1].indexOf('button.addEventListener("click"')>=0);
 assert.ok(script[1].indexOf('verifyOtp(')>script[1].indexOf('button.addEventListener("click"'),
   'Verification may never run automatically when an email scanner fetches the page');
});

test('Fall TV has reviewed source candidates with normal verification',()=>{
 const code=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(code,/const FALL_TV_ATMOSPHERE:Record/);
 assert.match(code,/"Over the Garden Wall"/);
 assert.match(code,/"Gilmore Girls"/);
 assert.match(code,/const allFallTitles=mood==="fall"/);
 assert.match(code,/const seasonalTitles=\[\.\.\.new Set\(\[\.\.\.regionFirst/);
 assert.match(code,/const FALL_PACE_HINTS:Record/);
 assert.match(code,/const ids=mood==="fall"\|\|mood==="winding"\?\[\]:await moodKeywordIds\(mood,token\)/);
 assert.match(code,/\?6:Math\.min\(6/);
 assert.match(code,/if\(experience\.score<5\)return/);
});
test('Discover Again excludes previously seen shelves and offers Not for me',()=>{
 const home=read('discover.html');
 assert.match(home,/discoveryHistory=\{movies:new Set\(\),tv:new Set\(\)\}/);
 assert.match(home,/const candidates=freshDiscovery\(category\)/);
 assert.match(home,/if\(candidates\.length<5\)/);
 assert.match(home,/className="discovery-not-interested"/);
 assert.match(home,/discoveryDismissed\.add\(/);
});
test('Guest catalog Save remembers the exact title before authentication',()=>{
 const browser=read('catalog-browser.js'),helper=read('pending-watchlist.js');
 const explore=read('explore.html');
 assert.match(browser,/AfterloguePendingWatchlist\?\.remember/);
 assert.match(browser,/from=all-films/);
 assert.match(explore,/pending-watchlist\.js\?v=1/);
 assert.match(helper,/client\.from\('watchlist'\)\.insert/);
 assert.match(helper,/watchlist_saved=1/);
});
test('Watchlist reminder does not wait for three slow TMDB lookups',()=>{
 const code=read('home-watchlist-reminder.js');
 const begin=code.indexOf('async function showThree(){'),end=code.indexOf('async function loadWatchlist()',begin);
 const section=code.slice(begin,end);
 assert.ok(section.indexOf('grid.replaceChildren(...chosen.map(createCard))')>=0);
 assert.ok(section.indexOf('grid.replaceChildren(...chosen.map(createCard))')<section.indexOf('await recoverPoster(story)'));
 assert.doesNotMatch(section,/await Promise\.allSettled\(chosen\.map\(recoverPoster\)\)/);
});

test('Discover Again updates the page number from live state without a stale variable',()=>{
 const home=read('discover.html');
 assert.match(home,/String\(discoveryPages\[category\] \+ 1\)\.padStart\(3, "0"\)/);
 assert.doesNotMatch(home,/String\(nextPage \+ 1\)\.padStart/);
});

test('Legacy Yearning TV recommendations refresh without deleting unrelated mood histories',()=>{
 const page=read('explore.html');
 assert.match(page,/snap\.mood==="yearning"&&snap\.format==="tv"/);
 assert.match(page,/snap\.moodAlgorithm!=="global-yearning-tv-2"/);
 assert.match(page,/items:five\.slice\(0,5\),savedAt:Date\.now\(\)/);
 assert.match(page,/const moodHistoryKey="afterlogue\.explore\.seen-mood-titles\.v3"/);
});


test('Many newly logged animations do not erase earlier observational and indie cinema',()=>{
 const now=Date.UTC(2026,9,22);
 const older=Array.from({length:6},(_,i)=>({
   key:'indie-'+i,title:'Observational cinema '+i,category:'movies',
   facets:{genres:['drama'],themes:['everyday-life'],tones:['reflective'],pace:'slow'},
   directMatches:[],position:i
 }));
 const newer=Array.from({length:13},(_,i)=>({
   key:'animation-'+i,title:'Animated discovery '+i,category:'movies',
   facets:{genres:['animation','family'],themes:['friendship'],tones:['playful'],pace:'medium'},
   directMatches:[],position:100+i
 }));
 const sources=[...older,...newer];
 const timestamps=Object.fromEntries(sources.map((item,i)=>[
  item.key,new Date(now-(i<older.length?240+i*22:2+i-older.length)*86400000).toISOString()
 ]));
 const impressions=Object.fromEntries(sources.map(item=>[item.key,'Loved']));
 const profile=engine.buildTasteProfile({entries:sources,impressions,timestamps,now});
 const genre=name=>profile.dimensions.genres.find(x=>x.tag===name)?.affinity||0;
 assert.ok(genre('drama')>genre('animation')*.6,
   'An older long-standing drama preference must remain meaningful');
 const seeds=engine.selectSeeds({sources:[...newer,...older].map(item=>({
  title:item.title,rating:'Loved',timestamp:timestamps[item.key],facets:item.facets
 })),limit:4,rotation:5,category:'movies'});
 assert.equal(seeds.length,4);
 assert.ok(seeds.some(name=>name.startsWith('Observational cinema')),
   'A dated Log must retrieve candidates related to earlier tastes');
 assert.ok(seeds.some(name=>name.startsWith('Animated discovery')),
   'A dated Log must still acknowledge recent tastes');
 assert.ok(seeds.filter(name=>name.startsWith('Animated discovery')).length<=2,
   'Four retrieval sources must not all be animated when the wider Log is mixed');
 const choices=[
  ...Array.from({length:8},(_,i)=>({
   key:'next-cartoon-'+i,title:'Another animated pick '+i,category:'movies',
   facets:{genres:['animation','family'],themes:['friendship'],tones:['playful'],pace:'medium'},
   directMatches:[],position:800+i,tmdb:{id:2000+i,media:'movie'}
  })),
  ...Array.from({length:5},(_,i)=>({
   key:'next-indie-'+i,title:'Another contemplative discovery '+i,category:'movies',
   facets:{genres:['drama'],themes:['everyday-life'],tones:['reflective'],pace:'slow'},
   directMatches:[],position:900+i,tmdb:{id:3000+i,media:'movie'}
  }))
 ];
 const ranked=engine.rank({entries:[...sources,...choices],category:'movies',
   impressions,timestamps});
 const pool=ranked.filter(item=>item.key.startsWith('next-')&&item.score>0);
 const shown=engine.balanceShelves({entries:pool,profileEntries:sources,
   impressions,category:'movies'}).slice(0,5);
 assert.equal(shown.length,5);
 assert.ok(shown.filter(item=>item.key.startsWith('next-indie-')).length>=2,
   'Mixed Logs should still surface earlier reflective tastes');
 assert.ok(shown.filter(item=>item.key.startsWith('next-cartoon-')).length<=2,
   'Recent algorithm-suggested animations must not monopolize the next five');
});

test('Strong long-term animation enthusiasts remain eligible for animated shelves',()=>{
 const now=Date.UTC(2026,9,22);
 const sources=Array.from({length:12},(_,i)=>({
  title:'Loved animation '+i,rating:'Loved',timestamp:new Date(now-i*60*86400000).toISOString(),
  facets:{genres:['animation'],themes:['friendship']}
 }));
 const picks=engine.selectSeeds({sources,limit:4,category:'movies',rotation:4});
 assert.equal(picks.length,4);
 assert.ok(picks.every(name=>name.startsWith('Loved animation ')),
   'Balancing decades must not ban animation for animation enthusiasts');
});

test('Home uses dated Log sources without storing additional private fields',()=>{
 const page=read('discover.html'),logic=read('recommendation-engine.js');
 assert.match(page,/timestamp:impressionDates\[x\.key\]\|\|null/);
 assert.match(page,/algorithm:"verified-cinematic-v8"/);
 assert.match(logic,/const fractions=\[0,\.5,\.25,\.75,\.125,\.625,\.375,\.875\]/);
 assert.match(logic,/const byLane=new Map\(\),byFranchise=new Set\(\),strong=\[\]/);
});

test('Screenshot regression: Monster High and Halloweentown sequels do not monopolize Home',()=>{
 const item=(key,title,genres,score)=>({
  key,title,score,category:'movies',facets:{genres,themes:[],tones:[],pace:null},
  personalized:true,matchMethod:'tmdb_related'
 });
 const pool=[
  item('mh-fright','Monster High: Fright On!',['animation','family','fantasy'],86),
  item('mh-haunted','Monster High: Haunted',['animation','family','fantasy'],85),
  item('cauldron','The Black Cauldron',['animation','family','fantasy'],83),
  item('canterville','The Canterville Ghost',['family','fantasy','comedy'],82),
  item('halloweentown-ii','Halloweentown II: Kalabar\'s Revenge',['family','fantasy'],81),
  item('halloweentown-high','Halloweentown High',['family','fantasy'],80),
  item('descendants','Descendants: The Rise of Red',['family','fantasy','music'],79),
  item('charlies-angels','Charlie\'s Angels',['action','comedy'],75),
  item('king','The Kid Who Would Be King',['family','fantasy','adventure'],74),
  item('indie-one','An Observational Drama',['drama'],70),
  item('indie-two','An Independent Character Study',['drama'],65),
  item('indie-three','A Quiet Relationship Film',['romance','drama'],63),
  item('indie-four','An Intimate Documentary',['documentary'],59)
 ];
 const diary=[
  ...Array.from({length:7},(_,i)=>item('hp-'+i,
    'Harry Potter and chapter '+(i+1),['family','fantasy','adventure'],0)),
  ...Array.from({length:6},(_,i)=>item('realist-'+i,
    'Earlier Observational Film '+i,['drama'],0))
 ];
 const impressions=Object.fromEntries(diary.map(x=>[x.key,'Loved']));
 const varied=engine.balanceShelves({entries:pool,profileEntries:diary,impressions});
 const first=varied.slice(0,5);
 assert.equal(first.length,5);
 assert.ok(first.filter(engine.familyAudience).length<=2,
   'A member with a broad Log must not receive four family-fantasy films');
 assert.ok(first.some(x=>x.key.startsWith('indie-')),
   'A strong independent cinema fit should survive theatrical franchise overload');
 assert.ok(first.filter(x=>engine.obviousFollowup(x)).length<=1,
   'Do not suggest multiple sequels to a mixed-taste member in the same five');
 const groups=first.map(engine.franchiseKey);
 assert.equal(groups.length,new Set(groups).size,
   'Each of the five should represent a distinct story / franchise');
 assert.equal(engine.franchiseKey(pool[0]),engine.franchiseKey(pool[1]));
 assert.equal(engine.franchiseKey(pool[4]),engine.franchiseKey(pool[5]));
});

test('Harry Potter ratings are one franchise signal for mixed indie-cinema discovery seeds',()=>{
 const now=Date.UTC(2026,9,22);
 const source=(title,genres,i)=>({title,rating:'Loved',facets:{genres},
   timestamp:new Date(now-(i<7?i:110+i)*86400000).toISOString()});
 const entries=[
   ...Array.from({length:7},(_,i)=>source('Harry Potter and the story '+i,
     ['family','fantasy','adventure'],i)),
   ...Array.from({length:6},(_,i)=>source('Independent film '+i,['drama'],7+i))
 ];
 const picks=engine.selectSeeds({sources:entries,category:'movies',limit:4,rotation:4});
 assert.equal(picks.length,4);
 assert.ok(picks.filter(title=>title.startsWith('Harry Potter')).length<=1,
   'A seven-movie franchise should not consume the majority of retrieval seeds');
 assert.ok(picks.filter(title=>title.startsWith('Independent film')).length>=2,
   'Earlier independent films should contribute sources to fresh discovery');
 const profileItems=entries.map((v,i)=>({
   ...v,key:'source-'+i,category:'movies',facets:{...v.facets,themes:[],tones:[],pace:null}
 }));
 const impressions=Object.fromEntries(profileItems.map(v=>[v.key,'Loved']));
 const profile=engine.buildTasteProfile({entries:profileItems,impressions,
   timestamps:Object.fromEntries(profileItems.map(v=>[v.key,v.timestamp])),now});
 const drama=profile.dimensions.genres.find(g=>g.tag==='drama').affinity;
 const fantasy=profile.dimensions.genres.find(g=>g.tag==='fantasy').affinity;
 assert.ok(drama>fantasy*.65,
   'Repeated entries in the same franchise should not erase a separate taste');
});

test('Legitimate animation/family fans remain free to receive multiple films they love',()=>{
 const source=Array.from({length:9},(_,i)=>({
   key:'kids-'+i,title:'Loved kids film '+i,category:'movies',
   facets:{genres:['family','animation']},score:90-i
 }));
 const picks=engine.balanceShelves({
   entries:Array.from({length:8},(_,i)=>({...source[i],key:'candidate-'+i})),
   profileEntries:source,impressions:Object.fromEntries(source.map(x=>[x.key,'Loved']))
 });
 assert.equal(picks.slice(0,5).filter(engine.familyAudience).length,5,
   'Family-film enthusiasts should not have their preferences overridden');
});

test('Home uses shared franchise grouping before ranking and stores known-series history',()=>{
 const home=read('discover.html'),engineSource=read('recommendation-engine.js');
 assert.match(home,/const discoveryFranchise=item=>/);
 assert.match(home,/discoverySeriesHistory\.movies\.has\(discoverySeriesKey\(item\)\)/);
 assert.match(home,/seriesHistory:\{movies:\[/);
 assert.match(home,/verified-cinematic-v8/);
 assert.match(home,/recommendation-engine\.js\?v=17/);
 assert.match(engineSource,/const group=franchiseKey\(byKey\.get\(key\)\)/);
});


test('Watchlist curiosity stays weaker than watched-and-loved evidence',()=>{
 const record=(key,genres,themes=[])=>({
   key,title:key,category:'movies',facets:{genres,themes,tones:[],pace:null},
   position:0,directMatches:[]
 });
 const titles=[
   record('watched-dramatic',['drama'],['connection']),
   record('future-fantasy',['fantasy'],['adventure']),
   record('drama-match',['drama'],['connection']),
   record('fantasy-match',['fantasy'],['adventure'])
 ];
 const impressions={'watched-dramatic':'Loved'};
 const withInterest=engine.buildTasteProfile({entries:titles,impressions,
   watchlist:[{title_key:'future-fantasy'}]});
 const without=engine.buildTasteProfile({entries:titles,impressions});
 assert.equal(withInterest.logSignals,1);
 assert.equal(withInterest.interestSignals,1);
 assert.equal(withInterest.interestCovered,1);
 assert.equal(without.interestSignals,0);
 assert.ok(engine.tasteMatch(withInterest,{genres:['drama']}).score>0);
 assert.equal(engine.tasteMatch(withInterest,{genres:['fantasy']}).score,0,
   'Watchlist curiosity must not rewrite established taste');
 const ranked=Array.from(engine.rank({entries:titles,category:'movies',
   impressions,watchlist:[{title_key:'future-fantasy'}]}));
 assert.equal(ranked.some(x=>x.key==='future-fantasy'),false);
 assert.equal(ranked[0].key,'drama-match',
   'A Loved reference remains stronger than a weak Watchlist association');
 assert.ok(ranked.find(x=>x.key==='fantasy-match').score>0,
   'Watchlist interest should still lift genuinely related films');
});

test('Watchlist-only similarity has a truthful reason and skips seen titles',()=>{
 const known={key:'tmdb-movie-10',title:'A Film Saved for Later',category:'movies',
   facets:{genres:['drama'],themes:['connection'],tones:[],pace:null},
   directMatches:[],position:0};
 const related={key:'tmdb-movie-20',title:'An Interesting Discovery',category:'movies',
   facets:{genres:['drama'],themes:['connection'],tones:[],pace:null},
   directMatches:['a-film-saved-for-later'],position:1};
 const excluded={...related,key:'tmdb-movie-30',title:'Already Watched',position:2};
 const ranked=Array.from(engine.rank({entries:[known,related,excluded],category:'movies',
   watchlist:[{title_key:'tmdb-movie-10'}],seen:['tmdb-movie-30']}));
 assert.equal(ranked.length,1);
 assert.equal(ranked[0].key,'tmdb-movie-20');
 assert.equal(ranked[0].personalized,true);
 assert.match(ranked[0].why,/^Because you saved A Film Saved for Later to your Watchlist,/);
 assert.doesNotMatch(ranked[0].why,/because you liked/i);
});

test('Watchlisted negative impression never becomes positive taste evidence',()=>{
 const titles=[
  {key:'bad',title:'Bad Experience',category:'movies',
   facets:{genres:['horror'],themes:[],tones:[],pace:null},position:1,directMatches:[]},
  {key:'more',title:'More Horror',category:'movies',
   facets:{genres:['horror'],themes:[],tones:[],pace:null},position:2,directMatches:[]}
 ];
 const p=engine.buildTasteProfile({entries:titles,impressions:{bad:'Not for me'},
   watchlist:[{title_key:'bad'}]});
 assert.equal(p.interestSignals,0);
 assert.ok(engine.tasteMatch(p,{genres:['horror']}).score<0);
 const results=Array.from(engine.rank({entries:titles,category:'movies',
   impressions:{bad:'Not for me'},watchlist:[{title_key:'bad'}]}));
 assert.equal(results.length,1);
 assert.ok(results[0].score<0);
});

test('Home loads saved title metadata and retrieves candidates from Watchlist anchors',()=>{
 const home=read('discover.html');
 assert.match(home,/watchlistKeys=new Set\(discoveryWatchlist/);
 assert.match(home,/watchlistKeys:\[\.\.\.watchlistKeys\]/);
 assert.match(home,/const watchlistSources=/);
 assert.match(home,/kind:"watchlist"/);
 assert.match(home,/match\.signal\.watchlist/);
 assert.match(home,/verified-cinematic-v8/);
 assert.match(home,/recommendation-engine\.js\?v=17/);
});

test('Two saved sequels do not count as two independent established preferences',()=>{
 const mk=(key,title,genre)=>({key,title,category:'movies',
   facets:{genres:[genre],themes:[],tones:[],pace:null},directMatches:[]});
 const entries=[
  mk('p1','Harry Potter and the Chamber of Secrets','fantasy'),
  mk('p2','Harry Potter and the Goblet of Fire','fantasy'),
  mk('indie','Quiet Independent Film','drama')
 ];
 const p=engine.buildTasteProfile({entries,impressions:{indie:'Loved'},
   watchlist:[{title_key:'p1'},{title_key:'p2'}]});
 assert.equal(p.interestSignals,2);
 assert.ok(p.interestDimensions.genres.find(x=>x.tag==='fantasy').affinity>0);
 assert.equal(engine.tasteMatch(p,{genres:['fantasy']}).score,0);
 assert.ok(engine.tasteMatch(p,{genres:['drama']}).score>0);
});


test('117 films rated within days still draw from distinct historical sections, not latest fantasy',()=>{
 const now=Date.UTC(2026,9,22);
 const liked=[];
 for(let i=0;i<117;i++){
   const recentFamily=i<20;
   const genre=recentFamily?['family','fantasy','adventure']:
     i<53?['drama']:i<82?['comedy']:['documentary'];
   liked.push({
     title:recentFamily?'Harry Potter and the Story '+(i+1):'Independent title '+i,
     rating:i<35?'Loved':'Liked',facets:{genres:genre},
     timestamp:new Date(now-Math.floor(i/20)*86400000).toISOString()
   });
 }
 const cohort=Array.from(engine.selectSeeds({sources:liked,limit:8,rotation:4,category:'movies'}));
 assert.equal(cohort.length,8);
 assert.equal(new Set(cohort).size,8);
 assert.ok(cohort.slice(0,4).some(x=>x.startsWith('Independent title ')),
   'First source request must cover independent historical titles');
 assert.ok(cohort.slice(4).some(x=>x.startsWith('Independent title ')),
   'Second source request must cover independent historical titles');
 assert.ok(cohort.filter(x=>x.startsWith('Harry Potter')).length<=1,
   'A twenty-film series is one independent source, not twenty');
 const historical=cohort.filter(x=>x.startsWith('Independent title '));
 assert.ok(historical.length>=6, 'A long varied Log should not retrieve mostly fantasy');
});

test('Screenshot reproduction: fantasy, monsters and sequels cannot fill five mixed-taste cards',()=>{
 const candidate=(key,title,genres,score)=>({key,title,category:'movies',score,
   facets:{genres,themes:[],tones:[],pace:null},personalized:true,matchMethod:'tmdb_related'});
 const pool=[
  candidate('hobbit','The Hobbit: The Desolation of Smaug',['fantasy','adventure'],110),
  candidate('ghostbusters','Ghostbusters: Frozen Empire',['fantasy','comedy'],108),
  candidate('love-and-monsters','Love and Monsters',['adventure','science fiction','action'],106),
  candidate('black-cauldron','The Black Cauldron',['fantasy','family','animation'],104),
  candidate('monster-family','Monster Family 2',['fantasy','family','animation'],102),
  candidate('indie-1','Quiet Character Study',['drama'],90),
  candidate('indie-2','Contemplative Love Story',['romance','drama'],87),
  candidate('indie-3','Intimate Documentary',['documentary'],84),
  candidate('indie-4','Human Comedy',['comedy'],81)
 ];
 const profile=[
  ...Array.from({length:10},(_,i)=>candidate('recent-'+i,
    'Harry Potter and Story '+i,['family','fantasy','adventure'],0)),
  ...Array.from({length:35},(_,i)=>candidate('older-'+i,
    'Independent Drama '+i,['drama'],0)),
  ...Array.from({length:20},(_,i)=>candidate('more-'+i,
    'International Documentary '+i,['documentary'],0))
 ];
 const result=Array.from(engine.balanceShelves({
   entries:pool,profileEntries:profile,
   impressions:Object.fromEntries(profile.map(x=>[x.key,'Loved']))
 })).slice(0,5);
 assert.equal(result.length,5);
 assert.ok(result.filter(engine.spectacleAdventure).length<=2,
   'Hobbit + Ghostbusters + Monsters is one repeated experience on a mixed-taste shelf');
 assert.ok(result.filter(x=>x.key.startsWith('indie-')).length>=2,
   'The first shelf must include genuinely different but positively scored stories');
 assert.equal(engine.obviousFollowup({title:'Monster Family 2',facets:{genres:['family','fantasy']}}),true,
   'Numbered sequels cannot slip through because the franchise was not hand-listed');
});

test('All 117 recent Log entries create two four-title TMDB retrieval cohorts',()=>{
 const page=read('discover.html');
 assert.match(page,/grouped\[category\]\.length>=24\?8:4/);
 assert.match(page,/const own=allOwn\.slice\(0,4\),historical=allOwn\.slice\(4,8\)/);
 assert.match(page,/kind:"direct-history"/);
 assert.match(page,/historical\.length<2/);
 assert.match(page,/algorithm:"verified-cinematic-v8"/);
 assert.match(page,/recommendation-engine\.js\?v=17/);
});


test('117-film / 39-show audit: every TMDB-rated story precedes unwatched Watchlist interests',()=>{
 // Actual audit proportions, with synthetic IDs to protect member privacy:
 // 136 dynamic rated titles (106 movies + 30 TV), 20 editorial-rated titles,
 // 82 dynamic Watchlist titles (five also rated).
 const movieIds=Array.from({length:106},(_,i)=>'tmdb-movie-'+(110000+i));
 const tvIds=Array.from({length:30},(_,i)=>'tmdb-tv-'+(220000+i));
 const likedMovies=movieIds.slice(0,77),likedTv=tvIds.slice(0,20);
 const watchlist=[...movieIds.slice(0,5),
   ...Array.from({length:70},(_,i)=>'tmdb-movie-'+(330000+i)),
   ...Array.from({length:7},(_,i)=>'tmdb-tv-'+(440000+i))];
 const rated=[...movieIds,...tvIds,
   ...Array.from({length:20},(_,i)=>'editorial-title-'+i)];
 const planned=Array.from(engine.planTasteFeatureKeys({
   firstMovieKeys:[likedMovies[0],likedMovies[40],likedMovies.at(-1)],
   firstTvKeys:[likedTv[0],likedTv.at(-1)],
   positiveMovieKeys:likedMovies,positiveTvKeys:likedTv,
   ratedKeys:rated,watchlistKeys:watchlist
 }));
 assert.equal(planned.length,213, 'All rated TMDB IDs and all new Watchlist IDs should be eligible');
 assert.equal(new Set(planned).size,planned.length, 'No duplicate film IDs');
 assert.equal(movieIds.every(key=>planned.includes(key)),true);
 assert.equal(tvIds.every(key=>planned.includes(key)),true);
 const firstWatchOnly=Math.min(...watchlist
   .filter(key=>!rated.includes(key)).map(key=>planned.indexOf(key)));
 assert.equal(firstWatchOnly,136, 'Unwatched saves must follow all 136 rated TMDB titles');
 assert.ok(planned.indexOf(likedMovies.at(-1))<firstWatchOnly,
   'Old movie tastes cannot be lost behind recent Watchlist additions');
 assert.ok(planned.indexOf(likedTv.at(-1))<firstWatchOnly,
   'Rated TV shows also outrank saved but unrated films');
 assert.ok(!planned.some(key=>key.startsWith('editorial-title-')),
   'Editorial titles have separate metadata and are not sent to TMDB');
});

test('A very large rated Log never allows Watchlist titles to displace rated metadata',()=>{
 const movies=Array.from({length:295},(_,i)=>'tmdb-movie-'+(500000+i));
 const watch=Array.from({length:200},(_,i)=>'tmdb-movie-'+(800000+i));
 const planned=Array.from(engine.planTasteFeatureKeys({
   positiveMovieKeys:movies.slice(0,120),
   ratedKeys:movies,watchlistKeys:watch
 }));
 assert.equal(planned.length,256,'Keep network requests bounded');
 assert.ok(planned.every(key=>movies.includes(key)),
   'Do not evict rated cinema to process a Watchlist-first queue');
 const limited=Array.from(engine.planTasteFeatureKeys({
   firstMovieKeys:['tmdb-movie-501','tmdb-movie-501'],
   ratedKeys:['tmdb-movie-502','invalid','tmdb-movie-503'],
   watchlistKeys:['tmdb-tv-600'],
   limit:3
 }));
 assert.deepEqual(limited,['tmdb-movie-501','tmdb-movie-502','tmdb-movie-503']);
});

test('Home prioritizes the full rated Log before Watchlist within bounded public metadata batches',()=>{
 const home=read('discover.html');
 assert.match(home,/planTasteFeatureKeys\(\{/);
 assert.match(home,/firstTvKeys:tvSourceKeys\.slice\(0,4\)/);
 assert.match(home,/positiveMovieKeys:movieSourceKeys/);
 assert.match(home,/positiveTvKeys:tvSourceKeys/);
 assert.match(home,/ratedKeys:Object\.keys\(savedImpressions\)/);
 assert.match(home,/watchlistKeys:\[\.\.\.watchlistKeys\]/);
 assert.match(home,/const bounded=unique\.slice\(0,256\)/);
 assert.match(home,/const deadline=started\+16000/);
 assert.match(home,/Math\.min\(3,batches\.length\)/);
 assert.match(home,/algorithm:"verified-cinematic-v8"/);
 assert.match(home,/recommendation-engine\.js\?v=17/);
 assert.doesNotMatch(home,/unique\.slice\(0,108\)/);
});


test('Step 2 counts returned metadata, meaningful tags, and missing coverage honestly',()=>{
 const keys=['tmdb-movie-100','tmdb-movie-101','tmdb-tv-102',
   'tmdb-movie-103','tmdb-tv-104','tmdb-movie-105'];
 const data=[
  {key:'tmdb-movie-100',genres:['drama'],themes:['family'],tones:[]},
  {key:'tmdb-movie-101',genres:['fantasy'],themes:[],tones:[]},
  {key:'tmdb-tv-102',genres:['comedy'],themes:[],tones:['satirical']},
  {key:'tmdb-movie-103',genres:[],themes:[],tones:[]},
  {key:'tmdb-movie-105',genres:['romance'],themes:[],tones:[]}
 ];
 const audit=engine.tasteFeatureCoverage({keys,records:data,
   impressions:{
    'afterlogue-tmdb-movie-100':'Loved',
    'afterlogue-tmdb-movie-101':'Liked',
    'afterlogue-tmdb-tv-102':'Okay',
    'afterlogue-tmdb-movie-103':'Not for me',
    'afterlogue-before-sunrise':'Loved'
   },
   watchlist:[{title_key:'tmdb-tv-104'},{title_key:'tmdb-movie-105'},
     {title_key:'tmdb-movie-100'}],
   requestStats:{queued:6,attempted:5,successfulBatches:1,failedBatches:1,
     notAttempted:1,elapsedMs:14000}
 });
 assert.deepEqual(JSON.parse(JSON.stringify(audit.all)),{planned:6,returned:5,genres:4,themes:1,
   tones:1,storyTags:2,genreOnly:2,empty:1,missing:1});
 assert.equal(audit.ratedMovies.planned,3);
 assert.equal(audit.ratedMovies.returned,3);
 assert.equal(audit.ratedTV.storyTags,1);
 assert.equal(audit.positive.storyTags,1);
 assert.equal(audit.neutralOrNegative.empty,1);
 assert.equal(audit.watchlistOnly.planned,2);
 assert.equal(audit.watchlistOnly.returned,1);
 assert.equal(audit.editorialRated,1);
 assert.deepEqual(JSON.parse(JSON.stringify(audit.requestStats)),{queued:6,attempted:5,
   successfulBatches:1,failedBatches:1,notAttempted:1,elapsedMs:14000});
});

test('Step 2 does not count queued keys as metadata successfully received',()=>{
 const keys=Array.from({length:136},(_,i)=>
   'tmdb-'+(i<106?'movie':'tv')+'-'+(50000+i));
 const rows=keys.slice(0,38).map(key=>({key,genres:['drama'],
   themes:[],tones:[]}));
 const report=engine.tasteFeatureCoverage({keys,records:rows,
   impressions:Object.fromEntries(keys.map(key=>['afterlogue-'+key,'Loved'])),
   requestStats:{queued:136,attempted:90,successfulBatches:5,
     failedBatches:1,notAttempted:46}});
 assert.equal(report.all.planned,136);
 assert.equal(report.all.returned,38);
 assert.equal(report.all.missing,98);
 assert.equal(report.all.storyTags,0);
 assert.equal(report.all.genreOnly,38);
 assert.equal(report.ratedMovies.returned,38);
 assert.equal(report.ratedTV.returned,0);
 assert.equal(report.requestStats.notAttempted,46);
});

test('Step 2 opt-in diagnostic does not change recommendations or member data',()=>{
 const home=read('discover.html');
 assert.match(home,/tasteAuditRequested=new URLSearchParams\(location\.search\)/);
 assert.match(home,/tasteFeatureCoverage\(\{keys,records,/);
 assert.match(home,/if\(tasteAuditRequested\)void runTasteMetadataAudit\(\)/);
 assert.match(home,/function showTasteAudit\(lines\)/);
 assert.match(home,/onStats\(\{/);
 assert.match(home,/notAttempted:bounded\.length-attempted/);
 assert.match(home,/successfulBatches\+\+/);
 assert.match(home,/failedBatches\+\+/);
 assert.match(home,/console\.info\("Afterlogue source metadata coverage \(aggregate\)"/);
 assert.match(home,/recommendation-engine\.js\?v=17/);
});

test('Verified filmmaker overlap helps a compatible film, but never outweighs strong taste evidence',()=>{
 const films=[
  {key:'favorite',title:'Favorite',category:'movies',position:0,directMatches:[],
   facets:{genres:['drama'],themes:['solitude'],tones:['reflective'],directors:['tmdb-person-11']}},
  {key:'filmmaker',title:'Another Film',category:'movies',position:2,directMatches:[],
   facets:{genres:['drama'],themes:['solitude'],tones:['reflective'],directors:['tmdb-person-11']}},
  {key:'same-genre',title:'Genre Film',category:'movies',position:1,directMatches:[],
   facets:{genres:['drama'],themes:['solitude'],tones:['reflective'],directors:['tmdb-person-22']}},
  {key:'other',title:'Unrelated Film',category:'movies',position:3,directMatches:[],
   facets:{genres:['action'],themes:['revenge'],tones:['intense'],directors:['tmdb-person-11']}}
 ];
 const picks=engine.rank({entries:films,category:'movies',impressions:{favorite:'Loved'}});
 assert.equal(picks[0].key,'filmmaker');
 assert.ok(picks.find(x=>x.key==='other').score<picks.find(x=>x.key==='same-genre').score);
 assert.ok(picks[0].why.includes('solitude'));
});
test('A filmmaker connection alone does not invent shared themes or tones',()=>{
 const entries=[
  {key:'liked',title:'Liked Film',category:'movies',position:0,directMatches:[],
   facets:{genres:['drama'],themes:['memory'],tones:['quiet'],directors:['tmdb-person-11']}},
  {key:'other',title:'Other Film',category:'movies',position:1,directMatches:[],
   facets:{genres:['horror'],themes:['survival'],tones:['intense'],directors:['tmdb-person-11']}}
 ];
 const picks=engine.rank({entries,category:'movies',impressions:{liked:'Loved'}});
 assert.equal(picks.length,1);
 assert.ok(picks[0].why.includes('share a director'));
 assert.ok(!picks[0].why.includes('memory'));
});
