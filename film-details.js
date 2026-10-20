/* AFTERLOGUE — STORY DETAILS
   Private Watchlist is updated only for its owner. Public discussions stay separate.
   Unsupported metadata is left unknown instead of guessed.
*/
(async()=>{
'use strict';
const client=window.afterlogueSupabase;
const catalog={...(window.AfterlogueFeaturedCatalog||{})};
const editorial=window.AfterlogueFilmDetails||{};
const exploration=window.afterlogueExploreData?.titles||[];
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const slug=text=>String(text||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const query=params.get('title')||params.get('id')||'perfect-days';
let key=Object.prototype.hasOwnProperty.call(catalog,query)?query:slug(query);
if(!catalog[key]){
 const fromName=Object.keys(catalog).find(k=>slug(catalog[k].title)===key);
 if(fromName)key=fromName;
}
let dynamicDetails=null;
const externalId=Number(params.get('tmdb'));
const externalType=params.get('type')==='tv'?'tv':'movie';
if(Number.isInteger(externalId)&&externalId>0&&externalId<=100000000){
 try{
  const response=await fetch('https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({mode:'detail',id:externalId,media:externalType})
  });
  if(!response.ok)throw Error('Catalog service unavailable');
  dynamicDetails=await response.json();
  if(!dynamicDetails?.title)throw Error('Title not found');
  key='tmdb-'+externalType+'-'+externalId;
  catalog[key]={title:dynamicDetails.title,year:dynamicDetails.year,
   category:externalType==='tv'?'tv':'movies',poster:dynamicDetails.poster};
 }catch(error){
  console.warn('Expanded details unavailable',error);
  $('film-loading').textContent='This film is temporarily unavailable. Please return to Explore.';
  return;
 }
}
const item=catalog[key];
const rich=dynamicDetails?{
 synopsis:dynamicDetails.synopsis,director:dynamicDetails.director,
 creator:dynamicDetails.creator,country:dynamicDetails.country,
 language:dynamicDetails.language,runtime:dynamicDetails.runtime,
 genre:dynamicDetails.genre,certification:dynamicDetails.certification,cast:dynamicDetails.cast,crew:dynamicDetails.crew,
 still:dynamicDetails.backdrop,stills:dynamicDetails.stills,
 trailer:dynamicDetails.trailer
}:{...(window.AfterlogueFilmBasics?.[key]||{}),...(editorial[key]||{})};
const fromExplore=exploration.find(t=>slug(t.title)===key);
const fallbackText='Explore this title, save it to your personal Watchlist, or join a conversation about what it means to you.';
if(!item){$('film-loading').textContent='This title is not yet part of the Afterlogue catalog. Return to Discover to find another story.';return;}
const isTV=item.category==='tv';
document.title=item.title+' — Afterlogue';
const safe=document.createElement('span');
const label=(name,value)=>{if(!value)return;const dt=document.createElement('dt'),dd=document.createElement('dd'),row=document.createElement('div');row.className='film-fact-row';dt.textContent=name;dd.textContent=value;row.append(dt,dd);$('film-facts').append(row);};
function info(s){$('film-feedback').textContent=s;}
const referrer=(()=>{try{const url=new URL(document.referrer);return url.origin===location.origin?url.pathname.split('/').pop():'';}catch(_){return '';}})();
const origin=params.get('from')||(referrer==='my-log.html'?'log':referrer==='explore.html'?'explore':referrer==='member-profile.html'?'profile':'discover');
const returns={log:['my-log.html','← Back to Log'],explore:['explore.html','← Back to Explore'],mood:['explore.html#mood-results','← Back to your five stories'],'all-films':['explore.html#all-films','← Back to All Films'],profile:['account-settings.html','← Back to your profile'],discover:['discover.html','← Back to Discover']};
let [href,title]=returns[origin]||returns.discover;
if(origin==='profile'&&document.referrer&&referrer==='member-profile.html'){href=document.referrer;}
$('film-back').href=href;$('film-back').textContent=title;
$('film-title').textContent=item.title;
$('film-eyebrow').textContent='AFTERLOGUE / '+(isTV?'A SERIES IN FOCUS':'A FILM IN FOCUS');
const synopsis=rich.synopsis|| (fromExplore?fromExplore.reason+' Further synopsis and credits are being curated.':'A story in the Afterlogue collection. Detailed synopsis and credits are being curated.');
$('film-lead').textContent=synopsis;
const meta=[String(item.year||''),rich.country||'',rich.certification?('US '+rich.certification):'',rich.genre||'',rich.runtime||''].filter(Boolean);
for(const value of meta){const el=document.createElement('span');el.textContent=value;$('film-meta').append(el);}

if(rich.perspective){$('film-perspective').textContent=rich.perspective;$('film-perspective').hidden=false;}
const hero=$('film-hero-image');
const setPosterFallback=()=>{
 if(hero.dataset.fallback==='used'){
  hero.style.display='none';
  $('film-hero-frame').style.background='linear-gradient(135deg,#29322f,#191b1a)';
  return;
 }
 hero.dataset.fallback='used';hero.src=item.poster||'';hero.classList.add('is-poster');
};
hero.addEventListener('error',setPosterFallback);
hero.alt=item.title+' — a cinematic image from the story';
hero.src=rich.still||item.poster;
if(!rich.still)hero.classList.add('is-poster');
// For every title, replace lettered poster art with a verified, text-free backdrop.
// If the public artwork service cannot supply one, keep the existing fallback.
if(window.AfterlogueFilmArtwork){
 window.AfterlogueFilmArtwork.resolve(item.title,item.year,isTV).then(url=>{
  if(!url || !document.body.contains(hero))return;
  const preview=new Image();
  preview.onload=()=>{hero.src=url;hero.classList.remove('is-poster');hero.style.display='block';};
  preview.src=url;
 }).catch(error=>console.warn('Artwork unavailable',error));
}
label('Director',rich.director);
label('Creator',rich.creator);
label('Country',rich.country);
label('Language',rich.language);
label('Runtime',rich.runtime);
label('Genre',rich.genre);
label('Release',String(item.year||''));
if(!rich.director&&!rich.creator)label('Format',isTV?'Television':'Feature film');
const galleryHost=$('film-stills');
const gallery=$('film-gallery');
const lightbox=$('film-lightbox');
const lightboxImage=$('film-lightbox-image');
const frames=[];
const pendingGallery=[];
const seenSources=new Set();
const ignoredSources=new Set([item.poster,rich.still].filter(Boolean));
const sameImage=(a,b)=>String(a||'').split('?')[0]===String(b||'').split('?')[0];
let previousLightboxFocus=null;
let activeStill=0;
function renderLightbox(){
 if(!frames.length){closeLightbox();return;}
 activeStill=(activeStill+frames.length)%frames.length;
 lightboxImage.src=frames[activeStill].src;
 lightboxImage.alt='Scene '+(activeStill+1)+' from '+item.title;
 $('film-lightbox-caption').textContent=item.title+'  ·  '+(activeStill+1)+' / '+frames.length;
 const multiple=frames.length>1;
 $('film-lightbox-prev').hidden=!multiple;
 $('film-lightbox-next').hidden=!multiple;
}
function openLightbox(index){
 if(!frames.length)return;
 previousLightboxFocus=document.activeElement;
 activeStill=index;
 lightbox.hidden=false;
 document.body.classList.add('film-lightbox-open');
 renderLightbox();
 $('film-lightbox-close').focus();
}
function closeLightbox(){
 if(lightbox.hidden)return;
 lightbox.hidden=true;
 document.body.classList.remove('film-lightbox-open');
 lightboxImage.removeAttribute('src');
 previousLightboxFocus?.focus?.();
}
const stepLightbox=delta=>{activeStill+=delta;renderLightbox();};
$('film-lightbox-close').addEventListener('click',closeLightbox);
$('film-lightbox-prev').addEventListener('click',()=>stepLightbox(-1));
$('film-lightbox-next').addEventListener('click',()=>stepLightbox(1));
lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox();});
document.addEventListener('keydown',event=>{
 if(lightbox.hidden)return;
 if(event.key==='Escape'){event.preventDefault();closeLightbox();}
 if(event.key==='ArrowRight'){event.preventDefault();stepLightbox(1);}
 if(event.key==='ArrowLeft'){event.preventDefault();stepLightbox(-1);}
 if(event.key==='Tab'){
  const controls=[$('film-lightbox-close'),$('film-lightbox-prev'),$('film-lightbox-next')].filter(el=>!el.hidden);
  const index=controls.indexOf(document.activeElement);
  if(event.shiftKey&&index<=0){event.preventDefault();controls[controls.length-1].focus();}
  else if(!event.shiftKey&&index===controls.length-1){event.preventDefault();controls[0].focus();}
 }
});
let touchStart=null;
lightbox.addEventListener('touchstart',event=>{touchStart=event.touches[0]?.clientX??null;},{passive:true});
lightbox.addEventListener('touchend',event=>{
 if(touchStart===null)return;
 const delta=(event.changedTouches[0]?.clientX??touchStart)-touchStart;
 if(Math.abs(delta)>45)stepLightbox(delta<0?1:-1);
 touchStart=null;
},{passive:true});
function syncGalleryControls(){
 const maximum=galleryHost.scrollWidth-galleryHost.clientWidth;
 $('film-gallery-prev').disabled=galleryHost.scrollLeft<=2;
 $('film-gallery-next').disabled=galleryHost.scrollLeft>=maximum-2;
 gallery.classList.toggle('is-single',frames.length===1);
 gallery.classList.toggle('no-overflow',maximum<=3);
}
function refreshGallery(){
 gallery.hidden=frames.length===0;
 galleryHost.hidden=frames.length===0;
 $('film-stills-credit').hidden=frames.length===0;
 requestAnimationFrame(syncGalleryControls);
}
function fillGallery(){
 while(pendingGallery.length){
  const src=pendingGallery.shift();
  if(ignoredSources.has(src)||sameImage(src,hero.src)||sameImage(src,hero.currentSrc))continue;
  const frame=document.createElement('div');
  frame.className='film-still-frame';
  frame.dataset.src=src;
  const button=document.createElement('button');
  button.type='button';
  button.setAttribute('aria-label','Enlarge scene '+(frames.length+1)+' from '+item.title);
  const img=document.createElement('img');
  img.loading='lazy';img.alt='Scene from '+item.title;img.src=src;
  frame.append(button);button.append(img);
  const record={src,frame};
  frames.push(record);
  img.addEventListener('error',()=>{
   const index=frames.indexOf(record);
   if(index<0)return;
   frames.splice(index,1);
   frame.remove();
   if(!lightbox.hidden){
    if(index<activeStill)activeStill--;
    else if(index===activeStill){if(frames.length)renderLightbox();else closeLightbox();}
   }
   refreshGallery();
  });
  button.addEventListener('click',()=>openLightbox(frames.indexOf(record)));
  galleryHost.append(frame);
 }
 refreshGallery();
}
function queueGallery(urls){
 if(!Array.isArray(urls))return;
 for(const src of urls){
  if(typeof src!=='string'||!/^https:\/\//i.test(src))continue;
  const signature=src.split('?')[0];
  if(seenSources.has(signature)||ignoredSources.has(src))continue;
  seenSources.add(signature);pendingGallery.push(src);
 }
 fillGallery();
}
function removeHeroDuplicate(){
 const src=hero.currentSrc||hero.src;
 for(const record of [...frames]){
  if(!sameImage(record.src,src))continue;
  const index=frames.indexOf(record);
  frames.splice(index,1);
  record.frame.remove();
  if(!lightbox.hidden){
   if(index<activeStill)activeStill--;
   else if(index===activeStill){if(frames.length)renderLightbox();else closeLightbox();}
  }
 }
 refreshGallery();
}
hero.addEventListener('load',removeHeroDuplicate);
$('film-gallery-prev').addEventListener('click',()=>galleryHost.scrollBy({left:-galleryHost.clientWidth*.8,behavior:'smooth'}));
$('film-gallery-next').addEventListener('click',()=>galleryHost.scrollBy({left:galleryHost.clientWidth*.8,behavior:'smooth'}));
galleryHost.addEventListener('scroll',syncGalleryControls,{passive:true});
galleryHost.addEventListener('keydown',event=>{
 if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
  event.preventDefault();galleryHost.scrollBy({left:(event.key==='ArrowRight'?1:-1)*galleryHost.clientWidth*.6,behavior:'smooth'});
 }
});
window.addEventListener('resize',syncGalleryControls);
const curated=(window.AfterlogueCuratedStills||{})[key]||[];
queueGallery(curated);
queueGallery(Array.isArray(rich.stills)?rich.stills:[]);
if(window.AfterlogueFilmArtwork?.resolveGallery){
 window.AfterlogueFilmArtwork.resolveGallery(item.title,item.year,isTV).then(queueGallery).catch(error=>{
  console.warn('Supplementary scene images unavailable',error);
 });
}
$('film-stills-credit').textContent=curated.length
 ?'Selected images from the film. All imagery belongs to its respective rights holders.'
 :(rich.imageCredit||'Images belong to their respective rights holders.');
