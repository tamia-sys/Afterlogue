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

test('First five never reserve two slots for the original editorial catalog', () => {
  const html=read('discover.html');
  assert.doesNotMatch(html,/expanded\.slice\(0,3\),\.\.\.editorial\.slice\(0,2\)/);
  assert.match(html,/entry\.matched\.some\(match=>/);
  assert.match(html,/entry\.personalized\|\|entry\.score<=0/);
  assert.match(html,/selected\.filter\(meaningful\)/);
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
  assert.match(home,/if\(scoped\)return false/);
});
