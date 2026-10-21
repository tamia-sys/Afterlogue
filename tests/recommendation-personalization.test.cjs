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
  assert.match(beforeLoad,/if\(isGuestMode\)/);
  assert.doesNotMatch(beforeLoad,/localStorage/);
  assert.match(home,/\.from\("impressions"\)/);
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

test('Explore searches one unified results shelf and never collapses on one character',()=>{
 const html=read('explore.html'),search=read('explore-global-search.js');
 assert.match(html,/explore-global-search\.js\?v=3/);
 assert.match(search,/explore-match-picks/);
 assert.match(search,/byTitle=new Map/);
 assert.match(search,/render\(\[\],\[\],query,true\)/);
 assert.match(search,/Searching films and television/);
 assert.match(search,/Promise\.all\(jobs\.map/);
 assert.match(search,/No matching titles found/);
 assert.doesNotMatch(search,/Country search currently applies to curated/);
 assert.match(html,/typed\.length>=2\?typed:""/);
 assert.match(html,/explore-browse-note" hidden/);
 assert.doesNotMatch(html,/Look beyond our featured collection/);
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
test('All Films has 60-story batch pages and does not fall back to a tiny featured rail',()=>{
 const client=read('catalog-browser.js'),backend=read('supabase/functions/afterlogue-catalog/index.ts');
 assert.match(client,/pageSize:60/);
 assert.match(client,/configured=true/);
 assert.doesNotMatch(client,/explore-all-films-open"\)\?\.click/);
 assert.match(backend,/const pagesToFetch=batched\?4:1/);
 assert.match(backend,/verified\.slice\(0,batched\?60:20\)/);
});
test('Film Details keeps the editorial heading as a question',()=>{
 const details=read('film-details.html');
 assert.match(details,/Another story, perhaps\?/);
 assert.doesNotMatch(details,/Another story, perhaps\.<\/h2>/);
});
