const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const server=fs.readFileSync(path.join(__dirname,'../supabase/functions/afterlogue-catalog/index.ts'),'utf8');
function section(a,b){
 const start=server.indexOf(a),end=server.indexOf(b,start+a.length);
 assert.ok(start>=0&&end>start,'source boundary missing: '+a);
 return server.slice(start,end);
}
// Execute the actual server implementation; do not duplicate the heuristics.
const source=section('function holidayEvidence(', '// Stronger than a genre label')+
 '\n'+section('type MoodAssessment=', 'const HOLIDAY_GROUPS:string[][]=');
const compiled=ts.transpileModule(source,{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
const {moodExperience,slowWindingFilmEvidence}=new Function(compiled+'\nreturn {moodExperience,slowWindingFilmEvidence};')();
const film=(title,overview,genres=[],id=99)=>({id,title,overview,genres:genres.map(id=>({id}))});
const match=(item,tags=[],pace='slow',reason=null,lane=null)=>
 moodExperience('winding',item,tags,pace,reason,null,lane);

test('Winding down includes easygoing neighborhood comedy, not only quiet dramas',()=>{
 const beauty=film('Salon Days','A funny neighborhood salon comedy about friends, family and everyday life.',[35]);
 const result=match(beauty);
 assert.ok(result.score>=5,JSON.stringify(result));
 assert.match(result.reason,/humor|lighthearted|everyday/i);
});
test('Winding down includes poetic routines and contemplative travel even when bittersweet',()=>{
 const daily=film('Ordinary Days','A quiet contemplative story about daily routines and the passage of time.',[18]);
 const roads=film('A Road Alone','An introspective journey in solitude as a traveler grapples with grief.',[18]);
 assert.ok(match(daily).score>=5);
 assert.ok(match(roads).score>=5,'Contemplative melancholy must not be mistaken for an automatic mismatch');
 assert.match(match(daily).reason,/reflective|contemplative/i);
});
test('Light, energetic comedy can qualify without mislabeling it as slow',()=>{
 const road=film('Unexpected Family Road Trip','A witty comedy about an unlikely duo and their misadventures on a road trip.',[35,12]);
 const fast=match(road,[],'energetic'),slow=match(road,[],'slow');
 assert.ok(fast.score>=5,JSON.stringify(fast));
 assert.ok(fast.score>slow.score);
});
test('A slice-of-life keyword alone does not qualify chaotic material',()=>{
 const falsePositive=film('Chaotic School Fantasy','Students fight monsters to survive a violent magical school war.',[16,10759]);
 assert.ok(match(falsePositive,['slice of life']).score<5,JSON.stringify(match(falsePositive,['slice of life'])));
});
test('Trauma is not recast as relaxing just because the synopsis says intimate',()=>{
 const prison=film('A Gentle Prison','A gentle prison guard witnesses an execution on death row.',[18,80]);
 const documentary=film('Painful Search','An intimate search for missing daughters after domestic abuse and violence.',[99,18]);
 assert.ok(match(prison).score<5,JSON.stringify(match(prison)));
 assert.ok(match(documentary,['self discovery']).score<5,JSON.stringify(match(documentary,['self discovery'])));
});
test('A documented editorial rationale can acknowledge emotionally challenging contemplation',()=>{
 const nomad=film('Nomadland','A woman travels through the American West after grief and job loss.',[18]);
 const reason='Its unhurried journeys and attentive observations of everyday lives invite contemplation, despite difficult themes.';
 const result=match(nomad,[],'slow',reason,'contemplative');
 assert.ok(result.score>=5,JSON.stringify(result));
 assert.equal(result.reason,reason);
 assert.equal(result.lane,'contemplative');
});
test('Anchors preserve broad cinema while avoiding unspecified Hamlet adaptation',()=>{
 const anchors=section('const WINDING_REFERENCES:','const SEASONAL_FEATURES:');
 for(const name of ['"Beauty Shop"','"Zombieland"','"Nomadland"','"Perfect Days"','"Into the Wild"','"Boyhood"','"Midnight Diner"','"Reply 1988"','"K-On!"']){
  assert.ok(anchors.includes(name),'Missing positive example '+name);
 }
 assert.ok(!anchors.includes('"Hamlet":'),'An unspecified adaptation cannot be hard-coded as a verified title');
 assert.match(server,/windingRef\?\.reason\|\|fallReason/);
 assert.match(server,/windingRef\?\.lane\|\|null/);
 assert.match(server,/yearOf\(String\(media==="tv"\?item\.first_air_date:item\.release_date\|\|""\)\)===reference\.year/);
});
test('Winding selection seeds multiple strands; user filters remain authoritative',()=>{
 assert.match(server,/const windingLanes=pace==="energetic"/);
 assert.match(server,/const windingSeedJob=/);
 assert.match(server,/if\(windingSeedJob\)\{/);
 assert.match(server,/if\(experience\.score<5\)return/);
 assert.match(server,/if\(countries\.length&&!countries\.some\(c=>produced\.includes\(c\)\)\)return/);
 assert.match(server,/if\(ratings\.length&&!ratings\.includes\(certification!\)\)return/);
 assert.match(server,/if\(genres\.length&&!genres\.some\(g=>detailGenreIds\.includes\(categoryGenres\[g\]\)\)\)return/);
 assert.match(server,/const rangePenalty=mood==="winding"&&!genres\.length&&!countries\.length&&!languages\.length/);
});

test('Take your time has explicit contemplative global cinema references',()=>{
 const anchors=section('const WINDING_REFERENCES:','const SEASONAL_FEATURES:');
 for(const title of [
  'Paterson','Columbus','Lost in Translation','Her',
  'Spring, Summer, Fall, Winter... and Spring','Three Colors: Blue',
  'Wendy and Lucy','Sound of Metal','Paris, Texas','Ikiru',
  'Pather Panchali','Poetry','Ordet','Au Hasard Balthazar','Amour',
  'The Tree of Life'
 ]) assert.ok(anchors.includes(JSON.stringify(title)),title);
 assert.match(server,/windingLaneSequence=pace==="slow"&&media==="movie"/);
 assert.match(server,/windingRef\.lane==="contemplative"/);
 assert.match(server,/if\(experience\.score<5\)return/);
});
test('Ambiguous or short-film titles do not falsely claim verified feature eligibility',()=>{
 const anchors=section('const WINDING_REFERENCES:','const SEASONAL_FEATURES:');
 assert.ok(!anchors.includes('"The Host":'),'Which The Host adaptation is ambiguous');
 assert.ok(!anchors.includes('"The Red Balloon":'),'1956 short is under the current feature runtime minimum');
 assert.ok(!anchors.includes('"Hamlet":'),'An adaptation/year was not selected');
});

test('References do not monopolize discovery: look for unlisted, eligible TMDB neighbors',()=>{
 assert.match(server,/const referenceNeighbors=references\.filter/);
 assert.match(server,/\/similar",params,token/);
 assert.match(server,/windingRelatedGroups=related\.filter/);
 assert.match(server,/for\(const related of windingRelatedGroups\)/);
 assert.match(server,/while\(queue\.length&&verified\.length<\(mood==="winding"\?20:16\)\)/);
 assert.match(server,/windingReference:Boolean\(windingRef\)/);
 assert.match(server,/const independent=curated\.filter\(entry=>!entry\.windingReference&&entry\.moodFit>=7\)/);
 assert.match(server,/independent\.slice\(0,5\)\.forEach\(append\)/);
 assert.match(server,/if\(experience\.score<5\)return/);
});

test('Take your time rejects a frantic horror despite reflective marketing copy',()=>{
 const horror=film('They Will Kill You','A young woman survives a violent horror siege; an intimate, reflective night of terror.',[27,28,53]);
 assert.equal(slowWindingFilmEvidence(horror,[],[27,28,53],null,null),false);
});
test('Take your time rejects a broad party comedy that mentions friendship',()=>{
 const party=film('American Pie','Four high-school friends plan a wild night and pledge to lose their virginity by prom.',[35,10749]);
 assert.equal(slowWindingFilmEvidence(party,['coming of age'],[35,10749],null,null),false);
});
test('Take your time recognizes small routines without a named editorial anchor',()=>{
 const ordinary=film('A Poem After Work','A quiet contemplative portrait of a bus driver and his daily routine in a small town.',[18]);
 assert.equal(slowWindingFilmEvidence(ordinary,[],[18],null,null),true);
});
test('Take your time preserves demanding but contemplative cinema',()=>{
 const ghost=film('A Ghost Story','A story about loss that drifts over centuries.',[18,14]);
 assert.equal(slowWindingFilmEvidence(ghost,[],[18,14],'contemplative','slow'),true);
 const dogville=film('Dogville','A brutal story about abuse in a small town.',[18,80]);
 assert.equal(slowWindingFilmEvidence(dogville,[],[18,80],'contemplative','slow'),true);
});
test('Take your time is narrower than Winding Down generally',()=>{
 const beauty=film('Beauty Shop','Funny salon conversations and neighborhood friendship.',[35]);
 assert.equal(slowWindingFilmEvidence(beauty,[],[35],'everyday','slow'),false);
 assert.ok(match(beauty,[],'energetic','Comforting salon humor.','everyday').score>=5);
});
test('Slow film evidence is checked before accepting a mood-verified item',()=>{
 assert.match(server,/if\(mood==="winding"&&media==="movie"&&pace==="slow"&&/);
 assert.match(server,/!slowWindingFilmEvidence\(details,tags,detailGenreIds,/);
});

test('Contemplative discovery searches reflective worldwide film strata, not just listed examples',()=>{
 assert.match(server,/const contemplativeStrands=\[\[18\]/);
 assert.match(server,/const useRatedSort=slowMovieSearch&&\(i%3===1\)/);
 assert.match(server,/sort_by:useRatedSort\?"vote_average.desc":"popularity.desc"/);
 assert.match(server,/mood==="winding"&&pace==="slow"&&media==="movie"\?120/);
 assert.match(server,/references\.slice\(0,/);
 assert.match(server,/independent\.slice\(0,5\)\.forEach\(append\)/);
});
