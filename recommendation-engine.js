/* AFTERLOGUE / TASTE MATCHING v1
 * Pure, deterministic recommendation ranking. No AI, hidden sponsored picks,
 * private notes, or external network calls. Existing curated five-at-a-time UX
 * remains the presentation layer; later catalog expansion is separate.
 */
(function(root){
"use strict";
const raw={
 "mean-girls":["friendship,identity,belonging,social-status","funny,satirical,energetic","fast"],
 "moonlight":["identity,belonging,family,first-love,growing-up","intimate,tender,melancholic","slow"],
 "jurassic-park":["survival,science,adventure,control","suspenseful,thrilling,wondrous","fast"],
 "the-sound-of-music":["family,belonging,love,courage","warm,hopeful,romantic","medium"],
 "get-out":["identity,control,prejudice,survival","unsettling,satirical,suspenseful","fast"],
 "little-miss-sunshine":["family,belonging,growing-up,self-worth","funny,tender,bittersweet","medium"],
 "the-truman-show":["identity,control,freedom,truth","reflective,satirical,unsettling","medium"],
 "spirited-away":["identity,growing-up,courage,belonging","wondrous,tender,unsettling","medium"],
 "parasite":["class,family,ambition,secrets,survival","satirical,unsettling,suspenseful","fast"],
 "titanic":["love,class,loss,survival","romantic,emotional,tragic","medium"],
 "ex-machina":["identity,control,science,trust,freedom","unsettling,reflective,suspenseful","slow"],
 "shrek":["belonging,self-worth,love,friendship","funny,warm,playful","fast"],
 "malcolm-in-the-middle":["family,growing-up,belonging","funny,chaotic,warm","fast"],
 "abbott-elementary":["work,friendship,community,belonging","funny,warm,hopeful","medium"],
 "gilmore-girls":["family,friendship,first-love,growing-up","warm,funny,comforting","medium"],
 "insecure":["friendship,identity,love,ambition,growing-up","funny,intimate,bittersweet","medium"],
 "bridgerton":["love,class,family,social-status","romantic,playful,dramatic","medium"],
 "gossip-girl":["love,friendship,class,social-status,secrets","dramatic,playful,tense","fast"],
 "stranger-things":["friendship,growing-up,survival,mystery","suspenseful,wondrous,nostalgic","fast"],
 "chernobyl":["science,truth,control,survival,responsibility","unsettling,tragic,intense","medium"],
 "demon-slayer":["family,loss,courage,friendship,survival","emotional,thrilling,hopeful","fast"],
 "avatar-the-last-airbender":["friendship,identity,family,courage,growing-up","wondrous,warm,hopeful","medium"],
 "love-island-usa":["love,social-status,friendship,competition","playful,dramatic,energetic","fast"],
 "criminal-minds":["crime,mystery,justice,trust","suspenseful,dark,intense","fast"],
 "the-farewell":["family,identity,loss,belonging,truth","tender,intimate,bittersweet","slow"],
 "booksmart":["friendship,growing-up,self-worth,belonging","funny,energetic,warm","fast"],
 "perfect-days":["solitude,routine,connection,self-worth,ordinary-life","quiet,reflective,tender","slow"],
 "past-lives":["love,identity,memory,belonging,loss","tender,melancholic,intimate","slow"],
 "aftersun":["family,memory,loss,growing-up,connection","tender,melancholic,intimate","slow"],
 "knives-out":["family,class,secrets,mystery,justice","funny,suspenseful,playful","fast"],
 "everything-everywhere-all-at-once":["family,identity,belonging,regret,love","chaotic,emotional,wondrous","fast"],
 "the-grand-budapest-hotel":["friendship,loyalty,loss,adventure","playful,whimsical,bittersweet","fast"],
 "lady-bird":["growing-up,family,identity,belonging,friendship","funny,tender,bittersweet","medium"],
 "arrival":["language,connection,memory,loss,science","reflective,emotional,wondrous","slow"],
 "whiplash":["ambition,work,control,self-worth,obsession","intense,unsettling,thrilling","fast"],
 "the-florida-project":["family,class,childhood,ordinary-life,survival","intimate,tender,bittersweet","slow"],
 "gone-girl":["secrets,truth,control,marriage,identity","unsettling,suspenseful,satirical","fast"],
 "spider-man-into-the-spider-verse":["identity,growing-up,belonging,family,courage","energetic,wondrous,hopeful","fast"],
 "before-sunrise":["love,connection,time,identity","intimate,romantic,reflective","slow"],
 "mindhunter":["crime,mystery,control,obsession,truth","unsettling,reflective,suspenseful","slow"],
 "fullmetal-alchemist-brotherhood":["family,loss,science,loyalty,courage","emotional,wondrous,thrilling","fast"],
 "station-eleven":["survival,memory,loss,connection,community","reflective,tender,melancholic","slow"],
 "severance":["identity,control,work,freedom,mystery","unsettling,satirical,reflective","slow"],
 "the-leftovers":["loss,family,faith,connection,mystery","melancholic,intimate,reflective","slow"],
 "the-bear":["work,ambition,family,loss,self-worth","intense,chaotic,tender","fast"],
 "fleabag":["loss,identity,love,family,connection","funny,intimate,bittersweet","medium"],
 "succession":["family,ambition,class,control,loyalty","satirical,intense,tense","fast"],
 "atlanta":["identity,class,friendship,work,ordinary-life","satirical,unsettling,funny","medium"],
 "dark":["family,mystery,time,loss,secrets","unsettling,melancholic,suspenseful","slow"],
 "the-good-place":["identity,friendship,morality,self-worth,love","funny,warm,hopeful","medium"],
 "sh-gun":["loyalty,ambition,class,control,courage","intense,reflective,dramatic","medium"],
 "breaking-bad":["ambition,control,family,secrets,crime","intense,unsettling,suspenseful","fast"],
 "beef":["identity,work,control,anger,connection","satirical,intense,bittersweet","fast"],
 "yellowjackets":["friendship,survival,loss,secrets,mystery","unsettling,dark,suspenseful","fast"]
};
const tags=Object.freeze(Object.fromEntries(Object.entries(raw).map(([key,parts])=>[key,{
  themes:parts[0].split(","),tones:parts[1].split(","),pace:parts[2]
}])));
const weights={"Loved":4,"Liked":2.8,"Okay":0.2,"Not for me":-3.7};
const slug=value=>String(value||"").toLowerCase().normalize("NFKD")
 .replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"");
const overlap=(a=[],b=[])=>a.filter(x=>b.includes(x));
const common=(a,b)=>{
 const sharedThemes=overlap(a.themes,b.themes);
 const sharedTones=overlap(a.tones,b.tones);
 const sharedGenre=overlap(a.genres,b.genres);
 const sharedPace=a.pace&&b.pace&&a.pace===b.pace;
 const sharedDirectors=overlap(a.directors||[],b.directors||[]);
 const sharedWriters=overlap(a.writers||[],b.writers||[]);
 // Broad concepts like identity, control, and family appear across very
 // different films. Require a richer connection before they dominate ranking.
 const broad=new Set(["identity","family","control","belonging","survival","love","friendship","loss"]);
 const themeScore=sharedThemes.reduce((sum,theme)=>sum+(broad.has(theme)?.65:1.8),0);
 const toneScore=sharedTones.length*1.25;
 const genreScore=Math.min(sharedGenre.length,2)*1.1;
 return {sharedThemes,sharedTones,sharedGenre,sharedPace,
  sharedDirectors,sharedWriters,
  // Verified creative connections help, but never override emotional taste.
  strength:themeScore+toneScore+genreScore+(sharedPace?.35:0)+
    Math.min(sharedDirectors.length,1)*1.3+Math.min(sharedWriters.length,1)*.45};
};
function normalizeEntries(catalog={},explore=[],editorial={},basics={}){
 const fromExplore=new Map(explore.map(item=>[slug(item.title),item]));
 return Object.entries(catalog).map(([key,item],position)=>{
   const data={...(basics[key]||{}),...(editorial[key]||{})};
   const extra=fromExplore.get(slug(item.title))||{};
   const theme=tags[key]||{themes:[],tones:[],pace:"medium"};
   const genres=String(data.genre||"").split("·").map(x=>x.trim().toLowerCase()).filter(Boolean);
   return {
    key,title:item.title,year:item.year,category:item.category==="tv"?"tv":"movies",
    poster:item.poster,position,
    reason:extra.reason||null,
    directMatches:(extra.matches||[]).map(slug),
    synopsis:data.synopsis||null,
    facets:{...theme,genres}
   };
 });
}
const toMap=value=>{
 if(value instanceof Map)return value;
 if(Array.isArray(value))return new Map(value.map(entry=>[entry.title_key||entry.key,entry.rating]));
 return new Map(Object.entries(value||{}));
};
// Deterministic, privacy-preserving taste profile. A single unpopular film
// cannot ban its genre; multiple independent signals build confidence.
// Unsupported emotional tags are intentionally omitted rather than guessed.
function buildTasteProfile({entries=[],impressions={},favorites=[],watchlist=[],timestamps={},now=Date.now()}={}){
 const byKey=new Map(entries.map(item=>[item.key,item]));
 const aliases=new Map(entries.flatMap(item=>[[item.key,item.key],[slug(item.title),item.key]]));
 const resolve=value=>aliases.get(slug(String(value||"").replace(/^afterlogue-/,"")))
   ||String(value||"").replace(/^afterlogue-/,"");
 const liked=new Map();
 for(const [name,record] of toMap(impressions)){
   const key=resolve(name);
   if(!byKey.has(key))continue;
   const rating=typeof record==="string"?record:record?.rating;
   if(!Object.prototype.hasOwnProperty.call(weights,rating))continue;
   liked.set(key,{rating,favorite:false});
 }
 for(const favorite of favorites||[]){
   const key=resolve(typeof favorite==="string"?favorite:favorite?.title_key);
   if(!byKey.has(key))continue;
   const existing=liked.get(key);
   if(existing)existing.favorite=true;
   else liked.set(key,{rating:null,favorite:true});
 }
 const buckets={themes:new Map(),tones:new Map(),genres:new Map(),pace:new Map(),directors:new Map()};
 const franchiseCounts=new Map();
 for(const [key,signal] of liked){
   if(!["Loved","Liked"].includes(signal.rating))continue;
   const group=franchiseKey(byKey.get(key));
   if(group?.startsWith("series:")||group?.startsWith("numbered:")||
      group?.startsWith("tmdb-collection:"))
     franchiseCounts.set(group,(franchiseCounts.get(group)||0)+1);
 }
 const significance={"Loved":2.4,"Liked":1.1,"Okay":0,"Not for me":-2.0};
 let covered=0;
 for(const [key,signal] of liked){
   const entry=byKey.get(key);
   const date=Date.parse(timestamps[key]||timestamps["afterlogue-"+key]||"");
   const age=Number.isFinite(date)?Math.max(0,(now-date)/86400000):0;
   // Older tastes remain part of the profile but recent choices weigh more.
   const recency=Number.isFinite(date)?.85+.15*Math.exp(-age/730):1;
   let strength=(significance[signal.rating]||0);
   if(signal.favorite&&strength>=0)strength+=.75;
   if(!strength)continue;
   const facets=entry.facets||{};
   let supported=false;
   for(const dimension of Object.keys(buckets)){
     const raw=dimension==="pace"?(facets.pace?[facets.pace]:[]):facets[dimension];
     const values=[...new Set((Array.isArray(raw)?raw:[]).map(value=>
       String(value||"").toLowerCase().trim()).filter(Boolean))];
     if(!values.length)continue;
     supported=true;
     const measure=buckets[dimension];
     const group=franchiseKey(entry);
   const franchiseVolume=strength>0?(franchiseCounts.get(group)||1):1;
   const perTitle=strength*recency/Math.sqrt(values.length*franchiseVolume);
     for(const tag of values){
       const old=measure.get(tag)||{tag,sum:0,positive:0,negative:0,support:0};
       measure.set(tag,{tag,sum:old.sum+perTitle,positive:old.positive+(strength>0?1:0),
         negative:old.negative+(strength<0?1:0),support:old.support+1});
     }
   }
   if(supported)covered++;
 }
 const dimensions={};
 for(const [dimension,measure] of Object.entries(buckets)){
   dimensions[dimension]=[...measure.values()].map(item=>({
     ...item,
     // Diminishing returns prevent 25 broad dramas from drowning out an
     // equally meaningful but smaller preference for contemplative films.
     affinity:Math.max(-2.6,Math.min(2.6,item.sum/(1+item.support)))
   })).sort((a,b)=>Math.abs(b.affinity)-Math.abs(a.affinity));
 }
 // Watchlist saves suggest curiosity, not proof the member enjoyed a film.
 // Keep their influence separate from established tastes and negative ratings.
 const interestBuckets={themes:new Map(),tones:new Map(),genres:new Map(),pace:new Map(),directors:new Map()};
 const interested=new Set();
 for(const record of watchlist||[]){
   const key=resolve(typeof record==="string"?record:record?.title_key||record?.key);
   if(byKey.has(key)&&!liked.has(key))interested.add(key);
 }
 const interestFranchises=new Map();
 for(const key of interested){
   const group=franchiseKey(byKey.get(key));
   if(group&&!group.startsWith("film:"))
     interestFranchises.set(group,(interestFranchises.get(group)||0)+1);
 }
 let interestCovered=0;
 for(const key of interested){
   const item=byKey.get(key),facets=item.facets||{};
   const group=franchiseKey(item);
   const franchiseVolume=interestFranchises.get(group)||1;
   let supported=false;
   for(const dimension of Object.keys(interestBuckets)){
     const raw=dimension==="pace"?(facets.pace?[facets.pace]:[]):facets[dimension];
     const values=[...new Set((Array.isArray(raw)?raw:[]).map(value=>
       String(value||"").toLowerCase().trim()).filter(Boolean))];
     if(!values.length)continue;
     supported=true;
     const weight=.75/Math.sqrt(values.length*franchiseVolume);
     const bucket=interestBuckets[dimension];
     for(const tag of values){
       const prior=bucket.get(tag)||{tag,sum:0,positive:0,negative:0,support:0};
       bucket.set(tag,{tag,sum:prior.sum+weight,positive:prior.positive+1,
         negative:0,support:prior.support+1});
     }
   }
   if(supported)interestCovered++;
 }
 const interestDimensions={};
 for(const [dimension,bucket] of Object.entries(interestBuckets)){
   interestDimensions[dimension]=[...bucket.values()].map(item=>({
     ...item,affinity:Math.min(1,item.sum/(1+item.support))
   })).sort((a,b)=>b.affinity-a.affinity);
 }
 return {version:3,logSignals:liked.size,covered,dimensions,
   interestSignals:interested.size,interestCovered,interestDimensions};
}
function tasteMatch(profile,facets={}){
 const dimensions=profile?.dimensions||{};
 const scales={themes:1.7,tones:1.5,genres:.8,pace:.3,directors:1.15};
 let strength=0;
 const evidence=[];
 for(const [dimension,scale] of Object.entries(scales)){
   const data=dimension==="pace"?(facets.pace?[facets.pace]:[]):facets[dimension];
   const labels=[...new Set((Array.isArray(data)?data:[]).map(s=>
     String(s||"").toLowerCase().trim()).filter(Boolean))];
   const relevant=dimensions[dimension]||[];
   for(const tag of labels){
     const signal=relevant.find(x=>x.tag===tag);
     if(!signal)continue;
     const value=signal.affinity*scale/Math.sqrt(labels.length||1);
     strength+=value;
     evidence.push({dimension,tag,affinity:signal.affinity,value});
   }
 }
 return {score:Math.max(-7,Math.min(7,strength)),evidence};
}
function rank({entries,category,impressions={},favorites=[],watchlist=[],seen=[],timestamps={}}){
 const all=Array.isArray(entries)?entries:[];
 const byKey=new Map(all.map(entry=>[entry.key,entry]));
 const aliases=new Map(all.flatMap(entry=>[[entry.key,entry.key],[slug(entry.title),entry.key]]));
 const canonical=value=>aliases.get(slug(String(value||"").replace(/^afterlogue-/,"")) )||String(value||"").replace(/^afterlogue-/,"");
 const signals=new Map();
 for(const [rawKey,rawRating] of toMap(impressions)){
  const key=canonical(rawKey);
  const rating=typeof rawRating==="string"?rawRating:rawRating?.rating;
  if(!weights.hasOwnProperty(rating)||!byKey.has(key))continue;
  signals.set(key,{key,rating,weight:weights[rating],favorite:false});
 }
 for(const value of favorites||[]){
  const key=canonical(typeof value==="string"?value:value?.title_key);
  if(!byKey.has(key))continue;
  if(signals.has(key)){
   const existing=signals.get(key);
   existing.favorite=true;
   if(existing.weight>0)existing.weight+=1.0;
  }else signals.set(key,{key,rating:null,weight:2.5,favorite:true});
 }
 const watch=new Set((watchlist||[]).map(v=>canonical(typeof v==="string"?v:v?.title_key)));
 // Watchlist titles can guide matching, but have less influence than Loved.
 // Existing ratings and favorites always take precedence.
 for(const key of watch){
   if(!signals.has(key)&&byKey.has(key))
     signals.set(key,{key,rating:null,weight:.85,favorite:false,watchlist:true});
 }
 const known=new Set([...signals.keys(),...(seen||[]).map(v=>canonical(typeof v==="string"?v:v?.title_key))]);
 const positives=[...signals.values()].filter(s=>s.weight>=1.5);
 const negatives=[...signals.values()].filter(s=>s.weight<0);
 const candidates=all.filter(entry=>entry.category===category&&!known.has(entry.key)&&!watch.has(entry.key));
 const profile=buildTasteProfile({entries:all,impressions,favorites,watchlist,timestamps});
 const scored=candidates.map(entry=>{
  const matched=[];
  const contributions=[];
  for(const signal of signals.values()){
   const source=byKey.get(signal.key);
   if(!source)continue;
   const sim=common(entry.facets,source.facets);
   const directlyMatched=entry.directMatches.includes(source.key)||entry.directMatches.includes(slug(source.title));
   const strength=sim.strength+(directlyMatched?2.2:0);
   if(strength<=0)continue;
   // Several titles in the same familiar genre do not overwhelm richer theme connections.
   const contribution=signal.weight*Math.min(strength,9);
   contributions.push({value:contribution,lane:storyLane(source),franchise:franchiseKey(source)});
   if(signal.weight>0&&(signal.weight>=1.5||signal.watchlist))matched.push({source,signal,similarity:sim,strength,contribution});
  }
  // Without prior feedback, respect the existing curated ordering.
  const coldStart=signals.size===0?Math.max(0,4-entry.position*.08):0;
  // Cap individual-title influence; use the whole Log's dimensions for
  // coherent long-term taste without popularity/volume takeover.
  // Cap correlated evidence from the same category. If someone logs 12
  // animations because Home displayed animations, 6 similar items must not
  // drown out a long-standing love of live-action / contemplative cinema.
  // Unknown source genres remain independent (never inferred).
  const byLane=new Map(),byFranchise=new Set(),strong=[];
  for(const item of contributions.filter(x=>x.value>0).sort((a,b)=>b.value-a.value)){
    const key=item.lane||Symbol("unclassified");
    if((byLane.get(key)||0)>=2)continue;
    const group=item.franchise;
    if(group&&group.startsWith("series:")&&byFranchise.has(group))continue;
    if(group&&group.startsWith("tmdb-collection:")&&byFranchise.has(group))continue;
    if(group&&group.startsWith("numbered:")&&byFranchise.has(group))continue;
    if(group&&(group.startsWith("series:")||group.startsWith("tmdb-collection:")||
      group.startsWith("numbered:")))byFranchise.add(group);
    byLane.set(key,(byLane.get(key)||0)+1);
    strong.push(item.value);
    if(strong.length>=6)break;
  }
  const adverse=contributions.filter(x=>x.value<0)
    .sort((a,b)=>a.value-b.value).slice(0,3);
  const directScore=strong.reduce((sum,value)=>sum+value,0)+
    adverse.reduce((sum,item)=>sum+item.value,0);
  const preference=tasteMatch(profile,entry.facets);
  // A small bounded boost for emerging interests; keep long-term ratings
  // substantially stronger than provisional Watchlist metadata.
  const interest=tasteMatch({dimensions:profile.interestDimensions},entry.facets);
  const interestBoost=Math.min(2.4,Math.max(0,interest.score*1.15));
  const score=directScore+preference.score*2+interestBoost;
  return {...entry,score:score+coldStart,preference,interest,
    matched:matched.sort((a,b)=>b.contribution-a.contribution)};
 });
 scored.sort((a,b)=>b.score-a.score||a.position-b.position||a.title.localeCompare(b.title));
 const ordered=[];
 const remaining=[...scored];
 while(remaining.length){
  // Gentle diversity control: avoid 5 films about the exact same subject.
  // Similarity to the user's preferences still matters far more.
  const window=remaining.slice(0,Math.min(10,remaining.length));
  let best=window[0],bestValue=-Infinity;
  for(const entry of window){
   const similarity=ordered.reduce((max,item)=>Math.max(max,common(entry.facets,item.facets).strength),0);
   const noveltyPenalty=similarity*.35;
   const value=entry.score-noveltyPenalty;
   if(value>bestValue){best=entry;bestValue=value;}
  }
  ordered.push(best);
  remaining.splice(remaining.indexOf(best),1);
 }
 return ordered.map(entry=>{
   // A direct TMDB recommendation linked to a film the member enjoyed is
   // more meaningful than an incidental overlap with another film.
   const directlyLinked=entry.matched.find(x=>
     (entry.directMatches||[]).includes(x.source.key)||
     (entry.directMatches||[]).includes(slug(x.source.title)));
   const strongest=directlyLinked||
     entry.matched.find(x=>x.similarity.sharedThemes.length||x.similarity.sharedTones.length||x.similarity.sharedGenre.length)||
     entry.matched[0];
   let why=null;
   if(strongest){
    const {source,signal,similarity}=strongest;
    const verb=signal.favorite&&!signal.rating?"saved":signal.rating==="Loved"?"loved":"liked";
    const intro=signal.watchlist?"Because you saved "+source.title+" to your Watchlist, ":
      "Because you "+verb+" "+source.title+", ";
    const theme=similarity.sharedThemes.slice(0,2).map(x=>x.replace(/-/g," "));
    if(theme.length)why=intro+"this story also explores "+(theme.length===2?theme.join(" and "):theme[0])+".";
    else if(similarity.sharedTones.length)why=intro+"this shares a "+similarity.sharedTones[0]+" tone.";
    else if(similarity.sharedDirectors.length)why=intro+"both stories share a director.";
    else if(similarity.sharedGenre.length)why=intro+"it offers another perspective on "+similarity.sharedGenre[0]+".";
    else if(directlyLinked)why=intro+"this title appears among stories recommended alongside it in the wider catalog.";
   }
   // A plot synopsis is not an explanation of taste. Be clear when there
   // is too little evidence to call a pick personalized.
   if(!why)why=entry.reason
     ? "An editorial selection: "+entry.reason
     : "From the Afterlogue collection. Share more impressions to see what connects the next story to your taste.";
   return {...entry,why,personalized:Boolean(strongest&&why.startsWith("Because you "))};
 });
}
// Presentation-level diversity for each five-card shelf. It only reorders
// already eligible, taste-matched candidates; it never invents a title,
// overrides a country/language filter, or turns an archive fallback into a
// personalized match. When the Log strongly favors one form or genre, trust it.
function storyLane(item){
 const genres=(item?.facets?.genres||[]).map(value=>String(value).toLowerCase());
 const has=value=>genres.includes(value);
 if(has("family"))return "family";
 if(has("animation"))return "animation";
 if(has("documentary"))return "documentary";
 if(has("horror"))return "horror";
 if(has("comedy"))return "comedy";
 if(has("thriller")||has("mystery")||has("crime"))return "suspense";
 if(has("romance"))return "romance";
 if(has("science fiction")||has("sci-fi & fantasy")||has("fantasy"))return "speculative";
 if(has("action")||has("adventure")||has("action & adventure"))return "adventure";
 if(has("drama"))return "drama";
 if(has("family"))return "family";
 return null; // Unknown genre is NOT evidence of a different type of film.
}
// A sequel collection is one narrative interest, not eight independent
// endorsements of an entire genre. Prefer TMDB collection IDs when available;
// known title stems also cover public recommendation search results that only
// contain the list-item fields (without expensive per-title detail lookups).
const familiarFranchises=[
 "monster high","halloweentown","harry potter","descendants","twilight",
 "the hunger games","star wars","star trek","the hobbit","the lord of the rings",
 "the maze runner","maze runner","the divergent series","divergent",
 "the chronicles of narnia","pirates of the caribbean","toy story",
 "shrek","kung fu panda","how to train your dragon","home alone",
 "jurassic park","jurassic world","the conjuring","scream",
 "final destination","mission impossible","fast and furious","john wick",
 "the mummy","transformers","ice age","the land before time",
 "high school musical","camp rock","the princess diaries","step up",
 "bring it on","american pie","the karate kid"
];
function franchiseKey(item){
 const id=Number(item?.collectionId||item?.collection_id);
 if(Number.isInteger(id)&&id>0)return "tmdb-collection:"+id;
 const title=String(typeof item==="string"?item:item?.title||"")
   .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 if(!title)return null;
 const match=familiarFranchises.find(base=>title===base||title.startsWith(base+" "));
 if(match)return "series:"+match;
 // Never infer a franchise from a bare trailing number. Titles such as
 // "Story 2" may be independent, and guessing caused unrelated films to
 // collapse. Explicit "Part II" is a meaningful sequel marker.
 const numbered=/^(.{4,}?)\s+(?:part|chapter|volume|episode)\s*(?:ii|iii|iv|v|vi|vii|[2-9])(?:\s|$)/.exec(title);
 if(numbered)return "numbered:"+slug(numbered[1]);
 return "film:"+slug(title);
}
// Broad fantasy/adventure form based on provider genres, not movie titles.
function spectacleAdventure(item){
 const genres=(item?.facets?.genres||item?.genres||[])
   .map(value=>String(value).toLowerCase());
 const has=value=>genres.includes(value);
 return has("fantasy")||has("sci-fi & fantasy")||
   ((has("adventure")||has("action & adventure"))&&
     (has("science fiction")||has("action")||has("family")||has("animation")));
}
function familyAudience(item){
 const names=(item?.facets?.genres||item?.genres||[])
   .map(value=>String(value).toLowerCase());
 return names.includes("family")&&
  names.some(value=>["family","animation","fantasy","adventure",
    "comedy","action & adventure"].includes(value));
}
function obviousFollowup(item){
 const title=String(typeof item==="string"?item:item?.title||"")
   .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 if(!title)return false;
 const known=familiarFranchises.find(base=>title===base||title.startsWith(base+" "));
 if(known)return title!==known;
 return /^.{4,}\s+(?:part|chapter|volume|episode)\s*(?:ii|iii|iv|v|vi|vii|[2-9])(?:\s|$)/.test(title)
   || (/^.{5,}\s+[2-9]$/.test(title)&&
     (familyAudience(item)||spectacleAdventure(item))); // Genre-supported sequel, not any numbered title
}
function balanceShelves({entries=[],profileEntries=[],impressions={},favorites=[],
  category="movies",size=5}={}){
 const eligible=Array.isArray(entries)?entries:[];
 const width=Math.max(1,Math.min(10,Math.floor(Number(size)||5)));
 if(eligible.length<=1)return [...eligible];
 const sources=new Map();
 for(const item of profileEntries){
   if(item?.category!==category||!item.key)continue;
   sources.set(item.key,item);
   sources.set(slug(item.title),item);
 }
 const positive=new Set();
 for(const [rawKey,value] of toMap(impressions)){
   const rating=typeof value==="string"?value:value?.rating;
   if(rating==="Loved"||rating==="Liked")positive.add(String(rawKey).replace(/^afterlogue-/,""));
 }
 for(const item of favorites){
   const key=String(typeof item==="string"?item:item?.title_key||"").replace(/^afterlogue-/,"");
   const rating=toMap(impressions).get("afterlogue-"+key)||toMap(impressions).get(key);
   if(rating!=="Not for me"&&rating!=="Okay")positive.add(key);
 }
 const counts=new Map();
 let known=0;
 for(const key of positive){
   const source=sources.get(key)||sources.get(slug(key));
   if(!source)continue;
   const lane=storyLane(source);
   if(!lane)continue;
   known++;
   counts.set(lane,(counts.get(lane)||0)+1);
 }
 const dominant=known>=7?[...counts].filter(([,count])=>count/Math.max(known,positive.size)>=.78)
   .map(([lane])=>lane):[];
 const knownFamily=[...positive].filter(key=>{
   const source=sources.get(key)||sources.get(slug(key));
   return source&&familyAudience(source);
 }).length;
 const familyDominant=known>=7&&knownFamily/Math.max(known,positive.size)>=.78;
 const familyCap=familyDominant?width:2;
 // Measure a broad fantasy/adventure preference across distinct franchises,
 // rather than treating a dozen franchise installments as twelve interests.
 const distinctPositive=new Map();
 for(const key of positive){
   const source=sources.get(key)||sources.get(slug(key));
   if(source)distinctPositive.set(franchiseKey(source)||source.key||slug(source.title),source);
 }
 const uniqueSources=[...distinctPositive.values()];
 const uniqueKnown=uniqueSources.filter(item=>storyLane(item));
 const spectacleCount=uniqueKnown.filter(spectacleAdventure).length;
 const hasBroadLog=uniqueKnown.length>=7&&uniqueKnown.some(item=>!spectacleAdventure(item));
 const spectacleDominant=uniqueKnown.length>=7&&spectacleCount/uniqueKnown.length>=.78;
 const spectacleCap=hasBroadLog&&!spectacleDominant?2:width;
 const sequelCap=familyDominant?width:1;
 const remaining=[...eligible],result=[];
 while(remaining.length){
   const shelf=[];
   while(shelf.length<width&&remaining.length){
     const leader=remaining[0];
     const laneCounts=new Map();
     for(const chosen of shelf){
       const lane=storyLane(chosen);
       if(lane)laneCounts.set(lane,(laneCounts.get(lane)||0)+1);
     }
     const mainLane=storyLane(leader);
     const cap=dominant.includes(mainLane)?width:2;
     const familyCount=shelf.filter(familyAudience).length;
     const spectacleCount=shelf.filter(spectacleAdventure).length;
     const sequelCount=shelf.filter(obviousFollowup).length;
     const franchiseUsed=new Set(shelf.map(franchiseKey));
     const tooManyFamily=familyAudience(leader)&&familyCount>=familyCap;
     const tooManySpectacle=spectacleAdventure(leader)&&spectacleCount>=spectacleCap;
     const tooManySequels=obviousFollowup(leader)&&sequelCount>=sequelCap;
     const repeatedFranchise=franchiseUsed.has(franchiseKey(leader));
     let nextIndex=0;
     if(tooManyFamily||tooManySpectacle||tooManySequels||repeatedFranchise||
       (mainLane&&(laneCounts.get(mainLane)||0)>=cap)){
       // Ranker scores can be highly concentrated even when multiple
       // genuinely related, positively scored genres remain available.
       // Requiring 38% of an animation's score hid most live-action films.
       const minimum=Number.isFinite(leader.score)&&leader.score>0
         ?Math.max(6,leader.score*.16):0;
       // Only comparable, qualified suggestions may break a run of one style.
       // Do not sacrifice relevance merely to fill a diversity quota.
       const alternative=remaining.findIndex((candidate,index)=>{
         if(!index||index>220)return false; // Extra source pool can exceed 70 titles.
         if(Boolean(candidate.starter)!==Boolean(leader.starter))return false;
         if(franchiseUsed.has(franchiseKey(candidate)))return false;
         if(familyAudience(candidate)&&familyCount>=familyCap)return false;
         if(spectacleAdventure(candidate)&&spectacleCount>=spectacleCap)return false;
         if(obviousFollowup(candidate)&&sequelCount>=sequelCap)return false;
         const lane=storyLane(candidate);
         if(!lane)return false;
         if((laneCounts.get(lane)||0)>=(dominant.includes(lane)?width:2))return false;
         if(lane===mainLane&&!tooManyFamily&&!tooManySpectacle&&!tooManySequels&&!repeatedFranchise)return false;
         if(minimum&&(!Number.isFinite(candidate.score)||candidate.score<minimum))return false;
         return true;
       });
       if(alternative>=0)nextIndex=alternative;
     }
     shelf.push(remaining.splice(nextIndex,1)[0]);
   }
   result.push(...shelf);
 }
 return result;
}
// Keep recent, strongly positive Log titles in the anchor seats, while giving
// every older positive title a turn as the Log grows. This selects names only:
// it never fabricates titles, downloads metadata or changes TMDB eligibility.
// Balance the TMDB retrieval sources, not merely the displayed five.
// Similar sequels in a Log are evidence of one series, not permission to
// abandon the person's independent cinema and other distinct preferences.
function balanceRetrievalSeeds(selected,all,cap,shift){
 if(!selected.length||all.length<=cap)return selected.slice(0,cap);
 const recognized=all.filter(x=>storyLane(x)!==null);
 const unrelated=recognized.filter(x=>!familyAudience(x));
 const familyHeavy=recognized.length>=7&&
   recognized.filter(familyAudience).length/recognized.length>=.78;
 const familyCap=unrelated.length>=3&&!familyHeavy?2:cap;
 const ordered=[...selected,...all.slice(shift),...all.slice(0,shift)];
 const chosen=[],included=new Set(),groups=new Set();
 function add(item,enforce){
   if(!item||included.has(item.title))return false;
   const group=franchiseKey(item);
   if(enforce&&groups.has(group)&&group&&
      !group.startsWith("film:"))return false;
   if(enforce&&familyAudience(item)&&chosen.filter(familyAudience).length>=familyCap)return false;
   chosen.push(item);included.add(item.title);
   if(group)groups.add(group);
   return true;
 }
 // First preserve the dated/rotated anchors that fit the mixed Log, then
 // replace repetitions from the unused Log. Relax constraints only when the
 // user genuinely has no alternative positive titles to draw from.
 for(const item of selected)add(item,true);
 for(const item of ordered){
   if(chosen.length>=cap)break;
   add(item,true);
 }
 for(const item of ordered){
   if(chosen.length>=cap)break;
   add(item,false);
 }
 return chosen.slice(0,cap);
}
function selectSeeds({sources=[],limit=4,rotation=0,category="movies"}={}){
 const cap=Math.max(0,Math.min(8,Math.floor(Number(limit)||0)));
 if(!cap)return [];
 const unique=new Set();
 const ranked=(Array.isArray(sources)?sources:[]).flatMap((source,index)=>{
   const title=String(source?.title||"").trim();
   const id=slug(title);
   if(!id||unique.has(id))return [];
   unique.add(id);
   const strength=source.rating==="Loved"?3:source.rating==="Liked"?2:1;
   const timestamp=Date.parse(String(source.timestamp||source.updatedAt||""));
   return [{title,strength,index,facets:source.facets||{},
     timestamp:Number.isFinite(timestamp)?timestamp:null}];
 }).sort((a,b)=>b.strength-a.strength||a.index-b.index);
 if(ranked.length<=cap)return ranked.map(source=>source.title);
 const shift=Math.abs(Math.floor(Number(rotation)||0))%ranked.length;
 // 117 movies added within days represent a much longer history of taste.
 // Stratify by ALL positive entries, not only by rating timestamp age.
 if(ranked.length>=24){
   const history=[...ranked].sort((a,b)=>a.index-b.index);
   const fractions=[0,.5,.25,.75,.125,.625,.375,.875];
   const groups=new Set(),used=new Set(),lanes=new Map(),chosen=[];
   const wiggle=Math.floor(Math.abs(Math.floor(Number(rotation)||0))%5);
   for(const fraction of fractions.slice(0,cap)){
     let target=Math.round(fraction*(history.length-1));
     target=Math.min(history.length-1,target+wiggle);
     const options=history.map((item,i)=>({
       item,i,distance:Math.abs(i-target),
       lane:storyLane(item),group:franchiseKey(item)
     })).filter(x=>!used.has(x.item.title));
     const freshSeries=options.filter(x=>!x.group||x.group.startsWith("film:")||!groups.has(x.group));
     const pool=freshSeries.length?freshSeries:options;
     if(!pool.length)break;
     // Prefer different verified story forms near each historical segment.
     const window=Math.max(6,Math.floor(history.length/8));
     const nearby=pool.filter(x=>x.distance<=window);
     const considered=nearby.length?nearby:pool;
     considered.sort((a,b)=>
       Number(Boolean(a.lane&&(lanes.get(a.lane)||0)>=2))-
         Number(Boolean(b.lane&&(lanes.get(b.lane)||0)>=2))||
       a.distance-b.distance||
       b.item.strength-a.item.strength||
       a.i-b.i);
     const next=considered[0];
     chosen.push(next.item);
     used.add(next.item.title);
     if(next.group&&!next.group.startsWith("film:"))groups.add(next.group);
     if(next.lane)lanes.set(next.lane,(lanes.get(next.lane)||0)+1);
   }
   return chosen.map(item=>item.title);
 }
 // With actual dated Log evidence, use both recent and historical viewing.
 // The recent two Loved titles should not permanently occupy half of the
 // TMDB retrieval seeds when the older half describes a different taste.
 const dated=ranked.filter(source=>source.timestamp!==null)
   .sort((a,b)=>b.timestamp-a.timestamp);
 if(dated.length>=6&&dated[0].timestamp-dated.at(-1).timestamp>=14*86400000){
   const newest=dated.slice(0,Math.max(1,Math.ceil(dated.length/3)));
   const historic=dated.slice(Math.floor(dated.length/2));
   const middle=dated.slice(Math.ceil(dated.length/3),Math.floor(dated.length/2));
   const chosen=[];
   const choose=pool=>{
     const remaining=pool.filter(item=>!chosen.includes(item));
     if(!remaining.length)return;
     const rotated=[...remaining.slice(shift%remaining.length),
       ...remaining.slice(0,shift%remaining.length)];
     const laneCounts=new Map();
     chosen.forEach(item=>{
       const lane=storyLane(item);
       if(lane)laneCounts.set(lane,(laneCounts.get(lane)||0)+1);
     });
     const available=rotated.filter(item=>{
       const lane=storyLane(item);
       return !lane||(laneCounts.get(lane)||0)<2;
     });
     // Prefer a different evidenced film form, without declaring unknown
     // metadata to be proof of diversity or discarding an eligible title.
     const poolToUse=available.length?available:rotated;
     const distinct=poolToUse.find(item=>{
       const lane=storyLane(item);
       return lane&&!(laneCounts.get(lane)||0);
     });
     chosen.push(distinct||poolToUse[0]);
   };
   choose(newest);choose(historic);choose(middle);
   // The remaining slot rotates throughout the *entire* positive Log.
   const byRotation=[...ranked.slice(shift),...ranked.slice(0,shift)];
   while(chosen.length<cap){
     const before=chosen.length;
     choose(byRotation);
     if(chosen.length===before)break;
   }
   return balanceRetrievalSeeds(chosen,ranked,cap,shift).map(item=>item.title);
 }

 const pickPool=ranked.slice(0,Math.min(2,cap));
 const remaining=ranked.slice(pickPool.length);
 const turn=remaining.length?shift%remaining.length:0;
 const rotated=[...remaining.slice(turn),...remaining.slice(0,turn)];
 // Use actual rated-title genres to keep candidate RETRIEVAL broad as
 // well as arranging the final shelf. If too few genres are known, retain
 // the proven recency + rotation behavior rather than guessing by title.
 const known=ranked.filter(source=>storyLane(source));
 const animationShare=known.filter(source=>storyLane(source)==="animation").length/Math.max(1,ranked.length);
 const animationDominates=known.length>=7&&animationShare>=.78;
 const varied=known.length>=3&&!animationDominates;
 if(!varied)return balanceRetrievalSeeds([...pickPool,...rotated.slice(0,cap-pickPool.length)],ranked,cap,shift).map(x=>x.title);
 const chosen=[],remainingAll=[...pickPool,...rotated];
 while(chosen.length<cap&&remainingAll.length){
   const counts=new Map();
   for(const member of chosen){
     const lane=storyLane(member);
     if(lane)counts.set(lane,(counts.get(lane)||0)+1);
   }
   const choice=remainingAll.findIndex((source,index)=>{
     const lane=storyLane(source);
     if(!lane)return true; // Broaden the retrieval seeds when the top genre is saturated.
     // This is exploration, not a claim about an unknown title's genre.
     return (counts.get(lane)||0)<2;
   });
   const at=choice>=0?choice:0;
   chosen.push(remainingAll.splice(at,1)[0]);
 }
 return balanceRetrievalSeeds(chosen,ranked,cap,shift).map(x=>x.title);
}
// Plan public TMDB metadata requests from the MEMBER'S RATED LOG FIRST.
// Editorial catalog films are already enriched locally and have non-TMDB keys.
// Separate later Watchlist curiosity from watched/reviewed preferences.
// This only uses public title IDs; neither ratings nor private notes are sent
// to the metadata service.
function planTasteFeatureKeys({
 firstMovieKeys=[],firstTvKeys=[],positiveMovieKeys=[],positiveTvKeys=[],
 ratedKeys=[],favoriteKeys=[],watchlistKeys=[],limit=256
}={}){
 const output=[],seen=new Set();
 const max=Math.max(0,Math.min(256,Math.floor(Number(limit)||0)));
 const include=keys=>{
  for(const key of keys||[]){
   if(output.length>=max)return;
   if(typeof key!=="string"||!/^tmdb-(movie|tv)-[1-9][0-9]{0,9}$/.test(key)
     ||seen.has(key))continue;
   seen.add(key);output.push(key);
  }
 };
 // A fast first batch supports mixed movie/TV retrieval. Then ALL rated
 // film/TV evidence comes before any unwatched Watchlist-only title.
 include(firstMovieKeys);
 include(firstTvKeys);
 include(positiveMovieKeys);
 include(positiveTvKeys);
 include(ratedKeys);
 include(favoriteKeys);
 include(watchlistKeys);
 return output;
}
// Diagnose *returned* public metadata, never merely IDs placed into a queue.
// Counts only: no member ID, ratings, private notes, or movie lists leave the
// client through this helper. Editorial titles are measured separately.
function tasteFeatureCoverage({keys=[],records=[],impressions={},watchlist=[],
  requestStats={}}={}){
 const isTmdb=key=>/^tmdb-(movie|tv)-[1-9][0-9]{0,9}$/.test(key);
 const clean=key=>String(key||"").replace(/^afterlogue-/,"");
 const scheduled=[...new Set(keys.map(clean).filter(isTmdb))];
 const available=new Map((records||[]).filter(x=>x&&isTmdb(x.key))
   .map(x=>[x.key,x]));
 const ratings=new Map(toMap(impressions));
 const rated=new Map([...ratings].map(([key,value])=>[
   clean(key),typeof value==="string"?value:value?.rating
 ]).filter(([,rating])=>["Loved","Liked","Okay","Not for me"].includes(rating)));
 const saved=new Set((watchlist||[]).map(value=>
   clean(typeof value==="string"?value:value?.title_key||value?.key)));
 const summarize=filter=>{
   const group=scheduled.filter(filter);
   const report={planned:group.length,returned:0,genres:0,themes:0,tones:0,
     storyTags:0,genreOnly:0,empty:0,missing:0};
   for(const key of group){
     const row=available.get(key);
     if(!row){report.missing++;continue;}
     report.returned++;
     const genres=Array.isArray(row.genres)&&row.genres.some(Boolean);
     const themes=Array.isArray(row.themes)&&row.themes.some(Boolean);
     const tones=Array.isArray(row.tones)&&row.tones.some(Boolean);
     if(genres)report.genres++;
     if(themes)report.themes++;
     if(tones)report.tones++;
     if(themes||tones)report.storyTags++;
     if(genres&&!themes&&!tones)report.genreOnly++;
     if(!genres&&!themes&&!tones)report.empty++;
   }
   return report;
 };
 const positive=new Set([...rated].filter(([,v])=>v==="Loved"||v==="Liked").map(([k])=>k));
 const otherRated=new Set([...rated].filter(([,v])=>v==="Okay"||v==="Not for me").map(([k])=>k));
 return {
   all:summarize(()=>true),
   ratedMovies:summarize(key=>key.startsWith("tmdb-movie-")&&rated.has(key)),
   ratedTV:summarize(key=>key.startsWith("tmdb-tv-")&&rated.has(key)),
   positive:summarize(key=>positive.has(key)),
   neutralOrNegative:summarize(key=>otherRated.has(key)),
   watchlistOnly:summarize(key=>saved.has(key)&&!rated.has(key)),
   editorialRated:[...rated.keys()].filter(key=>!isTmdb(key)).length,
   requestStats:{
     queued:Number(requestStats.queued)||scheduled.length,
     attempted:Number(requestStats.attempted)||0,
     successfulBatches:Number(requestStats.successfulBatches)||0,
     failedBatches:Number(requestStats.failedBatches)||0,
     notAttempted:Number(requestStats.notAttempted)||0,
     elapsedMs:Number(requestStats.elapsedMs)||0
   }
 };
}
root.AfterlogueRecommendationEngine=Object.freeze({version:"2.9",normalizeEntries,planTasteFeatureKeys,tasteFeatureCoverage,rank,buildTasteProfile,tasteMatch,selectSeeds,balanceShelves,storyLane,franchiseKey,familyAudience,spectacleAdventure,obviousFollowup,facets:tags});
})(typeof window!=="undefined"?window:globalThis);
