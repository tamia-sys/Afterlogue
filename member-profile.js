(async()=>{'use strict';
const client=window.afterlogueSupabase;
const id=new URLSearchParams(location.search).get('id');
const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'');
const list=document.getElementById('member-conversations');
const note=message=>{list.textContent=message;};
if(!valid){note('This member profile could not be found.');return;}
try{
const {data:p,error}=await client.from('member_profiles').select('username,display_name,avatar_path,avatar_preset,created_at').eq('user_id',id).maybeSingle();
if(error)throw error;
if(!p){note('This member has not created a public profile yet.');return;}
document.getElementById('member-name').textContent=p.display_name||'Afterlogue member';
document.getElementById('member-handle').textContent=p.username?'@'+p.username:'';
document.getElementById('member-since').textContent='Member since '+new Date(p.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'});
const avatar=document.getElementById('member-picture');
if(p.avatar_path)avatar.style.backgroundImage='url('+client.storage.from('member-avatars').getPublicUrl(p.avatar_path).data.publicUrl+')';
else if(p.avatar_preset){const n=p.avatar_preset;avatar.classList.add('preset');avatar.style.backgroundImage='url(assets/afterlogue-avatars.png)';avatar.style.backgroundPosition=((n-1)%4)*100/3+'% '+Math.floor((n-1)/4)*50+'%';}
const {data:threads,error:threadError}=await client.from('discussion_threads').select('id,title,created_at').eq('author_id',id).eq('is_hidden',false).order('created_at',{ascending:false}).limit(50);
if(threadError)throw threadError;
list.replaceChildren();
if(!threads?.length){note('No published conversations yet.');return;}
threads.forEach(t=>{const row=document.createElement('article');row.className='member-thread';const link=document.createElement('a');link.href='discuss-thread.html?id='+encodeURIComponent(t.id);link.textContent=t.title;const date=document.createElement('p');date.textContent=new Date(t.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});row.append(link,date);list.append(row);});
}catch(error){console.warn('Member profile unavailable',error);note('Unable to load this profile right now.');}
})();