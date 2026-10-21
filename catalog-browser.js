/* Afterlogue expanded catalog. Requires Supabase TMDB_READ_ACCESS_TOKEN secret.
   The original 54-title collection works independently if the service is unconfigured. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const panel=$("afterlogue-global-catalog");
if(!panel)return;
const endpoint="https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog";
let media="all",page=1,pages=1,term="",genre="",country="",language="",decade="",sort="discover",timer=null,serial=0,configured=false;
let hasNext=false;
let activeCollection=null;
const collectionNames={
 "modern-classics":"Modern Classics",
 "around-the-world":"Stories Around the World",
 "love-in-all-forms":"Love in All Its Forms",
 "animation-discoveries":"Animation Worth Discovering"
};
let pageCursors=new Map([[1,null]]);
const hasActiveFilters=()=>Boolean(term.trim().length>=2||genre||country||language||decade);
// A title-only mixed search can use ordinary 20-result TMDB pages; other
// filtered browsing retains the catalog's precise source cursors.
const simpleMixedSearch=()=>media==="all"&&term.trim().length>=2&&!genre&&!country&&!language&&!decade;
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
const featuredCards=[...panel.querySelectorAll(".afterlogue-feature-card")];
const archiveHeading=$("catalog-archive-title"),clearCollectionButton=$("catalog-collection-clear");
function reflectCollection(){
 if(archiveHeading)archiveHeading.textContent=activeCollection
    ?collectionNames[activeCollection]:"The archive.";
 if(clearCollectionButton)clearCollectionButton.hidden=!activeCollection;
 featuredCards.forEach(card=>{
   const chosen=card.dataset.collection===activeCollection;
   card.setAttribute("aria-pressed",String(chosen));
 });
}
function leaveCollection(){
 if(!activeCollection)return;
 activeCollection=null;
 reflectCollection();
}
// v2 intentionally migrates old default Popular sessions to the new Discover feed.
const stateKey="afterlogue.explore.all-films.v2";
const params=new URLSearchParams(location.search);
function readState(){
 try{
  const record=JSON.parse(sessionStorage.getItem(stateKey)||"null");
  if(!record||typeof record!=="object")return;
  media=["all","movie","tv"].includes(record.media)?record.media:"all";
  page=Number.isInteger(record.page)?Math.max(1,Math.min(100,record.page)):1;
  term=typeof record.term==="string"?record.term.slice(0,100):"";
  genre=typeof record.genre==="string"?record.genre:"";
  country=typeof record.country==="string"?record.country:"";
  language=typeof record.language==="string"?record.language:"";
  decade=typeof record.decade==="string"?record.decade:"";
  sort=["discover","popular","newest","oldest"].includes(record.sort)?record.sort:"discover";
  activeCollection=Object.prototype.hasOwnProperty.call(collectionNames,record.collection)
    ?record.collection:null;
  if(Array.isArray(record.cursors)){
    const validCursor=value=>typeof value==="string"&&/^[1-9][0-9]{0,2}:(?:[0-9]|1[0-9])$/.test(value);
    pageCursors=new Map([[1,null],...record.cursors.filter(item=>{
      if(!Array.isArray(item)||!Number.isInteger(item[0])||item[0]<2||item[0]>100)return false;
      const entry=item[1];
      return validCursor(entry)||Boolean(entry&&typeof entry==="object"&&!Array.isArray(entry)
        &&(validCursor(entry.movie)||validCursor(entry.tv))
        &&(entry.movie==null||validCursor(entry.movie))
        &&(entry.tv==null||validCursor(entry.tv)));
    })]);
  }
  $("catalog-media").value=media;input.value=term;
  genreBox.value=genre;countryBox.value=country;languageBox.value=language;decadeBox.value=decade;sortBox.value=sort;
  reflectCollection();
 }catch(_){}
}
function rememberState(){
 try{sessionStorage.setItem(stateKey,JSON.stringify({media,page,term,genre,country,language,decade,sort,collection:activeCollection,cursors:[...pageCursors]}));}catch(_){}
}
async function request(body){
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const json=await res.json();
 if(!res.ok)throw Error(json.message||"Expanded catalog is not configured yet.");
 return json;
}
let catalogMember=null,catalogWatchlist=new Set(),catalogAccountJob=null;
async function catalogAccount(){
 if(catalogAccountJob)return catalogAccountJob;
 catalogAccountJob=(async()=>{
  const client=window.afterlogueSupabase;
  if(!client)return null;
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)return null;
  catalogMember=data.user;
  const rows=await client.from("watchlist").select("title_key").eq("user_id",catalogMember.id);
  if(!rows.error)catalogWatchlist=new Set((rows.data||[]).map(x=>x.title_key));
  document.querySelectorAll(".catalog-save").forEach(button=>{
   showCatalogSaved(button,catalogWatchlist.has(button.dataset.watchKey));
  });
  return catalogMember;
 })().catch(error=>{console.warn("Watchlist loading",error);return null});
 return catalogAccountJob;
}
function showCatalogSaved(button,saved){
 button.setAttribute("aria-pressed",String(saved));
 button.setAttribute("aria-label",saved?"Saved to Watchlist":"Save "+button.dataset.watchTitle+" to Watchlist");
 button.title=saved?"In your Watchlist":"Save to Watchlist";
 button.textContent=saved?"✓ Saved":"+ Save";
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
  const sub=document.createElement("span");sub.className="catalog-tile-year";sub.textContent=(title.media==="tv"?"TV show":"Film")+(title.year?" · "+title.year:"");
  frame.append(img);a.append(frame,name,sub);
  const tile=document.createElement("div");tile.className="catalog-tile-wrap";
  const eye=window.AfterlogueSeen?.button({key:"tmdb-"+title.media+"-"+title.id,title:title.title,year:title.year,poster:title.poster,category:title.media==="tv"?"tv":"movies"});
  const watchKey="tmdb-"+title.media+"-"+title.id;
  const save=document.createElement("button");
  save.type="button";save.className="catalog-save";
  save.dataset.watchKey=watchKey;save.dataset.watchTitle=title.title;
  showCatalogSaved(save,catalogWatchlist.has(watchKey));
  save.addEventListener("click",async()=>{
   if(save.disabled)return;
   save.disabled=true;
   try{
    const member=await catalogAccount();
    if(!member){location.assign("signup.html?mode=signin");return;}
    if(catalogWatchlist.has(watchKey)){showCatalogSaved(save,true);return;}
    const client=window.afterlogueSupabase;
    const metadata=window.AfterlogueCatalogMetadata;
    if(metadata?.save)await metadata.save(client,member.id,{
      key:watchKey,title:title.title,year:title.year,poster:title.poster,
      category:title.media==="tv"?"tv":"movies"
    });
    const {error}=await client.from("watchlist").insert({
      user_id:member.id,title_key:watchKey,category:title.media==="tv"?"tv":"movies"
    });
    if(error&&error.code!=="23505")throw error;
    catalogWatchlist.add(watchKey);
    document.querySelectorAll(".catalog-save").forEach(button=>{
     if(button.dataset.watchKey===watchKey)showCatalogSaved(button,true);
    });
   }catch(error){
    console.warn("Could not save catalog title",error);
    $("catalog-message").textContent="Couldn't save that title. Please try again.";
   }finally{save.disabled=false;}
  });
  const actions=document.createElement("div");
  actions.className="catalog-tile-actions";
  if(eye)actions.append(eye);
  actions.append(save);
  tile.append(a,actions);$("catalog-grid").append(tile);
 }
}
async function load(){
 const id=++serial;
 const isSearch=term.trim().length>=2;
 const filtered=hasActiveFilters();
 const cursorPaging=filtered&&!simpleMixedSearch();
 if(cursorPaging&&page>1&&!pageCursors.has(page))page=1;
 syncSortWithFilters();
 rememberState();
 $("catalog-prev").disabled=true;$("catalog-next").disabled=true;
 $("catalog-message").textContent=activeCollection?"Opening the collection…":sort==="discover"?"Discovering cinema…":"Finding stories…";
 try{
  // Curated cards share the SAME poster wall; there is no separate page.
  if(activeCollection){
    const result=await request({mode:"collection",collection:activeCollection});
    if(id!==serial)return;
    render(result.items||[]);
    catalogAccount();
    const count=(result.items||[]).length;
    $("catalog-message").textContent=count+" "+(count===1?"film":"films")+" · Curated by Afterlogue";
    $("catalog-pagination").hidden=true;
    return;
  }
  const pageSize=simpleMixedSearch()?20:filtered?70:60;
  const types=media==="all"?["movie","tv"]:[media];
  const activeCursors=pageCursors.get(page);
  // For a mixed filtered result, a source that reached its final cursor
  // should not be fetched again on the next page.
  const results=await Promise.all(types.map(type=>{
    if(media==="all"&&cursorPaging&&page>1&&!activeCursors?.[type]){
      return Promise.resolve({items:[],hasMore:false,nextCursor:null});
    }
    const cursor=cursorPaging
      ?media==="all"?(activeCursors?.[type]||null):(activeCursors||null)
      :null;
    return request({mode:isSearch?"search":"discover",query:term.trim(),media:type,page,pageSize,
      cursor,genre,country,originalLanguage:language,decade:Number(decade)||null,sort});
  }));
  if(id!==serial)return;
  const lists=results.map(response=>response.items||[]);
  const merged=[];
  // An alternating result wall lets people find a film or series from one
  // search without burying the second category below the first.
  const longest=Math.max(0,...lists.map(list=>list.length));
  for(let i=0;i<longest;i++)for(const list of lists)if(list[i])merged.push(list[i]);
  if(cursorPaging){
    if(media==="all"){
      const next={};
      types.forEach((type,index)=>next[type]=typeof results[index].nextCursor==="string"
        ?results[index].nextCursor:null);
      hasNext=Boolean(next.movie||next.tv);
      if(hasNext)pageCursors.set(page+1,next);
      else pageCursors.delete(page+1);
    }else{
      const nextCursor=typeof results[0].nextCursor==="string"?results[0].nextCursor:null;
      hasNext=Boolean(nextCursor);
      if(nextCursor)pageCursors.set(page+1,nextCursor);
      else pageCursors.delete(page+1);
    }
  }else{
    hasNext=results.some(response=>response.hasMore===true);
  }
  render(merged);
  catalogAccount();
  const totalShown=merged.length;
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
$("catalog-media").addEventListener("change",e=>{leaveCollection();media=e.target.value;resetPaging();load();});
input.addEventListener("input",()=>{
  clearTimeout(timer);
  // Save the search immediately. A viewer can open a title before the
  // debounced request completes and should still return to their query.
  leaveCollection();
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
[genreBox,countryBox,languageBox,decadeBox,sortBox].forEach(el=>el.addEventListener("change",()=>{leaveCollection();genre=genreBox.value;country=countryBox.value;language=languageBox.value;decade=decadeBox.value;sort=sortBox.value;resetPaging();load();}));
function turnPage(direction){
 if(activeCollection)return;
 const target=page+direction;
 if(target<1||(direction>0&&!hasNext))return;
 if(hasActiveFilters()&&!simpleMixedSearch()&&target>1&&!pageCursors.has(target))return;
 if(!hasActiveFilters()&&direction>0&&!hasNext)return;
 page=target;
 // Move back to the TOP OF THE CATALOG, not the bottom pagination controls.
 panel.scrollIntoView({block:"start",behavior:"instant"});
 load();
}
$("catalog-prev").addEventListener("click",()=>turnPage(-1));
$("catalog-next").addEventListener("click",()=>turnPage(1));
featuredCards.forEach(card=>card.addEventListener("click",()=>{
 const key=card.dataset.collection;
 if(!Object.prototype.hasOwnProperty.call(collectionNames,key))return;
 activeCollection=key;
 media="movie";$("catalog-media").value="movie";
 term="";input.value="";
 genre="";genreBox.value="";
 country="";countryBox.value="";
 language="";languageBox.value="";
 decade="";decadeBox.value="";
 sort="discover";sortBox.value="discover";
 resetPaging();
 reflectCollection();
 firstLoadStarted=true;
 load();
 archiveHeading?.scrollIntoView({block:"start",behavior:"smooth"});
}));
clearCollectionButton?.addEventListener("click",()=>{
 leaveCollection();
 resetPaging();
 load();
 archiveHeading?.scrollIntoView({block:"start",behavior:"smooth"});
});
readState();
if(location.hash==="#all-films"){
  requestAnimationFrame(()=>{
    panel.scrollIntoView({block:"start",behavior:"instant"});
    ensureLibraryLoaded();
  });
}
})();