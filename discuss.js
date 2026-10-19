(()=>{'use strict';
const db=window.afterlogueSupabase;
const $=id=>document.getElementById(id);
const list=$('discuss-list'),notice=$('discuss-notice');
const threadDialog=$('thread-dialog'),composeDialog=$('compose-dialog');
const state={user:null,threads:[],teasers:[],replies:[],filter:'all',selected:null,featured:null};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
function safeText(container,raw){container.replaceChildren();const bits=String(raw||'').split(/(\|\|[\s\S]*?\|\|)/g);bits.forEach(bit=>{if(bit.startsWith('||')&&bit.endsWith('||')&&bit.length>4){const b=el('button','discuss-spoiler','Reveal spoiler');b.type='button';b.setAttribute('aria-label','Reveal hidden spoiler');b.dataset.text=bit.slice(2,-2);b.addEventListener('click',()=>{const revealed=b.classList.toggle('revealed');b.textContent=revealed?b.dataset.text:'Reveal spoiler';b.setAttribute('aria-label',revealed?'Hide spoiler':'Reveal hidden spoiler');});container.appendChild(b);}else container.appendChild(document.createTextNode(bit));});}
function button(text,cls,action){const n=el('button',cls,text);n.type='button';n.addEventListener('click',action);return n;}
function initialsOf(thread){return thread.author_id?'Afterlogue member':'Afterlogue';}
function dateOf(s){return new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
function closeModal(d){if(d.open)d.close();}
function requireMember(){if(state.user)return true;notice.textContent='Sign in to join the conversation.';window.location.href='signup.html?mode=signin';return false;}
async function load(){
 try{
  const current=await db.auth.getUser();
  state.user=current.error?null:current.data.user;
  const email=$('account-email'),status=$('account-status'),out=$('account-signout'),signin=$('account-signin');
  email.textContent=state.user?(state.user.email||'Afterlogue member'):'Browsing as guest';
  status.textContent=state.user?'● Signed in':'Read general discussions freely.';
  out.hidden=!state.user;signin.hidden=!!state.user;
  const query=state.user?db.from('discussion_threads').select('*'):db.from('discussion_threads').select('id,kind,title,body,has_spoilers,is_featured,created_at,author_id');
  const result=await query.eq('is_hidden',false).order('created_at',{ascending:false}).limit(100);
  if(result.error)throw result.error;
  state.threads=result.data||[];
  if(!state.user){
   const tease=await db.from('discussion_title_teasers').select('id,work_title,work_type').order('created_at',{ascending:false}).limit(25);
   if(tease.error)throw tease.error;state.teasers=tease.data||[];
  }
  state.featured=state.threads.find(t=>t.is_featured)||null;
  if(state.featured){$('featured-title').textContent=state.featured.title;$('featured-description').textContent=state.featured.body;}
  render();
  const params=new URLSearchParams(location.search);
  if(params.get('compose')==='1'&&state.user)openCompose();
 }catch(err){console.error('Discuss loading failed',err);notice.textContent='Unable to load conversations. Please refresh.';list.replaceChildren();}
}
function render(){
 const rows=state.threads.filter(t=>!t.is_featured && (state.filter==='all'||t.kind===state.filter));
 list.replaceChildren();
 rows.forEach(t=>{
  const row=el('article','discuss-thread');
  const body=el('div');
  body.appendChild(el('p','discuss-kicker',t.kind==='general'?'GENERAL DISCUSSION':'FILM & TV / MEMBERS'));
  body.appendChild(el('h3','',t.title));
  if(t.has_spoilers)body.appendChild(el('p','discuss-footer-hint','Spoilers marked — open to reveal.'));
  else body.appendChild(el('p','',t.body.replace(/\|\|[\s\S]*?\|\|/g,'[spoiler hidden]').slice(0,175)+(t.body.length>175?'…':'')));
  body.appendChild(el('div','discuss-meta',initialsOf(t)+' · '+dateOf(t.created_at)));
  row.appendChild(body);row.appendChild(button('Read conversation →','discuss-open',()=>openThread(t)));list.appendChild(row);
 });
 if(!state.user&&(state.filter==='all'||state.filter==='title'))state.teasers.forEach(t=>{
  const row=el('article','discuss-thread'),body=el('div');
  body.appendChild(el('p','discuss-kicker','FILM & TV / MEMBERS ONLY'));
  body.appendChild(el('h3','',t.work_title));
  body.appendChild(el('p','','Dedicated '+(t.work_type==='tv'?'TV':'film')+' conversation. Sign in to read and participate.'));
  row.appendChild(body);row.appendChild(button('Sign in to read →','discuss-open',()=>{location.href='signup.html?mode=signin';}));list.appendChild(row);
 });
 if(!list.children.length)list.appendChild(el('p','discuss-empty',state.filter==='title'?'No film- or TV-specific conversations yet. Start one when a story stays with you.':'No conversations yet. Start one of your own.'));
 document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===state.filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
async function openThread(t){
 if(t.kind==='title'&&!requireMember())return;
 state.selected=t;$('thread-kind').textContent=t.kind==='general'?'GENERAL DISCUSSION':'FILM & TV / '+t.work_title;
 $('thread-dialog-title').textContent=t.title;$('thread-meta').textContent=initialsOf(t)+' · '+dateOf(t.created_at)+(t.has_spoilers?' · Spoilers marked':'');
 const content=$('thread-body');
 content.replaceChildren();
 if(t.has_spoilers){
  const reveal=button('Reveal spoiler discussion','discuss-open',()=>{safeText(content,t.body);});
  content.appendChild(reveal);
 }else safeText(content,t.body);
 $('reply-form').hidden=!state.user;$('guest-reply-hint').hidden=!!state.user;
 $('reply-body').value='';$('reply-spoiler').checked=false;$('reply-status').textContent='';
 $('thread-replies').replaceChildren(el('p','discuss-empty','Loading responses…'));
 threadDialog.showModal();
 await loadReplies(t);
}
async function loadReplies(t){
 try{
  const r=await db.from('discussion_replies').select('id,author_id,body,created_at').eq('thread_id',t.id).eq('is_hidden',false).order('created_at',{ascending:true}).limit(150);
  if(r.error)throw r.error;
  const section=$('thread-replies');if(!state.selected||state.selected.id!==t.id)return;
  section.replaceChildren(el('h3','','Responses'));
  if(!r.data.length)section.appendChild(el('p','discuss-empty','No responses yet. Be the first to join.'));
  r.data.forEach(reply=>{
   const div=el('div','discuss-reply');
   div.appendChild(el('span','discuss-meta',(reply.author_id===state.user?.id?'You':'Afterlogue member')+' · '+dateOf(reply.created_at)));
   const paragraph=el('p');
   if(reply.body.startsWith('||')&&reply.body.endsWith('||')){
    const reveal=button('Reveal spoiler','discuss-open',()=>{safeText(paragraph,reply.body.slice(2,-2));});
    paragraph.appendChild(reveal);
   }else safeText(paragraph,reply.body);
   div.appendChild(paragraph);section.appendChild(div);
  });
 }catch(e){console.error(e);$('thread-replies').replaceChildren(el('p','discuss-empty','Could not load replies.'));}
}
function openCompose(){
 if(!requireMember())return;
 $('compose-form').reset();$('compose-status').textContent='';
 const raw=sessionStorage.getItem('afterlogue-discuss-draft');
 if(raw){try{const data=JSON.parse(raw);if(data&&typeof data==='object'&&typeof data.body==='string'&&data.body.length<=4000){$('compose-body').value=data.body;$('compose-kind').value=data.kind==='title'?'title':'general';$('compose-heading').value=(data.heading||'').slice(0,160);$('compose-work').value=(data.work||'').slice(0,120);}}catch(e){}sessionStorage.removeItem('afterlogue-discuss-draft');}
 updateWorkFields();composeDialog.showModal();
}
function updateWorkFields(){$('compose-work-fields').hidden=$('compose-kind').value!=='title';$('compose-work').required=$('compose-kind').value==='title';}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;render();}));
$('featured-open').addEventListener('click',()=>{if(state.featured)openThread(state.featured);else notice.textContent='Featured conversation is loading.';});
$('new-thread').addEventListener('click',openCompose);
$('compose-kind').addEventListener('change',updateWorkFields);
$('compose-cancel').addEventListener('click',()=>closeModal(composeDialog));
$('thread-close').addEventListener('click',()=>closeModal(threadDialog));
$('compose-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!requireMember())return;
 const b=$('compose-submit');b.disabled=true;$('compose-status').textContent='';
 try{
  const kind=$('compose-kind').value;
  const row={author_id:state.user.id,kind,title:$('compose-heading').value.trim(),body:$('compose-body').value.trim(),has_spoilers:$('compose-spoiler').checked,work_title:kind==='title'?$('compose-work').value.trim():null,work_type:kind==='title'?$('compose-work-type').value:null};
  if(row.title.length<5||row.body.length<10||kind==='title'&&!row.work_title)throw Error('Please complete the title and conversation text.');
  const response=await db.from('discussion_threads').insert(row);
  if(response.error)throw response.error;
  closeModal(composeDialog);notice.textContent='Your conversation was published.';await load();
 }catch(err){console.error(err);$('compose-status').textContent=err.message||'Could not publish. Please try again.';}finally{b.disabled=false;}
});
$('reply-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!requireMember()||!state.selected)return;
 const body=$('reply-body').value.trim();if(body.length<2)return;
 const submit=$('reply-form').querySelector('button[type=submit]');submit.disabled=true;$('reply-status').textContent='';
 try{
  const reply=$('reply-spoiler').checked?'||'+body+'||':body;
  const r=await db.from('discussion_replies').insert({thread_id:state.selected.id,author_id:state.user.id,body:reply});
  if(r.error)throw r.error;$('reply-body').value='';$('reply-spoiler').checked=false;await loadReplies(state.selected);
 }catch(err){console.error(err);$('reply-status').textContent='Could not post reply. Please try again.';}finally{submit.disabled=false;}
});
$('report-thread').addEventListener('click',async ()=>{
 if(!requireMember()||!state.selected)return;
 const reason=prompt('Report this discussion? Enter one of: spoiler, harassment, spam, other');
 if(reason===null)return;
 if(!['spoiler','harassment','spam','other'].includes(reason.toLowerCase().trim())){$('reply-status').textContent='Please enter a valid report reason.';return;}
 try{
  const r=await db.from('discussion_reports').insert({reporter_id:state.user.id,thread_id:state.selected.id,reason:reason.toLowerCase().trim()});
  if(r.error)throw r.error;$('reply-status').textContent='Report submitted for review.';
 }catch(err){console.error(err);$('reply-status').textContent='Could not submit report.';}
});
$('account-signout').addEventListener('click',async()=>{const r=await db.auth.signOut();if(!r.error)location.href='index.html';});
load();
})();