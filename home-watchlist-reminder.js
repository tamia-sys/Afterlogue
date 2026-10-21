/* Afterlogue / A little reminder.
 * This is a deliberately private Watchlist resurfacing feature, NOT a new
 * recommendation and never a set of sample posters.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const button=$('watchlist-reminder-toggle');
const panel=$('watchlist-reminder-content');
const status=$('watchlist-reminder-status');
const grid=$('watchlist-reminder-grid');
const next=$('watchlist-reminder-next');
const watchlistLink=document.querySelector('.watchlist-reminder-all');
if(!button||!panel||!status||!grid||!next||!watchlistLink)return;
const guest=new URLSearchParams(location.search).get('guest')==='1';
const client=window.afterlogueSupabase;
const catalogue=window.AfterlogueFeaturedCatalog||{};
const isTmdb=key=>/^tmdb-(movie|tv)-([1-9]\d{0,9})$/.exec(String(key||''));
const categoryFor=(row,key)=>row.category==='tv'||isTmdb(key)?.[1]==='tv'?'tv':'movies';
const humanKey=key=>String(key||'').split('-').join(' ')
  .replace(/\b\w/g,character=>character.toUpperCase());
const watchHref=story=>{
 const match=isTmdb(story.key);
 return match
  ?'film-details.html?tmdb='+encodeURIComponent(match[2])+'&type='+match[1]+'&from=discover'
  :'film-details.html?title='+encodeURIComponent(story.key)+'&from=discover';
};
const shuffle=items=>{
 const arr=items.slice();
 for(let i=arr.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [arr[i],arr[j]]=[arr[j],arr[i]];
 }
 return arr;
};
let ownerId=null,stories=[],previousKeys=new Set(),version=0,loading=false;
const clear=()=>{
 grid.replaceChildren();status.textContent='';
 next.hidden=true;stories=[];previousKeys.clear();ownerId=null;
};
function buildStory(row,metadata){
 const key=String(row.title_key||'');
 const known=metadata.get(key)||catalogue[key]||null;
 const media=categoryFor(row,key);
 const title=String(known?.title||'').trim()||
   (isTmdb(key)?(media==='tv'?'Saved TV series':'Saved film'):humanKey(key));
 const year=Number(known?.year);
 return {key,media,title,year:Number.isInteger(year)&&year>1880?year:null,
  poster:typeof known?.poster==='string'?known.poster:''};
}
async function recoverPoster(story){
 const match=isTmdb(story.key);
 if(!match||(story.poster&&story.title!=='Saved film'&&story.title!=='Saved TV series'))return story;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),7500);
 try{
  const response=await fetch('https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog',{
   method:'POST',signal:controller.signal,
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({mode:'detail',id:Number(match[2]),media:match[1]})
  });
  if(!response.ok)return story;
  const details=await response.json();
  if(!details?.title)return story;
  story.title=String(details.title);
  if(!story.poster)story.poster=typeof details.poster==='string'?details.poster:'';
  if(!story.year&&Number.isInteger(Number(details.year)))story.year=Number(details.year);
 }catch(error){console.warn('Saved title artwork unavailable',error);}
 finally{clearTimeout(timeout);}
 return story;
}
const selection=()=>{
 const count=Math.min(3,stories.length);
 const fresh=shuffle(stories.filter(item=>!previousKeys.has(item.key)));
 const earlier=shuffle(stories.filter(item=>previousKeys.has(item.key)));
 const chosen=[...fresh,...earlier].slice(0,count);
 previousKeys=new Set(chosen.map(item=>item.key));
 return chosen;
};
function createCard(story){
 const card=document.createElement('article');
 card.className='watchlist-reminder-card';
 const url=watchHref(story);
 const poster=document.createElement('a');
 poster.className='watchlist-reminder-poster';poster.href=url;
 poster.setAttribute('aria-label','View details for '+story.title);
 if(story.poster){
  const image=document.createElement('img');
  image.loading='lazy';image.alt=story.title+' poster';image.src=story.poster;
  image.addEventListener('error',()=>{
   image.remove();
   const missing=document.createElement('span');
   missing.className='watchlist-reminder-poster-fallback';
   missing.textContent='afterlogue.';
   poster.append(missing);
  },{once:true});
  poster.append(image);
 }else{
  const missing=document.createElement('span');
  missing.className='watchlist-reminder-poster-fallback';
  missing.textContent='afterlogue.';
  poster.append(missing);
 }
 const title=document.createElement('a');
 title.href=url;title.className='watchlist-reminder-card-title';
 title.textContent=story.title;
 const meta=document.createElement('p');
 meta.className='watchlist-reminder-meta';
 meta.textContent=[story.year,story.media==='tv'?'TV series':'Film'].filter(Boolean).join(' · ');
 card.append(poster,title,meta);
 return card;
}
async function showThree(){
 const current=++version,chosen=selection();
 grid.replaceChildren();
 if(!chosen.length){
  status.textContent='Nothing in your Watchlist yet. Save a film or series in Explore and it can appear here.';
  next.hidden=true;
  return;
 }
 status.textContent='Finding a few stories you saved…';
 await Promise.allSettled(chosen.map(recoverPoster));
 if(current!==version||panel.hidden)return;
 grid.replaceChildren(...chosen.map(createCard));
 status.textContent=stories.length<3
  ?'Your '+stories.length+' saved '+(stories.length===1?'story':'stories')+', ready when you are.'
  :'Three stories from your Watchlist, picked for a second look.';
 next.hidden=stories.length<=3;
}
async function loadWatchlist(){
 clear();
 if(guest||!client){
  status.textContent='Sign in to revisit stories from your private Watchlist.';
  watchlistLink.href='signup.html?mode=signin';
  watchlistLink.textContent='Sign in ↗';
  return;
 }
 const {data:auth,error:authError}=await client.auth.getUser();
 if(authError)throw authError;
 if(!auth?.user){
  status.textContent='Sign in to revisit stories from your private Watchlist.';
  watchlistLink.href='signup.html?mode=signin';
  watchlistLink.textContent='Sign in ↗';
  return;
 }
 ownerId=auth.user.id;
 const [saved,meta]=await Promise.all([
  client.from('watchlist').select('title_key,category,created_at')
    .eq('user_id',ownerId).order('created_at',{ascending:false}),
  client.from('user_catalog_titles').select('title_key,title,year,poster,category')
    .eq('user_id',ownerId)
 ]);
 if(saved.error)throw saved.error;
 // The curated titles can be displayed even if optional custom metadata
 // fails to load; never substitute another viewer's saved metadata.
 if(meta.error)console.warn('Watchlist metadata unavailable',meta.error);
 const metadata=new Map((meta.error?[]:meta.data||[])
  .map(row=>[String(row.title_key),row]));
 const keys=new Set();
 stories=(saved.data||[]).filter(row=>{
  const key=String(row.title_key||'');
  if(!key||keys.has(key))return false;
  keys.add(key);return true;
 }).map(row=>buildStory(row,metadata));
 await showThree();
}
button.addEventListener('click',async()=>{
 if(loading)return;
 if(!panel.hidden){
  version++;panel.hidden=true;button.setAttribute('aria-expanded','false');
  button.querySelector('.watchlist-reminder-symbol').textContent='↗';
  // In-memory account data should not remain visible while collapsed.
  clear();return;
 }
 panel.hidden=false;button.setAttribute('aria-expanded','true');
 button.querySelector('.watchlist-reminder-symbol').textContent='↓';
 loading=true;button.disabled=true;
 status.textContent='Opening your Watchlist…';
 try{await loadWatchlist();}
 catch(error){
  console.warn('Watchlist reminder unavailable',error);
  clear();status.textContent="Your Watchlist couldn't be loaded. Please try again.";
 }
 finally{loading=false;button.disabled=false;}
});
next.addEventListener('click',async()=>{
 if(loading||panel.hidden)return;
 loading=true;next.disabled=true;
 try{
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user||data.user.id!==ownerId){
   // Never carry a previous member's Watchlist across a changed session.
   await loadWatchlist();
  }else await showThree();
 }catch(error){
  clear();status.textContent='Your Watchlist could not be refreshed. Please try again.';
 }finally{loading=false;next.disabled=false;}
});
})();
