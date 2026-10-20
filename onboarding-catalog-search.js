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
function makeCard(item){
 const key=keyFor(item),card=document.createElement('article');card.className='impressions-more-card';
 const img=document.createElement('img');img.loading='lazy';img.alt=item.title+' poster';img.src=item.poster||'';
 const title=document.createElement('p');title.className='impressions-more-title';title.textContent=item.title+' ('+(item.year||'—')+')';
 const buttons=document.createElement('div');buttons.className='impressions-more-ratings';
 const current=localStorage.getItem('afterlogue-'+key);
 for(const rating of ['Loved','Liked','Okay','Not for me']){
  const b=document.createElement('button');b.type='button';b.textContent=rating;
  b.setAttribute('aria-pressed',String(current===rating));
  b.addEventListener('click',()=>{
    localStorage.setItem('afterlogue-'+key,rating);
    localStorage.setItem('afterlogue.onboarding.tmdb.'+key,JSON.stringify({key,title:item.title,year:item.year,poster:item.poster,category:item.media==='tv'?'tv':'movies'}));
    buttons.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));
    status.textContent='Saved your impression of '+item.title+'.';
  });
  buttons.append(b);
 }
 card.append(img,title,buttons);
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
document.querySelector('#films')?.before(controls);
const statusLine=document.createElement('p');statusLine.className='impressions-selection-status';statusLine.setAttribute('role','status');
controls.after(statusLine);
let offset=0,sequence=0;
async function populate(media,sectionId,requestId){
 const parent=document.querySelector(sectionId);
 if(!parent)return;
 const grid=parent.querySelector('.log-film-grid');
 if(grid&&requestId===sequence)grid.replaceChildren();
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
  const cards=items.map(item=>{
   const key=keyFor(item),card=document.createElement('article');card.className='impressions-more-card';
   card.dataset.tmdbKey=key;
   const picture=document.createElement('img');picture.loading='lazy';picture.alt=item.title+' poster';picture.src=item.poster;
   const name=document.createElement('h4');name.textContent=item.title;
   const year=document.createElement('p');year.textContent=String(item.year||'');
   const buttons=document.createElement('div');buttons.className='impressions-more-ratings';
   for(const rating of ['Loved','Liked','Okay','Not for me']){
    const button=document.createElement('button');button.type='button';button.textContent=rating;
    button.setAttribute('aria-pressed',String(localStorage.getItem('afterlogue-'+key)===rating));
    button.addEventListener('click',()=>{
     localStorage.setItem('afterlogue-'+key,rating);
     localStorage.setItem('afterlogue.onboarding.tmdb.'+key,JSON.stringify({
      key,title:item.title,year:item.year,poster:item.poster,category:media==='tv'?'tv':'movies'
     }));
     buttons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    });
    buttons.append(button);
   }
   card.append(picture,name,year,buttons);
   return card;
  });
  grid.replaceChildren(...cards);
  if(heading)heading.textContent=items.length+' TITLES · SELECTED FOR THIS VISIT';
 }catch(error){
  if(requestId!==sequence)return;
  statusLine.textContent='Unable to load titles right now. Please try again.';
  console.warn('First Impressions unavailable',error);
 }
}
function refresh(){
 const id=++sequence;
 statusLine.textContent='Finding familiar films and shows…';
 Promise.allSettled([populate('movie','#films',id),populate('tv','#television',id)]);
}
countrySelect.addEventListener('change',()=>{offset=0;refresh();});
languageSelect.addEventListener('change',()=>{offset=0;refresh();});
controls.querySelector('#first-refresh').addEventListener('click',()=>{offset++;refresh();});
refresh();

})();