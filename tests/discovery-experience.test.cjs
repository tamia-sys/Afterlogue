const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('All four featured collections have eighteen source choices and cap results at sixteen',()=>{
 const code=read('supabase/functions/afterlogue-catalog/index.ts');
 const begin=code.indexOf('const EDITORIAL_COLLECTIONS:');
 const end=code.indexOf('\n};',begin);
 assert.ok(begin>=0&&end>begin);
 const text=code.slice(begin,end);
 const sections=[...text.matchAll(/"(modern-classics|around-the-world|love-in-all-forms|animation-discoveries)":\[([\s\S]*?)\n \]/g)];
 assert.equal(sections.length,4);
 for(const [,name,body] of sections){
  const titles=[...body.matchAll(/\{title:"([^"]+)",year:(\d{4})\}/g)];
  assert.equal(titles.length,18,name+' needs reserve picks for 16 displayed results');
 }
 assert.match(code,/found\.slice\(0,16\)\.map/);
});
test('Home poster opens details, with independent actions and no why overlay',()=>{
 const code=read('discover.html');
 const css=read('discover-home.css');
 assert.match(code,/poster\.href=detailsHref/);
 assert.match(code,/posterStack\.append\(poster,actions\)/);
 assert.doesNotMatch(code,/detailLink\.textContent="Details ↗"/);
 assert.doesNotMatch(code,/card\.append\(posterStack,title,year\)/);
 assert.match(code,/card\.append\(posterStack\)/);
 assert.match(code,/actions\.append\(bookmarkButton\)/);
 assert.doesNotMatch(code,/className\s*=\s*"discovery-reason"/);
 assert.match(css,/\.discovery-card:hover \.discovery-card-actions/);
 assert.match(css,/@media\(hover:none\),\(pointer:coarse\)/);
});
test('Film details clearly acknowledges Watchlist, shares public card and embeds muted trailer',()=>{
 const html=read('film-details.html'),script=read('film-details.js');
 assert.match(html,/id="film-watchlist-feedback"/);
 assert.match(html,/id="film-share-modal"/);
 assert.match(html,/id="film-share-open"/);
 assert.match(script,/Saved to Watchlist\. Removed from Home\./);
 assert.match(script,/watchBtn\.closest\('\.film-watchlist-control'\)\.before\(eye\)/);
 const css=read('film-details.css');
 assert.match(css,/\.film-hero-actions \.film-watchlist-feedback\{/);
 assert.match(css,/position:absolute;display:block/);
 assert.match(css,/white-space:nowrap/);
 assert.match(css,/text-overflow:ellipsis/);
 assert.match(script,/navigator\.share/);
 assert.match(script,/navigator\.clipboard\.writeText/);
 assert.match(script,/autoplay=1&mute=1/);
});
test('Mood results have independent Watchlist save with existing title metadata',()=>{
 const html=read('explore.html');
 assert.match(html,/className="explore-mood-save"/);
 assert.match(html,/\.from\("watchlist"\)\.insert/);
 assert.match(html,/AfterlogueCatalogMetadata\.save/);
 assert.match(html,/actions\.append\(save,note\)/);
 assert.match(html,/el\.append\(link,actions,title,year,why\)/);
 assert.doesNotMatch(html,/detail\.textContent="View details";detail\.className="explore-global-detail";actions\.append\(detail\)/);
 assert.match(html,/for\(let attempt=0;attempt<2&&picks\.length<desired;attempt\+\+\)/);
 assert.match(html,/if\(hasPrevious\)\{/);
 assert.doesNotMatch(html,/Try adjusting your filters or mood\./);
});
test('Account menus close on click outside and Escape',()=>{
 const nav=read('site-navigation.js');
 assert.match(nav,/document\.addEventListener\("pointerdown"/);
 assert.match(nav,/!menu\.contains\(event\.target\)/);
 assert.match(nav,/event\.key!=="Escape"/);
 assert.match(nav,/menu\.open=false/);
});
