/* AFTERLOGUE — STORY DETAILS
   Private Watchlist is updated only for its owner. Public discussions stay separate.
   Unsupported metadata is left unknown instead of guessed.
*/
(async()=>{
'use strict';
const client=window.afterlogueSupabase;
const catalog=window.AfterlogueFeaturedCatalog||{};
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
const item=catalog[key];
const rich=editorial[key]||{};
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
const returns={log:['my-log.html','← Back to Log'],explore:['explore.html','← Back to Explore'],profile:['account-settings.html','← Back to your profile'],discover:['discover.html','← Back to Discover']};
let [href,title]=returns[origin]||returns.discover;
if(origin==='profile'&&document.referrer&&referrer==='member-profile.html'){href=document.referrer;}
$('film-back').href=href;$('film-back').textContent=title;
$('film-title').textContent=item.title;
$('film-eyebrow').textContent='AFTERLOGUE / '+(isTV?'A SERIES IN FOCUS':'A FILM IN FOCUS');
$('film-lead').textContent=rich.perspective||fromExplore?.reason||fallbackText;
const meta=[String(item.year||''),rich.country||'',rich.genre||'',rich.runtime||''].filter(Boolean);
for(const value of meta){const el=document.createElement('span');el.textContent=value;$('film-meta').append(el);}
const synopsis=rich.synopsis|| (fromExplore?fromExplore.reason+' Further synopsis and credits are being curated.':'A story in the Afterlogue collection. Detailed synopsis and credits are being curated.');
$('film-about').textContent=synopsis;
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
 if(!rich.cast?.length&&!rich.crew?.length){const p=document.createElement('p');p.className='film-watch-notice';p.textContent='Full credits for this title are still being curated.';host.append(p);return;}
 addGroup('Cast.',rich.cast);
 addGroup('Crew.',(rich.crew||[]).map(row=>[row[1],row[0]]));
}
showCredits();
const verifiedTrailers=window.AfterlogueOfficialTrailers||{};
const trailer=verifiedTrailers[key]||null;
const trailerLink=$('film-trailer');
if(trailer){
 trailerLink.href=trailer;
 trailerLink.innerHTML='<span aria-hidden="true">▷</span> Watch trailer';
}else{
 trailerLink.removeAttribute('href');
 trailerLink.removeAttribute('target');
 trailerLink.setAttribute('aria-disabled','true');
 trailerLink.classList.add('is-unavailable');
 trailerLink.textContent='Official trailer unavailable';
 trailerLink.title='An official distributor trailer has not been verified for this title.';
}
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
const related=Object.entries(catalog).filter(([k,v])=>k!==key&&v.category===item.category)
 .sort((a,b)=>Math.abs((a[1].year||2000)-(item.year||2000))-Math.abs((b[1].year||2000)-(item.year||2000)))
 .slice(0,5);
if(related.length){
 const host=$('film-related-grid');
 for(const [k,v] of related){
  const a=document.createElement('a');a.className='film-other-link';
  a.href='film-details.html?title='+encodeURIComponent(k)+'&from='+encodeURIComponent(origin);
  const img=document.createElement('img');img.loading='lazy';img.src=v.poster;img.alt=v.title+' poster';
  const span=document.createElement('span');span.textContent=v.title;
  a.append(img,span);host.append(a);
 }
 $('film-related').hidden=false;
}
$('film-loading').hidden=true;
$('film-content').hidden=false;
const target=location.hash.slice(1);
switchTab(['overview','cast','watch','discuss'].includes(target)?target:'overview',false);
})().catch(error=>{
 console.error('Afterlogue film detail failed',error);
 const el=document.getElementById('film-loading');
 if(el)el.textContent='Unable to open this story right now. Try refreshing the page.';
});
