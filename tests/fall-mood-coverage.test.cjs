const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/afterlogue-catalog/index.ts'),'utf8');
const explore=fs.readFileSync(path.join(__dirname,'../explore.html'),'utf8');
function between(start,end){
 const first=source.indexOf(start),last=source.indexOf(end,first+start.length);
 assert.ok(first>=0&&last>first,'Missing source section '+start);
 return source.slice(first,last);
}
function titles(section){return [...section.matchAll(/"([^"]+)"/g)].map(match=>match[1]);}
test('Fall search has distinct, international slow and energetic candidate pools',()=>{
 const films=between('const FALL_FILM_PACE_SEEDS={','};');
 const tv=between('const FALL_TV_PACE_SEEDS={','};');
 const list=(value,name)=>titles(value.match(new RegExp(name+':\\[([\\s\\S]*?)\\]'))?.[1]||'');
 for(const section of [films,tv]){
  const slow=list(section,'slow'),fast=list(section,'energetic');
  assert.ok(slow.length>=10,'Slow should not depend on three seeds');
  assert.ok(fast.length>=10,'Energetic should not depend on three seeds');
  assert.equal(new Set(slow).size,slow.length,'Duplicate seed');
  assert.equal(new Set(fast).size,fast.length,'Duplicate seed');
  assert.equal(slow.filter(x=>fast.includes(x)).length,0,'Both paces cannot use identical reviewed seed titles');
 }
 for(const film of ['A Tale of Autumn','Autumn Sonata','Little Forest'])
  assert.ok(films.includes('"'+film+'"'),'International film '+film+' missing');
 for(const show of ['Dark','The Chestnut Man','Jordskott'])
  assert.ok(tv.includes('"'+show+'"'),'International TV '+show+' missing');
});
test('Fall search rotates candidate sources and verifies beyond first 24',()=>{
 assert.match(source,/const seasonalTitles=mood==="fall"/);
 assert.match(source,/fallPool\[\(offset\*5\+i\)%fallPool.length\]/);
 assert.match(source,/const queue=selected\.slice\(0,72\)/);
 assert.match(source,/while\(queue\.length&&verified\.length<10\)/);
 assert.match(source,/if\(experience\.score<5\)return/);
 assert.match(source,/preferredFallTitles\.has/);
});
test('Mood history avoids immediate cross-pace repeats but respects separate filters',()=>{
 assert.match(explore,/function previousMoodTitles\(scope\)/);
 assert.match(explore,/other\[0\]!==selected\[0\]/);
 assert.match(explore,/other\[1\]!==selected\[1\]/);
 assert.match(explore,/JSON\.stringify\(other\.slice\(3\)\)/);
});
test('Existing explicit hard filters and truthful partial-result path are retained',()=>{
 for(const s of ['if(ratings.length&&!certification)return',
   'if(countries.length&&!countries.some(c=>produced.includes(c)))return',
   'if(languages.length&&!languages.includes(String(details.original_language||"")))return',
   'if(decades.length&&(!year||!decades.includes(String(Math.floor(year/10)*10))))return',
   'if(genres.length&&!genres.some(g=>detailGenreIds.includes(categoryGenres[g])))return'])
  assert.ok(source.includes(s),'Missing filter check '+s);
 assert.match(explore,/if\(picks\.length!==desired\)/);
 assert.match(explore,/if\(picks\.length\)\{/);
});
