/* Afterlogue expanded catalog. Requires Supabase TMDB_READ_ACCESS_TOKEN secret.
   The original 54-title collection works independently if the service is unconfigured. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const panel=$("afterlogue-global-catalog");
if(!panel)return;
const endpoint="https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog";
let media="movie",page=1,pages=1,term="",genre="",country="",language="",decade="",sort="discover",timer=null,serial=0,configured=false;
let hasNext=false;
let pageCursors=new Map([[1,null]]);
const hasActiveFilters=()=>Boolean(term.trim().length>=2||genre||country||language||decade);
function syncSortWithFilters(){
 const filtered=hasActiveFilters();
 const option=sortBox.querySelector('option[value="discover"]');
 if(option)option.disabled=filtered;
 // Discover is an intentionally balanced global mix, not a filter
 // ranking. When filtering, use an explicitly labeled Popular sort
 // rather than silently reverting to popularity under "Discover".
 if(filtered&&sort==="discover"){
   sort="popular";
   sortBox.value=sort;
 }
}
function resetPaging(){page=1;hasNext=false;pageCursors=new Map([[1,null]]);}
const input=$("catalog-search"),genreBox=$("catalog-genre"),countryBox=$("catalog-country"),languageBox=$("catalog-language"),decadeBox=$("catalog-decade"),sortBox=$("catalog-sort");
// v2 intentionally migrates old default Popular sessions to the new Discover feed.
const stateKey="afterlogue.explore.all-films.v2";
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
  sort=["discover","popular","newest","oldest"].includes(record.sort)?record.sort:"discover";
  if(Array.isArray(record.cursors)){
    pageCursors=new Map([[1,null],...record.cursors
      .filter(item=>Array.isArray(item)&&Number.isInteger(item[0])&&item[0]>=2&&item[0]<=100
        &&typeof item[1]==="string"&&/^[1-9][0-9]{0,2}:(?:[0-9]|1[0-9])$/.test(item[1]))]);
  }
  $("catalog-media").value=media;input.value=term;
  genreBox.value=genre;countryBox.value=country;languageBox.value=language;decadeBox.value=decade;sortBox.value=sort;
 }catch(_){}
}
function rememberState(){
 try{sessionStorage.setItem(stateKey,JSON.stringify({media,page,term,genre,country,language,decade,sort,cursors:[...pageCursors]}));}catch(_){}
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
 const id=++serial;
 const isSearch=term.trim().length>=2;
 const filtered=hasActiveFilters();
 if(filtered&&page>1&&!pageCursors.has(page))page=1;
 syncSortWithFilters();
 rememberState();
 $("catalog-prev").disabled=true;$("catalog-next").disabled=true;
 $("catalog-message").textContent=sort==="discover"?"Discovering cinema…":"Finding stories…";
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
    // Each discovery stream has a different number of available titles.
    // Honor actual Next availability instead of inventing an "of 100".
    pages=Math.max(1,Number(result.totalPages)||1);
    hasNext=typeof result.hasMore==="boolean"
      ?result.hasMore:page<pages;
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
  $("catalog-message").textContent=totalShown+" "+(totalShown===1?"story":"stories")+" · Page "+page;
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
// The full library belongs below the moods. Fetch only when near its section.
let firstLoadStarted=false;
function ensureLibraryLoaded(){
 if(firstLoadStarted)return;
 firstLoadStarted=true;
 load();
}
if("IntersectionObserver" in window){
 const observer=new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting)){
   ensureLibraryLoaded();observer.disconnect();
  }
 },{rootMargin:"600px 0px"});
 observer.observe(panel);
}else ensureLibraryLoaded();
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
 if(!hasActiveFilters()&&direction>0&&!hasNext)return;
 page=target;
 // Move back to the TOP OF THE CATALOG, not the bottom pagination controls.
 panel.scrollIntoView({block:"start",behavior:"instant"});
 load();
}
$("catalog-prev").addEventListener("click",()=>turnPage(-1));
$("catalog-next").addEventListener("click",()=>turnPage(1));
readState();
if(location.hash==="#all-films"){
  requestAnimationFrame(()=>{
    panel.scrollIntoView({block:"start",behavior:"instant"});
    ensureLibraryLoaded();
  });
}
})();