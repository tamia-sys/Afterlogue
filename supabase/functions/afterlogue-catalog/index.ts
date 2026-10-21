/**
 * Afterlogue / scalable public film + TV catalogue.
 *
 * Configure TMDB_READ_ACCESS_TOKEN as a Supabase Edge Function secret.
 * Do NOT place the TMDB token in frontend JavaScript or commit it to Git.
 * Movies and shows remain read-only; this function never reads member data.
 *
 * Public endpoint supports the guest Explore experience.
 * TMDB requires attribution and may require commercial licensing.
 */
type Media = "movie" | "tv";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };
const TMDB = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p/";
const GENRES: Record<string, number> = {
  Action:28, Adventure:12, Animation:16, Comedy:35, Crime:80,
  Documentary:99, Drama:18, Family:10751, Fantasy:14, History:36,
  Horror:27, Music:10402, Mystery:9648, Romance:10749,
  "Science Fiction":878, Thriller:53, War:10752, Western:37,
};
const TV_GENRES: Record<string, number> = {
  Animation:16, Comedy:35, Crime:80, Documentary:99, Drama:18,
  Family:10751, Kids:10762, Mystery:9648, Reality:10764,
  "Sci-Fi & Fantasy":10765, "Action & Adventure":10759,
  "War & Politics":10768, Western:37,
};
const codes: Record<number,string> = Object.fromEntries(
  Object.entries({...TV_GENRES, ...GENRES}).map(([name,id]) => [id,name])
);
const response = (body: unknown,status = 200) =>
  new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,"Cache-Control":"public, max-age=300"}});
const number = (v: unknown,lo:number,hi:number,fall:number) =>
  typeof v === "number" && Number.isInteger(v) ? Math.max(lo,Math.min(hi,v)) : fall;
const safePicture = (path: unknown,size = "w500") =>
  typeof path === "string" && /^\/[A-Za-z0-9_./-]+\.(?:jpg|png|webp)$/.test(path) ?
    IMAGE+size+path : null;
const yearOf = (date: unknown) => typeof date === "string" ? Number(date.slice(0,4)) || null : null;
const formatRuntime = (value: unknown): string | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n >= 60 ? Math.floor(n/60)+"h "+String(n%60).padStart(2,"0")+"m" : n+"m";
};
const concise = (val: unknown) => typeof val === "string" ? val.trim().slice(0,1400) : "";

/* TMDB is community-maintained: these checks are editorial eligibility
   heuristics, NOT proof of accreditation or professional release. */
