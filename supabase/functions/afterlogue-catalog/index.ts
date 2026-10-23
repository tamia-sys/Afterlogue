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
/* Independently reviewed sources for Discover's opening film lineup.
 * LABEL IS NOT A PRODUCTION CLAIM: distribution or an official film catalog
 * counts, including territory-specific film releases by Curzon, NEON, Focus.
 * Sources: film.curzon.com/film-library/, a24films.com/films,
 * neonrated.com/films/all, focusfeatures.com/films,
 * blumhouse.com/catalogue, shop.laika.com/collections/all,
 * moma.org Tim Burton exhibition (Skellington), sonypictures.com/steamboy.
 * Search matches are resolved to real, released TMDB films at request time.
 * We do not infer a distribution credit from TMDB production_companies.
 */
type EditorialAnchor={title:string;year:number;label:string;relation:"produced"|"released"|"distributed"|"filmography"};
const EDITORIAL_FILMS:EditorialAnchor[]=[
 {title:"Parasite",year:2019,label:"Curzon Film",relation:"distributed"},
 {title:"Past Lives",year:2023,label:"A24",relation:"released"},
 {title:"Coraline",year:2009,label:"LAIKA",relation:"produced"},
 {title:"Get Out",year:2017,label:"Blumhouse",relation:"produced"},
 {title:"Portrait of a Lady on Fire",year:2019,label:"Curzon Film",relation:"distributed"},
 {title:"The Holdovers",year:2023,label:"Focus Features",relation:"released"},
 {title:"Anatomy of a Fall",year:2023,label:"NEON",relation:"distributed"},
 {title:"Everything Everywhere All at Once",year:2022,label:"A24",relation:"released"},
 {title:"Cold War",year:2018,label:"Curzon Film",relation:"distributed"},
 {title:"Kubo and the Two Strings",year:2016,label:"LAIKA",relation:"produced"},
 {title:"The Nightmare Before Christmas",year:1993,label:"Skellington Productions",relation:"produced"},
 {title:"Perfect Days",year:2023,label:"NEON",relation:"distributed"},
 {title:"Phantom Thread",year:2017,label:"Focus Features",relation:"released"},
 {title:"The Farewell",year:2019,label:"A24",relation:"released"},
 {title:"Steamboy",year:2004,label:"Triumph Films / Sony",relation:"distributed"},
 {title:"The Worst Person in the World",year:2021,label:"NEON",relation:"distributed"},
 {title:"The Square",year:2017,label:"Curzon Film",relation:"distributed"},
 {title:"Whiplash",year:2014,label:"Blumhouse",relation:"filmography"},
 {title:"Anora",year:2024,label:"NEON",relation:"distributed"},
 {title:"45 Years",year:2015,label:"Curzon Film",relation:"distributed"},
 {title:"ParaNorman",year:2012,label:"LAIKA",relation:"produced"},
 {title:"Moonlight",year:2016,label:"A24",relation:"released"},
 {title:"Atonement",year:2007,label:"Focus Features",relation:"released"},
 {title:"Amour",year:2012,label:"Curzon Film",relation:"distributed"}
];
// A24's official television catalog and an editorial selection of acclaimed
// independently produced/international television. TV networks and distributors
// are NOT represented as original production credits in the UI.
const EDITORIAL_TELEVISION:EditorialAnchor[]=[
 {title:"Beef",year:2023,label:"A24 Television",relation:"filmography"},
 {title:"Fleabag",year:2016,label:"BBC / Two Brothers",relation:"filmography"},
 {title:"Pachinko",year:2022,label:"Apple TV+",relation:"filmography"},
 {title:"My Brilliant Friend",year:2018,label:"Rai / HBO",relation:"filmography"},
 {title:"Ramy",year:2019,label:"A24 Television",relation:"filmography"},
 {title:"The Bear",year:2022,label:"FX",relation:"filmography"},
 {title:"Normal People",year:2020,label:"BBC / Element Pictures",relation:"filmography"},
 {title:"The Bureau",year:2015,label:"CANAL+",relation:"filmography"},
 {title:"Euphoria",year:2019,label:"A24 Television",relation:"filmography"},
 {title:"I May Destroy You",year:2020,label:"BBC / HBO",relation:"filmography"},
 {title:"The Sympathizer",year:2024,label:"A24 Television",relation:"filmography"},
 {title:"Severance",year:2022,label:"Apple TV+",relation:"filmography"},
 {title:"Mo",year:2022,label:"A24 Television",relation:"filmography"},
 {title:"The Curse",year:2023,label:"A24 Television",relation:"filmography"},
 {title:"Dark",year:2017,label:"Wiedemann & Berg",relation:"filmography"},
 {title:"The Returned",year:2012,label:"CANAL+",relation:"filmography"},
 {title:"Detectorists",year:2014,label:"BBC",relation:"filmography"},
 {title:"Such Brave Girls",year:2023,label:"A24 Television",relation:"filmography"}
];
const hashSeed=(str:string)=>{
 let h=2166136261;
 for(const ch of str){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
};
const GENRE_MOODS:Record<string,{movie:number[][],tv:number[][],caption:string}>={
 yearning:{movie:[[10749,18],[18],[10749]],tv:[[18],[18,35],[35,18],[18,10765],[18,9648]],caption:"Romance, distance, and difficult connections."},
 winding:{movie:[[35,10749],[18],[10751,12],[99,18],[16,35]],tv:[[35],[18],[10751],[99],[16,35]],caption:"Easygoing comedy, ordinary life, playful escapism and contemplative storytelling."},
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
// A Winding Down mood can be playful OR contemplative; "Take your time"
// specifically asks for the latter. TMDB similarity alone is not pace evidence.
// Avoid hardcoding a blacklist of particular films and preserve serious/bleak
// contemplative editorials (e.g. Dogville and A Ghost Story).
function slowWindingFilmEvidence(
 film:Record<string,unknown>,tagNames:string[],genreIds:number[],
 editorialLane:string|null,editorialPace:string|null
):boolean{
 if(editorialLane)return editorialLane==="contemplative"&&editorialPace==="slow";
 // An action, horror, thriller or crime genre is a poor default for patient
 // observation unless a human-reviewed reference establishes the exception.
 if(genreIds.some(id=>[27,28,53,80].includes(id)))return false;
 const drama=genreIds.some(id=>[18,99,36].includes(id));
 const comedy=genreIds.includes(35);
 if(comedy&&!drama)return false; // broad party/sex comedies are not "slow cinema"
 const synopsis=String(film.overview||"");
 const introspective=/\b(contemplat\w*|meditat\w*|introspect\w*|philosoph\w*|poetic\w*|lyrical|solitude|lonelin\w*|life and death|mortality|grief|mourning|memories|reminisc\w*|passage of time|passing of time|over the years|search for meaning|self.discovery|personal growth|quiet\w*|unhurried|subtle|observ\w*|ordinary life|everyday life|daily life|daily routine|rural life|small moments|coming.of.age|growing up|family life|small.town life|human connection)\b/i;
 const topic=/\b(slow cinema|meditation|contemplation|slice of life|philosophy|everyday life|human condition|self.discovery|rural life|family life|poetry|character study)\b/i;
 // Neither a broad genre nor a single "friends" keyword establishes pace.
 return (drama||genreIds.includes(10749)||genreIds.includes(16))&&
  (introspective.test(synopsis)||tagNames.some(t=>topic.test(t)));
}

function moodExperience(
 mood:string,film:Record<string,unknown>,tagNames:string[],
 pace:string,editorialReason:string|null,editorialPace:string|null=null,editorialLane:string|null=null
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
  // Different kinds of longing need different explanations. A generic
  // supernatural obstacle or any "relationship" mention alone is not enough.
  add(Boolean(editorialReason),10,editorialReason||"","reviewed relationship");
  add(cue(/\b(unrequited|forbidden love|secret love|impossible love|love against|unfulfilled love|not meant to be)\b/i),8,
    "The characters' feelings are complicated by what they cannot openly have.","forbidden feelings");
  add(cue(/\b(lovers? separated|separated by|long.distance|years apart|reunite|cannot be together|struggle to be together|love across)\b/i),8,
    "Distance and separation keep the characters' connection unresolved.","separation");
  add(cue(/\b(heartbreak|heartbroken|lost love|yearn|longing|cannot forget)\b/i),7,
    "Unresolved feelings or loss give the relationship emotional weight.","unfinished feelings");
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
  // "Take your time" changes the preferred emotional pacing, not nation.
  if(editorialPace&&pace!=="medium")
   score+=editorialPace===pace?5:editorialPace==="medium"?0:-3;
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
  // Winding Down can mean familiar, entertaining comfort OR an absorbing
  // contemplative story. Narrative pace and emotional weight are independent.
  // A sparse "slice of life" tag on its own is NOT evidence of restfulness.
  const warmth=cue(/\b(comed(y|ic)|funny|humou?r|witty|light.hearted|playful|uplifting|feel.good|cheerful|hilarious|heartwarming|rom.com|romantic comedy|laugh(s|ter)?|whimsical)\b/i);
  const everyday=cue(/\b(friendship|friends?|neighbou?rhood|community|family bonds|family life|family reunion|romantic relationship|workplace|salon|shop|restaurant|ordinary life|daily lives|day.to.day|everyday|school friends|growing up|coming.of.age|small town)\b/i);
  const contemplating=cue(/\b(contemplative|introspect|reflective|meditative|solitude|daily routine|wanders?|life on the road|travel(s|ing)? across|life in the countryside|quiet observation|over the years|passage of time|poetry|artistic life)\b/i)||tagged(/\b(contemplation|meditation|slow cinema|poetry)\b/i);
  const playfulAdventure=cue(/\b(road trip|comedic adventure|misadventure|hijinks|escapades?|unlikely duo|unlikely friendship|comic caper|wacky|zany)\b/i);
  add(Boolean(editorialReason),9,editorialReason||"",editorialLane||"reviewed wind-down");
  add(warmth,6,
    "Its documented humor or lighthearted tone makes this an easygoing watch.","feel-good");
  add(everyday,4,
    "Everyday relationships and familiar surroundings make this a character-led choice.","everyday connections");
  add(contemplating,7,
    "Its reflective storytelling invites a more contemplative kind of evening.","contemplative");
  add(playfulAdventure&&pace!=="slow",5,
    "Its playful adventure offers an engaging, entertaining way to unwind.","playful escapism");
  add(tagged(/\b(slice of life|healing|everyday life|self discovery|feel.good)\b/i),2,"","topic tags");
  add(has(35,10749),1,"","comedy or romance");
  // Neither animation nor slow pacing is proof of a relaxing experience.
  // Dark topics are not automatically excluded: some verified, thoughtfully
  // chosen films are cathartic. Avoid unverified trauma-as-comfort claims.
  if(distressing)score-=editorialReason?2:10;
  if(bleak&&!warmth)score-=editorialReason?1:contemplating?2:5;
  if(has(27,53,28,80)&&!warmth&&!editorialReason)score-=4;
  if(frantic&&!warmth&&!editorialReason)score-=4;
  if(pace==="slow"&&frantic&&!editorialReason)score-=3;
  if(pace==="energetic"&&warmth)score+=2;
  // A serious contemporary drama can be a great wind-down when the viewer
  // wants to reflect; never assume all viewers require happy endings.
  if(pace==="slow"&&Number(film.id)===1069193)score-=6;
  if(pace==="slow"&&/the devil wears prada 2/i.test(title))score-=8;
  if(!editorialReason&&!warmth&&!everyday&&!contemplating&&!playfulAdventure)score-=4;
 }else if(mood==="fall"){
  // Fall is a VIEWING ATMOSPHERE, not a synonym for Halloween or horror.
  // Campus, woodland, literary, seasonal-city and reflective stories belong.
  add(Boolean(editorialReason),11,editorialReason||"","autumn atmosphere");
  add(cue(/\b(autumn|fall season|falling leaves|harvest|leaf.peeping|changing leaves|october)\b/i),8,
    "Its documented setting evokes autumn and the change of seasons.","autumn setting");
  add(tagged(/\b(autumn|fall season|falling leaves|harvest)\b/i),7,
    "Autumn is part of its documented atmosphere.","autumn setting");
  add(cue(/\b(boarding school|high school|schooldays|college|campus|university|professor|poetry|literature|bookshop|bookstore|school year|school term)\b/i),6,
    "Its academic or literary setting gives it a back-to-school, autumn feel.","literary or campus");
  // A generic 'small town' or 'woodland' tag is not proof of fall
  // atmosphere—otherwise unrelated films such as Kinky Boots qualify.
  add(cue(/\b(woodland|forest|woods|countryside|misty|foggy|rainy|coastal new england)\b/i),2,
    "Its outdoor setting may fit a reflective autumn watch.","woodland");
  add(tagged(/\b(autumn leaves|fall foliage|new england autumn|school year|school life|university|boarding school)\b/i),5,
    "Its documented setting connects to the atmospheric side of autumn.","seasonal atmosphere");
  add(cue(/\b(halloween|pumpkin|spooky|ghost|haunted|witch|gothic)\b/i),3,
    "Its eerie seasonal elements suit an autumn evening.","eerie");
  add(tagged(/\b(halloween|haunted house|ghost|witch)\b/i),2,
    "Its Halloween theme offers the spookier side of fall.","eerie");
  add(has(18,10749,16,10751,35),1,"","genres");
  if(has(27)&&!editorialReason)score-=4; // Keep horror as ONE lane, not the default mood.
  // Treat the requested pace as a real ranking preference, rather
  // than a tiny genre tie-break. These are editorial estimates.
  if(pace!=="medium"&&editorialPace)
   score+=editorialPace===pace?9:editorialPace==="medium"?0:-4;
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
/* Editorial reference points, NOT a fixed five-story rotation. Every title
 * is resolved through TMDB and must meet the usual title/metadata checks. */
const YEARNING_TV_REFERENCES:Record<string,{reason:string;pace:"slow"|"medium"|"energetic"}>={
 "Normal People":{reason:"Its intimate, years-spanning relationship develops through unspoken feelings.",pace:"slow"},
 "One Day":{reason:"A friendship and near-romance revisited over the years creates unresolved longing.",pace:"slow"},
 "Fleabag":{reason:"Its wit conceals loneliness and the ache of fragile connection.",pace:"slow"},
 "Bridgerton":{reason:"Duty and reputation complicate attraction and emotional honesty.",pace:"medium"},
 "The Summer I Turned Pretty":{reason:"Changing friendships and first loves create unfinished feelings.",pace:"medium"},
 "NANA":{reason:"Love, loss and emotional dependency entwine two young women's lives.",pace:"slow"},
 "Sex Education":{reason:"Awkward first loves and vulnerability complicate growing up.",pace:"energetic"},
 "Outlander":{reason:"Love strained by separation and time gives its romance lasting emotional weight.",pace:"medium"},
 "Nobody Wants This":{reason:"Attraction competes with differing expectations in a modern relationship.",pace:"medium"},
 "Jane the Virgin":{reason:"Romantic choices and family loyalty shape complicated attachments.",pace:"energetic"},
 "Sense8":{reason:"Love and belonging connect people across extraordinary distances.",pace:"medium"},
 "Interview with the Vampire":{reason:"Desire and obsession complicate a deeply troubled relationship.",pace:"slow"},
 "The Vampire Diaries":{reason:"Supernatural obstacles intensify romantic tensions and loyalties.",pace:"energetic"},
 "Felicity":{reason:"University friendships and romantic uncertainty unfold through quiet choices.",pace:"slow"},
 "North & South":{reason:"Class division and restrained attraction create slow-burn romantic tension.",pace:"slow"},
 "Downton Abbey":{reason:"Love and unspoken loyalties unfold against social expectations.",pace:"slow"},
 "Little Dorrit":{reason:"Love restrained by duty and class makes for a quietly emotional period drama.",pace:"slow"},
 "Crash Landing on You":{reason:"Borders and distance stand between two people falling in love.",pace:"medium"},
 "Hospital Playlist":{reason:"Long friendships and everyday care reveal affection that builds quietly.",pace:"slow"},
 "One Tree Hill":{reason:"Youthful attachments evolve through loss, first love and friendship.",pace:"medium"},
 "Fellow Travelers":{reason:"Secrecy and history complicate a long-running romantic connection.",pace:"slow"},
 "Heartstopper":{reason:"Tender first love explores vulnerability and the desire to be known.",pace:"slow"},
 "Sanditon":{reason:"Social boundaries and guarded affection sustain slow romantic tension.",pace:"slow"},
 "Younger":{reason:"Romantic choices and questions of identity become difficult to separate.",pace:"medium"},
 "Strong Woman Do Bong-soon":{reason:"Attraction and discovery emerge through a playful unusual relationship.",pace:"medium"},
 "Young Royals":{reason:"A private romance conflicts with public duty and expectation.",pace:"slow"},
 "My Liberation Notes":{reason:"Quiet loneliness drives a search for meaning and connection.",pace:"slow"},
 "The Red Sleeve":{reason:"Affection restrained by duty shapes a historical romance.",pace:"slow"},
 "Eternal Love":{reason:"Romantic bonds tested by time and separation underpin its fantasy world.",pace:"medium"},
 "The Returned":{reason:"Loss and the return of loved ones turn absence into unsettling longing.",pace:"slow"},
 "The Hook Up Plan":{reason:"Friendship and imperfect romantic choices propel a Paris-set love story.",pace:"medium"},
 "SKAM France":{reason:"Vulnerable first loves and the desire to belong shape coming of age.",pace:"medium"},
 "Never Have I Ever":{reason:"Grief and awkward romances complicate a lively coming-of-age journey.",pace:"energetic"},
 "Ginny & Georgia":{reason:"Family attachment and young romance animate an emotional ensemble.",pace:"medium"},
 "Lovesick":{reason:"Reflecting on old relationships brings unfinished feelings to the surface.",pace:"medium"},
 "Starstruck":{reason:"Unexpected attraction creates awkward, uncertain emotional timing.",pace:"medium"},
 "Love Life":{reason:"Changing adult relationships frame a search for meaningful intimacy.",pace:"slow"},
 "Twenty-Five Twenty-One":{reason:"Youthful first love meets the bittersweet passage of time.",pace:"slow"},
 "Our Beloved Summer":{reason:"Former lovers reconnect and face emotions they thought were finished.",pace:"slow"},
 "Something in the Rain":{reason:"An intimate relationship confronts family and social expectations.",pace:"slow"},
 "When the Weather Is Fine":{reason:"Guarded affection unfolds through a gentle small-town reunion.",pace:"slow"},
 "A Perfect Story":{reason:"Growing intimacy challenges different social worlds.",pace:"medium"},
 "Feel Good":{reason:"Emotional vulnerability complicates a relationship under personal strain.",pace:"slow"},
 "Queen Charlotte: A Bridgerton Story":{reason:"Love and duty collide across different seasons of life.",pace:"slow"}
};
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
  "Good Will Hunting":"Its Boston academic and reflective setting fits an introspective fall watch.",
  "Knives Out":"Its New England country-house mystery adds an involving autumn-night option.",
  "Coraline":"Its rain-soaked Oregon setting and eerie storybook atmosphere suit spooky fall viewing.",
  "Rushmore":"Its school-year setting and eccentric campus life fit the back-to-school season.",
  "Whisper of the Heart":"Its Japanese schooldays, bookshops and creative ambitions fit a gentler fall afternoon.",
  "Autumn Sonata":"Its Swedish family reunion and autumn setting make a reflective seasonal watch.",
  "A Tale of Autumn":"Its French countryside and autumn romance connect directly to the season.",
  "October Sky":"Its Appalachian school setting and science-club ambitions suit back-to-school viewing.",
  "ParaNorman":"Its New England town and supernatural adventure make a lively spooky-season choice.",
  "Harry Potter and the Philosopher's Stone":"Its opening school term and Gothic castle create cozy autumn atmosphere.",
  "Little Forest":"Its countryside, cooking and changing agricultural seasons make a quiet fall watch.",
  "The Worst Person in the World":"Its Oslo seasons and reflective relationships suit an autumn evening.",
  "Monster House":"Its suburban Halloween adventure offers a spirited fall night.",
  // Korean Film Council, "KO-pick: Movies with autumn vibes" (2023):
  // https://www.koreanfilm.or.kr/eng/news/features.jsp?blbdComCd=601013&mode=FEATURES_VIEW&seq=626
  "Art Museum by the Zoo":"Its Seoul park's autumn maple leaves and gently comic romance bring a warm fall atmosphere.",
  "Love Wind Love Song":"Its Jeju autumn silvergrass landscapes and romance evoke a breezy fall escape.",
  "Il Mare":"Its windswept Korean seaside landscape and reflective letter-writing romance suit a quiet autumn watch.",
  "Spring, Summer, Fall, Winter... and Spring":"Its forest temple and vivid autumn mountain foliage connect directly to the changing seasons.",
  "Traces of Love":"Its autumn-set journey through Korea's seasonal landscapes ties grief and memory to fall.",
  "Late Autumn":"Its Seattle autumn leaves and fleeting romance make fall central to its atmosphere.",
  // Little Forest is the Korean 2018 adaptation, not the Japanese 2014 film.
  "Little Forest: Summer/Autumn":"Its Japanese forest cooking and the progression into autumn capture seasonal rural life.",
  "Only Yesterday":"Its Japanese countryside farming and harvest memories suit a reflective autumn afternoon."
};
/* Human-reviewed pace preferences, not an objective TMDB pace field. */
const FALL_PACE_HINTS:Record<Media,Record<string,"slow"|"medium"|"energetic">>={
 movie:{
  "Twilight":"medium","Dead Poets Society":"slow","You've Got Mail":"slow",
  "Manchester by the Sea":"slow","Fantastic Mr. Fox":"medium","The Holdovers":"slow",
  "Little Women":"slow","When Harry Met Sally...":"medium","Practical Magic":"medium",
  "Good Will Hunting":"slow","Knives Out":"energetic","Coraline":"energetic",
  "Rushmore":"medium","Whisper of the Heart":"slow","Autumn Sonata":"slow",
  "A Tale of Autumn":"slow","October Sky":"medium","ParaNorman":"energetic",
  "Harry Potter and the Philosopher's Stone":"energetic","Little Forest":"slow",
  "The Worst Person in the World":"slow","Monster House":"energetic",
  "Art Museum by the Zoo":"slow","Love Wind Love Song":"medium",
  "Il Mare":"slow","Spring, Summer, Fall, Winter... and Spring":"slow",
  "Traces of Love":"slow","Late Autumn":"slow",
  "Little Forest: Summer/Autumn":"slow","Only Yesterday":"slow"
 },
 tv:{
  "Gilmore Girls":"slow","Over the Garden Wall":"medium","Anne with an E":"slow",
  "Friday Night Lights":"medium","Only Murders in the Building":"energetic",
  "Chilling Adventures of Sabrina":"energetic","The Haunting of Hill House":"energetic",
  "Twin Peaks":"medium","Wednesday":"energetic","Heartstopper":"slow",
  "Felicity":"slow","Buffy the Vampire Slayer":"energetic","Dark":"energetic",
  "Reply 1988":"slow","The Makanai: Cooking for the Maiko House":"slow",
  "Normal People":"slow","The Chestnut Man":"energetic",
  "Sex Education":"energetic","Black Spot":"energetic",
  "The Haunting of Bly Manor":"slow","All Creatures Great and Small":"slow",
  "Autumn in My Heart":"slow"
 }
};
/* Film Council-reviewed national autumn references. These do NOT waive
   country, language, year, poster or other catalog quality verification.
   Year protects e.g. the 2018 Korean Little Forest from a 2014 Japanese match. */
const FALL_REGIONAL_FILMS:Record<string,{country:string;language:string;year:number}>={
  "Little Forest":{country:"KR",language:"ko",year:2018},
  "Art Museum by the Zoo":{country:"KR",language:"ko",year:1998},
  "Love Wind Love Song":{country:"KR",language:"ko",year:1999},
  "Il Mare":{country:"KR",language:"ko",year:2000},
  "Spring, Summer, Fall, Winter... and Spring":{country:"KR",language:"ko",year:2003},
  "Traces of Love":{country:"KR",language:"ko",year:2006},
  "Late Autumn":{country:"KR",language:"en",year:2010},
  "Little Forest: Summer/Autumn":{country:"JP",language:"ja",year:2014},
  "Only Yesterday":{country:"JP",language:"ja",year:1991},
  "Whisper of the Heart":{country:"JP",language:"ja",year:1995}
};
// Human-reviewed mood anchors, not a permanent watchlist or user preference.
// A windy evening can be playful, everyday, or contemplative (even bittersweet).
// Search anchors are validated against TMDB title/year and ALL user filters.
// Ambiguous adaptations (e.g. "Hamlet") are learned as a mood example, not
// forced to a particular adaptation without a release year.
type WindingReference={year:number;lane:string;pace:string;reason:string};
const WINDING_REFERENCES:Record<Media,Record<string,WindingReference>>={
  movie:{
    "Columbus":{year:2017,lane:"contemplative",pace:"slow",reason:"Its architecture, patient conversations and personal uncertainties invite quiet observation."},
    "Lost in Translation":{year:2003,lane:"contemplative",pace:"slow",reason:"Its unhurried Tokyo encounters and moments of disconnection invite emotional reflection."},
    "Her":{year:2013,lane:"contemplative",pace:"slow",reason:"Its intimate questions about connection and loneliness offer thoughtful speculative romance."},
    "Spring, Summer, Fall, Winter... and Spring":{year:2003,lane:"contemplative",pace:"slow",reason:"Its changing seasons and spiritual practice invite quiet philosophical contemplation."},
    "Three Colors: Blue":{year:1993,lane:"contemplative",pace:"slow",reason:"Its carefully observed grief and music create a contemplative, emotionally demanding experience."},
    "Three Colors: White":{year:1994,lane:"contemplative",pace:"slow",reason:"Its restrained character story offers reflective European cinema with bittersweet humor."},
    "Three Colors: Red":{year:1994,lane:"contemplative",pace:"slow",reason:"Its patient encounters explore connection and chance in a meditative style."},
    "Meet Joe Black":{year:1998,lane:"contemplative",pace:"slow",reason:"Its extended conversations about life, love and mortality reward an unhurried mood."},
    "Liberal Arts":{year:2012,lane:"contemplative",pace:"slow",reason:"Its conversations about literature, growing older and connection encourage reflection."},
    "Wendy and Lucy":{year:2008,lane:"contemplative",pace:"slow",reason:"Its spare, closely observed daily struggles invite quiet attention, though the story is sad."},
    "Sound of Metal":{year:2019,lane:"contemplative",pace:"slow",reason:"Its attentive sound design and patient character journey invite immersive reflection despite emotional strain."},
    "Fish Tank":{year:2009,lane:"contemplative",pace:"slow",reason:"Its intimate social-realist observations require attention and can be emotionally difficult."},
    "The Piano":{year:1993,lane:"contemplative",pace:"slow",reason:"Its visual storytelling and complex personal relationships invite immersive, emotionally intense reflection."},
    "A Ghost Story":{year:2017,lane:"contemplative",pace:"slow",reason:"Its long takes and consideration of grief and time are deliberately contemplative."},
    "Arrival":{year:2016,lane:"contemplative",pace:"slow",reason:"Its deliberate science-fiction mystery reflects on language, memory and connection."},
    "Breaking the Waves":{year:1996,lane:"contemplative",pace:"slow",reason:"Its patient moral and spiritual questions invite deep reflection, but its subject matter is distressing."},
    "Paris, Texas":{year:1984,lane:"contemplative",pace:"slow",reason:"Its sparse dialogue, landscapes and gradual revelations reward patient attention."},
    "Phantom Thread":{year:2017,lane:"contemplative",pace:"slow",reason:"Its restrained performances and meticulous domestic rhythms offer controlled psychological observation."},
    "A Short Film About Love":{year:1988,lane:"contemplative",pace:"slow",reason:"Its quiet study of longing and intimacy invites ethically complicated reflection."},
    "Pather Panchali":{year:1955,lane:"contemplative",pace:"slow",reason:"Its detailed observation of rural family life and childhood invites patient immersion."},
    "Silent Souls":{year:2010,lane:"contemplative",pace:"slow",reason:"Its restrained travel narrative and ritual reflections contemplate grief and belonging."},
    "Ordet":{year:1955,lane:"contemplative",pace:"slow",reason:"Its extended dialogue and questions of faith invite meditative contemplation."},
    "Au Hasard Balthazar":{year:1966,lane:"contemplative",pace:"slow",reason:"Its restrained scenes and suffering invite serious, demanding moral reflection."},
    "Barbara":{year:2012,lane:"contemplative",pace:"slow",reason:"Its quiet East German setting and subtle choices create patient, character-led tension."},
    "Ikiru":{year:1952,lane:"contemplative",pace:"slow",reason:"Its measured examination of mortality and meaning invites compassionate reflection."},
    "Poetry":{year:2010,lane:"contemplative",pace:"slow",reason:"Its carefully observed encounters invite contemplation of beauty alongside troubling realities."},
    "After Life":{year:1998,lane:"contemplative",pace:"slow",reason:"Its gently paced conversations ask what memories give a life meaning."},
    "Vive L'Amour":{year:1994,lane:"contemplative",pace:"slow",reason:"Its spare dialogue and urban solitude make patient observation the point."},
    "A Pigeon Sat on a Branch Reflecting on Existence":{year:2014,lane:"contemplative",pace:"slow",reason:"Its deadpan tableaux and existential humor offer an unusual contemplative rhythm."},
    "Amour":{year:2012,lane:"contemplative",pace:"slow",reason:"Its controlled intimate storytelling confronts difficult themes of aging and love."},
    "Dogville":{year:2003,lane:"contemplative",pace:"slow",reason:"Its theatrical restraint invites ethical reflection but includes profoundly distressing violence."},
    "The Tree of Life":{year:2011,lane:"contemplative",pace:"slow",reason:"Its lyrical images, family memories and philosophical passages invite patient immersion."},
    "Beauty Shop":{year:2005,lane:"everyday",pace:"slow",reason:"Its neighborhood salon, close friendships and comic everyday conversations make an inviting comfort watch."},
    "Just Wright":{year:2010,lane:"comfort",pace:"slow",reason:"An approachable romance grounded in friendship, personal connection and humor."},
    "Roll Bounce":{year:2005,lane:"playful",pace:"energetic",reason:"Skating, friendship and playful competition offer upbeat nostalgic escapism."},
    "ATL":{year:2006,lane:"everyday",pace:"slow",reason:"Friendship, neighborhood life and coming of age anchor its nostalgic everyday appeal."},
    "Drumline":{year:2002,lane:"playful",pace:"energetic",reason:"Music, campus camaraderie and spirited competition make an energetic, enjoyable watch."},
    "The Princess and the Frog":{year:2009,lane:"playful",pace:"energetic",reason:"Its songs, humor and lively fairy-tale adventure offer animated escapism."},
    "We're the Millers":{year:2013,lane:"playful",pace:"energetic",reason:"Its road-trip comedy and mismatched traveling companions keep things playful."},
    "Vacation":{year:2015,lane:"playful",pace:"energetic",reason:"An absurd family road trip makes an easygoing, comedic escape."},
    "He's Just Not That Into You":{year:2009,lane:"comfort",pace:"slow",reason:"Interconnected romantic misunderstandings make for an approachable ensemble watch."},
    "About Last Night":{year:2014,lane:"comfort",pace:"slow",reason:"Relationship comedy and conversational warmth keep this an accessible romantic watch."},
    "Bruce Almighty":{year:2003,lane:"playful",pace:"energetic",reason:"Its playful supernatural premise and broad humor make an upbeat comedy."},
    "The Switch":{year:2010,lane:"comfort",pace:"slow",reason:"A friendship-led romantic comedy with familiar, lighthearted relationship stakes."},
    "This Is Where I Leave You":{year:2014,lane:"everyday",pace:"slow",reason:"Family reunion and everyday tensions blend emotional connection with comedy."},
    "Guess Who":{year:2005,lane:"playful",pace:"energetic",reason:"Its awkward family introduction and comic clashes make a breezy relationship comedy."},
    "Identity Thief":{year:2013,lane:"playful",pace:"energetic",reason:"An unlikely duo and outrageous road-trip misadventures offer spirited comedic escapism."},
    "Zombieland":{year:2009,lane:"playful",pace:"energetic",reason:"Self-aware horror-comedy and found-family humor offer playful escapism for viewers comfortable with genre violence."},
    "Nomadland":{year:2020,lane:"contemplative",pace:"slow",reason:"Its unhurried journeys and attentive observations of everyday lives invite contemplation, despite difficult themes."},
    "Perfect Days":{year:2023,lane:"contemplative",pace:"slow",reason:"Small routines, music and everyday encounters invite an unhurried, attentive evening."},
    "Into the Wild":{year:2007,lane:"contemplative",pace:"slow",reason:"Its scenic personal journey invites reflection even though the story becomes emotionally difficult."},
    "Boyhood":{year:2014,lane:"contemplative",pace:"slow",reason:"Ordinary family moments across the years encourage patient, reflective viewing."},
    "Avatar":{year:2009,lane:"playful",pace:"energetic",reason:"An immersive fantastical world and accessible adventure offer a more energetic way to unwind."},
    "Little Forest":{year:2018,lane:"everyday",pace:"slow",reason:"Seasonal cooking and rural routines create a gentle everyday-life experience."},
    "The Lunchbox":{year:2013,lane:"comfort",pace:"slow",reason:"Food, handwritten exchanges and small human connections make an intimate, approachable watch."},
    "Paterson":{year:2016,lane:"contemplative",pace:"slow",reason:"Everyday routines and poetry create a warmly observant, unhurried rhythm."},
    "Amélie":{year:2001,lane:"comfort",pace:"slow",reason:"Its playful imagination and neighborhood connections offer whimsical feel-good storytelling."},
    "Our Little Sister":{year:2015,lane:"everyday",pace:"slow",reason:"Family relationships and everyday rituals make a warm, observant slice-of-life film."},
    "Hunt for the Wilderpeople":{year:2016,lane:"playful",pace:"energetic",reason:"An unlikely friendship and offbeat wilderness adventure blend humor and heart."},
    "School of Rock":{year:2003,lane:"playful",pace:"energetic",reason:"Music, classroom camaraderie and broad humor make an upbeat, rewatchable comedy."}
  },
  tv:{
    "Abbott Elementary":{year:2021,lane:"everyday",pace:"slow",reason:"A workplace school comedy built around funny, caring colleagues and small victories."},
    "Insecure":{year:2016,lane:"everyday",pace:"slow",reason:"Friendship, career and relationship misadventures offer relatable humor and everyday warmth."},
    "The Good Place":{year:2016,lane:"comfort",pace:"slow",reason:"A witty, warm-hearted ensemble uses humor and friendship to explore life's bigger questions."},
    "Midnight Diner":{year:2009,lane:"everyday",pace:"slow",reason:"Late-night meals and customers' everyday stories create a gentle, episodic rhythm."},
    "Somebody Somewhere":{year:2022,lane:"everyday",pace:"slow",reason:"Friendship and small-town life offer compassionate humor and personal connection."},
    "Detectorists":{year:2014,lane:"contemplative",pace:"slow",reason:"Its countryside wandering and affectionate character humor invite unhurried viewing."},
    "Reply 1988":{year:2015,lane:"everyday",pace:"slow",reason:"Neighbors, family and adolescence evoke everyday warmth and nostalgia."},
    "K-On!":{year:2009,lane:"comfort",pace:"slow",reason:"Light school-club music and friendships offer playful, low-stakes animated comfort."},
    "Gilmore Girls":{year:2000,lane:"comfort",pace:"slow",reason:"Community, banter and relationships make a familiar small-town comfort watch."},
    "Bob's Burgers":{year:2011,lane:"comfort",pace:"slow",reason:"Everyday family mishaps and affectionate comedy create approachable animated comfort."},
    "Schitt's Creek":{year:2015,lane:"comfort",pace:"slow",reason:"Warm relationships grow through oddball small-town comedy."},
    "Derry Girls":{year:2018,lane:"playful",pace:"energetic",reason:"Energetic school friendships and chaotic comedy deliver an upbeat escape."},
    "Heartstopper":{year:2022,lane:"comfort",pace:"slow",reason:"Tender young relationships and friendship offer gentle coming-of-age warmth."},
    "Kim's Convenience":{year:2016,lane:"everyday",pace:"slow",reason:"A family shop and neighborhood relationships provide relatable everyday comedy."},
    "One Day at a Time":{year:2017,lane:"everyday",pace:"slow",reason:"Warm family relationships and lively sitcom humor make an approachable evening watch."},
    "Misaeng":{year:2014,lane:"contemplative",pace:"slow",reason:"Office life and quietly persistent personal growth make a reflective character-focused watch."},
    "Somebody Feed Phil":{year:2018,lane:"comfort",pace:"slow",reason:"Friendly food and travel encounters make an upbeat, easygoing factual watch."},
    "Felicity":{year:1998,lane:"contemplative",pace:"slow",reason:"Its university friendships and relationship choices invite nostalgic, introspective viewing."}
  }
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
/* Small, human-curated thematic collections. The titles are resolved using
 * exact TMDB title + first release year, not guessed IDs or genre keywords.
 * The archive below remains the complete catalog when a collection is closed. */
type CollectionTitle={title:string;year:number};
const EDITORIAL_COLLECTIONS:Record<string,CollectionTitle[]>={
 "modern-classics":[
  {title:"Parasite",year:2019},{title:"Moonlight",year:2016},
  {title:"The Grand Budapest Hotel",year:2014},{title:"Whiplash",year:2014},
  {title:"The Social Network",year:2010},{title:"Aftersun",year:2022},
  {title:"Everything Everywhere All at Once",year:2022},{title:"The Zone of Interest",year:2023},
  {title:"Get Out",year:2017},{title:"Sound of Metal",year:2019},
  {title:"Lady Bird",year:2017},{title:"The Favourite",year:2018},
  {title:"The Florida Project",year:2017},{title:"Manchester by the Sea",year:2016},
  {title:"The Lobster",year:2015},{title:"The Holdovers",year:2023},
  {title:"The Master",year:2012},{title:"Frances Ha",year:2012}
 ],
 "around-the-world":[
  {title:"In the Mood for Love",year:2000},{title:"Drive My Car",year:2021},
  {title:"City of God",year:2002},{title:"The Lives of Others",year:2006},
  {title:"Roma",year:2018},{title:"Shoplifters",year:2018},
  {title:"The Lunchbox",year:2013},{title:"Cold War",year:2018},
  {title:"Timbuktu",year:2014},{title:"The Handmaiden",year:2016},
  {title:"A Separation",year:2011},{title:"The Secret in Their Eyes",year:2009},
  {title:"Pan's Labyrinth",year:2006},{title:"The Great Beauty",year:2013},
  {title:"The Motorcycle Diaries",year:2004},{title:"The Hunt",year:2012},
  {title:"The Wailing",year:2016},{title:"Amores Perros",year:2000}
 ],
 "love-in-all-forms":[
  {title:"Past Lives",year:2023},{title:"Before Sunrise",year:1995},
  {title:"Portrait of a Lady on Fire",year:2019},{title:"The Worst Person in the World",year:2021},
  {title:"Carol",year:2015},{title:"Love & Basketball",year:2000},
  {title:"The Farewell",year:2019},{title:"Little Women",year:2019},
  {title:"About Time",year:2013},{title:"If Beale Street Could Talk",year:2018},
  {title:"The Intouchables",year:2011},{title:"Her",year:2013},
  {title:"Eternal Sunshine of the Spotless Mind",year:2004},{title:"Blue Valentine",year:2010},
  {title:"The Big Sick",year:2017},{title:"Call Me by Your Name",year:2017},
  {title:"Brooklyn",year:2015},{title:"Before Sunset",year:2004}
 ],
 "animation-discoveries":[
  {title:"Coraline",year:2009},{title:"Fantastic Mr. Fox",year:2009},
  {title:"Spirited Away",year:2001},{title:"Kubo and the Two Strings",year:2016},
  {title:"Memoir of a Snail",year:2024},{title:"Persepolis",year:2007},
  {title:"The Triplets of Belleville",year:2003},{title:"Mary and Max",year:2009},
  {title:"The Tale of the Princess Kaguya",year:2013},{title:"The Red Turtle",year:2016},
  {title:"The Breadwinner",year:2017},{title:"Anomalisa",year:2015},
  {title:"Waltz with Bashir",year:2008},{title:"My Life as a Zucchini",year:2016},
  {title:"The Illusionist",year:2010},{title:"The Secret of Kells",year:2009},
  {title:"Song of the Sea",year:2014},{title:"Ernest & Celestine",year:2012}
 ]
};
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
    // On-demand, privacy-safe features for a member's *own* logged titles.
    // The client sends only public TMDB identifiers, never ratings, notes,
    // emails or user IDs. No third-party AI service or model is involved.
    // Bounded batches and short-lived public metadata cache control fanout.
    if(mode==="taste-features"){
      const requested=Array.isArray(input.keys)?input.keys.slice(0,18):[];
      const keys=[...new Set(requested.filter((key:unknown)=>typeof key==="string"&&
        /^tmdb-(movie|tv)-[1-9][0-9]{0,9}$/.test(key)))];
      if(!keys.length)return response({items:[]});
      const themeKeywords:Record<string,string>={
        "coming of age":"growing-up","growing up":"growing-up",
        "first love":"first-love","unrequited love":"love",
        "forbidden love":"love","longing":"connection",
        "loneliness":"solitude","solitude":"solitude",
        "family relationships":"family","family relationship":"family",
        "father daughter relationship":"family","mother daughter relationship":"family",
        "friendship":"friendship","female friendship":"friendship",
        "grief":"loss","bereavement":"loss","loss of loved one":"loss",
        "memory":"memory","social class":"class","class differences":"class",
        "identity":"identity","self-discovery":"identity",
        "workplace":"work","work":"work","ambition":"ambition",
        "revenge":"revenge","obsession":"obsession",
        "secrets":"secrets","secrecy":"secrets"
      };
      const toneKeywords:Record<string,string>={
        "dark comedy":"satirical","satire":"satirical",
        "melancholy":"melancholic","melancholic":"melancholic",
        "heartwarming":"warm","whimsical":"playful",
        "psychological thriller":"suspenseful"
      };
      // Normalize *documented TMDB keyword phrases* into a restrained set of
      // story qualities. No genre-to-tone guessing or fabricated plot analysis.
      const extraThemeKeywords:Record<string,string>={
        "alienation":"solitude","isolation":"solitude",
        "estrangement":"connection","emotional distance":"connection",
        "long distance relationship":"connection",
        "unrequited romance":"love","romantic longing":"connection",
        "bittersweet":"loss","nostalgia":"memory",
        "nostalgic":"memory","reminiscence":"memory",
        "mourning":"loss","death of a loved one":"loss",
        "parent child relationship":"family","sibling relationship":"family",
        "dysfunctional family":"family","family conflict":"family",
        "identity crisis":"identity","search for identity":"identity",
        "existentialism":"identity","existential crisis":"identity",
        "finding oneself":"identity","self discovery":"identity",
        "class conflict":"class","wealth disparity":"class",
        "social inequality":"class","economic inequality":"class",
        "female protagonist":"identity","outsider":"belonging",
        "outsiders":"belonging","sense of belonging":"belonging",
        "slice of life":"everyday-life","everyday life":"everyday-life",
        "daily life":"everyday-life","ordinary life":"everyday-life",
        "human relationship":"connection","human relationships":"connection",
        "personal growth":"growing-up","adolescence":"growing-up",
        "coming-of-age":"growing-up","introspection":"self-reflection",
        "self reflection":"self-reflection","introspective":"self-reflection",
        "redemption":"redemption","forgiveness":"forgiveness",
        "trauma":"trauma","childhood trauma":"trauma",
        "migration":"displacement","immigration":"displacement",
        "displacement":"displacement","homesickness":"displacement"
      };
      const extraToneKeywords:Record<string,string>={
        "deadpan humor":"dry-humor","deadpan comedy":"dry-humor",
        "dry humor":"dry-humor","dry comedy":"dry-humor",
        "black comedy":"satirical","dark humor":"satirical",
        "tragicomedy":"bittersweet","bittersweet":"bittersweet",
        "poignant":"bittersweet","somber":"melancholic",
        "somber mood":"melancholic","wistful":"melancholic",
        "quiet":"quiet","contemplative":"contemplative",
        "meditative":"contemplative","reflective":"contemplative",
        "atmospheric":"atmospheric","dreamlike":"dreamlike",
        "surrealism":"surreal","surreal":"surreal",
        "absurdist comedy":"absurdist","absurdism":"absurdist",
        "feel good":"warm","feel-good":"warm"
      };
      const themeLookup={...themeKeywords,...extraThemeKeywords};
      const toneLookup={...toneKeywords,...extraToneKeywords};
      const output:Array<Record<string,unknown>>=[];
      let cursor=0;
      await Promise.all(Array.from({length:Math.min(5,keys.length)},async()=>{
        while(cursor<keys.length){
          const key=keys[cursor++];
          const found=/^tmdb-(movie|tv)-(\d+)$/.exec(key);
          if(!found)continue;
          const contentMedia=found[1] as Media;
          try {
            const data=await tmdb("/"+contentMedia+"/"+found[2],
              new URLSearchParams({language:"en-US",append_to_response:"keywords"}),token);
            if(data.adult===true||!data.id)continue;
            const terms=contentMedia==="movie"?data.keywords?.keywords:data.keywords?.results;
            const names=(Array.isArray(terms)?terms:[]).map((word:Record<string,unknown>)=>
              String(word.name||"").toLowerCase().trim());
            const genres=(Array.isArray(data.genres)?data.genres:[])
              .map((genre:Record<string,unknown>)=>String(genre.name||"").toLowerCase().trim())
              .filter(Boolean).slice(0,6);
            const rawTitle=contentMedia==="tv"?data.name:data.title;
            const title=typeof rawTitle==="string"?rawTitle.trim().slice(0,180):"";
            if(!title)continue;
            output.push({key,title,category:contentMedia==="tv"?"tv":"movies",
              genres,
              themes:[...new Set(names.map((name:string)=>themeLookup[name]).filter(Boolean))].slice(0,8),
              tones:[...new Set(names.map((name:string)=>toneLookup[name]).filter(Boolean))].slice(0,5)});
          }catch(_){/* Missing details reduce confidence; never fabricate facets. */}
        }
      }));
      return response({items:output});
    }
    if(mode==="collection"){
      const key=typeof input.collection==="string"?input.collection:"";
      const titles=Object.prototype.hasOwnProperty.call(EDITORIAL_COLLECTIONS,key)
        ?EDITORIAL_COLLECTIONS[key]:null;
      if(!titles)return response({error:"Unknown collection"},400);
      const normalized=(title:unknown)=>String(title||"").normalize("NFKD")
        .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
      const searches=await Promise.allSettled(titles.map(async title=>{
        const query=new URLSearchParams({
          query:title.title,language:"en-US",page:"1",include_adult:"false"
        });
        const data=await tmdb("/search/movie",query,token);
        return (data.results||[]).find((item:Record<string,unknown>)=>
          normalized(item.title)===normalized(title.title)
          &&yearOf(item.release_date)===title.year
          &&eligible(item,"movie",0))||null;
      }));
      const found=searches.filter((x):x is PromiseFulfilledResult<Record<string,unknown>|null>=>x.status==="fulfilled")
        .map(x=>x.value).filter((x):x is Record<string,unknown>=>Boolean(x));
      // A small reserve makes it possible to offer 16 verified stories even
      // when an editorial title is not eligible or TMDB search is incomplete.
      return response({collection:key,items:found.slice(0,16).map(item=>listItem(item,"movie")),
        totalPages:1,hasMore:false});
    }
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
      // Discover's origin-country filter applies to films as well as TV.
      // Film production country is STILL verified using movie details below.
      if(country&&mode==="discover")params.set("with_origin_country",country);

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
        const allAnchors=media==="movie"?EDITORIAL_FILMS:EDITORIAL_TELEVISION;
        const reviewed=page===1?allAnchors.slice(0,16)
                     :page===2?allAnchors.slice(16,24):[];
        const normalized=(title:unknown)=>String(title||"").normalize("NFKD")
          .replace(/[\u0300-\u036f]/g,"").toLowerCase()
          .replace(/[^a-z0-9]+/g," ").trim();
        // Studio-anchored titles and wide-catalog lanes load CONCURRENTLY.
        // Keep the first two rows engaging without doubling loading time.
        const anchorJob=Promise.allSettled(reviewed.map(async anchor=>{
          const query=new URLSearchParams({
            query:anchor.title,language:"en-US",page:"1",include_adult:"false"
          });
          const found=await tmdb("/search/"+media,query,token);
          return (found.results||[]).find((item:Record<string,unknown>)=>
            normalized(media==="movie"?item.title:item.name)===normalized(anchor.title)
            &&yearOf(media==="movie"?item.release_date:item.first_air_date)===anchor.year
            &&eligible(item,media,30))||null;
        }));
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
        // A studio-backed opening dozen is engaging, but not a wall of
        // blockbusters. We verify release and the exact title/year at TMDB.
        // Curzon is intentionally well represented as a UK distributor.
        // The other 45+ slots still explore the broader film/TV landscape.
        const anchorMatches=await anchorJob;
        const editorial=anchorMatches
          .filter((x):x is PromiseFulfilledResult<Record<string,unknown>|null>=>x.status==="fulfilled")
          .map(x=>x.value).filter((x):x is Record<string,unknown>=>Boolean(x));
        const mixed:Record<string,unknown>[]=[],used=new Set<number>();
        const append=(item:Record<string,unknown>|undefined)=>{
          const id=Number(item?.id);
          if(!item||!Number.isInteger(id)||used.has(id)||mixed.length>=60)return;
          used.add(id);mixed.push(item);
        };
        editorial.forEach(append);
        // Interleave the rest; never repeat an anchor that occurs in a lane.
        for(let i=0;i<20&&mixed.length<60;i++){
          for(const lane of lanesReady)append(lane.entries[i]);
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
      const availableItems=Math.min(500*20,Number(body.total_results)||0);
      const hasMore=page<100&&firstIndex+requestedSize<availableItems;
      return response({
        page,
        // A provider total can include films subsequently rejected by
        // content filters. Don't present it as the number of usable pages.
        totalPages:null,
        totalResults:country||mode==="search"&&(requestedGenre||hasDecade||originalLanguage)?null:Number(body.total_results)||0,
        hasMore,
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
      const shortlist=balanced.slice(0,28);
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
        items:verified.slice(0,18).map(v=>listItem(v,media)),
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
      // Fall is already seeded with reviewed references; avoid seven extra
      // sequential keyword lookups on the latency-sensitive first request.
      const ids=mood==="fall"||mood==="winding"?[]:await moodKeywordIds(mood,token);
      // Keyword coverage is incomplete, so also find subjects through title and synopsis evidence.
      const now=new Date().toISOString().slice(0,10),offset=number(input.offset,0,120,0);
      // Seeded seasonal stories make fall fast; other moods explore several
      // parallel pages but never spin through repeated frontend re-queries.
      const total=mood==="fall"||mood==="yearning"&&media==="tv"&&!countries.length&&!languages.length
        ?6:Math.min(6,Math.max(4,countries.length*languages.length,decades.length*2));
      // Start reviewed autumn-title discovery at the SAME TIME as the broader
      // mood search; otherwise two sequential rounds of TMDB traffic cause a
      // long loading screen. These are candidates, NOT unverified outputs.
      // Reviewed seasonal television gives the Fall + TV route genuine
      // candidates. Previously only films were seeded, while the TV discover
      // stream rarely had enough verified autumn evidence to show anything.
      const FALL_TV_ATMOSPHERE:Record<string,string>={
        "Gilmore Girls":"Its New England small-town setting, campus life and seasonal traditions suit a cozy fall watch.",
        "Over the Garden Wall":"Its woodland journey, harvest palette and eerie folklore give it a distinctive autumn atmosphere.",
        "Anne with an E":"Its literary schooldays, countryside setting and changing seasons make it a reflective fall choice.",
        "Friday Night Lights":"Its small-town football season and community stories evoke autumn evenings.",
        "Only Murders in the Building":"Its New York apartment setting and playful mystery suit a crisp fall evening.",
        "Chilling Adventures of Sabrina":"Its school-year setting, witches and autumnal gothic atmosphere suit the spooky side of fall.",
        "The Haunting of Hill House":"Its gothic family mystery gives a more frightening option for autumn evenings.",
        "Twin Peaks":"Its misty woodland town and uncanny mysteries evoke the atmospheric side of fall.",
        "Wednesday":"Its Gothic boarding school and mysteries make for an energetic autumn watch.",
        "Heartstopper":"Its British school-year setting and young relationships offer a gentler fall watch.",
        "Felicity":"Its New York university years and intimate relationships suit a cozy fall evening.",
        "Buffy the Vampire Slayer":"Its school-year setting and supernatural mysteries work for a lively fall night.",
        "Dark":"Its German forest town and eerie mysteries evoke the darker side of autumn.",
        "Reply 1988":"Its Korean neighborhood schooldays and family traditions bring nostalgic autumn warmth.",
        "The Makanai: Cooking for the Maiko House":"Its Kyoto seasonal meals and quiet daily rituals suit reflective fall viewing.",
        "Normal People":"Its Irish school and university years evoke the reflective back-to-school season.",
        "The Chestnut Man":"Its Danish autumn crime mystery is an intense fall-night option.",
        "Sex Education":"Its British school-year setting and lively teenage stories suit back-to-school season.",
        "Black Spot":"Its French-language woodland setting and ominous mysteries fit an atmospheric autumn night.",
        "The Haunting of Bly Manor":"Its English Gothic estate and subdued ghost story suit an eerie fall evening.",
        "All Creatures Great and Small":"Its Yorkshire countryside and seasonal village life offer a cozy fall watch.",
        "Autumn in My Heart":"Its Korean autumn romance and melancholy family story fit the season directly."
      };
      // Include curated slow and energetic titles, rotating the sample
      // across attempts so a second request can discover different stories.
      const allFallTitles=mood==="fall"?(media==="tv"
        ?Object.keys(FALL_TV_ATMOSPHERE):Object.keys(FALL_ATMOSPHERE)):[];
      const preferred=allFallTitles.filter(t=>FALL_PACE_HINTS[media][t]===pace);
      const remaining=allFallTitles.filter(t=>FALL_PACE_HINTS[media][t]!==pace);
      const rotate=(titles:string[],n:number)=>titles.length
        ?[...titles.slice(n%titles.length),...titles.slice(0,n%titles.length)]:[];
      const regional=media==="movie"&&mood==="fall"&&(countries.length||languages.length)
        ?allFallTitles.filter(title=>{
           const ref=FALL_REGIONAL_FILMS[title];
           return Boolean(ref&&(!countries.length||countries.includes(ref.country))&&
             (!languages.length||languages.includes(ref.language)));
         }):[];
      const regionFirst=[...rotate(regional.filter(t=>FALL_PACE_HINTS.movie[t]===pace),offset*4),
        ...rotate(regional.filter(t=>FALL_PACE_HINTS.movie[t]!==pace),offset*4)];
      const seasonalTitles=[...new Set([...regionFirst,...rotate(preferred,offset*5),
        ...rotate(remaining,offset*5)])].slice(0,18);
      // Diverse global relationship stories are editorial signposts, never
      // the only source of results: the keyword and TMDB discovery lanes run
      // in parallel to surface stories the viewer hasn't heard about.
      const yearningUnfiltered=mood==="yearning"&&media==="tv"&&
        !countries.length&&!languages.length&&!genres.length&&!decades.length&&!ratings.length;
      const yearningNames=yearningUnfiltered?Object.keys(YEARNING_TV_REFERENCES):[];
      const yearningPreferred=yearningNames.filter(t=>YEARNING_TV_REFERENCES[t].pace===pace);
      const yearningOther=yearningNames.filter(t=>YEARNING_TV_REFERENCES[t].pace!==pace);
      const yearningSeeds=[...rotate(yearningPreferred,offset*7),
        ...rotate(yearningOther,offset*7)].slice(0,16);
      const yearningSeedJob=yearningSeeds.length
        ?Promise.allSettled(yearningSeeds.map(async title=>{
          const result=await tmdb("/search/tv",new URLSearchParams({
            query:title,language:"en-US",include_adult:"false",page:"1"
          }),token);
          const normalize=(x:string)=>x.normalize("NFKD").toLowerCase()
            .replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]/gu,"");
          return (result.results||[]).find((v:Record<string,unknown>)=>
            [v.name,v.original_name].some(name=>
              normalize(String(name||""))===normalize(title)))||null;
        })):null;
      const fallSeedJob=seasonalTitles.length
        ?Promise.allSettled(seasonalTitles.map(async title=>{
           const result=await tmdb("/search/"+media,
             new URLSearchParams({query:title,language:"en-US",include_adult:"false",page:"1"}),token);
           const normalize=(value:string)=>value.toLowerCase().normalize("NFKD")
             .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
           const anchor=media==="movie"?FALL_REGIONAL_FILMS[title]:null;
           return (result.results||[]).find((v:Record<string,unknown>)=>{
             if(anchor){
               const year=yearOf(v.release_date);
               if(year&&Math.abs(year-anchor.year)>1)return false;
               if(v.original_language&&v.original_language!==anchor.language)return false;
             }
             return [v[media==="tv"?"name":"title"],
               v[media==="tv"?"original_name":"original_title"]]
               .some(name=>normalize(String(name||""))===normalize(title));
           })||null;
         }))
        :null;
      // Reviewed wind-down references seed several DISTINCT viewing styles.
      // Rotating by offset prevents a fixed shelf, while the wider TMDB search
      // remains available for discoveries beyond these editorial examples.
      const windingCatalog:Record<string,WindingReference>=mood==="winding"?WINDING_REFERENCES[media]:{};
      const windingEntries=Object.entries(windingCatalog);
      const preferredWinding=windingEntries.filter(([,ref])=>ref.pace===pace);
      const alternateWinding=windingEntries.filter(([,ref])=>ref.pace!==pace);
      // The actual "Take your time" request means sustained attention:
      // subtle moments, slow cinema, thought and contemplation. This is
      // different from the wider Winding Down umbrella of comfort and fun.
      const windingLanes=pace==="energetic"
        ?["playful","comfort","everyday","contemplative"]
        :["contemplative","everyday","comfort","playful"];
      const windingLaneSequence=pace==="slow"&&media==="movie"
        ?["contemplative","contemplative","everyday","contemplative",
          "contemplative","comfort","contemplative","contemplative",
          "contemplative","contemplative","everyday","contemplative"]
        :Array.from({length:12},(_,i)=>windingLanes[i%windingLanes.length]);
      const windOrder=[...preferredWinding,...alternateWinding];
      const windingByLane=new Map(windingLanes.map(lane=>[lane,
        windOrder.filter(([,ref])=>ref.lane===lane)]));
      const windingTitles:string[]=[];
      const laneCursor=new Map<string,number>();
      for(const lane of windingLaneSequence){
        const entries=windingByLane.get(lane)||[];
        const idx=laneCursor.get(lane)||0;laneCursor.set(lane,idx+1);
        const row=entries.length?entries[(idx+offset*5)%entries.length]:null;
        if(row&&!windingTitles.includes(row[0]))windingTitles.push(row[0]);
      }
      const windingSeedJob=windingTitles.length?Promise.allSettled(
        windingTitles.map(async title=>{
          const reference=windingCatalog[title];
          const data=await tmdb("/search/"+media,
            new URLSearchParams({query:title,language:"en-US",page:"1",include_adult:"false"}),token);
          const normalized=(value:string)=>value.normalize("NFKD")
            .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
          return (data.results||[]).find((item:Record<string,unknown>)=>
            normalized(String(media==="tv"?item.name:item.title||""))===normalized(title)
            &&yearOf(String(media==="tv"?item.first_air_date:item.release_date||""))===reference.year)||null;
        })
      ):null;
      const jobs=await Promise.allSettled(Array.from({length:total},async (_,i)=>{
        const country=countries.length?countries[(i+offset)%countries.length]:null;
        const language=languages.length?languages[(Math.floor(i/Math.max(1,countries.length))+offset)%languages.length]:null;
        const decade=decades.length?Number(decades[(Math.floor(i/Math.max(1,countries.length*languages.length))+offset)%decades.length]):null;
        const slowMovieSearch=mood==="winding"&&pace==="slow"&&media==="movie";
        // Older, quieter cinema rarely appears on the first popular pages.
        // Blend relevance candidates from popular and critically rated
        // catalog strata; keep the same feature/runtime/fit verification.
        const useRatedSort=slowMovieSearch&&(i%3===1);
        const params=new URLSearchParams({
          language:"en-US",include_adult:"false",
          sort_by:useRatedSort?"vote_average.desc":"popularity.desc",
          page:String(1+((offset*2+Math.floor(i/2))%24)),
          "vote_count.gte":String(mood==="fall"&&(countries.length||languages.length)?8:useRatedSort?100:media==="movie"?30:20)
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
        // The slow Winding Down path must actually *retrieve* reflective
        // human dramas rather than spending half its provider budget on
        // broad comedy/animation, only to discard them in verification.
        const contemplativeStrands=[[18],[18,10749],[18,99],[18,36],[18,16],[99,18]];
        const contemplativeSearch=mood==="winding"&&pace==="slow"&&media==="movie";
        const strands=contemplativeSearch?contemplativeStrands:GENRE_MOODS[mood][media];
        const broader=strands[i%strands.length];
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
          if(!eligible(v,media,mood==="fall"&&(countries.length||languages.length)?8:media==="movie"?30:20))return false;
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
      if(!groups.length&&!fallSeedJob&&!windingSeedJob&&!yearningSeedJob)return response({error:"catalogue_unavailable",message:"Mood search is temporarily unavailable."},502);
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
      if(yearningSeedJob){
        for(const result of await yearningSeedJob){
          if(result.status!=="fulfilled"||!result.value?.id)continue;
          const id=Number(result.value.id);
          if(excluded.has(id)||seen.has(id))continue;
          seen.add(id);selected.push(result.value);
        }
      }
      let windingRelatedGroups:Record<string,unknown>[][]=[];
      if(windingSeedJob){
        const exemplars=await windingSeedJob;
        const references=exemplars.filter((result):result is PromiseFulfilledResult<Record<string,unknown>>=>
          result.status==="fulfilled"&&Boolean(result.value?.id)).map(result=>result.value);
        // References define the viewing experience; they must not become an
        // endless carousel of the founder's own example films.
        // Reserve a few eligible reference candidates as fallbacks.
        // Preserve reference titles as a compass, not the opening four cards.
        // Editorial references found through other paths remain eligible
        // but won't crowd out strong unknown films in final ranking.
        for(const item of references.slice(0,
          mood==="winding"&&pace==="slow"&&media==="movie"?2:3)){
          const id=Number(item.id);
          if(excluded.has(id)||seen.has(id))continue;
          seen.add(id);selected.push(item);
        }
        // TMDB's similar-title graph supplies previously unlisted candidates.
        // Similarity is a *retrieval hint*, not automatic mood verification:
        // all recommendations must pass the normal synopsis/keyword fit test.
        const referenceNeighbors=references.filter((_,i)=>i%3===0).slice(0,3);
        const related=await Promise.allSettled(referenceNeighbors.map(async item=>{
          const params=new URLSearchParams({
            language:"en-US",page:String(1+(offset%3)),include_adult:"false"
          });
          const payload=await tmdb("/"+media+"/"+Number(item.id)+"/similar",params,token);
          return (payload.results||[]).filter((v:Record<string,unknown>)=>
            eligible(v,media,media==="movie"?30:20));
        }));
        windingRelatedGroups=related.filter((r):r is PromiseFulfilledResult<Record<string,unknown>[]> =>
          r.status==="fulfilled").map(r=>r.value);
      }
      // Editor-reviewed occasion picks still must satisfy the production,
      // country, language, genre and decade checks before being returned.
      if(mood==="holidays"&&media==="movie"){
        for(const id of Object.keys(SEASONAL_FEATURES).map(Number)){
          if(!excluded.has(id)){seen.add(id);selected.push({id});}
        }
      }
      for(let index=0;index<20;index++){
        // Interleave real catalog neighbors with worldwide/genre discovery
        // instead of front-loading a static list. No provider recommendation
        // is displayed until the same detailed mood evidence checks pass.
        if(mood==="winding"&&index<12){
          for(const related of windingRelatedGroups){
            const entry=related[index];
            if(!entry||seen.has(Number(entry.id))||excluded.has(Number(entry.id)))continue;
            seen.add(Number(entry.id));selected.push(entry);
          }
        }
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
      // Search more than the first 24: narrow pools repeatedly produced
      // only 2–3 Fall results despite unrestricted preferences.
      const queue=selected.slice(0,
        mood==="winding"&&pace==="slow"&&media==="movie"?120:
        mood==="winding"?75:mood==="fall"&&(countries.length||languages.length)?120:90);
      const verified:Array<ReturnType<typeof listItem>&{
        moodReason:string;matchedFilters:string[];moodFit:number;moodLane:string;energySignal:string;fitVersion:string;
        windingReference:boolean;originCountry:string;editorialAnchor:boolean
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
          // TMDB frequently lacks studio credits for genuine older and
          // international releases. Studio attribution is not evidence that
          // the movie exists; requiring it excluded verified Korean films.
          // Keep actual release status, feature runtime, production origin,
          // original language, poster, synopsis and strong mood evidence.
          if(details.status!=="Released"||Number(details.runtime)<40)return;
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
        const fallReason=mood==="fall"
          ?(media==="tv"?FALL_TV_ATMOSPHERE[String(details.name||"")]
            :FALL_ATMOSPHERE[String(details.title||"")])||null:null;
        const tags=Array.isArray(detailKeywords)?detailKeywords.map((v:Record<string,unknown>)=>String(v.name||"")):[];
        const windingRef=mood==="winding"
          ?WINDING_REFERENCES[media][String(media==="tv"?details.name:details.title)]||null:null;
        const editorialPace=mood==="fall"
          ?FALL_PACE_HINTS[media][String(media==="tv"?details.name:details.title)]||null:null;
        const yearningHint=mood==="yearning"&&media==="tv"
          ?YEARNING_TV_REFERENCES[String(details.name||"")]||null:null;
        const experience=moodExperience(mood,details,tags,pace,
          windingRef?.reason||fallReason||yearningHint?.reason||editorial?.reason||null,
          editorialPace||yearningHint?.pace||null,windingRef?.lane||null);
        // Pace changes the preference ordering among qualifying anchors,
        // not their ability to fit the Winding Down mood at all.
        if(mood==="winding"&&windingRef&&pace!=="medium"){
          // For slow Film requests, prioritize genuinely contemplative cinema
          // over just pleasant comedy, without excluding other eligible films.
          experience.score+=windingRef.pace===pace?3:-1;
          if(pace==="slow"&&media==="movie"&&windingRef.lane==="contemplative")
            experience.score+=5;
        }
        // Winding Down's slow choice means patiently observed human moments,
        // not every comedy/horror vaguely tagged reflective or everyday.
        // This guard also rejects pleasant-but-brisk editorial references when
        // the viewer explicitly asks for contemplation.
        if(mood==="winding"&&media==="movie"&&pace==="slow"&&
          !slowWindingFilmEvidence(details,tags,detailGenreIds,
            windingRef?.lane||null,windingRef?.pace||null))return;
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
        const titleItem=listItem({...details,genre_ids:detailGenreIds},media);
        if(!titleItem.poster)return;
        verified.push({
          ...titleItem,certification,moodReason:reason,
          windingReference:Boolean(windingRef),originCountry:produced[0]||"",
          editorialAnchor:Boolean(yearningHint),
          moodFit:experience.score,moodLane:experience.lane,
          energySignal:experience.energy,fitVersion:experience.fitVersion,
          matchedFilters:matching
        });
      }
      async function worker(){
        while(queue.length&&verified.length<(mood==="winding"?20:16)){
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
        // Regional diversity applies only to an unfiltered TV yearning shelf.
        // Hard user-selected filters are always authoritative.
        const regionOf=(country:string)=>{
          if(["US","CA","MX","BR","AR","CO"].includes(country))return "americas";
          if(["JP","KR","CN","TW","HK","TH","PH","ID","IN","VN","SG","MY"].includes(country))return "asia";
          if(["GB","IE","FR","DE","ES","IT","SE","NO","DK","PL","NL","TR","RU"].includes(country))return "europe";
          return "other";
        };
        const mixedYearning=mood==="yearning"&&media==="tv"&&
          !countries.length&&!languages.length&&!genres.length&&!decades.length&&!ratings.length;
        while(remaining.length){
          let best=0,bestScore=-Infinity;
          for(let i=0;i<remaining.length;i++){
            const entry=remaining[i];
            const lanePenalty=(laneCounts.get(entry.moodLane)||0)*2.4;
            const seenGenre=curated.filter(selected=>
              selected.genreIds.some(id=>entry.genreIds.includes(id))).length;
            // Encourage stylistic range only among comparably fitting choices,
            // and never counteract a specific animation or country filter.
            const style=entry.genreIds.includes(16)?"animated":"other";
            const styleRepeats=curated.filter(item=>
              (item.genreIds.includes(16)?"animated":"other")===style).length;
            const languageRepeats=curated.filter(item=>item.language&&item.language===entry.language).length;
            const rangePenalty=mood==="winding"&&!genres.length&&!countries.length&&!languages.length
              ?Math.max(0,styleRepeats-1)*1.8+Math.min(3,languageRepeats)*0.9:0;
            const originRepeat=curated.filter(x=>x.originCountry&&x.originCountry===entry.originCountry).length;
            const region=regionOf(entry.originCountry);
            const regionRepeat=curated.filter(x=>region!=="other"&&regionOf(x.originCountry)===region).length;
            const animeRepeat=curated.filter(x=>x.genreIds.includes(16)).length;
            const editorialRepeat=curated.filter(x=>x.editorialAnchor).length;
            const mixPenalty=mixedYearning&&curated.length<5?
              originRepeat*3+regionRepeat*2+
              (entry.genreIds.includes(16)?animeRepeat*2:0)+
              (entry.editorialAnchor?editorialRepeat*1.1:0):0;
            const adjusted=entry.moodFit-lanePenalty-Math.min(2,seenGenre)*0.4-rangePenalty-mixPenalty;
            if(adjusted>bestScore){bestScore=adjusted;best=i;}
          }
          const [winner]=remaining.splice(best,1);
          curated.push(winner);
          laneCounts.set(winner.moodLane,(laneCounts.get(winner.moodLane)||0)+1);
        }
        // Keep the editorial references as examples, not the whole shelf.
        // Prefer at least three qualifying, independently discovered stories
        // across ten returned candidates; never promote a weak match.
        if(mood==="winding"){
          const independent=curated.filter(entry=>!entry.windingReference&&entry.moodFit>=7);
          if(independent.length){
            const known=curated.filter(entry=>entry.windingReference);
            const preferred:typeof curated=[];
            const used=new Set<number>();
            const append=(entry:typeof curated[number])=>{
              const id=Number(entry.id);
              if(used.has(id))return;
              used.add(id);preferred.push(entry);
            };
            // Feature strong discoveries FIRST rather than guaranteeing
            // slots to the founder's suggestions. A couple of reviewed
            // anchors can join only after the independent candidates.
            independent.slice(0,5).forEach(append);
            if(known[0])append(known[0]);
            if(known[1])append(known[1]);
            curated.forEach(append); 
            verified.splice(0,verified.length,...preferred);
          }else{
            verified.splice(0,verified.length,...curated);
          }
        }else{
          verified.splice(0,verified.length,...curated);
        }
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
      const sourceMedia:Media=input.sourceMedia==="movie"?"movie":input.sourceMedia==="tv"?"tv":media;
      // A small cross-format bridge prevents an empty TV shelf when someone
      // has rated movies but not series (or vice versa). These are GENRE
      // connections, not fabricated TMDB film-to-series recommendations.
      if(sourceMedia!==media){
        const genreBridge:Record<string,number[]>=media==="tv"?{
          "28":[10759],"12":[10759],"878":[10765],"14":[10765],
          "27":[10765,9648],"53":[9648,18],"10749":[18],
          "36":[18,10768],"10752":[10768],"10402":[18],
          "18":[18],"35":[35],"80":[80],"16":[16],"99":[99],
          "10751":[10751],"9648":[9648],"37":[37]
        }:{
          "10759":[28,12],"10765":[878,14,9648],"10768":[36,10752],
          "10762":[10751,16],"10764":[99],"18":[18],"35":[35],
          "80":[80],"16":[16],"99":[99],"10751":[10751],
          "9648":[9648],"37":[37]
        };
        const normalized=(x:string)=>x.normalize("NFKD")
          .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
        const seeds=await Promise.allSettled(terms.map(async title=>{
          const data=await tmdb("/search/"+sourceMedia,
            new URLSearchParams({query:title,language:"en-US",page:"1",include_adult:"false"}),token);
          const match=(data.results||[]).find((x:Record<string,unknown>)=>
            [sourceMedia==="movie"?x.title:x.name,
              sourceMedia==="movie"?x.original_title:x.original_name]
              .some(name=>normalized(String(name||""))===normalized(title)));
          if(!match)return {title,results:[] as Record<string,unknown>[],targets:[] as number[]};
          const targets=[...new Set((Array.isArray(match.genre_ids)?match.genre_ids:[])
            .flatMap((id:number)=>genreBridge[String(id)]||[]))].slice(0,5);
          if(!targets.length)return {title,results:[] as Record<string,unknown>[],targets};
          const requests=[1,2].map(async page=>{
            const query=new URLSearchParams({
              language:"en-US",include_adult:"false",page:String(page),
              sort_by:page===1?"popularity.desc":"vote_average.desc",
              "vote_count.gte":String(media==="tv"?70:100),
              "vote_average.gte":"6.1",with_genres:targets.join("|")
            });
            query.set(media==="movie"?"primary_release_date.lte":"first_air_date.lte",
              new Date().toISOString().slice(0,10));
            const response=await tmdb("/discover/"+media,query,token);
            return response.results||[];
          });
          const replies=await Promise.allSettled(requests);
          return {title,targets,results:replies.flatMap(x=>x.status==="fulfilled"?x.value:[])};
        }));
        const pool=new Map<number,{item:ReturnType<typeof listItem>;matched:string[];genreNames:string[];count:number;popularity:number}>();
        for(const seed of seeds){
          if(seed.status!=="fulfilled")continue;
          const {title,targets,results}=seed.value;
          const taken=new Set<number>();
          for(const v of results){
            const id=Number(v.id),ids:Array<number>=Array.isArray(v.genre_ids)?v.genre_ids:[];
            if(taken.has(id)||!targets.some(target=>ids.includes(target))||!eligible(v,media,scoped?5:media==="tv"?25:40))continue;
            if(originalLanguage&&v.original_language!==originalLanguage)continue;
            if(country&&media==="tv"&&!(v.origin_country||[]).includes(country))continue;
            taken.add(id);
            const related=targets.filter(target=>ids.includes(target)).map(target=>
              codes[target]||"a related genre");
            const prior=pool.get(id);
            if(prior){prior.count++;prior.matched.push(title);}
            else pool.set(id,{item:listItem(v,media),matched:[title],genreNames:related,
              count:1,popularity:Number(v.popularity)||0});
          }
        }
        const candidates=[...pool.values()].sort((a,b)=>b.count-a.count||b.popularity-a.popularity).slice(0,90);
        if(!scoped)return response({items:candidates.slice(0,60).map(v=>({
          ...v.item,matched:v.matched,matchedGenres:v.genreNames,matchMethod:"shared_genre",matchCount:v.count
        })),filters:{country:null,originalLanguage:null}});
        // Honor user-selected production country and original language across
        // the format bridge too; search summaries are not country proof.
        const validated=await Promise.allSettled(candidates.map(async v=>{
          const details=await tmdb("/"+media+"/"+v.item.id,
            new URLSearchParams({language:"en-US"}),token);
          const nations=media==="movie"
            ?(details.production_countries||[]).map((c:Record<string,unknown>)=>String(c.iso_3166_1||""))
            :exactCodes(details.origin_country);
          const language=String(details.original_language||"");
          if(country&&!nations.includes(country))return null;
          if(originalLanguage&&language!==originalLanguage)return null;
          return {...v.item,matched:v.matched,matchedGenres:v.genreNames,
            matchMethod:"shared_genre",matchCount:v.count,countries:nations,
            originalLanguage:language,filterVerified:true};
        }));
        return response({items:validated.filter((x):x is PromiseFulfilledResult<ReturnType<typeof listItem> & {
          matched:string[];matchedGenres:string[];matchMethod:string;matchCount:number;
          countries:string[];originalLanguage:string;filterVerified:boolean}|null>=>x.status==="fulfilled"&&x.value!==null)
          .map(x=>x.value).slice(0,60),filters:{country:country||null,originalLanguage:originalLanguage||null}});
      }
      const all=new Map<number,{item:ReturnType<typeof listItem>,votes:number,matched:string[],
        matchMethod:string,matchedGenres:string[]}>();
      const normalizeTitle=(x:string)=>x.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
        .toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
      // A recommendation must trace to an actual positively rated title.
      // Similar is a backup that expands the source pool, not a generic
      // popular-movie replacement or editorial quota.
      const found=await Promise.allSettled(terms.map(async term=>{
        const searchData=await tmdb("/search/"+media,
          new URLSearchParams({query:term,language:"en-US",page:"1",include_adult:"false"}),token);
        const source=(searchData.results||[]).find((v:Record<string,unknown>)=>
          [media==="tv"?v.name:v.title,media==="tv"?v.original_name:v.original_title]
            .some(name=>normalizeTitle(String(name||""))===normalizeTitle(term)));
        if(!source?.id)return {term,results:[] as Record<string,unknown>[],genreIds:new Set<number>()};
        const endpoint="/"+media+"/"+source.id;
        const ids=Array.isArray(source.genre_ids)?source.genre_ids.slice(0,3).map(Number):[];
        const genreParams=new URLSearchParams({
          language:"en-US",include_adult:"false",page:"1",
          sort_by:"vote_average.desc","vote_count.gte":media==="movie"?"125":"80",
          "vote_average.gte":"6.3",with_genres:ids.join("|")
        });
        genreParams.set(media==="movie"?"primary_release_date.lte":"first_air_date.lte",
          new Date().toISOString().slice(0,10));
        const jobs=[
          tmdb(endpoint+"/recommendations",new URLSearchParams({language:"en-US",page:"1"}),token),
          tmdb(endpoint+"/similar",new URLSearchParams({language:"en-US",page:"1"}),token)
        ];
        if(ids.length){
          if(scoped){
            // With a country or original-language preference, asking TMDB
            // for generic worldwide films and filtering afterwards may
            // leave ZERO Korean (or other international) matches. Search
            // the requested catalog at the source instead, anchored to
            // genres of the positively rated film. Keep these as labeled
            // shared-genre bridges, not claimed title-to-title matches.
            const targeted=new URLSearchParams(genreParams);
            targeted.set("sort_by","popularity.desc");
            targeted.set("vote_count.gte","12");
            targeted.delete("vote_average.gte");
            if(country)targeted.set("with_origin_country",country);
            if(originalLanguage)targeted.set("with_original_language",originalLanguage);
            for(const page of [1,2]){
              const p=new URLSearchParams(targeted);
              p.set("page",String(page));
              jobs.push(tmdb("/discover/"+media,p,token));
            }
          }else jobs.push(tmdb("/discover/"+media,genreParams,token));
        }
        const replies=await Promise.allSettled(jobs);
        const pool:Record<string,unknown>[]=[];
        const genreIds=new Set<number>(),directIds=new Set<number>();
        for(let i=0;i<replies.length;i++){
          const reply=replies[i];
          if(reply.status!=="fulfilled")continue;
          const items:Record<string,unknown>[]=reply.value.results||[];
          if(i>=2)items.forEach(item=>genreIds.add(Number(item.id)));
          else items.forEach(item=>directIds.add(Number(item.id)));
          pool.push(...items);
        }
        for(const id of directIds)genreIds.delete(id);
        return {term,results:pool,genreIds};
      }));
      for(const outcome of found){
        if(outcome.status!=="fulfilled")continue;
        const {term,results,genreIds}=outcome.value;
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
          const isGenreOnly=genreIds.has(id);
          const relatedGenres=isGenreOnly?(title.genres||[]):[];
          if(prev){
            prev.votes+=1;prev.matched.push(term);
            if(!isGenreOnly)prev.matchMethod="tmdb_related";
          }else all.set(id,{item:title,votes:1,matched:[term],
            matchMethod:isGenreOnly?"shared_genre":"tmdb_related",
            matchedGenres:relatedGenres});

        }
      }
      const candidates=[...all.values()].sort((a,b)=>b.votes-a.votes);
      if(!scoped)return response({items:candidates.slice(0,70)
        .map(v=>({...v.item,matched:v.matched,matchCount:v.votes,
          matchMethod:v.matchMethod,matchedGenres:v.matchedGenres})),
        filters:{country:null,originalLanguage:null}});
      // Search summaries cannot confirm a film's production country. Check
      // actual TMDB details, and never silently relax either selected filter.
      const selected: Array<{item:ReturnType<typeof listItem>;votes:number;matched:string[];
        matchMethod:string;matchedGenres:string[];verifiedCountries:string[];originalLanguage:string}> = [];
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
          matchCount:v.votes,matchMethod:v.matchMethod,matchedGenres:v.matchedGenres,
          countries:v.verifiedCountries,
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
      // Only presentation text is localized. Keep the verified English
      // metadata, posters and trailers intact and fall back when TMDB has
      // no published translation for this title.
      const uiLocale=typeof input.uiLocale==="string"?input.uiLocale:"en";
      const tmdbLocales:Record<string,string>={es:"es-ES",fr:"fr-FR",pt:"pt-BR",ko:"ko-KR"};
      let localizedOverview="";
      if(tmdbLocales[uiLocale]){
        try{
          const translated=await tmdb("/"+media+"/"+id,
            new URLSearchParams({language:tmdbLocales[uiLocale]}),token);
          localizedOverview=concise(translated.overview);
        }catch(_){/* Continue with the verified original overview. */}
      }
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
        synopsis:localizedOverview||concise(data.overview),
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
