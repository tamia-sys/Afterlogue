/* AFTERLOGUE — deliberately chosen public collection, independent of the private Log. */
(()=>{
'use strict';
const client=window.afterlogueSupabase;
const catalog=window.AfterlogueFeaturedCatalog||{};
const all=Object.entries(catalog).sort((a,b)=>a[1].title.localeCompare(b[1].title));
const $=id=>document.getElementById(id);
if(!$('featured-selected')||!client)return;
let user=null,selected=[],hasProfile=false;
const message=s=>{$('featured-feedback').textContent=s;};
function renderSelected(){
 const target=$('featured-selected');target.replaceChildren();
 for(const key of selected){
  const item=catalog[key];if(!item)continue;
  const card=document.createElement('div');card.className='featured-choice';
  const art=document.createElement('div');art.className='featured-choice-art';
  const image=document.createElement('img');image.src=item.poster;image.alt=item.title+' poster';image.loading='lazy';
  art.append(image);
  const title=document.createElement('p');title.className='featured-choice-name';title.textContent=item.title;
  const remove=document.createElement('button');remove.type='button';remove.className='featured-choice-remove';
  remove.textContent='×';remove.setAttribute('aria-label','Remove '+item.title);
  remove.addEventListener('click',()=>{selected=selected.filter(k=>k!==key);renderSelected();renderResults();message('Selection changed. Save your three to publish it.');});
  card.append(art,title,remove);target.append(card);
 }
 for(let i=selected.length;i<3;i++){
  const blank=document.createElement('div');blank.className='featured-choice-placeholder';blank.textContent='+';
  blank.setAttribute('aria-label','Empty featured title slot');
  target.append(blank);
 }
}
function renderResults(){
 const target=$('featured-search-results');target.replaceChildren();
 const query=$('featured-search').value.toLocaleLowerCase().trim();
 const candidates=all.filter(([key,item])=>!selected.includes(key)&&(!query||item.title.toLocaleLowerCase().includes(query))).slice(0,8);
 if(!candidates.length){
  const empty=document.createElement('p');empty.className='account-private';
  empty.textContent=selected.length===3?'All three places are filled.':'No matching titles in the current Afterlogue collection.';
  target.append(empty);return;
 }
 for(const [key,item] of candidates){
  const btn=document.createElement('button');btn.type='button';
  btn.disabled=selected.length>=3;
  btn.setAttribute('aria-label','Feature '+item.title);
  const image=document.createElement('img');image.src=item.poster;image.loading='lazy';image.alt='';
  const info=document.createElement('span');info.textContent=item.title;
  const sub=document.createElement('small');sub.textContent=' · '+item.year+' · '+(item.category==='tv'?'TV':'Film');
  info.append(document.createElement('br'),sub);
  btn.append(image,info);
  btn.addEventListener('click',()=>{
   if(selected.length>=3||selected.includes(key))return;
   selected.push(key);
   $('featured-search').value='';
   renderSelected();renderResults();
   message('Selection changed. Save your three to publish it.');
  });
  target.append(btn);
 }
}
$('featured-search').addEventListener('input',renderResults);
$('featured-save').addEventListener('click',async()=>{
 if(!user||!hasProfile){message('Save your display name and username first, then choose your three.');return;}
 const btn=$('featured-save');btn.disabled=true;message('Saving your selection…');
 try{
  const {data,error}=await client.from('member_profiles')
   .update({featured_titles:selected}).eq('user_id',user.id)
   .select('featured_titles').single();
  if(error)throw error;
  if(!data)throw Error('Selection not verified.');
  message('Saved! Your three will now appear on your public profile.');
 }catch(error){console.error('Featured profile save failed',error);message('Could not save your selection: '+(error.message||'Please try again.'));}
 finally{btn.disabled=false;}
});
if(location.hash==='#featured-titles')$('featured-titles').open=true;
async function init(){
 try{
  const auth=await client.auth.getUser();if(auth.error)throw auth.error;
  user=auth.data.user;
  if(!user)return;
  const {data,error}=await client.from('member_profiles')
   .select('featured_titles').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  hasProfile=!!data;
  selected=(Array.isArray(data?.featured_titles)?data.featured_titles:[])
   .filter(key=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(catalog,key)).slice(0,3);
  renderSelected();renderResults();
 }catch(error){console.warn('Featured titles unavailable',error);message('Could not load featured titles. Please refresh.');}
}
renderSelected();renderResults();init();
})();