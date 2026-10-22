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
 assert.match(home,/facets:sourceFeatureMap\.get\(x\.key\)/);
 assert.match(home,/category,limit:4,rotation:/);
 assert.match(home,/algorithm:"balanced-home-shelves-v2-broad-candidate-seeds"/);
 assert.match(home,/recommendation-engine\.js\?v=11/);
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
 assert.match(home,/algorithm:"balanced-home-shelves-v2-broad-candidate-seeds"/);
 assert.match(home,/recommendation-engine\.js\?v=11/);
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
 assert.match(code,/discoverySeriesPrefixes/);
 assert.match(code,/the hunger games/);
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
