const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Home keeps one five-pick shelf followed by a collapsed saved collection',()=>{
 const html=read('discover.html');
 assert.match(html,/id="discovery-results"/);
 assert.match(html,/id="watchlist-reminder-toggle"/);
 assert.match(html,/Something from your collection, perhaps\?/);
 assert.match(html,/id="watchlist-reminder-content"[^>]*hidden/);
 assert.ok(html.indexOf('id="discovery-results"')<html.indexOf('id="watchlist-reminder-toggle"'));
 assert.match(html,/home-watchlist-reminder\.js\?v=2/);
});
test('Reminder only uses authenticated personal Watchlist rows and catalog metadata',()=>{
 const js=read('home-watchlist-reminder.js');
 assert.match(js,/client\.auth\.getUser\(\)/);
 assert.match(js,/client\.from\('watchlist'\)\.select\('title_key,category,created_at'\)/);
 assert.match(js,/\.eq\('user_id',ownerId\)/);
 assert.match(js,/client\.from\('user_catalog_titles'\)/);
 assert.match(js,/const count=Math\.min\(3,stories\.length\)/);
 assert.match(js,/previousKeys=new Set/);
 assert.match(js,/if\(guest\|\|!client\)/);
 assert.match(js,/watchHref\(story\)/);
 assert.doesNotMatch(js,/Past Lives|Before Sunrise|Aftersun|The Favourite/);
});
test('Home respects screen width and gives the main shelf some space',()=>{
 const css=read('discover-home.css');
 assert.match(css,/\.discovery-home-page \.discovery-selections\{padding:0;max-width:1220px;margin:0 auto\}/);
 assert.match(css,/\.discovery-home-page \.discovery-results\{\s*max-width:1160px/);
 assert.match(css,/margin:clamp\(85px,10vw,145px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
});
test('View Watchlist opens the proper Log tab',()=>{
 const home=read('discover.html');
 const log=read('my-log.js');
 assert.match(home,/my-log\.html\?tab=watchlist/);
 assert.match(log,/new URLSearchParams\(location\.search\)\.get\('tab'\) === 'watchlist'/);
});
