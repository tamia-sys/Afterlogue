/* First Impressions: opt-in searchable films and TV beyond the first 24 cards. */
(()=>{
'use strict';
const root=document.querySelector('.log-page');
if(!root)return;
const section=document.createElement('section');
section.className='impressions-more';
section.innerHTML='<p class="impressions-kicker">MORE FIRST IMPRESSIONS</p><h2>Know another story?</h2><p>Search a film or series you have seen and share your impression. No need to rate everything.</p><div class="impressions-more-toolbar"><input type="search" id="impressions-search" placeholder="Search films or TV shows…" aria-label="Find more titles to rate"><select id="impressions-type" aria-label="Search category"><option value="movie">Films</option><option value="tv">TV Shows</option></select></div><p id="impressions-search-status" role="status"></p><div class="impressions-more-grid" id="impressions-search-grid"></div>';
const anchor=document.querySelector('.log-continue-section');anchor?.before(section);
const input=section.querySelector('#impressions-search'),format=section.querySelector('#impressions-type');
const result=section.querySelector('#impressions-search-grid'),status=section.querySelector('#impressions-search-status');
const endpoint='https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog';
let serial=0,timer;
const keyFor=item=>'tmdb-'+item.media+'-'+item.id;
/* Shared poster interaction for the rotating 24 titles and search results.
   The controls stay ON the poster; choosing a rating reveals a centered check. */
function makeCard(item){
 const key=keyFor(item);
 const card=document.createElement('article');
 card.className='impressions-more-card';
 card.dataset.tmdbKey=key;
 const poster=document.createElement('div');
 poster.className='impressions-more-poster';
 poster.tabIndex=0;
 poster.setAttribute('role','group');
 const picture=document.createElement('img');
 picture.loading='lazy';
 picture.alt=item.title+' poster';
 picture.src=item.poster||'';
 const overlay=document.createElement('div');
 overlay.className='impressions-more-rating-overlay';
 const heading=document.createElement('p');
 heading.textContent='YOUR IMPRESSION';
 overlay.append(heading);
 const buttons=[];
 const check=document.createElement('span');
 check.className='impressions-more-check';
 check.setAttribute('aria-hidden','true');
 check.innerHTML='<svg viewBox="0 0 48 48"><path d="M9 25 L20 35 L40 12" fill="none" stroke="#F4EADD" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const choice=document.createElement('span');
 choice.className='impressions-more-choice';
 function showRating(rating){
   poster.classList.toggle('is-rated',Boolean(rating));
   poster.classList.remove('is-open');
   poster.setAttribute('aria-expanded','false');
   poster.setAttribute('aria-label',item.title+(rating?': '+rating+'. Activate to change your impression.':'. Activate to choose your impression.'));
   check.hidden=!rating;
   choice.hidden=!rating;
   choice.textContent=rating||'';
   buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rating===rating)));
 }
 for(const rating of ['Loved','Liked','Okay','Not for me']){
   const button=document.createElement('button');
   button.type='button';
   button.dataset.rating=rating;
   button.textContent=rating;
   button.addEventListener('click',event=>{
     event.stopPropagation();
     localStorage.setItem('afterlogue-'+key,rating);
     localStorage.setItem('afterlogue.onboarding.tmdb.'+key,JSON.stringify({
       key,title:item.title,year:item.year,poster:item.poster,
       category:item.media==='tv'?'tv':'movies'
     }));
     showRating(rating);
     if(status && card.closest('#impressions-search-grid'))status.textContent='Saved your impression of '+item.title+'.';
   });
   buttons.push(button);
   overlay.append(button);
 }
 function toggleChoices(){
   const isOpen=poster.classList.toggle('is-open');
   poster.setAttribute('aria-expanded',String(isOpen));
 }
 poster.addEventListener('click',event=>{
   if(event.target.closest('button'))return;
   toggleChoices();
 });
 poster.addEventListener('keydown',event=>{
   if(event.target!==poster)return;
   if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleChoices();}
 });
 poster.append(picture,overlay,check,choice);
 const name=document.createElement('h4');
 name.textContent=item.title;
 const year=document.createElement('p');
 year.textContent=item.year?String(item.year):'';
 card.append(poster,name,year);
 showRating(localStorage.getItem('afterlogue-'+key));
 return card;
}
async function search(){
 const id=++serial,query=input.value.trim(),media=format.value;
 if(query.length<2){result.replaceChildren();status.textContent='';return;}
 status.textContent='Finding titles…';
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'search',query,media,page:1})});
  if(!response.ok)throw Error('Unavailable');
  const data=await response.json();
  if(id!==serial)return;
  const items=(data.items||[]).filter(x=>x.poster).slice(0,8);
  result.replaceChildren(...items.map(makeCard));
  status.textContent=items.length?'Choose your impression for any title you recognize.':'No titles found. Try another search.';
 }catch(error){if(id===serial)status.textContent='Search is temporarily unavailable. Your existing choices are safe.';}
}
function schedule(){clearTimeout(timer);++serial;timer=setTimeout(search,340);}
input.addEventListener('input',schedule);format.addEventListener('change',()=>{result.replaceChildren();schedule();});
/* The original cards are a fallback only. Each onboarding gets a broad,
   stable-to-visitor choice of real releases across different genres. */
