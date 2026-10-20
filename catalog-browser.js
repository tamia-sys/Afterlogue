/* Afterlogue expanded catalog. Requires Supabase TMDB_READ_ACCESS_TOKEN secret.
   The original 54-title collection works independently if the service is unconfigured. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const panel=$("afterlogue-global-catalog");
if(!panel)return;
const endpoint="https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog";
let media="movie",page=1,pages=1,term="",genre="",decade="",sort="popular",timer=null,serial=0,configured=false;
const input=$("catalog-search"),genreBox=$("catalog-genre"),decadeBox=$("catalog-decade"),sortBox=$("catalog-sort");
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
  decade=typeof record.decade==="string"?record.decade:"";
  sort=["popular","newest","oldest"].includes(record.sort)?record.sort:"popular";
  $("catalog-media").value=media;input.value=term;
  genreBox.value=genre;decadeBox.value=decade;sortBox.value=sort;
 }catch(_){}
}
function rememberState(){
 try{sessionStorage.setItem(stateKey,JSON.stringify({media,page,term,genre,decade,sort}));}catch(_){}
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
 $("catalog-message").textContent="Finding stories…";
 try{
  const result=await request({mode:isSearch?"search":"discover",query:term.trim(),media,page,genre,decade:Number(decade)||null,sort});
  if(id!==serial)return;
  pages=result.totalPages||1;render(result.items||[]);
  $("catalog-message").textContent=(result.totalResults||0).toLocaleString()+" titles · Page "+page+" of "+pages;
  $("catalog-prev").disabled=page<=1;$("catalog-next").disabled=page>=pages;
  $("catalog-pagination").hidden=pages<=1;
 }catch(error){
  if(id!==serial)return;
  clear();
  $("catalog-message").textContent=error.message||"Expanded catalog currently unavailable.";
  $("catalog-pagination").hidden=true;
  if(!configured)$("catalog-message").textContent="The full library is not available yet. Our featured films are still ready to explore.";
 }
}
async function openLibrary(){
  const ready=await readiness();
  configured=ready;
  if(!ready){
    document.getElementById("explore-all-films-open")?.click();
    return;
  }
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
$("catalog-media").addEventListener("change",e=>{media=e.target.value;page=1;load();});
input.addEventListener("input",()=>{
  clearTimeout(timer);
  // Save the search immediately. A viewer can open a title before the
  // debounced request completes and should still return to their query.
  term=input.value;
  page=1;
  rememberState();
  serial++;
  clear();
  $("catalog-message").textContent=term.trim().length>=2?"Searching for “"+term.trim()+"”…":"Finding stories…";
  $("catalog-pagination").hidden=true;
  timer=setTimeout(load,350);
});
[genreBox,decadeBox,sortBox].forEach(el=>el.addEventListener("change",()=>{genre=genreBox.value;decade=decadeBox.value;sort=sortBox.value;page=1;load();}));
$("catalog-prev").addEventListener("click",()=>{if(page>1){page--;load();}});
$("catalog-next").addEventListener("click",()=>{if(page<pages){page++;load();}});
readState();
if(location.hash==="#all-films")openLibrary();
})();