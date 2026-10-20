/* AFTERLOGUE — PUBLIC MEMBER PROFILE
   Identity, opt-in featured titles and published discussions are public.
   Personal Log records and impressions are never queried here.
*/
(async()=>{
'use strict';
const client=window.afterlogueSupabase;
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id');
const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'');
const list=$('member-conversations');
const note=message=>{list.textContent=message;};
const catalog=window.AfterlogueFeaturedCatalog||{};
function addPoster(item){
 const card=document.createElement('div');card.className='member-poster-card';
 const frame=document.createElement('div');frame.className='member-poster-frame';
 const img=document.createElement('img');img.src=item.poster;img.alt=item.title+' poster';img.loading='lazy';
 img.addEventListener('error',()=>{frame.textContent=item.title;frame.style.padding='10px';frame.style.textAlign='center';},{once:true});
 frame.append(img);
 const title=document.createElement('p');title.className='member-poster-name';title.textContent=item.title;
 const year=document.createElement('span');year.className='member-poster-year';year.textContent=item.year+' · '+(item.category==='tv'?'TV':'Film');
 card.append(frame,title,year);return card;
}
function showFeatured(selected,owner){
 const values=(Array.isArray(selected)?selected:[]).filter(key=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(catalog,key)).slice(0,3);
 if(!values.length&&!owner)return;
 $('member-featured-section').hidden=false;
 const grid=$('member-featured-grid');grid.replaceChildren();
 values.forEach(key=>grid.append(addPoster(catalog[key])));
 if(owner){
  for(let n=values.length;n<3;n++){
   const anchor=document.createElement('a');anchor.className='member-poster-placeholder';
   anchor.href='account-settings.html#featured-titles';anchor.textContent='+';
   anchor.setAttribute('aria-label','Choose a featured film or television show');
   grid.append(anchor);
  }
  $('member-featured-empty').hidden=values.length===3;
 }
}
function renderThreads(threads){
 list.replaceChildren();
 if(!threads.length){note('No published conversations yet.');return;}
 for(const t of threads){
  const row=document.createElement('article');row.className='member-thread';
  const eyebrow=document.createElement('p');eyebrow.className='member-thread-eyebrow';
  eyebrow.textContent=t.kind==='general'?'General discussion':'Film & TV';
  const heading=document.createElement('a');heading.className='member-thread-title';
  heading.href='discuss-thread.html?id='+encodeURIComponent(t.id);
  heading.textContent=t.has_spoilers?'Spoiler-marked conversation':t.title;
  const description=document.createElement('p');description.className='member-thread-preview';
  const clean=String(t.body||'')
   .replace(/^\[\[afterlogue:[^\]]+\]\]/g,'')
   .replace(/\[\[afterlogue:[^\]]+\]\]/g,'')
   .replace(/\|\|[\s\S]*?\|\|/g,'[spoiler hidden]').trim();
  description.textContent=t.has_spoilers?'This conversation contains spoilers. Open it when you are ready.':clean.length>200?clean.slice(0,197)+'…':clean;
  const date=document.createElement('p');date.className='member-thread-meta';
  date.textContent=new Date(t.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  row.append(eyebrow,heading,description,date);list.append(row);
 }
}
try{
 const {data:auth}=await client.auth.getUser();
 const user=auth?.user||null;
 $('member-back-home').href=user?'discover.html':'index.html';
 if($('account-email'))$('account-email').textContent=user?(user.email||'Afterlogue member'):'Browsing as guest';
 if($('account-status'))$('account-status').textContent=user?'● Signed in':'Reading public profiles';
 if($('account-signout')){
  $('account-signout').hidden=!user;
  $('account-signout').addEventListener('click',async()=>{const result=await client.auth.signOut();if(!result.error)location.assign('index.html');});
 }
 if($('account-signin'))$('account-signin').hidden=!!user;
 if(!valid){note('This member profile could not be found.');return;}
 const {data:p,error}=await client.from('member_profiles')
  .select('username,display_name,avatar_path,avatar_preset,created_at,bio,featured_titles')
  .eq('user_id',id).maybeSingle();
 if(error)throw error;
 if(!p){note('This member has not created a public profile yet.');return;}
 const owner=Boolean(user&&user.id===id);
 $('member-edit-profile').hidden=!owner;
 $('member-name').textContent=p.display_name||'Afterlogue member';
 $('member-handle').textContent=p.username?'@'+p.username:'';
 $('member-since').textContent='Member since '+new Date(p.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'});
 if(p.bio){$('member-bio').textContent=p.bio;$('member-bio').hidden=false;}
 const avatar=$('member-picture');
 if(p.avatar_path)avatar.style.backgroundImage='url('+client.storage.from('member-avatars').getPublicUrl(p.avatar_path).data.publicUrl+')';
 else if(p.avatar_preset){
  const n=p.avatar_preset;avatar.classList.add('preset');
  avatar.style.backgroundImage='url(assets/afterlogue-avatars.png)';
  avatar.style.backgroundPosition=((n-1)%4)*100/3+'% '+Math.floor((n-1)/4)*50+'%';
 }
 showFeatured(p.featured_titles,owner);
 const {data:threads,error:threadError}=await client.from('discussion_threads')
  .select('id,title,body,kind,has_spoilers,created_at').eq('author_id',id)
  .eq('is_hidden',false).order('created_at',{ascending:false}).limit(50);
 if(threadError)throw threadError;
 renderThreads(threads||[]);
}catch(error){
 console.warn('Member profile unavailable',error);
 note('Unable to load this profile right now.');
}
})();