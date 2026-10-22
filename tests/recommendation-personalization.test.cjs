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
 assert.match(backend,/while\(queue\.length&&verified\.length<12\)/);
 assert.match(backend,/const queue=selected\.slice\(0,90\)/);
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
 assert.match(home,/discoveryCacheKey="afterlogue\.discover\.shelf\.v1"/);
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
 assert.match(code,/An archive discovery to explore while Afterlogue learns more about your taste/);
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
 assert.match(code,/const seasonalTitles=\[\.\.\.rotate\(preferred/);
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