refreshGallery();
function showCredits(){
 const host=$('film-credits');host.replaceChildren();
 const addGroup=(heading,people)=>{
  if(!Array.isArray(people)||!people.length)return;
  const title=document.createElement('h3');title.className='film-credits-head';title.textContent=heading;
  const grid=document.createElement('div');grid.className='film-credits-grid';
  for(const [name,role] of people){
   const card=document.createElement('div');card.className='film-credit';
   const main=document.createElement('span');main.className='film-credit-name';main.textContent=name;
   const sub=document.createElement('span');sub.className='film-credit-role';sub.textContent=role;
   card.append(main,sub);grid.append(card);
  }
  host.append(title,grid);
 };
 if(!rich.cast?.length&&!rich.crew?.length){const p=document.createElement('p');p.className='film-watch-notice';p.textContent=rich.castNote||'Full credits for this title are still being curated.';host.append(p);return;}
 addGroup('Cast.',rich.cast);
 addGroup('Crew.',(rich.crew||[]).map(row=>[row[1],row[0]]));
}
showCredits();
const verifiedTrailers=window.AfterlogueOfficialTrailers||{};
const trailerLink=$('film-trailer');
const trailerModal=$('film-trailer-modal');
const trailerPlayer=$('film-trailer-player');
const trailerExternal=$('film-trailer-external');
const trailerStatus=$('film-trailer-status');
const youtubeSearch='https://www.youtube.com/results?search_query='+encodeURIComponent([item.title,item.year,isTV?'series':'film','trailer'].filter(Boolean).join(' '));
function getTrailerId(value){
 try{
  const url=new URL(value);
  if(url.hostname==='youtu.be')return /^[a-zA-Z0-9_-]{11}$/.test(url.pathname.slice(1))?url.pathname.slice(1):null;
  if(['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)){
   const id=url.searchParams.get('v')||url.pathname.split('/').filter(Boolean).slice(-1)[0];
   return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?id:null;
  }
 }catch(_){}
 return null;
}
let resolvedTrailerId=getTrailerId(verifiedTrailers[key]||rich.trailer||'');
let trailerLoading=null;
if(!resolvedTrailerId&&window.AfterlogueFilmArtwork?.resolveTrailer){
 trailerLoading=window.AfterlogueFilmArtwork.resolveTrailer(item.title,item.year,isTV).then(id=>{
  resolvedTrailerId=/^[a-zA-Z0-9_-]{11}$/.test(id||'')?id:null;
  return resolvedTrailerId;
 }).catch(()=>null);
}
let trailerPreviousFocus=null;
function closeTrailer(){
 if(trailerModal.hidden)return;
 trailerModal.hidden=true;
 trailerPlayer.removeAttribute('src'); // Stop video and sound on close.
 document.body.classList.remove('film-trailer-open');
 trailerPreviousFocus?.focus?.();
}
function playTrailer(id){
 if(trailerModal.hidden)return;
 trailerExternal.href='https://www.youtube.com/watch?v='+encodeURIComponent(id);
 trailerExternal.textContent='Watch on YouTube ↗';
 trailerStatus.textContent='If playback is blocked, open the video on YouTube.';
 trailerPlayer.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0&playsinline=1';
}
trailerLink.href='#film-trailer-modal';
trailerLink.removeAttribute('target');
trailerLink.innerHTML='<span aria-hidden="true">▷</span> Watch trailer';
trailerLink.title='Play the trailer here on Afterlogue';
trailerLink.addEventListener('click',async event=>{
 event.preventDefault();
 trailerPreviousFocus=document.activeElement;
 trailerModal.hidden=false;
 document.body.classList.add('film-trailer-open');
 $('film-trailer-heading').textContent=item.title+' — Trailer.';
 trailerExternal.href=resolvedTrailerId?'https://www.youtube.com/watch?v='+resolvedTrailerId:youtubeSearch;
 trailerExternal.textContent=resolvedTrailerId?'Watch on YouTube ↗':'Browse trailers on YouTube ↗';
 $('film-trailer-close').focus();
 if(resolvedTrailerId){playTrailer(resolvedTrailerId);return;}
 trailerStatus.textContent='Finding a trailer for this story…';
 if(trailerLoading)await trailerLoading;
 if(trailerModal.hidden)return;
 if(resolvedTrailerId){playTrailer(resolvedTrailerId);return;}
 trailerStatus.textContent='A playable trailer isn’t available here yet. You can browse trailer options on YouTube.';
 trailerExternal.href=youtubeSearch;
 trailerExternal.textContent='Browse trailers on YouTube ↗';
});
$('film-trailer-close').addEventListener('click',closeTrailer);
trailerModal.addEventListener('click',event=>{if(event.target===trailerModal)closeTrailer();});
document.addEventListener('keydown',event=>{
 if(trailerModal.hidden)return;
 if(event.key==='Escape'){event.preventDefault();closeTrailer();}
 if(event.key==='Tab'){
  const controls=[$('film-trailer-close'),trailerExternal];
  const n=controls.indexOf(document.activeElement);
  if(event.shiftKey&&n<=0){event.preventDefault();controls[1].focus();}
  else if(!event.shiftKey&&n===1){event.preventDefault();controls[0].focus();}
 }
});
const jw=rich.watch||'https://www.justwatch.com/us/search?q='+encodeURIComponent(item.title);
$('film-justwatch').href=jw;
$('film-justwatch').textContent=rich.watch&&rich.watch.includes('justwatch.com')?'Check viewing options':rich.watch?'View provider information':'Search viewing options';
const account=await client.auth.getUser();
const member=account.error?null:account.data?.user;
if($('account-email'))$('account-email').textContent=member?(member.email||'Afterlogue member'):'Browsing as guest';
if($('account-status'))$('account-status').textContent=member?'● Signed in':'Exploring as guest';
if($('account-signout')){
 $('account-signout').hidden=!member;
 $('account-signout').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(!error)location.assign('index.html');});
}
if($('account-signin'))$('account-signin').hidden=!!member;
const watchBtn=$('film-watchlist');
const catalogMeta = window.AfterlogueCatalogMetadata;
const dynamicEntry = dynamicDetails && catalogMeta?.identify(key) ? {
 key, title:item.title,year:item.year,poster:item.poster,category:item.category
} : null;
async function preserveDynamicTitle(){
 if (dynamicEntry && member) await catalogMeta.save(client,member.id,dynamicEntry);
}
// A Seen impression saves its TMDB metadata before the watched state, so
// the story always has a proper name and image in the owner's personal Log.
if (window.AfterlogueSeen) {
 const eye = window.AfterlogueSeen.button({
  key,title:item.title,year:item.year,poster:item.poster,category:item.category
 });
 eye.classList.add('film-seen-action');
 eye.title='Mark as seen or leave an impression';
 eye.appendChild(document.createTextNode(' Seen it'));
 watchBtn.before(eye);
}
let saved=false,watchId=null;
function displaySaved(){
 watchBtn.classList.toggle('is-selected',saved);
 watchBtn.textContent=!member?'＋ Sign in to save':saved?'✓ In your Watchlist':'＋ Add to Watchlist';
 watchBtn.setAttribute('aria-pressed',String(saved));
}
if(member){
 try{
  const {data,error}=await client.from('watchlist').select('id').eq('user_id',member.id).eq('title_key',key).maybeSingle();
  if(error)throw error;
  if(data){saved=true;watchId=data.id;}
 }catch(error){console.warn('Watchlist status not available',error);info('Watchlist status could not be loaded.');}
}else{watchBtn.textContent='＋ Sign in to save';}
displaySaved();
watchBtn.addEventListener('click',async()=>{
 if(!member){location.assign('signup.html?mode=signin');return;}
 watchBtn.disabled=true;info('');
 try{
  if(saved){
   const result=await client.from('watchlist').delete().eq('user_id',member.id).eq('title_key',key);
   if(result.error)throw result.error;
   saved=false;watchId=null;info('Removed from your Watchlist.');
  }else{
   await preserveDynamicTitle();
   const result=await client.from('watchlist').insert({user_id:member.id,title_key:key,category:item.category==='tv'?'tv':'movies'}).select('id').single();
   if(result.error)throw result.error;
   saved=true;watchId=result.data.id;info('Saved to your private Watchlist.');
  }
  displaySaved();
 }catch(error){
  console.error('Watchlist update failed',error);
  if(error.code==='23505'){saved=true;displaySaved();info('Already on your Watchlist.');}
  else info('Could not update Watchlist. Please try again.');
 }finally{watchBtn.disabled=false;}
});
$('film-to-log').href=member?'my-log.html':'signup.html?mode=signin';
$('film-to-log').title=member?'Open personal Log':'Sign in to use your Log';

