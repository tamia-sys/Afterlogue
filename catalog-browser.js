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
  a.href="film-details.html?tmdb="+encodeURIComponent(title.id)+"&type="+encodeURIComponent(title.media)+"&from=explore";
  const frame=document.createElement("div");frame.className="catalog-tile-poster";
  const img=document.createElement("img");img.loading="lazy";img.src=title.poster||"";img.alt=title.title+" poster";
  const name=document.createElement("span");name.className="catalog-tile-title";name.textContent=title.title;
  const sub=document.createElement("span");sub.className="catalog-tile-year";sub.textContent=title.year||"";
  frame.append(img);a.append(frame,name,sub);
  const tile=document.createElement("div");tile.className="catalog-tile-wrap";
  const eye=window.AfterlogueSeen?.button({key:"tmdb-"+title.media+"-"+title.id,title:title.title,category:title.media==="tv"?"tv":"movies"});
  tile.append(a);if(eye)tile.append(eye);$("catalog-grid").append(tile);
 }
}
async function load(){
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
  $("explore-gallery-wrap").hidden=true;$("explore-experience").hidden=true;
  $("explore-results").hidden=true;$("explore-all-films").hidden=true;
  window.scrollTo({top:0,behavior:"instant"});load();
}
$("catalog-open").addEventListener("click",openLibrary);
$("catalog-back").addEventListener("click",()=>{panel.hidden=true;$("explore-gallery-wrap").hidden=false;document.body.classList.add("explore-gallery-mode");});
$("catalog-media").addEventListener("change",e=>{media=e.target.value;page=1;load();});
input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>{term=input.value;page=1;load();},350);});
[genreBox,decadeBox,sortBox].forEach(el=>el.addEventListener("change",()=>{genre=genreBox.value;decade=decadeBox.value;sort=sortBox.value;page=1;load();}));
$("catalog-prev").addEventListener("click",()=>{if(page>1){page--;load();}});
$("catalog-next").addEventListener("click",()=>{if(page<pages){page++;load();}});
})();