const seedKey='afterlogue.first.impressions.seed.v2';
let seed=sessionStorage.getItem(seedKey);
if(!seed){seed=String(Math.floor(Math.random()*1e9));sessionStorage.setItem(seedKey,seed);}
const countries=[["","All countries"],["US","United States"],["GB","United Kingdom"],["CA","Canada"],["AU","Australia"],["FR","France"],["DE","Germany"],["IT","Italy"],["ES","Spain"],["MX","Mexico"],["BR","Brazil"],["AR","Argentina"],["CO","Colombia"],["IN","India"],["JP","Japan"],["KR","South Korea"],["CN","China"],["TW","Taiwan"],["TH","Thailand"],["PH","Philippines"],["ID","Indonesia"],["NG","Nigeria"],["ZA","South Africa"],["TR","Turkey"],["SE","Sweden"],["NO","Norway"],["DK","Denmark"],["NL","Netherlands"],["PL","Poland"],["EG","Egypt"],["NZ","New Zealand"]];
const languages=[["","All languages"],["en","English"],["es","Spanish"],["fr","French"],["de","German"],["it","Italian"],["pt","Portuguese"],["hi","Hindi"],["ta","Tamil"],["te","Telugu"],["bn","Bengali"],["ja","Japanese"],["ko","Korean"],["zh","Chinese"],["th","Thai"],["tl","Filipino"],["id","Indonesian"],["tr","Turkish"],["ar","Arabic"],["ru","Russian"],["nl","Dutch"],["sv","Swedish"],["no","Norwegian"],["da","Danish"],["pl","Polish"],["vi","Vietnamese"],["ml","Malayalam"]];
const options=(values)=>values.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;});
const controls=document.createElement('div');controls.className='impressions-location-filters';
controls.innerHTML='<label>Production country<select id="first-country"></select></label><label>Original language<select id="first-language"></select></label><button type="button" id="first-refresh">Different selection ↻</button>';
const countrySelect=controls.querySelector('#first-country'),languageSelect=controls.querySelector('#first-language');
countrySelect.append(...options(countries));languageSelect.append(...options(languages));
// Keep the filter selection through the signup-to-Home transition without
// using a shared cross-account localStorage preference.
const countryKey="afterlogue.onboarding.country";
const languageKey="afterlogue.onboarding.language";
const validCountry=new Set(countries.map(([code])=>code));
const validLanguage=new Set(languages.map(([code])=>code));
let previousCountry=sessionStorage.getItem(countryKey);
let previousLanguage=sessionStorage.getItem(languageKey);
if(previousCountry!==null&&validCountry.has(previousCountry))countrySelect.value=previousCountry;
if(previousLanguage!==null&&validLanguage.has(previousLanguage))languageSelect.value=previousLanguage;
function saveFilters(){
 sessionStorage.setItem(countryKey,countrySelect.value);
 sessionStorage.setItem(languageKey,languageSelect.value);
 sessionStorage.setItem("afterlogue.onboarding.filters.touched","1");
}
document.querySelector('#films')?.before(controls);
const statusLine=document.createElement('p');statusLine.className='impressions-selection-status';statusLine.setAttribute('role','status');
controls.after(statusLine);
let offset=0,sequence=0;
async function populate(media,sectionId,requestId){
 const parent=document.querySelector(sectionId);
 if(!parent)return;
 const grid=parent.querySelector('.log-film-grid');
 // Keep the curated fallback visible until the wider selection successfully loads.
 const heading=parent.querySelector('.log-section-heading span');
 if(!grid)return;
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode:'onboarding',media,seed,country:countrySelect.value,originalLanguage:languageSelect.value,offset})});
  if(!response.ok)throw Error('Onboarding catalog unavailable');
  const payload=await response.json();
  if(requestId!==sequence)return;
  const items=(payload.items||[]).filter(item=>item.poster).slice(0,12);
  if(!items.length){grid.replaceChildren();if(heading)heading.textContent='0 TITLES';statusLine.textContent='No popular released titles matched this combination. Try another country or language.';return;}
  statusLine.textContent='Choose any titles you recognize. Your impressions stay saved when you change the selection.';
  const cards=items.map(makeCard);
  grid.replaceChildren(...cards);
  if(heading)heading.textContent=items.length+' TITLES · SELECTED FOR THIS VISIT';
 }catch(error){
  if(requestId!==sequence)return;
  // Never display the unfiltered static fallback as though it satisfied
  // explicit country or language choices.
  if(countrySelect.value||languageSelect.value){
    grid.replaceChildren();
    if(heading)heading.textContent='NO VERIFIED MATCHES YET';
  }
  statusLine.textContent='Unable to load titles for these filters right now. Please try again.';
  console.warn('First Impressions unavailable',error);
 }
}
function refresh(){
 const id=++sequence;
 statusLine.textContent='Finding familiar films and shows…';
 Promise.allSettled([populate('movie','#films',id),populate('tv','#television',id)]);
}
countrySelect.addEventListener('change',()=>{saveFilters();offset=0;refresh();});
languageSelect.addEventListener('change',()=>{saveFilters();offset=0;refresh();});
controls.querySelector('#first-refresh').addEventListener('click',()=>{offset++;refresh();});
refresh();
// Returning members see their saved profile filters before making changes.
if(!sessionStorage.getItem("afterlogue.onboarding.filters.touched")&&window.afterlogueSupabase){
 window.afterlogueSupabase.auth.getUser().then(async ({data,error})=>{
  if(error||!data?.user)return;
  const result=await window.afterlogueSupabase.from("profiles")
    .select("discovery_country,discovery_language")
    .eq("user_id",data.user.id).maybeSingle();
  if(result.error||!result.data)return;
  const country=result.data.discovery_country||"";
  const language=result.data.discovery_language||"";
  if(!validCountry.has(country)||!validLanguage.has(language))return;
  if(sessionStorage.getItem("afterlogue.onboarding.filters.touched"))return;
  countrySelect.value=country;
  languageSelect.value=language;
  sessionStorage.setItem(countryKey,country);
  sessionStorage.setItem(languageKey,language);
  offset=0;refresh();
 }).catch(error=>console.warn("Unable to restore First Impressions filters",error));
}

})();