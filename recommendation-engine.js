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
 .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const overlap=(a=[],b=[])=>a.filter(x=>b.includes(x));
const common=(a,b)=>{
 const sharedThemes=overlap(a.themes,b.themes);
 const sharedTones=overlap(a.tones,b.tones);
 const sharedGenre=overlap(a.genres,b.genres);
 const sharedPace=a.pace&&b.pace&&a.pace===b.pace;
 // Broad concepts like identity, control, and family appear across very
 // different films. Require a richer connection before they dominate ranking.
 const broad=new Set(["identity","family","control","belonging","survival","love","friendship","loss"]);
 const themeScore=sharedThemes.reduce((sum,theme)=>sum+(broad.has(theme)?.65:1.8),0);
 const toneScore=sharedTones.length*1.25;
 const genreScore=Math.min(sharedGenre.length,2)*1.1;
 return {sharedThemes,sharedTones,sharedGenre,sharedPace,
  strength:themeScore+toneScore+genreScore+(sharedPace?.35:0)};
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
function rank({entries,category,impressions={},favorites=[],watchlist=[],seen=[]}){
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
 const known=new Set([...signals.keys(),...(seen||[]).map(v=>canonical(typeof v==="string"?v:v?.title_key))]);
 const positives=[...signals.values()].filter(s=>s.weight>=1.5);
 const negatives=[...signals.values()].filter(s=>s.weight<0);
 const candidates=all.filter(entry=>entry.category===category&&!known.has(entry.key)&&!watch.has(entry.key));
 const scored=candidates.map(entry=>{
  const matched=[];
  let score=0;
  for(const signal of signals.values()){
   const source=byKey.get(signal.key);
   if(!source)continue;
   const sim=common(entry.facets,source.facets);
   const directlyMatched=entry.directMatches.includes(source.key)||entry.directMatches.includes(slug(source.title));
   const strength=sim.strength+(directlyMatched?2.2:0);
   if(strength<=0)continue;
   // Several titles in the same familiar genre do not overwhelm richer theme connections.
   const contribution=signal.weight*Math.min(strength,9);
   score+=contribution;
   if(signal.weight>0&&signal.weight>=1.5)matched.push({source,signal,similarity:sim,strength,contribution});
  }
  // Without prior feedback, respect the existing curated ordering.
  const coldStart=signals.size===0?Math.max(0,4-entry.position*.08):0;
  return {...entry,score:score+coldStart,matched:matched.sort((a,b)=>b.contribution-a.contribution)};
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
    const intro="Because you "+verb+" "+source.title+", ";
    const theme=similarity.sharedThemes.slice(0,2).map(x=>x.replace(/-/g," "));
    if(theme.length)why=intro+"this story also explores "+(theme.length===2?theme.join(" and "):theme[0])+".";
    else if(similarity.sharedTones.length)why=intro+"this shares a "+similarity.sharedTones[0]+" tone.";
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
root.AfterlogueRecommendationEngine=Object.freeze({version:"1.1",normalizeEntries,rank,facets:tags});
})(typeof window!=="undefined"?window:globalThis);
