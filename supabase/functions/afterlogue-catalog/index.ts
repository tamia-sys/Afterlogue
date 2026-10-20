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
 holidays:{labels:["christmas","christmas eve","christmas holiday","thanksgiving","new year's eve","new year","hanukkah","diwali","lunar new year","santa claus"],reason:"A story centered on a holiday"},
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
  {label:"holiday season",pattern:/\bduring the holidays\b|\bfor the holidays\b|\bover the holidays\b|\bholiday season\b|\bholiday spirit\b|\bholiday cheer\b|\bholiday party\b|\bholiday festivities\b|\bholiday celebrations\b/i}
 ];
 for(const event of holidaySubjects){
  if(event.pattern.test(title))return "The title explicitly refers to "+event.label+".";
  if(event.pattern.test(overview))return "The synopsis explicitly references "+event.label+".";
 }
 return null;
}
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
      const ids=await moodKeywordIds(mood,token);
      if(!ids.length)return response({mood,items:[],note:"No verified mood tags are currently available."});
      const now=new Date().toISOString().slice(0,10),offset=number(input.offset,0,30,0);
      const total=Math.min(10,Math.max(4,countries.length*languages.length,decades.length*2));
      const jobs=await Promise.allSettled(Array.from({length:total},async (_,i)=>{
        const country=countries.length?countries[(i+offset)%countries.length]:null;
        const language=languages.length?languages[(Math.floor(i/Math.max(1,countries.length))+offset)%languages.length]:null;
        const decade=decades.length?Number(decades[(Math.floor(i/Math.max(1,countries.length*languages.length))+offset)%decades.length]):null;
        const params=new URLSearchParams({
          language:"en-US",include_adult:"false",sort_by:"popularity.desc",
          page:String(1+Math.floor((i+offset)/Math.max(1,total/2))%2),
          "vote_count.gte":String(media==="movie"?30:20),
          with_keywords:ids.join("|")
        });
        if(genres.length)params.set("with_genres",genres.map(name=>categoryGenres[name]).join("|"));
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
      for(let index=0;index<20;index++){
        for(const group of groups){
          const entry=group[index];
          if(!entry||seen.has(Number(entry.id)))continue;
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
      const queue=selected.slice(0,26);
      const verified:Array<ReturnType<typeof listItem>&{moodReason:string;matchedFilters:string[]}>= [];
      async function verifyOne(v:Record<string,unknown>){
        const p=new URLSearchParams({language:"en-US",append_to_response:"keywords"});
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
        if(!tagged.length)return;
        const label=idToTopic.get(tagged[0])||MOOD_TOPICS[mood].labels[0];
        const phrase=mood==="holidays"?holidayEvidence(details):null;
        if(mood==="holidays"&&!phrase)return;
        const reason=phrase||("TMDB tags this story with “"+label+"”, matching this mood.");
        const matching:string[]=[];
        if(countries.length)matching.push("Country: "+countries.filter(c=>produced.includes(c)).join(" or "));
        if(languages.length)matching.push("Language: "+details.original_language);
        if(genres.length)matching.push("Genre: "+genres.filter(g=>detailGenreIds.includes(categoryGenres[g])).join(" or "));
        if(decades.length&&year)matching.push("Decade: "+Math.floor(year/10)*10+"s");
        verified.push({
          ...listItem(v,media),moodReason:reason,
          matchedFilters:matching
        });
      }
      async function worker(){
        while(queue.length){
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
      verified.sort((a,b)=>(indexById.get(Number(a.id))??999)-(indexById.get(Number(b.id))??999));
      return response({
        mood,matching:"verified-theme-and-details",
        items:verified.slice(0,24),
        note:verified.length?"These stories have a verified thematic reason and match your filters."
          :"No verified stories match this mood and filter combination. Try fewer filters.",
        filters:{genres,countries,languages,decades}
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
