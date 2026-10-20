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
const loading=new Set();
async function populate(media,sectionId){
 const parent=document.querySelector(sectionId);
 if(!parent)return;
 const grid=parent.querySelector('.log-film-grid');
 const heading=parent.querySelector('.log-section-heading span');
 if(!grid)return;
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode:'onboarding',media,seed})});
  if(!response.ok)throw Error('Onboarding catalog unavailable');
  const payload=await response.json();
  const items=(payload.items||[]).filter(item=>item.poster).slice(0,12);
  if(items.length<6)throw Error('Insufficient titles');
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
  console.warn('Using featured first impressions as a fallback',error);
 }
}
Promise.allSettled([populate('movie','#films'),populate('tv','#television')]);

})();