function switchTab(id,updateHash=true){
 for(const tab of document.querySelectorAll('.film-tab')){
  const active=tab.dataset.tab===id;
  tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
  $('film-panel-'+tab.dataset.tab).hidden=!active;
 }
 if(updateHash)history.replaceState(null,'','#'+id);
 if(id==='discuss')loadDiscussions();
}
const tabs=[...document.querySelectorAll('.film-tab')];
for(const tab of tabs)tab.addEventListener('click',()=>switchTab(tab.dataset.tab));
document.querySelector('.film-tabs').addEventListener('keydown',event=>{
 if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
 event.preventDefault();
 const current=tabs.findIndex(t=>t.getAttribute('aria-selected')==='true');
 const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 tabs[next].focus();switchTab(tabs[next].dataset.tab);
});
let discussionsLoaded=false;
async function loadDiscussions(){
 if(discussionsLoaded)return;
 discussionsLoaded=true;
 const box=$('film-discussions');
 if(!member){box.textContent='Sign in to read film and TV conversations from Afterlogue members.';return;}
 box.textContent='Loading conversations…';
 try{
  const {data,error}=await client.from('discussion_threads').select('id,title,created_at,has_spoilers,work_title')
   .eq('kind','title').eq('work_type',isTV?'tv':'film')
   .eq('is_hidden',false).order('created_at',{ascending:false}).limit(200);
  if(error)throw error;box.replaceChildren();
  // Match normalized film titles so punctuation and year suffixes do not hide discussions.
  const matching=(data||[]).filter(t=>{
    const work=String(t.work_title||'').replace(/[,\s]+\d{4}\.?$/,'').trim();
    return slug(work)===slug(item.title);
  }).slice(0,12);
  if(!matching.length){const p=document.createElement('p');p.className='film-watch-notice';p.textContent='No conversations for this title yet. You could start the first.';box.append(p);return;}
  for(const t of matching){
   const article=document.createElement('article');article.className='film-discuss-card';
   const heading=document.createElement('h3');
   const link=document.createElement('a');link.href='discuss-thread.html?id='+encodeURIComponent(t.id);
   link.textContent=t.has_spoilers?'Spoiler-marked conversation':t.title;
   heading.append(link);
   const date=document.createElement('p');date.textContent=new Date(t.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
   article.append(heading,date);box.append(article);
  }
 }catch(error){console.warn('Film discussions unavailable',error);box.textContent='Discussions could not be loaded right now.';discussionsLoaded=false;}
}
$('film-start-discussion').href=member?'discuss-compose.html':'signup.html?mode=signin';
if(member){
 $('film-start-discussion').addEventListener('click',()=>{
  try{
   sessionStorage.setItem('afterlogue-discuss-draft',JSON.stringify({
    kind:'title',work:item.title,workType:isTV?'tv':'film',
    heading:'Thoughts on '+item.title,body:'',hasSpoilers:false
   }));
  }catch(_){}
 });
}
// Keep exploring uses current film's TMDB relationships, not a fixed set
// of same-year titles from the hand-picked Afterlogue collection.
async function loadRelatedStories(){
 const container=$('film-related-grid');
 const block=$('film-related');
 const endpoint='https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog';
 let id=Number(externalId);
 const media=isTV?'tv':'movie';
 if(!dynamicDetails){
  const q=await fetch(endpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode:'search',query:item.title,media,page:1})
  });
  if(!q.ok)throw Error('Could not resolve related film');
  const data=await q.json();
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const match=(data.items||[]).find(x=>norm(x.title)===norm(item.title)&&Number(x.year)===Number(item.year));
  if(!match)return;
  id=Number(match.id);
 }
 if(!Number.isSafeInteger(id)||id<1)return;
 const activeExplore=['mood','explore','all-films'].includes(origin);
 let facets={};
 if(activeExplore){
  try{
   const state=JSON.parse(sessionStorage.getItem('afterlogue.explore.mood-filters.v1')||'{}');
   if(state&&typeof state==='object')facets=state;
  }catch(_){}
 }
 let mood='';
 if(origin==='mood'){
  try{
   const saved=JSON.parse(sessionStorage.getItem('afterlogue.explore.return-to-picks.v1')||'null');
   if(saved?.mood&&Date.now()-Number(saved.savedAt)<4*60*60*1000)mood=saved.mood;
  }catch(_){}
 }
 if(origin==='all-films'){
  try{
   const prefs=JSON.parse(sessionStorage.getItem('afterlogue.explore.all-films.v1')||'null');
   if(prefs){
    if(prefs.genre)facets.genres=[prefs.genre];
    if(prefs.decade)facets.decades=[String(prefs.decade)];
   }
  }catch(_){}
 }
 const criteria={genres:facets.genres||[],countries:facets.countries||[],
  languages:facets.languages||[],decades:facets.decades||[],ratings:facets.ratings||[]};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({mode:'related',media,id,mood,...criteria})});
 if(!response.ok)throw Error('Related recommendations unavailable');
 const data=await response.json();
 container.replaceChildren();
 if(!data.items?.length){
  // Do not fill the shelf with unrelated titles just to keep it full.
  if(activeExplore){block.hidden=false;
   const message=document.createElement('p');message.className='film-watch-notice';
   message.textContent='No similar stories match all your current filters. Adjust your Explore choices for more.';
   container.append(message);
  }
  return;
 }
 for(const candidate of data.items){
  if(!candidate.poster||!candidate.id)continue;
  const a=document.createElement('a');a.className='film-other-link';
  a.href='film-details.html?tmdb='+encodeURIComponent(candidate.id)
   +'&type='+encodeURIComponent(candidate.media)+'&from='+encodeURIComponent(origin);
  const img=document.createElement('img');img.loading='lazy';img.src=candidate.poster;img.alt=candidate.title+' poster';
  const span=document.createElement('span');span.textContent=candidate.title;
  const subtitle=document.createElement('small');
  subtitle.textContent=[candidate.year,candidate.certification].filter(Boolean).join(' · ');
  a.append(img,span,subtitle);container.append(a);
 }
 block.hidden=container.children.length===0;
}
loadRelatedStories().catch(error=>console.warn('Related stories unavailable',error));
$('film-loading').hidden=true;
$('film-content').hidden=false;
const target=location.hash.slice(1);
switchTab(['overview','cast','watch','discuss'].includes(target)?target:'overview',false);
})().catch(error=>{
 console.error('Afterlogue film detail failed',error);
 const el=document.getElementById('film-loading');
 if(el)el.textContent='Unable to open this story right now. Try refreshing the page.';
});
