/* AFTERLOGUE — ONE Explore search across the featured and TMDB libraries.
 * The wide catalog is primary; featured cards can appear in the same rail.
 * Never claim "no matches" until all outstanding remote searches settle.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const field=$("explore-search"), grid=$("explore-match-picks");
const counter=$("explore-matches-count"),note=$("explore-browse-note");
if(!field||!grid)return;
const status=document.createElement("p");
status.id="explore-search-progress";status.className="catalog-intro";
status.setAttribute("role","status");status.setAttribute("aria-live","polite");
grid.after(status);
const endpoint="https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog";
const fold=v=>String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const slug=v=>fold(v).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const saved=window.afterlogueExploreData?.titles||[];
const cache=new Map();
let version=0,debounce=null,controllers=[];
function filters(){
 return {format:$("explore-format")?.value||"all",genre:$("explore-genre")?.value||"all",
  decade:$("explore-year")?.value||"all",country:$("explore-country")?.value||"all"};
}
function eligible(item,f){
 const media=item.media==="movies"?"movie":item.media;
 if(f.format!=="all"&&media!==(f.format==="tv"?"tv":"movie"))return false;
 if(f.genre!=="all"&&!(item.genres||[]).some(x=>fold(x)===fold(f.genre)))return false;
 if(f.decade!=="all"&&Math.floor(Number(item.year||0)/10)*10!==Number(f.decade))return false;
 // Only featured items with verified country tags can pass a country filter.
 if(f.country!=="all"&&item.source==="featured"&&!(item.countries||[]).includes(f.country))return false;
 return true;
}
function featured(query,f){
 return saved.filter(item=>fold(item.title).includes(fold(query)))
  .map(item=>({...item,media:item.media==="tv"?"tv":"movie",source:"featured"}))
  .filter(item=>eligible(item,f)).slice(0,10);
}
function ranking(item,query){
 const title=fold(item.title),q=fold(query);
 return title===q?0:title.startsWith(q)?1:title.split(/\s+/).some(word=>word.startsWith(q))?2:3;
}
function linkFor(item){
 if(item.source==="featured")return "film-details.html?title="+encodeURIComponent(slug(item.title))+"&from=explore";
 return "film-details.html?tmdb="+encodeURIComponent(item.id)+"&type="+item.media+"&from=explore";
}
function renderCard(item){
 const key=item.source==="featured"?slug(item.title):"tmdb-"+item.media+"-"+item.id;
 const node=document.createElement("article");node.className="explore-pick";
 const art=document.createElement("a");art.className="explore-art";art.href=linkFor(item);
 const img=document.createElement("img");img.loading="lazy";img.alt=item.title+" poster";img.src=item.poster||"";
 art.append(img);
 const title=document.createElement("h3");title.textContent=item.title;
 const year=document.createElement("p");year.className="explore-year";
 year.textContent=(item.year||"—")+" / "+(item.media==="tv"?"TV":"FILM");
 const actions=document.createElement("div");actions.className="explore-pick-actions";
 const eye=window.AfterlogueSeen?.button({key,title:item.title,year:item.year,poster:item.poster,category:item.media==="tv"?"tv":"movies"});
 const detail=document.createElement("a");detail.className="explore-global-detail";
 detail.href=art.href;detail.textContent="View details";
 if(eye)actions.append(eye);
 actions.append(detail);node.append(art,title,year,actions);
 return node;
}
function render(remote,local,query,loading,failures=0){
 const byTitle=new Map();
 // Prefer a TMDB record when it duplicates a featured title; they appear
 // together in ONE result list, rather than in two separate collections.
 for(const item of [...remote,...local]){
  if(!item?.poster)continue;
  const key=(item.media==="movies"?"movie":item.media)+":"+fold(item.title)+":"+String(item.year||"");
  if(!byTitle.has(key))byTitle.set(key,item);
 }
 const combined=[...byTitle.values()].sort((a,b)=>
  ranking(a,query)-ranking(b,query)||Number(a.source==="featured")-Number(b.source==="featured")||
  String(a.title).localeCompare(String(b.title))).slice(0,12);
 grid.replaceChildren(...combined.map(renderCard));
 counter.textContent=combined.length?combined.length+" matching "+(combined.length===1?"story":"stories"):"";
 $("explore-no-matches").hidden=true;
 if(loading)status.textContent="Searching films and television…";
 else if(combined.length)status.textContent=failures?"Showing available results. Some catalog searches couldn't finish.":"";
 else if(failures)status.textContent="Search couldn't finish. Please try again.";
 else status.textContent="No matching titles found. Try a different title or fewer filters.";
 // No internal catalog tiers in the visitor-facing interface.
}
function start(){
 clearTimeout(debounce);
 for(const controller of controllers)controller.abort();
 controllers=[];
 const id=++version,query=field.value.trim(),f=filters();
 if(query.length<2){
  grid.replaceChildren();counter.textContent="";status.textContent="";
  $("explore-no-matches").hidden=true;
  return;
 }
 const local=featured(query,f);
 // The catalog API verifies production country when supplied.
 // Wait for full results instead of showing a curated-only shelf first.
 render([],[],query,true);
 debounce=setTimeout(async()=>{
  if(id!==version)return;
  const media=f.format==="movies"?["movie"]:f.format==="tv"?["tv"]:["movie","tv"];
  const remote=[];let remaining=media.length,failures=0;
  const jobs=media.map(async type=>{
   const key=JSON.stringify([query,type,f.genre,f.decade,f.country]);
   if(cache.has(key))return cache.get(key);
   const controller=new AbortController();controllers.push(controller);
   const timeout=setTimeout(()=>controller.abort(),9000);
   try{
    const resp=await fetch(endpoint,{method:"POST",signal:controller.signal,
     headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"search",media:type,query,page:1,
       country:f.country==="all"?"":f.country,
       genre:f.genre==="all"?"":f.genre,
       decade:f.decade==="all"?null:Number(f.decade)})});
    if(!resp.ok)throw Error("Catalog returned "+resp.status);
    const payload=await resp.json(),items=(payload.items||[]).filter(item=>eligible(item,f));
    if(cache.size>35)cache.delete(cache.keys().next().value);
    cache.set(key,items);
    return items;
   }finally{clearTimeout(timeout);}
  });
  await Promise.all(jobs.map(async promise=>{
   try{const items=await promise;remote.push(...items);}
   catch(error){failures++;console.warn("Afterlogue search temporarily unavailable",error);}
   remaining--;
   if(id!==version)return;
   render(remote,local,query,remaining>0,failures);
  }));
 },210);
}
field.addEventListener("input",start);
["explore-format","explore-genre","explore-year","explore-country"].forEach(id=>$(id)?.addEventListener("change",start));
$("explore-clear")?.addEventListener("click",()=>{
 clearTimeout(debounce);version++;for(const c of controllers)c.abort();controllers=[];
 grid.replaceChildren();status.textContent="";counter.textContent="";
});
})();