function eligible(v:Record<string,unknown>,media:Media,minVotes=35){
 const title=String(media==="tv"?v.name:v.title||"").trim();
 const date=String(media==="tv"?v.first_air_date:v.release_date||"");
 const votes=Number(v.vote_count)||0,average=Number(v.vote_average)||0;
 const genres=Array.isArray(v.genre_ids)?v.genre_ids.map(Number):[];
 if(!Number.isInteger(Number(v.id))||!title||title.length>220)return false;
 if(!v.poster_path||!v.overview||String(v.overview).trim().length<55)return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>new Date().toISOString().slice(0,10))return false;
 if(v.adult===true||v.video===true||votes<minVotes||average<5.8)return false;
 if(/^(untitled|test movie|test film|sample movie|trailer only)$/i.test(title))return false;
 if(media==="tv"&&genres.some(g=>[10763,10764,10767].includes(g)))return false;
 return true;
}
const hashSeed=(str:string)=>{
 let h=2166136261;
 for(const ch of str){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
};
const GENRE_MOODS:Record<string,{movie:number[][],tv:number[][],caption:string}>={
 yearning:{movie:[[10749,18],[18],[10749]],tv:[[18],[10765,18]],caption:"Romance, distance, and difficult connections."},
 winding:{movie:[[18],[99],[10751,35]],tv:[[18],[35]],caption:"Reflective and softer-paced stories."},
 friday:{movie:[[35],[28,53],[9648,53]],tv:[[35],[10759,9648]],caption:"Lively, suspenseful or playful stories."},
 fall:{movie:[[18,10749],[18,35],[16,10751],[18,9648],[10749]],tv:[[18],[35,18],[10765,18]],caption:"Woodlands, campus life, city romance, warmth and autumn melancholy — not just Halloween."},
 holidays:{movie:[[10751,35],[10749,35],[14]],tv:[[35,10751],[10751]],caption:"Warmth, family and seasonal atmosphere."},
 unexpected:{movie:[[878,9648],[14,18],[16],[99]],tv:[[10765,9648],[16],[18]],caption:"An optional detour beyond familiar genres."}
};


/* Exact subject tags, not genres, decide whether a title belongs in a mood. */
const MOOD_TOPICS:Record<string,{labels:string[];reason:string}>={
 holidays:{labels:["christmas","christmas eve","christmas holiday","thanksgiving","new year's eve","new year","hanukkah","diwali","lunar new year","santa claus","valentine's day","easter","halloween","st. patrick's day","leap year","leap day","ramadan","eid al-fitr","festival of lights","mid-autumn festival"],reason:"A story connected to a holiday or seasonal occasion"},
 yearning:{labels:["unrequited love","long distance relationship","first love","forbidden love","lost love","unfulfilled love"],reason:"A story about longing and connection"},
 winding:{labels:["slice of life","self discovery","small town","healing","friendship","everyday life","feel-good"],reason:"A reflective story for winding down"},
 friday:{labels:["party","night out","road trip","heist","nightclub","music festival","concert","dance party"],reason:"An energetic Friday-night story"},
 fall:{labels:["autumn","fall season","falling leaves","boarding school","college campus","small town","bookshop","forest","harvest","halloween"],reason:"A story with a warm, literary, reflective, woodland or eerie autumn atmosphere"},
 unexpected:{labels:["surrealism","alternate reality","time travel","parallel universe","absurdism","experimental film","dream world"],reason:"A surprising or unconventional story"}
};
const keywordCache=new Map<string,{id:number,expires:number}>();
async function moodKeywordIds(mood:string,token:string):Promise<number[]>{
 // Cap cold-start keyword lookups; distant topics remain discoverable
 // through the untagged narrative/genre search streams.
 const allLabels=MOOD_TOPICS[mood]?.labels||[];
 const labels=mood==="holidays"
   ?[...new Set([allLabels[0],allLabels[3],allLabels[5],allLabels[6],allLabels[7],allLabels[8],allLabels[10],allLabels[13],allLabels[17],allLabels[20]].filter(Boolean))]
   :allLabels.slice(0,7);
 const results=await Promise.allSettled(labels.map(async label=>{
  const cached=keywordCache.get(label);
  if(cached&&cached.expires>Date.now())return cached.id;
  const resp=await tmdb("/search/keyword",new URLSearchParams({query:label,page:"1"}),token);
  const normalized=(s:unknown)=>String(s||"").toLowerCase().trim().replace(/’/g,"'");
  const exact=(resp.results||[]).find((v:Record<string,unknown>)=>normalized(v.name)===normalized(label));
  const id=Number(exact?.id)||0;
  keywordCache.set(label,{id,expires:Date.now()+6*60*60*1000});
  return id;
 }));
 return [...new Set(results.filter((v):v is PromiseFulfilledResult<number>=>v.status==="fulfilled")
  .map(v=>v.value).filter(v=>Number.isInteger(v)&&v>0))];
}

/* The holidays need an explicit story connection. A keyword-only match can
 * reflect one incidental scene (and is not sufficient). */
function holidayEvidence(v:Record<string,unknown>):string|null{
 const title=String(v.title||v.name||"");
 const overview=String(v.overview||"");
 const holidaySubjects=[
  {label:"Christmas",pattern:/\bchristmas\b|\bsanta claus\b|\bsanta's\b|\bchristmas eve\b|\bnorth pole\b|\breindeer\b/i},
  {label:"Thanksgiving",pattern:/\bthanksgiving\b/i},
  {label:"New Year's",pattern:/\bnew year(?:['’]s)?(?: eve| day)?\b/i},
  {label:"Hanukkah",pattern:/\bhanukkah\b|\bchanukah\b/i},
  {label:"Diwali",pattern:/\bdiwali\b/i},
  {label:"Lunar New Year",pattern:/\blunar new year\b|\bchinese new year\b/i},
  {label:"Valentine’s Day",pattern:/\bvalentine(?:[’\']s)? day\b|\bvalentine(?:[’\']s)?\b/i},
  {label:"Easter",pattern:/\beaster\b/i},
  {label:"Halloween",pattern:/\bhalloween\b|\btrick.or.treat\b/i},
  {label:"St. Patrick’s Day",pattern:/\bst[.]? patrick(?:[’\']s)? day\b/i},
  {label:"Leap Day",pattern:/\bleap day\b|\bleap year\b|\bfebruary 29(?:th)?\b|\bfeb[.]? 29\b/i},
  {label:"Eid",pattern:/\beid al.fitr\b|\beid al.adha\b|\beid celebrations?\b/i},
  {label:"Diwali",pattern:/\bdiwali\b|\bdeepavali\b/i},
  {label:"Ramadan",pattern:/\bramadan\b/i},
  {label:"holiday season",pattern:/\bduring the holidays\b|\bfor the holidays\b|\bover the holidays\b|\bholiday season\b|\bholiday spirit\b|\bholiday cheer\b|\bholiday party\b|\bholiday festivities\b|\bholiday celebrations\b/i}
 ];
 for(const event of holidaySubjects){
  if(event.pattern.test(title))return "The title explicitly refers to "+event.label+".";
  if(event.pattern.test(overview))return "The synopsis explicitly references "+event.label+".";
 }
 return null;
}
// Stronger than a genre label, but not an AI claim about emotional tone.
// Only cite the synopsis or topic tag if it actually contains the evidence.
function narrativeMoodEvidence(mood:string,details:Record<string,unknown>,tag:string):string|null{
 const synopsis=String(details.overview||"");
 if(mood==="holidays")return holidayEvidence(details);
 const patterns:Record<string,RegExp>={
  yearning:/\bunrequited\b|\bforbidden love\b|\bsecret(ly)? in love\b|\blong.distance\b|\bheartbreak\b|\bsecond chance\b|\blost love\b|\bfalls? in love\b|\bfalling in love\b|\brelationship\b|\breunite\b|\bromance\b|\bromantic\b|\blongs? for\b|\byearns? for\b|\baffair\b/i,
  winding:/\bquiet\b|\breflect\b|\bslice of life\b|\bday.to.day\b|\beveryday\b|\bsmall town\b|\bfriendship\b|\bhealing\b|\bself.discovery\b|\bfinds? (him|her|them)self\b|\bheartwarming\b|\bslow life\b|\bfamily bonds\b/i,
  friday:/\bparty\b|\bnight out\b|\bheist\b|\badventure\b|\bchase\b|\broad trip\b|\bconcert\b|\bnightclub\b|\bdance\b|\bcelebrat\b|\bthrilling\b|\bwild night\b/i,
  fall:/\b(autumn|fall season|falling leaves|harvest|halloween|campus|boarding school|university|small town|bookshop|bookstore|forest|woodland|fog|misty|gothic|poetry|haunted|spooky)\b/i,
  unexpected:/\bsurreal\b|\btime travel\b|\balternate reality\b|\bparallel universe\b|\bweird\b|\bstrange\b|\bbizarre\b|\babsurd\b|\botherworldly\b|\bdream world\b/i
 };
 const p=patterns[mood];const match=p?.exec(synopsis);
 if(match)return "The synopsis features "+match[0].toLowerCase()+", fitting this mood.";
 if(tag)return 'The film is tagged “'+tag+'” in the catalog.';
 return null;
}

/* Mood experience v1.
 * Research-informed editorial rules, NOT a trained AI model or an objective
 * psychological measurement of the film. Signals come from public plot
 * descriptions, catalog topic tags and genre, not scraped review text.
 *
 * Distinguish "topic is present" from "the viewing experience matches".
 * Never claim scene-level facts that do not appear in available evidence.
 */
type MoodAssessment={score:number;reason:string;lane:string;energy:string;fitVersion:string};
function moodExperience(
 mood:string,film:Record<string,unknown>,tagNames:string[],
 pace:string,editorialReason:string|null
):MoodAssessment{
 const title=String(film.title||film.name||"");
 const story=String(film.overview||"").toLowerCase();
 const tags=tagNames.map(x=>x.toLowerCase());
 const ids=(film.genres||[]).map((x:Record<string,unknown>)=>Number(x.id));
 const tagged=(p:RegExp)=>tags.some(t=>p.test(t));
 const has=(...g:number[])=>g.some(x=>ids.includes(x));
 const cue=(p:RegExp)=>p.test(story);
 let score=0,reason="",lane="other";
 const signals:Array<{points:number;why:string;lane:string}>=[];
 function add(on:boolean,points:number,why:string,group:string){
  if(!on)return;
  score+=points;
  if(points>0&&why)signals.push({points,why,lane:group});
 }
 const bleak=cue(/\b(grief|mourning|tragic|tragedy|depression|depressed|devastat|suicid|hopeless|despair|terminal illness|mourning|abuse|brutal murder|domestic violence|dysfunction|estranged|family crisis)\b/i);
 const frantic=cue(/\b(chaos|chaotic|heist|game goes wrong|goes awry|party game|nightclub|wild night|thrilling|adventure|chase|murder mystery|killer|race against time|hilarious|cat.and.mouse|survive the night|unexpected twist|out of control)\b/i);
 const tender=cue(/\b(tender|bittersweet|gentle|intimate|reflective|quiet|contemplat|wistful|melanchol|everyday|ordinary life|slice of life|heartwarming|reconnect|self.discovery)\b/i);
 const distressing=cue(/\b(disappear|disappeared|missing daughters?|vanish|violence|trauma|traumatic|terroris|radicaliz|war crimes|torture|abduction|genocide|sexual assault|violent assault|domestic abuse|death row|execution|penitentiary|capital punishment|killing two|convicted of murdering)\b/i);
 const light=cue(/\b(comedy|comedic|funny|hilarious|playful|celebrat|uplifting|joyful|witty|adventure|laughter)\b/i);
 if(mood==="yearning"){
  add(cue(/\b(unrequited|forbidden|secret love|love across|lovers? separated|separated by|long.distance|apart|years apart|heartbreak|heartbroken|lost love|yearn|longing|impossible love|love against|reunite|cannot be together|struggle to be together|unfulfilled|not meant to be)\b/i),8,
   "Distance or an obstacle between people gives this story genuine longing.","distance");
  add(tagged(/\b(unrequited love|forbidden love|lost love|long distance relationship|unfulfilled love)\b/i),7,
   "Its documented theme is love complicated by distance, loss or impossibility.","complicated love");
  add(cue(/\b(lonely|loneliness|isolation|isolated|unspoken|secret feelings|desire|miss(es|ing)? (him|her|them)|grapples? with (love|feelings)|cannot forget)\b/i),5,
   "Unspoken feelings or isolation give the relationships emotional tension.","unspoken feelings");
  add(tagged(/\bfirst love\b/i),5,
   "The uncertainty and intensity of first love fit a yearning mood.","first love");
  add(cue(/\b(falls? in love|falling in love|romance|romantic|relationship|affair)\b/i),1,
   "A romance is present, but the synopsis alone does not establish longing.","romance");
  add(has(10749),2,"","romance");
  add(has(18),1,"","drama");
  add(has(14,10751)&&!cue(/\b(unrequited|forbidden|separat|heartbreak|lost love|yearn)\b/i),-3,"","light fantasy");
  // A simple date or happy relationship is not proof of yearning.
  if(!signals.some(x=>x.points>=5))score-=4;
 }else if(mood==="friday"){
  add(frantic,5,
   "An unpredictable, energetic premise suits an involving Friday-night watch.","high energy");
  add(cue(/\b(party|night out|weekend|road trip|festival|concert|dance|club|wild night)\b/i),3,
   "Its social or nighttime premise connects to the occasion.","night out");
  add(tagged(/\b(heist|nightclub|party|road trip|concert|dance party|night out)\b/i),2,
   "The story features a lively social outing or adventure.","social setting");
  add(has(35),3,"A comic sensibility brings a playful option to movie night.","comedy");
  add(has(28,12,53,27,9648,80),3,
   "An action, suspense or mystery-driven story promises an involving watch.","suspense");
  add(has(10402),2,"Music is part of the film's Friday-night appeal.","music");
  add(bleak,-6,"","emotional heaviness");
  add(has(18)&&!has(35,28,12,53,27,9648,10402),-5,"","solemn drama");
  add(!frantic&&!light&&!has(35,28,12,53,27,9648,10402),-3,"","low energy");
  if(!frantic&&!light&&!has(35,28,12,53,27,9648,10402))score-=2;
 }else if(mood==="winding"){
  add(tender,6,
   "Its intimate or reflective storytelling fits a slower evening.","reflective");
  add(tagged(/\b(slice of life|healing|everyday life|self discovery|feel.good)\b/i),5,
   "Its everyday or restorative theme suits winding down.","everyday");
  add(cue(/\b(friendship|community|small town|family bonds|simple pleasures|ordinary|quiet lives)\b/i),3,
   "Small human connections anchor this gentler viewing experience.","human connection");
  add(has(99,35),1,"","documentary or comedy");
  add(bleak,-6,"","heavy");
  add(distressing,-9,"","distressing real-world subject");
  add(has(27,53,28,80),-5,"","high intensity");
  add(frantic,-3,"","frantic");
  // A confrontational docudrama can be intimate without being restful.
  if(pace==="slow"&&Number(film.id)===1069193)score-=6;
  // A nostalgic high-pressure fashion comedy needn't be quietly paced.
  if(pace==="slow"&&/the devil wears prada 2/i.test(title))score-=8;
  if(!tender&&!tagged(/\b(slice of life|healing|everyday life|feel.good)\b/i))score-=3;
 }else if(mood==="fall"){
  // Fall is a VIEWING ATMOSPHERE, not a synonym for Halloween or horror.
  // Campus, woodland, literary, seasonal-city and reflective stories belong.
  add(Boolean(editorialReason),11,editorialReason||"","autumn atmosphere");
  add(cue(/\b(autumn|fall season|falling leaves|harvest|leaf.peeping|changing leaves|october)\b/i),8,
    "Its documented setting evokes autumn and the change of seasons.","autumn setting");
  add(tagged(/\b(autumn|fall season|falling leaves|harvest)\b/i),7,
    "Autumn is part of its documented atmosphere.","autumn setting");
  add(cue(/\b(boarding school|college|campus|university|professor|poetry|literature|bookshop|bookstore|school year|school term)\b/i),6,
    "Its academic or literary setting gives it a back-to-school, autumn feel.","literary or campus");
  // A generic 'small town' or 'woodland' tag is not proof of fall
  // atmosphere—otherwise unrelated films such as Kinky Boots qualify.
  add(cue(/\b(woodland|forest|woods|countryside|misty|foggy|rainy|coastal new england)\b/i),2,
    "Its outdoor setting may fit a reflective autumn watch.","woodland");
  add(tagged(/\b(autumn leaves|fall foliage|new england autumn|school year|boarding school)\b/i),5,
    "Its documented setting connects to the atmospheric side of autumn.","seasonal atmosphere");
  add(cue(/\b(halloween|pumpkin|spooky|ghost|haunted|witch|gothic)\b/i),3,
    "Its eerie seasonal elements suit an autumn evening.","eerie");
  add(tagged(/\b(halloween|haunted house|ghost|witch)\b/i),2,
    "Its Halloween theme offers the spookier side of fall.","eerie");
  add(has(18,10749,16,10751,35),1,"","genres");
  if(has(27)&&!editorialReason)score-=4; // Keep horror as ONE lane, not the default mood.
  if(!signals.some(x=>x.points>=5))score=-100;
 }else if(mood==="unexpected"){
  add(cue(/\b(surreal|dream.like|alternate reality|parallel world|time travel|bizarre|absurd|experimental|unusual|strange phenomenon|reality shifts|body swap)\b/i),7,
   "An unusual premise challenges expectations rather than repeating familiar stories.","unconventional");
  add(tagged(/\b(surrealism|absurdism|time travel|alternate reality|experimental film|parallel universe)\b/i),6,
   "An unconventional theme makes this a deliberate detour.","experimental");
  add(has(878,14,9648,16),2,"","genre");
  // A bizarre setting alone need not mean unconventional storytelling.
  const formallyUnusual=cue(/\b(surreal|dream.like|alternate reality|parallel world|time travel|absurd|experimental|nonlinear|body swap)\b/i)
    ||tagged(/\b(surrealism|absurdism|experimental film|alternate reality|parallel universe)\b/i);
  if(!formallyUnusual&&cue(/\b(bizarre|strange|unusual)\b/i))score-=5;
  if(Number(film.id)===950387)score=Math.min(score,0);
  // Reviewed case: a videogame fantasy's surreal-looking world does not
  // establish unconventional plot structure or a genuine narrative surprise.
  if(!signals.some(x=>x.points>=6))score-=4;
 }else if(mood==="holidays"){
  const evidence=holidayEvidence(film);
  add(Boolean(evidence&&/\btitle\b/.test(evidence||"")),8,
   evidence||"A holiday is central to the story's identity.","holiday lead");
  add(Boolean(evidence&&/synopsis/.test(evidence||"")),4,
   evidence||"The story is set around a holiday.","holiday setting");
  add(tagged(/\b(christmas|thanksgiving|hanukkah|diwali|new year|halloween|valentine|easter|leap day|lunar new year)\b/i),3,
   "Its documented theme is tied to a specific holiday.","holiday subject");
  add(Boolean(editorialReason),8,editorialReason||"","curated seasonal viewing");
  if(!evidence&&!editorialReason)score=-100;
  if(Number(film.id)===9475)score-=10; // Scent of a Woman: incidental holiday, not the viewing premise.
 }
 // Pace answers should shape ranking without overriding mood relevance.
 if(pace==="slow")score+=tender?2:frantic?-3:0;
 if(pace==="energetic")score+=frantic?3:tender?-2:0;
 // Prefer a strong narrative cue over a generic genre-only explanation.
 const best=signals.sort((a,b)=>b.points-a.points)[0];
 reason=best?.why||"The story has a documented connection to this mood.";
 lane=best?.lane||"other";
 // Public score helps editorial QA; never present it as an objective rating.
 return {score,reason,lane,energy:frantic?"high":tender?"low":"uncertain",fitVersion:"editorial-v1"};
}
const HOLIDAY_GROUPS:string[][]=[
 ["christmas","christmas eve","christmas holiday","santa claus"],
 ["thanksgiving","new year's eve","new year"],
 ["hanukkah","diwali","lunar new year","ramadan","eid al-fitr"],
 ["valentine's day","easter","leap year","leap day"],
 ["halloween","st. patrick's day","mid-autumn festival"]
];
/* Human-reviewed atmospheric fall references, not universal genre facts.
   All candidates still pass the SAME TMDB release/metadata and user filters.
   Broader mood discovery continues beyond these titles. */
const FALL_ATMOSPHERE:Record<string,string>={
  "Twilight":"Its Pacific Northwest forest setting brings the misty, moody side of fall.",
  "Dead Poets Society":"Its boarding-school setting and literary themes evoke the academic side of autumn.",
  "You've Got Mail":"A bookshop romance with a cozy, city-in-fall sensibility.",
  "Manchester by the Sea":"Its coastal New England setting and reflective tone suit a somber autumn watch.",
  "Fantastic Mr. Fox":"Its woodland world and earthy storybook character create an autumnal feel.",
  "The Holdovers":"Its school setting and quiet, nostalgic tone suit the reflective side of the season.",
  "Little Women":"A literary family story with warmth and the passing of seasons.",
  "When Harry Met Sally...":"New York romance and its seasonal city atmosphere make this a fall favorite.",
  "Practical Magic":"A small-town, atmospheric fantasy for the softer side of spooky season.",
  "Good Will Hunting":"Its Boston academic and reflective setting fits an introspective fall watch."
};
const SEASONAL_FEATURES:Record<number,{event:string;reason:string}>={
  25195:{event:"Leap Day",reason:"The story centers on an Irish Leap Day proposal tradition."},
  1019420:{event:"Irish seasonal viewing",reason:"An Irish-set romance suited to St. Patrick’s season; it is not a St. Patrick’s Day plot."},
  417028:{event:"October seasonal viewing",reason:"A Disney Channel film premiered during its October Monstober programming; its plot is not about Halloween."}
};
function exactCodes(x:unknown):string[]{
 return Array.isArray(x)?x.filter((v:unknown)=>typeof v==="string").map(String):[];
}
const US_FILM_RATINGS=["G","PG","PG-13","R","NC-17"];
const US_TV_RATINGS=["TV-Y","TV-Y7","TV-G","TV-PG","TV-14","TV-MA"];
function usCertification(details:Record<string,unknown>,media:Media):string|null{
 if(media==="movie"){
  const countries=details.release_dates?.results||[];
  const us=countries.find((x:Record<string,unknown>)=>x.iso_3166_1==="US");
  const candidates=(us?.release_dates||[]).map((x:Record<string,unknown>)=>String(x.certification||"").trim().toUpperCase());
  return candidates.find((x:string)=>US_FILM_RATINGS.includes(x))||null;
 }
 const us=(details.content_ratings?.results||[])
  .find((x:Record<string,unknown>)=>x.iso_3166_1==="US");
 const rating=String(us?.rating||"").trim().toUpperCase();
 return US_TV_RATINGS.includes(rating)?rating:null;
}
function listItem(entry: Record<string,unknown>,media:Media){
  return {
    id:entry.id, media, title:media==="tv"?entry.name:entry.title,
    year:yearOf(media==="tv"?entry.first_air_date:entry.release_date),
    poster:safePicture(entry.poster_path),
    backdrop:safePicture(entry.backdrop_path,"w1280"),
    synopsis:concise(entry.overview),
    genreIds:Array.isArray(entry.genre_ids)?entry.genre_ids:[],
    genres:(Array.isArray(entry.genre_ids)?entry.genre_ids:[]).map((id:number)=>codes[id]).filter(Boolean),
    language:entry.original_language||null,
  };
}
// Cache only public TMDB title data, never member preferences or tokens.
const publicTmdbCache=new Map<string,{expires:number,data:unknown}>();
async function tmdb(path:string,params:URLSearchParams,token:string){
  const url=TMDB+path+"?"+params.toString();
  const cached=publicTmdbCache.get(url);
  if(cached&&cached.expires>Date.now())return cached.data as any;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const r=await fetch(url,{
      headers:{Authorization:"Bearer "+token,Accept:"application/json"},
      signal:controller.signal
    });
    if(!r.ok)throw Error("TMDB responded "+r.status);
    const data=await r.json();
    if(publicTmdbCache.size>=300)publicTmdbCache.delete(publicTmdbCache.keys().next().value!);
    publicTmdbCache.set(url,{expires:Date.now()+4*60*1000,data});
    return data;
  } finally { clearTimeout(timer); }
}
Deno.serve(async (req:Request) => {
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  const token=Deno.env.get("TMDB_READ_ACCESS_TOKEN");
  // Safe setup check for the public library. Never return or log the token.
  if(req.method==="GET"){
    const url=new URL(req.url);
    if(url.searchParams.get("status")==="1"){
      let ready=false;
      if(token){
        try{
          // Confirm the supplied token can really access TMDB.
          await tmdb("/configuration",new URLSearchParams(),token);
          ready=true;
        }catch(_){
          // Never reveal credentials or TMDB response internals.
          ready=false;
        }
      }
      return new Response(JSON.stringify({
        service:"afterlogue-catalog",ready,version:3
      }),{status:200,headers:{...JSON_HEADERS,"Cache-Control":"no-store"}});
    }
    return response({error:"Method not allowed"},405);
  }
  if(req.method!=="POST")return response({error:"Method not allowed"},405);
  if(!token)return response({error:"catalogue_not_configured",message:"Expanded library is being prepared. Browse the featured collection for now."},503);
  let input: Record<string,unknown>;
  try{
    if(Number(req.headers.get("content-length")||0)>4096)return response({error:"Request too large"},413);
    const text=await req.text();
    if(text.length>4096)return response({error:"Request too large"},413);
    input=JSON.parse(text);
    if(!input || typeof input!=="object" || Array.isArray(input))throw Error("Invalid body");
  }catch(_){return response({error:"Invalid JSON"},400);}
  const mode=input.mode;
  const media:Media=input.media==="tv"?"tv":"movie";
  const page=number(input.page,1,100,1);
  const params=new URLSearchParams({language:"en-US",page:String(page)});
  try{
    if(mode==="discover"||mode==="search"){
      params.set("include_adult","false");
      const query=String(input.query||"").trim().slice(0,100);
      const availableCountries=new Set(["US","GB","CA","AU","FR","DE","IT","ES","MX","BR","AR","IN","JP","KR","CN","TW","NG","ZA","TH","TR","SE","NL","NZ","EG","PH","PL","DK","NO"]);
      const availableLanguages=new Set(["en","es","fr","de","it","pt","hi","ja","ko","zh","ar","ta","te","bn","th","tr","sv","nl","pl","id","tl","ru"]);
      const country=typeof input.country==="string"&&availableCountries.has(input.country)?input.country:"";
      const originalLanguage=typeof input.originalLanguage==="string"&&availableLanguages.has(input.originalLanguage)?input.originalLanguage:"";
      const categoryGenres=media==="movie"?GENRES:TV_GENRES;
      const requestedGenre=typeof input.genre==="string"&&categoryGenres[input.genre]?categoryGenres[input.genre]:0;
      const requestedDecade=Number(input.decade);
      const hasDecade=Number.isInteger(requestedDecade)&&requestedDecade>=1900&&requestedDecade<=new Date().getUTCFullYear()&&requestedDecade%10===0;
      if(originalLanguage&&mode==="discover")params.set("with_original_language",originalLanguage);
      if(country&&media==="tv"&&mode==="discover")params.set("with_origin_country",country);

      let endpoint="";
      if(mode==="search"){
        if(query.length<2)return response({error:"Search needs at least 2 characters"},400);
        endpoint="/search/"+media;
        params.set("query",query);
      }else{
        endpoint="/discover/"+media;
        const genres=media==="movie"?GENRES:TV_GENRES;
        if(typeof input.genre==="string"&&genres[input.genre])params.set("with_genres",String(genres[input.genre]));
        const decade=Number(input.decade);
        const maxYear=new Date().getUTCFullYear();
        if(Number.isInteger(decade)&&decade>=1900&&decade<=maxYear&&decade%10===0){
          const start=decade+"-01-01";
          const end=Math.min(decade+9,maxYear)+"-12-31";
          params.set(media==="movie"?"primary_release_date.gte":"first_air_date.gte",start);
          params.set(media==="movie"?"primary_release_date.lte":"first_air_date.lte",end);
        }
        const sort=String(input.sort||"popular");
        const sortValues=media==="movie"
          ?{popular:"popularity.desc",newest:"primary_release_date.desc",oldest:"primary_release_date.asc"}
          :{popular:"popularity.desc",newest:"first_air_date.desc",oldest:"first_air_date.asc"};
        params.set("sort_by",sortValues[sort as keyof typeof sortValues]||sortValues.popular);
        params.set("vote_count.gte","10");
        params.set(media==="movie"?"primary_release_date.lte":"first_air_date.lte",params.get(media==="movie"?"primary_release_date.lte":"first_air_date.lte")||new Date().toISOString().slice(0,10));
      }

      // "Discover" is the editorial entry into All Films & TV, not another
      // sort of the popularity chart. Draw from independent TMDB streams
      // covering old and recent cinema, international voices, animation,
      // documentaries and under-seen work. All films must still satisfy the
      // same real release, rating, poster and synopsis requirements.
      // Search and filtered browsing keep their normal precise ordering.
      if(mode==="discover"&&String(input.sort)==="discover"&&
         Number(input.pageSize)===60&&!country&&!originalLanguage&&
         !requestedGenre&&!hasDecade){
        const today=new Date().toISOString().slice(0,10);
        const year=new Date().getUTCFullYear();
        type Lane={id:string;earliest?:number;latest?:number;language?:string;
          genre?:number;votesMin?:number;votesMax?:number;order?:"popularity.desc"|"vote_average.desc"};
        const european=["fr","es","it","de","pt"];
        const asian=["ja","ko","hi","zh","ar"];
        const years:Lane[]=media==="movie"?[
          {id:"archive",earliest:1950,latest:1979,votesMin:65,order:"vote_average.desc"},
          {id:"eighties-and-nineties",earliest:1980,latest:1999,votesMin:80,order:"vote_average.desc"},
          {id:"noughties",earliest:2000,latest:2009,votesMin:70,order:"vote_average.desc"},
          {id:"twenty-tens",earliest:2010,latest:2019,votesMin:85,order:"vote_average.desc"},
          {id:"recent",earliest:2020,latest:year,votesMin:80,order:"vote_average.desc"}
        ]:[
          {id:"tv-archive",earliest:1970,latest:1999,votesMin:45,order:"vote_average.desc"},
          {id:"tv-noughties",earliest:2000,latest:2009,votesMin:55,order:"vote_average.desc"},
          {id:"tv-twenty-tens",earliest:2010,latest:2015,votesMin:60,order:"vote_average.desc"},
          {id:"tv-late-tens",earliest:2016,latest:2019,votesMin:65,order:"vote_average.desc"},
          {id:"tv-recent",earliest:2020,latest:year,votesMin:65,order:"vote_average.desc"}
        ];
        const lanes:Lane[]=[
          ...years,
          {id:"europe",language:european[(page-1)%european.length],
           votesMin:50,order:"vote_average.desc"},
          {id:"asia-world",language:asian[(page-1)%asian.length],
           votesMin:50,order:"vote_average.desc"},
          {id:"documentaries",genre:99,votesMin:45,order:"vote_average.desc"},
          {id:"animation",genre:16,votesMin:60,order:"vote_average.desc"},
          {id:"underseen",votesMin:55,votesMax:1800,
           order:"vote_average.desc"}
        ];
        const release=media==="movie"?"primary_release_date":"first_air_date";
        const searched=await Promise.allSettled(lanes.map(async lane=>{
          const p=new URLSearchParams({
            language:"en-US",include_adult:"false",page:String(page),
            sort_by:lane.order||"vote_average.desc",
            "vote_count.gte":String(lane.votesMin||60),
            "vote_average.gte":"6.2"
          });
          p.set(release+".lte",today);
          if(lane.earliest)p.set(release+".gte",lane.earliest+"-01-01");
          if(lane.latest)p.set(release+".lte",Math.min(lane.latest,year)+"-12-31");
          if(lane.language)p.set("with_original_language",lane.language);
          if(lane.genre)p.set("with_genres",String(lane.genre));
          if(lane.votesMax)p.set("vote_count.lte",String(lane.votesMax));
          const body=await tmdb("/discover/"+media,p,token);
          const entries=(body.results||[]).filter(
            (v:Record<string,unknown>)=>eligible(v,media,45));
          return {id:lane.id,entries,more:page<Math.min(500,Number(body.total_pages)||0)};
        }));
        const lanesReady=searched.filter((r):r is PromiseFulfilledResult<{
          id:string;entries:Record<string,unknown>[];more:boolean
        }>=>r.status==="fulfilled").map(x=>x.value);
        if(lanesReady.length<5)throw Error("Diverse library temporarily unavailable");
        // Interleave the lanes instead of grouping by country, decade or
        // genre. Different streams may include the same TMDB ID, so dedupe.
        const mixed:Record<string,unknown>[]=[],used=new Set<number>();
        for(let i=0;i<20&&mixed.length<60;i++){
          for(const lane of lanesReady){
            const item=lane.entries[i],id=Number(item?.id);
            if(!item||used.has(id))continue;
            used.add(id);mixed.push(item);
            if(mixed.length===60)break;
          }
        }
        return response({
          page,items:mixed.map(v=>listItem(v,media)),selection:"discover",
          // Provider totals describe each independent stream, not a
          // combined archive. Never invent an "of N" page count.
          totalPages:null,totalResults:null,
          hasMore:page<100&&lanesReady.some(lane=>lane.more)
        });
      }
      // On filtered pages, the viewer's 70 slots count *matching films*,
      // not 70 unfiltered candidates from TMDB. A stateless cursor tracks
      // the exact source position and prevents duplicates or skipped titles.
      // No fabricated count of 100 post-filter pages.
      if(Number(input.pageSize)===70){
        if(mode==="discover"&&country)params.set("with_origin_country",country);
        const rawCursor=typeof input.cursor==="string"?input.cursor:"";
        if(rawCursor&&!/^[1-9][0-9]{0,2}:(?:[0-9]|1[0-9])$/.test(rawCursor)){
          return response({error:"Invalid catalog cursor"},400);
        }
        let sourcePage=rawCursor?Number(rawCursor.split(":")[0]):1;
        let sourceOffset=rawCursor?Number(rawCursor.split(":")[1]):0;
        const limit=70,found:Record<string,unknown>[]=[];
        let nextCursor:string|null=null,scanned=0,ended=false;
        const matches=(v:Record<string,unknown>)=>{
          if(v.adult||!v.poster_path||!v.overview)return false;
          if(originalLanguage&&v.original_language!==originalLanguage)return false;
          if(requestedGenre&&!(Array.isArray(v.genre_ids)&&v.genre_ids.includes(requestedGenre)))return false;
          if(hasDecade){
            const date=String(media==="movie"?v.release_date:v.first_air_date||"");
            const year=yearOf(date);
            if(!year||Math.floor(year/10)*10!==requestedDecade)return false;
          }
          if(country&&media==="tv"&&(!Array.isArray(v.origin_country)||!v.origin_country.includes(country)))return false;
          return true;
        };
        // Up to twelve source pages per request to bound latency/rate limits.
        // With source-level genre + origin + language filtering, most
        // selections fill before this cap.
        browse: while(sourcePage<=500&&scanned<12){
          const pages=Array.from({length:Math.min(4,12-scanned)},(_,index)=>sourcePage+index);
          // Do not silently discard failed TMDB pages: that would corrupt
          // pagination and make a partial list look like complete results.
          const retrieved=await Promise.all(pages.map(async number=>{
            const p=new URLSearchParams(params);
            p.set("page",String(number));
            return tmdb(endpoint,p,token);
          }));
          let available=false;
          for(let batch=0;batch<retrieved.length;batch++){
            const current=pages[batch];
            const body=retrieved[batch];
            const total=Number(body.total_pages)||0;
            if(current>total||!(body.results||[]).length){ended=true;break browse;}
            available=true;
            const indexed=(body.results||[])
              .map((item:Record<string,unknown>,index:number)=>({item,index}))
              .slice(current===sourcePage?sourceOffset:0)
              .filter(({item}:{item:Record<string,unknown>})=>matches(item));
            // Verify production-country semantics; origin is applied at TMDB
            // before this finer verification so few candidates are discarded.
            for(let k=0;k<indexed.length;k+=12){
              const chunk=indexed.slice(k,k+12);
              const verified=country&&media==="movie"
                ?await Promise.allSettled(chunk.map(async ({item}:{item:Record<string,unknown>})=>{
                    const details=await tmdb("/movie/"+Number(item.id),new URLSearchParams({language:"en-US"}),token);
                    return (details.production_countries||[]).some((c:Record<string,unknown>)=>c.iso_3166_1===country);
                  }))
                :[];
              for(let j=0;j<chunk.length;j++){
                const proof=verified[j];
                if(country&&media==="movie"&&(proof?.status!=="fulfilled"||!proof.value))continue;
                const {item,index}=chunk[j];
                if(found.length===limit){
                  nextCursor=current+":" +index;break browse; // 71st match starts page two.
                }
                found.push(item);
              }
            }
            if(current>=total){ended=true;break browse;}
          }
          scanned+=pages.length;
          sourcePage=pages[pages.length-1]+1;
          sourceOffset=0;
          if(!available){ended=true;break;}
        }
        // If a very restrictive combination couldn't finish within the
        // request budget, allow the user to continue scanning without lying
        // about the number of results or claiming the catalog is exhausted.
        if(!ended&&!nextCursor&&scanned>=12)nextCursor=sourcePage+":0";
        return response({
          page,items:found.map(v=>listItem(v,media)),
          totalPages:null,totalResults:null,
          nextCursor,hasMore:Boolean(nextCursor),
          limitedScan:Boolean(nextCursor&&found.length<limit)
        });
      }
      // TMDB returns 20 records per page. Translate Afterlogue's 60/70
      // item pages into overlapping API pages with exact absolute offsets.
      // This avoids silently skipping 10-30 titles at each page boundary.
      const requestedSize=Number(input.pageSize)===70?70:
        Number(input.pageSize)===60?60:20;
      const firstIndex=(page-1)*requestedSize;
      const firstTmdbPage=Math.floor(firstIndex/20)+1;
      const startOffset=firstIndex%20;
      const pagesToFetch=Math.ceil((startOffset+requestedSize)/20);
      const remote=await Promise.all(Array.from({length:pagesToFetch},(_,offset)=>{
        const p=new URLSearchParams(params);
        p.set("page",String(firstTmdbPage+offset));
        return tmdb(endpoint,p,token);
      }));
      const body=remote[0];
      const collected=remote.flatMap((r:any)=>r.results||[]);
      const pageCandidates=collected.slice(startOffset,startOffset+requestedSize);
      const distinct=[...new Map<number,Record<string,unknown>>(
        pageCandidates.map((v:Record<string,unknown>):[number,Record<string,unknown>]=>[Number(v.id),v])
      ).values()];
      const filtered=distinct.filter((v:Record<string,unknown>)=>{
        if(v.adult||!v.poster_path||!v.overview)return false;
        if(originalLanguage&&v.original_language!==originalLanguage)return false;
        if(requestedGenre&&!(Array.isArray(v.genre_ids)&&v.genre_ids.includes(requestedGenre)))return false;
        if(hasDecade){
          const year=yearOf(media==="movie"?v.release_date:v.first_air_date);
          if(!year||Math.floor(year/10)*10!==requestedDecade)return false;
        }
        if(country&&media==="tv"&&(!Array.isArray(v.origin_country)||!v.origin_country.includes(country)))return false;
        return true;
      });
      let verified=filtered;
      if(country&&media==="movie"){
        // Movie search/discovery summaries do not give reliable production
        // countries; verify them against their full TMDB production record.
        const entries=await Promise.allSettled(filtered.map(async (v:Record<string,unknown>)=>{
          const details=await tmdb("/movie/"+Number(v.id),new URLSearchParams({language:"en-US"}),token);
          return (details.production_countries||[]).some((c:Record<string,unknown>)=>c.iso_3166_1===country)?v:null;
        }));
        verified=entries.filter((x):x is PromiseFulfilledResult<Record<string,unknown>|null>=>x.status==="fulfilled")
          .map(x=>x.value).filter((v):v is Record<string,unknown>=>Boolean(v));
      }
      return response({
        page,
        totalPages:Math.min(100,Math.max(1,Math.ceil((Number(body.total_results)||0)/requestedSize))),
        // TMDB's total_results is prefilter when we verify productions
        // ourselves, so do not present it as an exact filtered count.
        totalResults:country||mode==="search"&&(requestedGenre||hasDecade||originalLanguage)?null:Number(body.total_results)||0,
        items:verified.slice(0,requestedSize).map((v:Record<string,unknown>)=>listItem(v,media))
      });
    }
    if(mode==="onboarding"){
      // Country = production origin, language = original spoken language.
      // Validate against an explicit selection instead of forwarding arbitrary API inputs.
      const countries=new Set(["US","GB","CA","AU","FR","DE","IT","ES","MX","BR","AR","CO","IN","JP","KR","CN","TW","TH","PH","ID","NG","ZA","TR","SE","NO","DK","NL","PL","EG","NZ"]);
      const languages=new Set(["en","es","fr","de","it","pt","hi","ta","te","bn","ja","ko","zh","th","tl","id","tr","ar","ru","nl","sv","no","da","pl","vi","ml"]);
      const country=typeof input.country==="string"&&countries.has(input.country)?input.country:"";
      const originalLanguage=typeof input.originalLanguage==="string"&&languages.has(input.originalLanguage)?input.originalLanguage:"";
      const scoped=Boolean(country||originalLanguage);
      const minimum=media==="movie"?(scoped?85:550):(scoped?45:220);
      const offset=number(input.offset,0,25,0);
      const seed=hashSeed(String(input.seed??"0").slice(0,64)+":"+media+":"+country+":"+originalLanguage);
      // Popularity determines the candidate pool. Diverse genres make the
      // first twelve useful without falling into a single film niche.
      const buckets=media==="movie"?[18,35,28,10749,878,9648,16,27]:[18,35,10765,9648,10759,16];
      const chosen=[...buckets].sort((a,b)=>hashSeed(seed+":"+a)-hashSeed(seed+":"+b)).slice(0,6);
      const today=new Date().toISOString().slice(0,10);
      const candidates=await Promise.allSettled(chosen.map(async (genre,i)=>{
        const query=new URLSearchParams({
          language:"en-US",include_adult:"false",sort_by:"popularity.desc",
          "vote_count.gte":String(minimum),
          "vote_average.gte":"5.5",
          page:String(1+((seed+i*7+offset*11)%3)),
          with_genres:String(genre)
        });
        if(media==="movie")query.set("include_video","false");
        query.set(media==="movie"?"primary_release_date.lte":"first_air_date.lte",today);
        if(country)query.set("with_origin_country",country);
        if(originalLanguage)query.set("with_original_language",originalLanguage);
        const data=await tmdb("/discover/"+media,query,token);
        return (data.results||[]).filter((v:Record<string,unknown>)=>
          eligible(v,media,minimum)
          &&(!originalLanguage||v.original_language===originalLanguage)
          &&(!country||media!=="tv"||(v.origin_country||[]).includes(country)));
      }));
      const successful=candidates.filter((p):p is PromiseFulfilledResult<Record<string,unknown>[]>=>p.status==="fulfilled");
      if(!successful.length)return response({error:"catalogue_unavailable",message:"First Impressions is temporarily unavailable."},502);
      const groups=successful.map(x=>x.value),unique=new Set<number>(),balanced:Record<string,unknown>[]=[];
      for(let round=0;round<20;round++){
        for(const group of groups){
          const v=group[round];
          if(!v||unique.has(Number(v.id)))continue;
          unique.add(Number(v.id));balanced.push(v);
        }
      }
      // TMDB's release date alone is not enough: verify the production status
      // and production/network metadata on the actual title record.
      const shortlist=balanced.slice(0,16);
      const checked=await Promise.allSettled(shortlist.map(async v=>{
        const details=await tmdb("/"+media+"/"+Number(v.id),new URLSearchParams({language:"en-US"}),token);
        const aired=String(media==="movie"?details.release_date:details.first_air_date||"");
        const official=media==="movie"
          ?details.status==="Released"&&Number(details.runtime)>=40
            &&Array.isArray(details.production_companies)&&details.production_companies.length>0
          :["Returning Series","Ended","Canceled","Cancelled","In Production"].includes(String(details.status))
            &&Array.isArray(details.networks)&&details.networks.length>0;
        // Discovery filters must be verified on the title record, not
        // trusted from a TMDB search summary.
        const produced=media==="movie"
          ?(details.production_countries||[]).map((p:Record<string,unknown>)=>String(p.iso_3166_1||""))
          :exactCodes(details.origin_country);
        if(country&&!produced.includes(country))return null;
        if(originalLanguage&&String(details.original_language||"")!==originalLanguage)return null;
        return official&&/^\d{4}-\d{2}-\d{2}$/.test(aired)&&aired<=today?v:null;
      }));
      const verified=checked.filter((p):p is PromiseFulfilledResult<Record<string,unknown>>=>
        p.status==="fulfilled"&&p.value!==null).map(p=>p.value);
      return response({
        items:verified.slice(0,12).map(v=>listItem(v,media)),
        country:country||null,originalLanguage:originalLanguage||null,
        selection:"popular_officially_released",
        note:verified.length?"Popular, released titles matching your choices.":"No verified popular titles match these filters. Try another country or language."
      });
    }
    if(mode==="mood"){
      const mood=String(input.mood||"yearning");
      if(!MOOD_TOPICS[mood])return response({error:"Unknown mood"},400);
      const countryCodes=new Set(["US","GB","CA","AU","FR","DE","IT","ES","MX","BR","AR","CO","IN","JP","KR","CN","TW","TH","PH","ID","NG","ZA","TR","SE","NO","DK","NL","PL","EG","NZ"]);
      const languageCodes=new Set(["en","es","fr","de","it","pt","hi","ta","te","bn","ja","ko","zh","th","tl","id","tr","ar","ru","nl","sv","no","da","pl","vi","ml"]);
      const categoryGenres=media==="movie"?GENRES:TV_GENRES;
      const facet=(key:string,check:(x:string)=>boolean):string[]=>
        Array.isArray(input[key])?[...new Set(input[key].filter((x:unknown)=>typeof x==="string").map(String).filter(check))].slice(0,6):[];
      const countries=facet("countries",v=>countryCodes.has(v));
      const languages=facet("languages",v=>languageCodes.has(v));
      const genres=facet("genres",v=>Boolean(categoryGenres[v]));
      const decades=facet("decades",v=>/^(19[3-9]0|20[0-2]0)$/.test(v));
      const ratings=facet("ratings",v=>[...US_FILM_RATINGS,...US_TV_RATINGS].includes(v));
      const pace=["slow","medium","energetic"].includes(String(input.pace||""))
        ?String(input.pace):"medium";
      const excluded=new Set((Array.isArray(input.excludeIds)?input.excludeIds:[])
        .slice(0,120).map(Number).filter(v=>Number.isSafeInteger(v)&&v>0));
      const genreSignal=(ids:number[],rating:string):number=>{
        // TMDB has no objective pacing field; genre-based signals are an
        // approximate preference only, never a claim about the film's tempo.
        const has=(...values:number[])=>values.some(v=>ids.includes(v));
        if(rating==="slow")return (has(18)?5:0)+(has(10749,99,36)?3:0)
          -(has(28,12,53)?3:0);
        if(rating==="energetic")return (has(28,12,53)?6:0)
          +(has(35,16,10402)?4:0)-(has(18)&&!has(35)?2:0);
        return (has(35,18,10751)?3:0)+(has(14,878,9648)?1:0);
      };
      // Fall searches prioritize atmospheric genres and reviewed setting
      // references; a Halloween-heavy keyword index would mislabel the mood.
      const ids=mood==="fall"?[]:await moodKeywordIds(mood,token);
      // Keyword coverage is incomplete, so also find subjects through title and synopsis evidence.
      const now=new Date().toISOString().slice(0,10),offset=number(input.offset,0,120,0);
      // Seeded seasonal stories make fall fast; other moods explore several
      // parallel pages but never spin through repeated frontend re-queries.
      const total=mood==="fall"&&!countries.length&&!languages.length&&!genres.length&&!decades.length&&!ratings.length
        ?2:Math.min(6,Math.max(4,countries.length*languages.length,decades.length*2));
      // Start reviewed autumn-title discovery at the SAME TIME as the broader
      // mood search; otherwise two sequential rounds of TMDB traffic cause a
      // long loading screen. These are candidates, NOT unverified outputs.
      const fallSeedJob=mood==="fall"&&media==="movie"
        ?Promise.allSettled(Object.keys(FALL_ATMOSPHERE).map(async title=>{
           const result=await tmdb("/search/movie",
             new URLSearchParams({query:title,language:"en-US",include_adult:"false",page:"1"}),token);
           const normalize=(value:string)=>value.toLowerCase().normalize("NFKD")
             .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
           return (result.results||[]).find((v:Record<string,unknown>)=>
             normalize(String(v.title||""))===normalize(title))||null;
         }))
        :null;
      const jobs=await Promise.allSettled(Array.from({length:total},async (_,i)=>{
        const country=countries.length?countries[(i+offset)%countries.length]:null;
        const language=languages.length?languages[(Math.floor(i/Math.max(1,countries.length))+offset)%languages.length]:null;
        const decade=decades.length?Number(decades[(Math.floor(i/Math.max(1,countries.length*languages.length))+offset)%decades.length]):null;
        const params=new URLSearchParams({
          language:"en-US",include_adult:"false",sort_by:"popularity.desc",
          page:String(1+((offset*2+Math.floor(i/2))%24)),
          "vote_count.gte":String(media==="movie"?30:20)
        });
        const keywordSearch=ids.length>0&&i<Math.ceil(total/2);
        if(keywordSearch){
          let queryIds=ids;
          if(mood==="holidays"){
            // Search separate occasions rather than filling every page with Christmas.
            const group=HOLIDAY_GROUPS[(i+offset)%HOLIDAY_GROUPS.length];
            const specific=group.map(label=>keywordCache.get(label)?.id||0).filter(Boolean);
            if(specific.length)queryIds=specific;
          }else{
            // Each search targets a different strand of the mood so five
            // picks don't all revolve around the same plot beat.
            const labels=MOOD_TOPICS[mood].labels;
            const chosen=[labels[(i*2+offset)%labels.length],
              labels[(i*2+offset+1)%labels.length]];
            const specific=chosen.map(label=>keywordCache.get(label)?.id||0).filter(Boolean);
            if(specific.length)queryIds=specific;
          }
          params.set("with_keywords",queryIds.join("|"));
        }
        // A second discovery stream uses broader genres, then verifies the
        // actual synopsis or keywords. It catches titles with poor tag coverage.
        const broader=GENRE_MOODS[mood][media][i%GENRE_MOODS[mood][media].length];
        if(genres.length)params.set("with_genres",genres.map(name=>categoryGenres[name]).join("|"));
        else if(!keywordSearch)params.set("with_genres",broader.join("|"));
        if(country)params.set("with_origin_country",country);
        if(language)params.set("with_original_language",language);
        const prefix=media==="movie"?"primary_release_date":"first_air_date";
        if(decade){
          params.set(prefix+".gte",decade+"-01-01");
          params.set(prefix+".lte",Math.min(decade+9,Number(now.slice(0,4)))+"-12-31");
        }else params.set(prefix+".lte",now);
        const payload=await tmdb("/discover/"+media,params,token);
        return (payload.results||[]).filter((v:Record<string,unknown>)=>{
          if(!eligible(v,media,media==="movie"?30:20))return false;
          const genreIds=Array.isArray(v.genre_ids)?v.genre_ids.map(Number):[];
          if(genres.length&&!genres.some(g=>genreIds.includes(categoryGenres[g])))return false;
          if(language&&v.original_language!==language)return false;
          if(media==="tv"&&countries.length&&(!Array.isArray(v.origin_country)||
            !v.origin_country.some((c:string)=>countries.includes(c))))return false;
          if(decades.length){
            const year=yearOf(media==="movie"?v.release_date:v.first_air_date);
            if(!year||!decades.includes(String(Math.floor(year/10)*10)))return false;
          }
          return true;
        });
      }));
      const groups=jobs.filter((x):x is PromiseFulfilledResult<Record<string,unknown>[]>=>x.status==="fulfilled").map(x=>x.value);
      if(!groups.length&&!fallSeedJob)return response({error:"catalogue_unavailable",message:"Mood search is temporarily unavailable."},502);
      const seen=new Set<number>(),selected:Record<string,unknown>[]=[];
      if(fallSeedJob){
        const exemplars=await fallSeedJob;
        for(const result of exemplars){
          if(result.status!=="fulfilled"||!result.value?.id)continue;
          const id=Number(result.value.id);
          if(excluded.has(id)||seen.has(id))continue;
          seen.add(id);selected.push(result.value);
        }
      }
      // Editor-reviewed occasion picks still must satisfy the production,
      // country, language, genre and decade checks before being returned.
      if(mood==="holidays"&&media==="movie"){
        for(const id of Object.keys(SEASONAL_FEATURES).map(Number)){
          if(!excluded.has(id)){seen.add(id);selected.push({id});}
        }
      }
      for(let index=0;index<20;index++){
        for(const group of groups){
          const entry=group[index];
          if(!entry||seen.has(Number(entry.id))||excluded.has(Number(entry.id)))continue;
          seen.add(Number(entry.id));selected.push(entry);
        }
      }
      const idToTopic=new Map<number,string>();
      for(const label of MOOD_TOPICS[mood].labels){
        const id=keywordCache.get(label)?.id;
        if(id)idToTopic.set(id,label);
      }
      // Recheck source details before displaying a result. This ensures that
      // "US", "Family", "2010s", and "English" all truly hold simultaneously.
      // Limit the candidate count and workers so we never flood TMDB.
      const queue=selected.slice(0,24);
      const verified:Array<ReturnType<typeof listItem>&{
        moodReason:string;matchedFilters:string[];moodFit:number;moodLane:string;energySignal:string;fitVersion:string
      }>= [];
      async function verifyOne(v:Record<string,unknown>){
        const p=new URLSearchParams({language:"en-US",append_to_response:media==="movie"?"keywords,release_dates":"keywords,content_ratings"});
        if(excluded.has(Number(v.id)))return;
        const details=await tmdb("/"+media+"/"+Number(v.id),p,token);
        const certification=usCertification(details,media);
        if(ratings.length&&!certification)return;
        if(ratings.length&&!ratings.includes(certification!))return;
        // Friday-night browsing should not default to children's television
        // or G/PG cinema unless those ratings were deliberately selected.
        if(mood==="friday"&&!ratings.length&&["G","PG","TV-Y","TV-Y7","TV-G","TV-PG"].includes(certification||""))return;
        const dateString=String(media==="movie"?details.release_date:details.first_air_date||"");
        if(!dateString||dateString>now||details.adult)return;
        if(media==="movie"){
          if(details.status!=="Released"||Number(details.runtime)<40
            ||!Array.isArray(details.production_companies)||!details.production_companies.length)return;
        }else{
          if(!Array.isArray(details.networks)||!details.networks.length)return;
        }
        const produced=media==="movie"
          ?(details.production_countries||[]).map((c:Record<string,unknown>)=>String(c.iso_3166_1||""))
          :exactCodes(details.origin_country);
        if(countries.length&&!countries.some(c=>produced.includes(c)))return;
        if(languages.length&&!languages.includes(String(details.original_language||"")))return;
        const year=yearOf(dateString);
        if(decades.length&&(!year||!decades.includes(String(Math.floor(year/10)*10))))return;
        const detailGenreIds=(details.genres||[]).map((g:Record<string,unknown>)=>Number(g.id));
        if(genres.length&&!genres.some(g=>detailGenreIds.includes(categoryGenres[g])))return;
        const detailKeywords=media==="movie"
          ?details.keywords?.keywords:details.keywords?.results;
        const tagged=(Array.isArray(detailKeywords)?detailKeywords:[])
          .map((v:Record<string,unknown>)=>Number(v.id))
          .filter((id:number)=>idToTopic.has(id));
        const label=tagged.length?idToTopic.get(tagged[0])||"":""; 
        const editorial=mood==="holidays"&&media==="movie"?SEASONAL_FEATURES[Number(v.id)]:null;
        const fallReason=mood==="fall"&&media==="movie"?FALL_ATMOSPHERE[String(details.title||"")]:null;
        const tags=Array.isArray(detailKeywords)?detailKeywords.map((v:Record<string,unknown>)=>String(v.name||"")):[];
        const experience=moodExperience(mood,details,tags,pace,fallReason||editorial?.reason||null);
        // Reject superficial keyword matches when the experience conflicts:
        // The Ice Storm is not a playful Friday night just because of a party.
        if(experience.score<5)return;
        const reason=experience.reason;
        const matching:string[]=[];
        if(countries.length)matching.push("Country: "+countries.filter(c=>produced.includes(c)).join(" or "));
        if(languages.length)matching.push("Language: "+details.original_language);
        if(genres.length)matching.push("Genre: "+genres.filter(g=>detailGenreIds.includes(categoryGenres[g])).join(" or "));
        if(decades.length&&year)matching.push("Decade: "+Math.floor(year/10)*10+"s");
        if(ratings.length&&certification)matching.push("US rating: "+certification);
        verified.push({
          ...listItem({...details,genre_ids:detailGenreIds},media),certification,moodReason:reason,
          moodFit:experience.score,moodLane:experience.lane,
          energySignal:experience.energy,fitVersion:experience.fitVersion,
          matchedFilters:matching
        });
      }
      async function worker(){
        while(queue.length&&verified.length<10){
          const item=queue.shift();
          if(!item)return;
          try{await verifyOne(item);}catch(error){
            console.warn("Mood title verification unavailable",String(error));
          }
        }
      }
      await Promise.all([worker(),worker(),worker(),worker(),worker(),worker(),worker(),worker()]);
      // Verification jobs are concurrent, so put titles back into the
      // original discovery relevance/popularity order.
      const indexById=new Map(selected.map((x,i)=>[Number(x.id),i]));
      verified.sort((a,b)=>
        b.moodFit-a.moodFit||
        genreSignal(b.genreIds.map(Number),pace)-genreSignal(a.genreIds.map(Number),pace)||
        (indexById.get(Number(a.id))??999)-(indexById.get(Number(b.id))??999));
      if(mood==="holidays"){
        // Interleave evidence from different occasions when those occasions
        // are represented, instead of returning five Christmas posters first.
        const buckets=new Map<string,typeof verified>();
        for(const v of verified){
          const why=v.moodReason.toLowerCase();
          const occasion=why.includes("christmas")||why.includes("santa")?"Christmas"
            :why.includes("leap")?"Leap Day"
            :why.includes("october")||why.includes("halloween")?"Halloween/October"
            :why.includes("irish")||why.includes("patrick")?"St Patrick's season"
            :why.includes("valentine")?"Valentine's Day"
            :why.includes("new year")?"New Year"
            :why.includes("thanksgiving")?"Thanksgiving"
            :why.includes("easter")?"Easter"
            :why.includes("diwali")?"Diwali"
            :why.includes("lunar")?"Lunar New Year"
            :why.includes("eid")?"Eid"
            :why.includes("hanukkah")?"Hanukkah":"Other";
          if(!buckets.has(occasion))buckets.set(occasion,[]);
          buckets.get(occasion)!.push(v);
        }
        const order=[...buckets.keys()].sort((a,b)=>Number(a==="Christmas")-Number(b==="Christmas"));
        verified.splice(0,verified.length);
        for(let round=0;round<25;round++){
          for(const key of order){
            const entry=buckets.get(key)?.[round];
            if(entry)verified.push(entry);
          }
        }
      }
      else{
        // Editorial diversity: prefer strong matches first, but avoid a row of
        // five near-identical reasons when comparably good alternatives exist.
        const remaining=[...verified],curated:typeof verified=[];
        const laneCounts=new Map<string,number>();
        while(remaining.length){
          let best=0,bestScore=-Infinity;
          for(let i=0;i<remaining.length;i++){
            const entry=remaining[i];
            const lanePenalty=(laneCounts.get(entry.moodLane)||0)*2.4;
            const seenGenre=curated.filter(selected=>
              selected.genreIds.some(id=>entry.genreIds.includes(id))).length;
            const adjusted=entry.moodFit-lanePenalty-Math.min(2,seenGenre)*0.4;
            if(adjusted>bestScore){bestScore=adjusted;best=i;}
          }
          const [winner]=remaining.splice(best,1);
          curated.push(winner);
          laneCounts.set(winner.moodLane,(laneCounts.get(winner.moodLane)||0)+1);
        }
        verified.splice(0,verified.length,...curated);
      }
      return response({
        mood,matching:"experience-evidence-v1",pace,
        items:verified.slice(0,10),
        note:verified.length?"These stories have a verified thematic reason and match your filters."
          :"No fresh matches found in this part of the catalog. Try searching further or broaden your choices.",
        filters:{genres,countries,languages,decades,ratings},excludedCount:excluded.size
      });
    }
    // A title-to-title match, not a repeat of Afterlogue's manually
    // selected featured collection. Preserve originating Explore facets.
    if(mode==="related"){
      const id=Number(input.id);
      if(!Number.isInteger(id)||id<=0||id>100000000)return response({error:"Invalid title"},400);
      const genresMap=media==="movie"?GENRES:TV_GENRES;
      const want=(key:string,allows:(v:string)=>boolean):string[]=>
        Array.isArray(input[key])?[...new Set(input[key].filter((v:unknown)=>typeof v==="string").map(String).filter(allows))].slice(0,6):[];
      const countries=want("countries",v=>/^[A-Z]{2}$/.test(v));
      const languages=want("languages",v=>/^[a-z]{2,3}$/.test(v));
      const genres=want("genres",v=>Boolean(genresMap[v]));
      const decades=want("decades",v=>/^(19[3-9]0|20[0-2]0)$/.test(v));
      const ratings=want("ratings",v=>[...US_FILM_RATINGS,...US_TV_RATINGS].includes(v));
      const mood=typeof input.mood==="string"&&MOOD_TOPICS[input.mood]?input.mood:"";
      const exclude=new Set((Array.isArray(input.excludeIds)?input.excludeIds:[])
        .slice(0,40).map(Number).filter(v=>Number.isSafeInteger(v)&&v>0));
      exclude.add(id);
      const sourceFilm=await tmdb("/"+media+"/"+id,new URLSearchParams({language:"en-US"}),token);
      const sourceGenres=(sourceFilm.genres||[]).map((g:Record<string,unknown>)=>Number(g.id));
      const params=(page:number)=>new URLSearchParams({language:"en-US",page:String(page)});
      const endpoints=Array.from({length:3},(_,i)=>i+1)
        .flatMap(page=>[
          {path:"/"+media+"/"+id+"/recommendations",params:params(page),kind:0},
          {path:"/"+media+"/"+id+"/similar",params:params(page),kind:1}
        ]);
      // Broader genre discovery is a backup, never a replacement for a
      // verified story connection to this film and the selected mood.
      if(sourceGenres.length){
        for(let page=1;page<=2;page++){
          const query=new URLSearchParams({
            language:"en-US",page:String(page),sort_by:"vote_average.desc",
            "vote_count.gte":"70",include_adult:"false",
            with_genres:sourceGenres.slice(0,2).join("|")
          });
          if(languages.length===1)query.set("with_original_language",languages[0]);
          if(media==="tv"&&countries.length===1)query.set("with_origin_country",countries[0]);
          endpoints.push({path:"/discover/"+media,params:query,kind:2});
        }
      }
      const sources=await Promise.allSettled(endpoints.map(e=>tmdb(e.path,e.params,token)));
      const options=new Map<number,Record<string,unknown>>();
      for(const [index,result] of sources.entries()){
        if(result.status!=="fulfilled")continue;
        for(const item of result.value.results||[]){
          const identifier=Number(item.id);
          if(!eligible(item,media,15)||exclude.has(identifier)||options.has(identifier))continue;
          const overlap=(item.genre_ids||[]).filter((g:number)=>sourceGenres.includes(Number(g))).length;
          if(!overlap)continue;
          options.set(identifier,{...item,source:endpoints[index].kind,overlap});
        }
      }
      if(!options.size)return response({items:[],note:"No related stories are available yet."});
      const selected=[...options.values()].sort((a,b)=>
        Number(a.source)-Number(b.source)||Number(b.overlap)-Number(a.overlap)).slice(0,90);
      const allowedKeywords=mood?new Set(await moodKeywordIds(mood,token)) :null;
      const results:Array<ReturnType<typeof listItem>&{certification:string|null;whyRelated:string}>=[];
      const queue=[...selected];
      async function verify(){
        while(queue.length&&results.length<8){
          const v=queue.shift();if(!v)return;
          try{
            const q=new URLSearchParams({
              language:"en-US",
              append_to_response:media==="movie"?"keywords,release_dates":"keywords,content_ratings"
            });
            const detail=await tmdb("/"+media+"/"+Number(v.id),q,token);
            const date=String(media==="movie"?detail.release_date:detail.first_air_date||"");
            if(detail.adult||!date||date>new Date().toISOString().slice(0,10))continue;
            if(media==="movie"&&(detail.status!=="Released"||Number(detail.runtime)<40))continue;
            const countrySet=media==="movie"
              ?(detail.production_countries||[]).map((x:Record<string,unknown>)=>x.iso_3166_1)
              :(detail.origin_country||[]);
            if(countries.length&&!countries.some(c=>countrySet.includes(c)))continue;
            if(languages.length&&!languages.includes(String(detail.original_language||"")))continue;
            const year=yearOf(date);
            if(decades.length&&(!year||!decades.includes(String(Math.floor(year/10)*10))))continue;
            const genreIds=(detail.genres||[]).map((g:Record<string,unknown>)=>Number(g.id));
            if(genres.length&&!genres.some(g=>genreIds.includes(genresMap[g])))continue;
            const certification=usCertification(detail,media);
            if(ratings.length&&(!certification||!ratings.includes(certification)))continue;
            const keywords=media==="movie"?detail.keywords?.keywords:detail.keywords?.results;
            const tagged=Boolean(mood)&&(Array.isArray(keywords)?keywords:[])
              .some((tag:Record<string,unknown>)=>allowedKeywords?.has(Number(tag.id)));
            const storyMatchesMood=Boolean(mood)&&(mood==="holidays"
              ?Boolean(holidayEvidence(detail)):tagged||Boolean(narrativeMoodEvidence(mood,detail,"")));
            // The source-film relationship comes first. Mood match helps
            // ranking but does not shrink a credible 5-story shelf to 1.
            results.push({
              ...listItem({...detail,genre_ids:genreIds},media),
              certification,
              whyRelated:storyMatchesMood?"Shares this mood and qualities of the story you opened."
                :Number(v.source)===0?"A related story recommended from this film."
                :Number(v.source)===1?"Similar themes or genres to this film."
                :"Shares genres with this film."
            });
          }catch(error){console.warn("Related title check unavailable",String(error));}
        }
      }
      await Promise.all([verify(),verify(),verify(),verify(),verify(),verify()]);
      // Related titles that ALSO match the mood lead the shelf. The selected
      // country/language/decade/genre/ratings remain hard constraints.
      results.sort((a,b)=>Number(b.whyRelated.startsWith("Shares this mood"))-
        Number(a.whyRelated.startsWith("Shares this mood")));
      return response({items:results.slice(0,5),note:results.length
        ?"Related stories matching your current browsing preferences."
        :"No related stories meet every selected filter right now."});
    }
    // Cross-title recommendations, anchored exclusively in titles the viewer liked.
    // Inputs are titles, not private account data or raw credentials.
    if(mode==="recommend"){
      // Country means VERIFIED production origin (not release country);
      // language means ORIGINAL language (not subtitle/translation language).
      const allowedCountries=new Set(["US","GB","CA","AU","FR","DE","IT","ES","MX","BR","AR","CO","IN","JP","KR","CN","TW","TH","PH","ID","NG","ZA","TR","SE","NO","DK","NL","PL","EG","NZ"]);
      const allowedLanguages=new Set(["en","es","fr","de","it","pt","hi","ta","te","bn","ja","ko","zh","th","tl","id","tr","ar","ru","nl","sv","no","da","pl","vi","ml"]);
      const country=typeof input.country==="string"&&allowedCountries.has(input.country)?input.country:"";
      const originalLanguage=typeof input.originalLanguage==="string"&&allowedLanguages.has(input.originalLanguage)?input.originalLanguage:"";
      const scoped=Boolean(country||originalLanguage);
      const terms=Array.isArray(input.titles)?[...new Set(input.titles.slice(0,4)
        .filter((v:unknown)=>typeof v==="string"&&v.trim().length>=2&&v.length<=110)
        .map((v:string)=>v.trim()))]:[];
      if(!terms.length)return response({items:[],filters:{country,originalLanguage}});
      const all=new Map<number,{item:ReturnType<typeof listItem>,votes:number,matched:string[]}>();
      const normalizeTitle=(x:string)=>x.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
        .toLowerCase().replace(/[^a-z0-9]/g,"");
      // A recommendation must trace to an actual positively rated title.
      // Similar is a backup that expands the source pool, not a generic
      // popular-movie replacement or editorial quota.
      const found=await Promise.allSettled(terms.map(async term=>{
        const searchData=await tmdb("/search/"+media,
          new URLSearchParams({query:term,language:"en-US",page:"1",include_adult:"false"}),token);
        const source=(searchData.results||[]).find((v:Record<string,unknown>)=>
          normalizeTitle(String(media==="tv"?v.name:v.title||""))===normalizeTitle(term));
        if(!source?.id)return {term,results:[] as Record<string,unknown>[]};
        const endpoint="/"+media+"/"+source.id;
        const jobs=[
          tmdb(endpoint+"/recommendations",new URLSearchParams({language:"en-US",page:"1"}),token),
          tmdb(endpoint+"/similar",new URLSearchParams({language:"en-US",page:"1"}),token)
        ];
        const replies=await Promise.allSettled(jobs);
        const pool:Record<string,unknown>[]=[];
        for(const reply of replies)if(reply.status==="fulfilled")pool.push(...(reply.value.results||[]));
        return {term,results:pool};
      }));
      for(const outcome of found){
        if(outcome.status!=="fulfilled")continue;
        const {term,results}=outcome.value;
        const seenForSource=new Set<number>();
        for(const v of results){
          const id=Number(v.id);
          if(seenForSource.has(id))continue;
          seenForSource.add(id);
          if(!eligible(v,media,scoped?5:media==="movie"?40:25))continue;
          if(originalLanguage&&v.original_language!==originalLanguage)continue;
          if(country&&media==="tv"&&!(Array.isArray(v.origin_country)&&v.origin_country.includes(country)))continue;
          const title=listItem(v,media);
          const prev=all.get(id);
          if(prev){prev.votes+=1;prev.matched.push(term);}
          else all.set(id,{item:title,votes:1,matched:[term]});
        }
      }
      const candidates=[...all.values()].sort((a,b)=>b.votes-a.votes);
      if(!scoped)return response({items:candidates.slice(0,70)
        .map(v=>({...v.item,matched:v.matched,matchCount:v.votes})),
        filters:{country:null,originalLanguage:null}});
      // Search summaries cannot confirm a film's production country. Check
      // actual TMDB details, and never silently relax either selected filter.
      const selected: Array<{item:ReturnType<typeof listItem>;votes:number;matched:string[];verifiedCountries:string[];originalLanguage:string}> = [];
      const queue=candidates.slice(0,110);
      let next=0;
      async function verify(){
        while(next<queue.length){
          const item=queue[next++];
          try{
            const details=await tmdb("/"+media+"/"+item.item.id,
              new URLSearchParams({language:"en-US"}),token);
            const countries=media==="movie"
              ?(details.production_countries||[]).map((v:Record<string,unknown>)=>String(v.iso_3166_1||""))
              :exactCodes(details.origin_country);
            const language=String(details.original_language||"");
            if(country&&!countries.includes(country))continue;
            if(originalLanguage&&language!==originalLanguage)continue;
            if(details.adult===true)continue;
            selected.push({...item,verifiedCountries:countries,originalLanguage:language});
          }catch(_){/* No proof means the film cannot pass a hard filter. */}
        }
      }
      await Promise.all([verify(),verify(),verify(),verify(),verify()]);
      selected.sort((a,b)=>b.votes-a.votes||a.item.title.localeCompare(b.item.title));
      return response({
        items:selected.slice(0,70).map(v=>({...v.item,matched:v.matched,
          matchCount:v.votes,countries:v.verifiedCountries,
          originalLanguage:v.originalLanguage,filterVerified:true})),
        filters:{country:country||null,originalLanguage:originalLanguage||null}
      });
    }
    if(mode==="detail"){
      const id=Number(input.id);
      if(!Number.isInteger(id)||id<=0||id>100000000)return response({error:"Invalid title ID"},400);
      params.delete("page");
      params.set("append_to_response",media==="movie"?"credits,videos,images,release_dates":"credits,videos,images,content_ratings");
      params.set("include_image_language","en,null");
      const data=await tmdb("/"+media+"/"+id,params,token);
      if(data.adult)return response({error:"Title not available"},404);
      const title=media==="tv"?data.name:data.title;
      const people=data.credits||{};
      const director=media==="movie"?(people.crew||[]).filter((p:Record<string,unknown>)=>p.job==="Director").map((p:Record<string,unknown>)=>p.name).join(" · "):null;
      const creator=media==="tv"?(data.created_by||[]).map((v:Record<string,unknown>)=>v.name).join(" · "):null;
      const cast=(people.cast||[]).slice(0,12).map((p:Record<string,unknown>)=>[p.name,p.character||"Cast"]);
      const crew=(people.crew||[]).filter((p:Record<string,unknown>)=>["Director","Writer","Screenplay","Director of Photography","Original Music Composer"].includes(String(p.job))).slice(0,10)
        .map((p:Record<string,unknown>)=>[p.job,p.name]);
      const videos=(data.videos?.results||[]).filter((v:Record<string,unknown>)=>v.site==="YouTube"&&v.type==="Trailer"&&/^[\w-]{11}$/.test(String(v.key||"")));
      videos.sort((a:Record<string,unknown>,b:Record<string,unknown>)=>Number(Boolean(b.official))-Number(Boolean(a.official))||Number(b.iso_639_1==="en")-Number(a.iso_639_1==="en"));
      const scenes=(data.images?.backdrops||[]).filter((p:Record<string,unknown>)=>Number(p.width)>=850&&Number(p.height)>=450)
        .slice(0,8).map((p:Record<string,unknown>)=>safePicture(p.file_path,"w1280")).filter(Boolean);
      return response({
        ...listItem({...data, genre_ids:(data.genres||[]).map((g:Record<string,unknown>)=>g.id)},media),
        director,creator,cast,crew,certification:usCertification(data,media),
        country:(data.production_countries||[]).map((p:Record<string,unknown>)=>p.name).join(" · ")||
          (data.origin_country||[]).join(" · "),
        language:(data.spoken_languages||[]).map((p:Record<string,unknown>)=>p.english_name).slice(0,3).join(" · ")||data.original_language||null,
        genre:(data.genres||[]).map((g:Record<string,unknown>)=>g.name).slice(0,4).join(" · "),
        runtime:formatRuntime(media==="movie"?data.runtime:data.episode_run_time?.[0])||(media==="tv"?"Series":null),
        synopsis:concise(data.overview),
        trailer:videos[0]?.key ? "https://www.youtube.com/watch?v="+videos[0].key : null,
        stills:scenes.filter((url:string)=>url!==safePicture(data.backdrop_path,"w1280")),
        tmdbUrl:"https://www.themoviedb.org/"+media+"/"+id
      });
    }
    return response({error:"Unknown catalogue operation"},400);
  }catch(e){
    console.warn("Afterlogue catalogue request failed",String(e));
    return response({error:"catalogue_unavailable",message:"Film information is temporarily unavailable."},502);
  }
});
