const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('Guest Watchlist intent uses a short lived validated movie or TV identifier',()=>{
 const source=read('pending-watchlist.js');
 assert.match(source,/MAX_AGE=45\*60\*1000/);
 assert.match(source,/^.*function remember\(title\)/m);
 assert.match(source,/localStorage\.setItem\(STORAGE_KEY/);
 assert.match(source,/url\.origin!==location\.origin/);
 assert.match(source,/if\(error&&error\.code!=='23505'\)throw error/);
 assert.match(source,/window\.AfterlogueCatalogMetadata\.save/);
 assert.match(source,/postLogin\(client,user,onboardingComplete\)/);
});
test('Returning members and newly onboarded members return to intended film',()=>{
 const auth=read('auth-signup.js');
 const onboarding=read('log.html');
 assert.match(auth,/AfterloguePendingWatchlist\?\.postLogin/);
 assert.match(onboarding,/AfterloguePendingWatchlist\?\.postLogin/);
 assert.match(onboarding,/await window\.saveFirstImpressions/);
 assert.match(auth,/profile\?\.onboarding_completed/);
 assert.match(auth,/latest\.data\?\.onboarding_completed/);
});
test('Only an explicit guest Watchlist Save starts a pending action',()=>{
 const source=read('film-details.js');
 assert.match(source,/AfterloguePendingWatchlist\?\.remember/);
 assert.match(source,/location\.assign\('signup\.html\?mode=signup'\)/);
 assert.match(source,/params\.get\('watchlist_saved'\)==='1'/);
 assert.match(source,/params\.get\('watchlist_error'\)==='1'/);
 assert.match(source,/AfterloguePendingWatchlist\.discard/);
});
test('Language selector loads across all public Afterlogue pages',()=>{
 const pages=['index.html','signup.html','log.html','discover.html','film-details.html','explore.html',
  'my-log.html','discuss.html','discuss-thread.html','discuss-compose.html',
  'member-profile.html','account-settings.html'];
 for(const file of pages)assert.match(read(file),/site-language\.js\?v=1/,file);
 const source=read('site-language.js');
 for(const code of ['en','es','fr','pt'])assert.ok(source.includes(code));
 assert.match(source,/afterlogue\.ui-language\.v1/);
 assert.match(source,/document\.documentElement\.lang=locale/);
 assert.match(source,/MutationObserver/);
 assert.match(source,/window\.AfterlogueLanguage/);
});
