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
  const leave=html.indexOf('location.assign("discover.html")', save);
  assert.ok(save!==-1 && leave>save);
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
 assert.match(html,/catalog-browser\.js\?v=8/);
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
 assert.match(backend,/while\(queue\.length&&verified\.length<10\)/);
});
test('All Films collects up to 70 actual filtered matches using cursor pagination',()=>{
 const client=read('catalog-browser.js');
 const backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(client,/hasFilters\?70:60/);
 assert.match(client,/const pageSize=hasFilters\?70:60/);
 assert.match(client,/cursor:filtered\?/);
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
 assert.match(client,/pageCursors\.set\(page\+1,cursor\)/);
 assert.match(client,/hasNext=Boolean\(cursor\)/);
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
 assert.match(html,/const facet=isSurprise\?/);
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
 assert.match(code,/if\(mixed\.length===60\)break/);
 assert.match(code,/eligible\(v,media,45\)/);
 assert.match(code,/selection:"discover"/);
});
test('All Films does not invent a capped total or block Next without its provider signal',()=>{
 const html=read('explore.html'),browser=read('catalog-browser.js');
 const backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(html,/catalog-browser\.js\?v=8/);
 assert.match(browser,/hasNext=typeof result\.hasMore==="boolean"/);
 assert.match(browser,/" · Page "\+page;/);
 assert.doesNotMatch(browser,/" of "\+pages/);
 assert.match(backend,/totalPages:null,totalResults:null/);
 assert.match(backend,/hasMore:page<100&&lanesReady\.some/);
});
