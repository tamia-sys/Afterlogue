/* Afterlogue expanded catalog. Requires Supabase TMDB_READ_ACCESS_TOKEN secret.
   The original 54-title collection works independently if the service is unconfigured. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const panel=$("afterlogue-global-catalog");
if(!panel)return;
const endpoint="https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog";
let media="movie",page=1,pages=1,term="",genre="",country="",language="",decade="",sort="popular",timer=null,serial=0,configured=false;
let hasNext=false;
let pageCursors=new Map([[1,null]]);
const hasActiveFilters=()=>Boolean(term.trim().length>=2||genre||country||language||decade);
function resetPaging(){page=1;hasNext=false;pageCursors=new Map([[1,null]]);}
const input=$("catalog-search"),genreBox=$("catalog-genre"),countryBox=$("catalog-country"),languageBox=$("catalog-language"),decadeBox=$("catalog-decade"),sortBox=$("catalog-sort");
const stateKey="afterlogue.explore.all-films.v1";
const params=new URLSearchParams(location.search);
function readState(){
 try{
  const record=JSON.parse(sessionStorage.getItem(stateKey)||"null");
  if(!record||typeof record!=="object")return;
  media=record.media==="tv"?"tv":"movie";
  page=Number.isInteger(record.page)?Math.max(1,Math.min(100,record.page)):1;
  term=typeof record.term==="string"?record.term.slice(0,100):"";
  genre=typeof record.genre==="string"?record.genre:"";
  country=typeof record.country==="string"?record.country:"";
  language=typeof record.language==="string"?record.language:"";
  decade=typeof record.decade==="string"?record.decade:"";
  sort=["popular","newest","oldest"].includes(record.sort)?record.sort:"popular";
  $("catalog-media").value=media;input.value=term;
  genreBox.value=genre;countryBox.value=country;languageBox.value=language;decadeBox.value=decade;sortBox.value=sort;
 }catch(_){}
}
function rememberState(){
 try{sessionStorage.setItem(stateKey,JSON.stringify({media,page,term,genre,country,language,decade,sort}));}catch(_){}
}
async function readiness(){
 try{const r=await fetch(endpoint+"?status=1");const data=await r.json();return Boolean(r.ok&&data.ready);}catch(_){return false;}
}
async function request(body){
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const json=await res.json();
 if(!res.ok)throw Error(json.message||"Expanded catalog is not configured yet.");
 return json;
}
function clear(){ $("catalog-grid").replaceChildren(); }
function render(list){
 clear();
 for(const title of list){
  const a=document.createElement("a");a.className="catalog-tile";
  a.href="film-details.html?tmdb="+encodeURIComponent(title.id)+"&type="+encodeURIComponent(title.media)+"&from=all-films";
  a.addEventListener("click",()=>{term=input.value;rememberState();});
  const frame=document.createElement("div");frame.className="catalog-tile-poster";
  const img=document.createElement("img");img.loading="lazy";img.src=title.poster||"";img.alt=title.title+" poster";
  const name=document.createElement("span");name.className="catalog-tile-title";name.textContent=title.title;
  const sub=document.createElement("span");sub.className="catalog-tile-year";sub.textContent=title.year||"";
  frame.append(img);a.append(frame,name,sub);
  const tile=document.createElement("div");tile.className="catalog-tile-wrap";
  const eye=window.AfterlogueSeen?.button({key:"tmdb-"+title.media+"-"+title.id,title:title.title,year:title.year,poster:title.poster,category:title.media==="tv"?"tv":"movies"});
  tile.append(a);if(eye)tile.append(eye);$("catalog-grid").append(tile);
 }
}
async function load(){
 rememberState();
 const id=++serial;
 const isSearch=term.trim().length>=2;
 const filtered=hasActiveFilters();
 if(filtered&&page>1&&!pageCursors.has(page))page=1;
 $("catalog-prev").disabled=true;$("catalog-next").disabled=true;
 $("catalog-message").textContent="Finding stories…";
 try{
  // Filtering exposes 70 titles per page; standard browsing uses 60.
  // The server uses exact offsets so no titles are silently skipped.
  const hasFilters=Boolean(isSearch||genre||country||language||decade);
  const pageSize=hasFilters?70:60;
  const result=await request({mode:isSearch?"search":"discover",query:term.trim(),media,page,pageSize,
    cursor:filtered?(pageCursors.get(page)||null):null,
    genre,country,originalLanguage:language,decade:Number(decade)||null,sort});
  if(id!==serial)return;
  if(!filtered){
    pages=Math.max(1,Number(result.totalPages)||1);
    if(page>pages){page=pages;return load();}
    hasNext=page<pages;
  }else{
    // Cursor pagination describes genuine qualifying titles, so unlike the
    // old UI it cannot claim there are 100 full pages without evidence.
    const cursor=typeof result.nextCursor==="string"?result.nextCursor:null;
    hasNext=Boolean(cursor);
    if(cursor)pageCursors.set(page+1,cursor);
    else pageCursors.delete(page+1);
  }
  render(result.items||[]);
  const totalShown=(result.items||[]).length;
  $("catalog-message").textContent=totalShown+" "+(totalShown===1?"story":"stories")+
    " · Page "+page+(filtered?"":" of "+pages);
  $("catalog-prev").disabled=page<=1;$("catalog-next").disabled=!hasNext;
  $("catalog-pagination").hidden=page<=1&&!hasNext;
 }catch(error){
  if(id!==serial)return;
  clear();
  $("catalog-message").textContent=error.message||"Expanded catalog currently unavailable.";
  $("catalog-pagination").hidden=true;
  if(!configured)$("catalog-message").textContent="The film library is temporarily unavailable. Please try again.";
 }
}
async function openLibrary(){
  // Show the same combined catalog for everybody. No separate "featured"
  // fallback or extra readiness network trip before posters can load.
  configured=true;
  panel.hidden=false;document.body.classList.remove("explore-gallery-mode");
  if(location.hash!=="#all-films")history.replaceState(null,"",location.pathname+location.search+"#all-films");
  $("explore-gallery-wrap").hidden=true;$("explore-experience").hidden=true;
  $("explore-results").hidden=true;$("explore-all-films").hidden=true;
  window.scrollTo({top:0,behavior:"instant"});load();
}
$("catalog-open").addEventListener("click",openLibrary);
$("catalog-back").addEventListener("click",()=>{
 panel.hidden=true;$("explore-gallery-wrap").hidden=false;document.body.classList.add("explore-gallery-mode");
 history.replaceState(null,"",location.pathname+location.search);
});
$("catalog-media").addEventListener("change",e=>{media=e.target.value;resetPaging();load();});
input.addEventListener("input",()=>{
  clearTimeout(timer);
  // Save the search immediately. A viewer can open a title before the
  // debounced request completes and should still return to their query.
  term=input.value;
  resetPaging();
  rememberState();
  serial++;
  if(term.trim().length===1){
    $("catalog-message").textContent="Keep typing to search…";
    return; // One character must not clear the catalog grid.
  }
  $("catalog-message").textContent=term.trim().length>=2?"Searching for “"+term.trim()+"”…":"Finding stories…";
  $("catalog-pagination").hidden=true;
  timer=setTimeout(load,260);
});
[genreBox,countryBox,languageBox,decadeBox,sortBox].forEach(el=>el.addEventListener("change",()=>{genre=genreBox.value;country=countryBox.value;language=languageBox.value;decade=decadeBox.value;sort=sortBox.value;resetPaging();load();}));
function turnPage(direction){
 const target=page+direction;
 if(target<1||(direction>0&&!hasNext))return;
 if(hasActiveFilters()&&target>1&&!pageCursors.has(target))return;
 if(!hasActiveFilters()&&target>pages)return;
 page=target;
 // Move back to the TOP OF THE CATALOG, not the bottom pagination controls.
 window.scrollTo({top:0,behavior:"instant"});
 panel.scrollTop=0;
 load();
}
$("catalog-prev").addEventListener("click",()=>turnPage(-1));
$("catalog-next").addEventListener("click",()=>turnPage(1));
readState();
if(location.hash==="#all-films")openLibrary();
})();