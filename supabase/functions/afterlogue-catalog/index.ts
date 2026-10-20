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
 fall:{movie:[[9648,18],[14,18],[18]],tv:[[9648,18],[18]],caption:"Mystery and atmosphere for changing seasons."},
 holidays:{movie:[[10751,35],[10749,35],[14]],tv:[[35,10751],[10751]],caption:"Warmth, family and seasonal atmosphere."},
 unexpected:{movie:[[878,9648],[14,18],[16],[99]],tv:[[10765,9648],[16],[18]],caption:"An optional detour beyond familiar genres."}
};


/* Exact subject tags, not genres, decide whether a title belongs in a mood. */
const MOOD_TOPICS:Record<string,{labels:string[];reason:string}>={
 holidays:{labels:["christmas","christmas eve","christmas holiday","thanksgiving","new year's eve","new year","hanukkah","diwali","lunar new year","santa claus","valentine's day","easter","halloween","st. patrick's day","leap year","leap day","ramadan","eid al-fitr","festival of lights","mid-autumn festival"],reason:"A story connected to a holiday or seasonal occasion"},
 yearning:{labels:["unrequited love","long distance relationship","first love","forbidden love","lost love","unfulfilled love"],reason:"A story about longing and connection"},
 winding:{labels:["slice of life","self discovery","small town","healing","friendship","everyday life","feel-good"],reason:"A reflective story for winding down"},
 friday:{labels:["party","night out","road trip","heist","nightclub","music festival","concert","dance party"],reason:"An energetic Friday-night story"},
 fall:{labels:["halloween","autumn","harvest","haunted house","ghost","witch","small town mystery"],reason:"A story with autumnal or eerie atmosphere"},
 unexpected:{labels:["surrealism","alternate reality","time travel","parallel universe","absurdism","experimental film","dream world"],reason:"A surprising or unconventional story"}
};
const keywordCache=new Map<string,{id:number,expires:number}>();
async function moodKeywordIds(mood:string,token:string):Promise<number[]>{
 const labels=MOOD_TOPICS[mood]?.labels||[];
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
  fall:/\bhalloween\b|\bautumn\b|\bfall season\b|\bharvest\b|\bghosts?\b|\bhaunted\b|\bwitch(es)?\b|\bpumpkin\b|\bsmall town mystery\b|\bcreepy\b|\bspooky\b/i,
  unexpected:/\bsurreal\b|\btime travel\b|\balternate reality\b|\bparallel universe\b|\bweird\b|\bstrange\b|\bbizarre\b|\babsurd\b|\botherworldly\b|\bdream world\b/i
 };
 const p=patterns[mood];const match=p?.exec(synopsis);
 if(match)return "The synopsis features "+match[0].toLowerCase()+", fitting this mood.";
 if(tag)return 'The film is tagged “'+tag+'” in the catalog.';
 return null;
}
const HOLIDAY_GROUPS:string[][]=[
 ["christmas","christmas eve","christmas holiday","santa claus"],
 ["thanksgiving","new year's eve","new year"],
 ["hanukkah","diwali","lunar new year","ramadan","eid al-fitr"],
 ["valentine's day","easter","leap year","leap day"],
 ["halloween","st. patrick's day","mid-autumn festival"]
];
const SEASONAL_FEATURES:Record<number,{event:string;reason:string}>={
  25195:{event:"Leap Day",reason:"The story centers on an Irish Leap Day proposal tradition."},
  1019420:{event:"Irish seasonal viewing",reason:"An Irish-set romance suited to St. Patrick’s season; it is not a St. Patrick’s Day plot."},
  417028:{event:"October seasonal viewing",reason:"A Disney Channel film premiered during its October Monstober programming; its plot is not about Halloween."}
};
function exactCodes(x:unknown):string[]{
 return Array.isArray(x)?x.filter((v:unknown)=>typeof v==="string").map(String):[];
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
async function tmdb(path:string,params:URLSearchParams,token:string){
  const url=TMDB+path+"?"+params.toString();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const r=await fetch(url,{
      headers:{Authorization:"Bearer "+token,Accept:"application/json"},
      signal:controller.signal
    });
    if(!r.ok)throw Error("TMDB responded "+r.status);
    return await r.json();
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
      const body=await tmdb(endpoint,params,token);
      return response({
        page:Number(body.page)||1,
        totalPages:Math.min(Number(body.total_pages)||1,100),
        totalResults:Number(body.total_results)||0,
        items:(body.results||[]).filter((v:Record<string,unknown>)=>!v.adult&&v.poster_path&&v.overview)
          .map((v:Record<string,unknown>)=>listItem(v,media))
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
      const ids=await moodKeywordIds(mood,token);
      // Keyword coverage is incomplete, so also find subjects through title and synopsis evidence.
      const now=new Date().toISOString().slice(0,10),offset=number(input.offset,0,120,0);
      const total=Math.min(10,Math.max(6,countries.length*languages.length,decades.length*2));
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
      if(!groups.length)return response({error:"catalogue_unavailable",message:"Mood search is temporarily unavailable."},502);
      const seen=new Set<number>(),selected:Record<string,unknown>[]=[];
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
      const queue=selected.slice(0,56);
      const verified:Array<ReturnType<typeof listItem>&{moodReason:string;matchedFilters:string[]}>= [];
      async function verifyOne(v:Record<string,unknown>){
        const p=new URLSearchParams({language:"en-US",append_to_response:"keywords"});
        if(excluded.has(Number(v.id)))return;
        const details=await tmdb("/"+media+"/"+Number(v.id),p,token);
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
        const explicit=narrativeMoodEvidence(mood,details,label);
        // Seasonal picks have editorially documented context; otherwise demand
        // story evidence, not a popularity score or generic genre label.
        if(!explicit&&!editorial)return;
        const reason=explicit||editorial!.reason;
        const matching:string[]=[];
        if(countries.length)matching.push("Country: "+countries.filter(c=>produced.includes(c)).join(" or "));
        if(languages.length)matching.push("Language: "+details.original_language);
        if(genres.length)matching.push("Genre: "+genres.filter(g=>detailGenreIds.includes(categoryGenres[g])).join(" or "));
        if(decades.length&&year)matching.push("Decade: "+Math.floor(year/10)*10+"s");
        verified.push({
          ...listItem({...details,genre_ids:detailGenreIds},media),moodReason:reason,
          matchedFilters:matching
        });
      }
      async function worker(){
        while(queue.length&&verified.length<22){
          const item=queue.shift();
          if(!item)return;
          try{await verifyOne(item);}catch(error){
            console.warn("Mood title verification unavailable",String(error));
          }
        }
      }
      await Promise.all([worker(),worker(),worker(),worker(),worker()]);
      // Verification jobs are concurrent, so put titles back into the
      // original discovery relevance/popularity order.
      const indexById=new Map(selected.map((x,i)=>[Number(x.id),i]));
      verified.sort((a,b)=>{
        const aa=genreSignal(a.genreIds.map(Number),pace);
        const bb=genreSignal(b.genreIds.map(Number),pace);
        return bb-aa||(indexById.get(Number(a.id))??999)-(indexById.get(Number(b.id))??999);
      });
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
      return response({
        mood,matching:"verified-theme-and-details",pace,
        items:verified.slice(0,24),
        note:verified.length?"These stories have a verified thematic reason and match your filters."
          :"No fresh matches found in this part of the catalog. Try searching further or broaden your choices.",
        filters:{genres,countries,languages,decades},excludedCount:excluded.size
      });
    }
    // Cross-title recommendations, anchored exclusively in titles the viewer liked.
    // Inputs are titles, not private account data or raw credentials.
    if(mode==="recommend"){
      const terms=Array.isArray(input.titles)?input.titles.slice(0,4)
        .filter((v:unknown)=>typeof v==="string"&&v.trim().length>=2&&v.length<=110):[];
      if(!terms.length)return response({items:[]});
      const all=new Map<number,{item:ReturnType<typeof listItem>,votes:number,matched:string[]}>();
      for(const rawTitle of terms){
        const term=String(rawTitle).trim();
        const searchParams=new URLSearchParams({query:term,language:"en-US",page:"1",include_adult:"false"});
        const searchData=await tmdb("/search/"+media,searchParams,token);
        const norm=(x:string)=>x.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
        const source=(searchData.results||[]).find((v:Record<string,unknown>)=>
          norm(String(media==="tv"?v.name:v.title||""))===norm(term));
        if(!source?.id)continue;
        const q=new URLSearchParams({language:"en-US",page:"1"});
        const recommends=await tmdb("/"+media+"/"+source.id+"/recommendations",q,token);
        for(const v of recommends.results||[]){
          if(!eligible(v,media,media==="movie"?40:25))continue;
          const title=listItem(v,media);
          const prev=all.get(Number(v.id));
          if(prev){prev.votes+=1;prev.matched.push(term);}
          else all.set(Number(v.id),{item:title,votes:1,matched:[term]});
        }
      }
      return response({items:[...all.values()]
        .sort((a,b)=>b.votes-a.votes)
        .slice(0,50)
        .map(v=>({...v.item,matched:v.matched,matchCount:v.votes}))});
    }
    if(mode==="detail"){
      const id=Number(input.id);
      if(!Number.isInteger(id)||id<=0||id>100000000)return response({error:"Invalid title ID"},400);
      params.delete("page");
      params.set("append_to_response","credits,videos,images");
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
        director,creator,cast,crew,
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
