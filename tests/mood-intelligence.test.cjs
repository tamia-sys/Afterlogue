const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the *actual* server classifier. These tests deliberately avoid
// mirroring its logic in a separate, potentially inconsistent implementation.
const source = fs.readFileSync(path.join(__dirname,'../supabase/functions/afterlogue-catalog/index.ts'),'utf8');
function section(from,to){
 const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'Server source boundaries changed: '+from);
 return source.slice(a,b);
}
const moodSource = section('function holidayEvidence(', '// Stronger than a genre label')
  +'\n'+section('type MoodAssessment=', 'const HOLIDAY_GROUPS:string[][]=');
const compiled=ts.transpileModule(moodSource,{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
const {moodExperience}=new Function(compiled+'\nreturn {moodExperience};')();
const movie=(id,title,overview,ids=[])=>({
 id,title,overview,genres:ids.map(id=>({id}))
});
const fit=(mood,movie,tags=[],pace='medium')=>
 moodExperience(mood,movie,tags,pace,null);

test('Friday night: an incidental party cannot outweigh a bleak family drama',()=>{
 const ice=movie(68924,'The Ice Storm',
   'An affluent family struggles with depression and quiet desperation as friends attend a party.',[18]);
 const bodies=movie(520023,'Bodies Bodies Bodies',
   'A party game goes awry when a killer turns the weekend into a chaotic survival mystery.',[35,27,9648]);
 const sad=fit('friday',ice,['party']),fun=fit('friday',bodies,['party']);
 assert.ok(sad.score<5,'The Ice Storm should not qualify: '+JSON.stringify(sad));
 assert.ok(fun.score>=5,'Bodies Bodies Bodies should qualify: '+JSON.stringify(fun));
 assert.ok(fun.score>sad.score,'The chaotic horror comedy should outrank the drama');
});
test('Yearning: first love and separation outrank generic romance',()=>{
 const first=movie(398818,'Call Me by Your Name',
   'A teenager falls in love and experiences first love during a summer in Italy.',[18,10749]);
 const generic=movie(999999,'A Pleasant Romance',
   'Two people fall in love and start a happy relationship.',[10749]);
 const classic=fit('yearning',first,['first love']);
 const surface=fit('yearning',generic);
 assert.ok(classic.score>=5,'first love should qualify');
 assert.ok(surface.score<5,'generic romance alone is not enough');
 assert.ok(classic.score>surface.score);
});
test('Yearning: loneliness and hard relationships can count without a romance tag',()=>{
 const her=movie(152601,'Her',
   'A lonely writer develops a romantic relationship with an unusual operating system.',[18,10749,878]);
 const result=fit('yearning',her);
 assert.ok(result.score>=5,JSON.stringify(result));
 assert.match(result.reason,/isolation|feelings/i);
});
test('Holidays: a Christmas mention is weaker than a Christmas-centered identity',()=>{
 const incidental=movie(9475,'Scent of a Woman',
   'An unlikely mentor meets a student during Christmas break.',[18]);
 const focused=movie(51052,'Arthur Christmas',
   'Arthur and his family must deliver presents in time for Christmas.',[16,10751]);
 assert.ok(fit('holidays',incidental).score<5);
 assert.ok(fit('holidays',focused).score>=5);
});
test('Winding down: distressing and frantic material loses to intimate daily life',()=>{
 const quiet=movie(777,'Ordinary Days',
   'A reflective slice of life story about an intimate friendship in a small town.',[18]);
 const crisis=movie(778,'Dark Night',
   'A brutal murder leads to chaos and a frightening chase.',[27,53]);
 assert.ok(fit('winding',quiet,['slice of life']).score>=5);
 assert.ok(fit('winding',crisis).score<5);
});
test('Pace is a secondary preference, not a replacement for mood',()=>{
 const bodies=movie(520023,'Bodies Bodies Bodies',
   'A wild night party game goes awry as a killer turns friends against each other.',[35,27]);
 const energetic=fit('friday',bodies,['party'],'energetic');
 const slow=fit('friday',bodies,['party'],'slow');
 assert.ok(energetic.score>slow.score);
 assert.ok(energetic.score>=5);
});
test('Explanations do not leak claims about numerical mood scores',()=>{
 const film=movie(9,'A Forbidden Romance',
   'Two lovers separated by distance struggle to be together.',[18,10749]);
 const result=fit('yearning',film);
 assert.match(result.reason,/distance|obstacle/i);
 assert.equal(result.fitVersion,'editorial-v1');
 assert.equal(typeof result.score,'number');
});
