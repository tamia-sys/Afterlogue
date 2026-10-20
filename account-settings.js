(() => {
'use strict';
const client=window.afterlogueSupabase;
const $=id=>document.getElementById(id);
const status=$('profile-status');
const fallback=$('avatar-preview').src;
let user,originalPath=null,removeAvatar=false,selectedFile=null,selectedPreset=null;
const position=n=>({x:((n-1)%4)*100/3,y:Math.floor((n-1)/4)*50});
function previewPreset(n){const p=position(n),el=$('avatar-preview');el.classList.add('is-preset');el.style.backgroundPosition=p.x+'% '+p.y+'%';el.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E';}
function clearPreset(){const el=$('avatar-preview');el.classList.remove('is-preset');el.style.backgroundPosition='';}
function choosePreset(n){selectedPreset=n;selectedFile=null;removeAvatar=false;$('avatar-file').value='';previewPreset(n);document.querySelectorAll('.avatar-option').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.preset)===n)));message('Avatar selected. Save changes to keep it.');}
for(let n=1;n<=12;n++){const b=document.createElement('button');b.type='button';b.className='avatar-option';b.dataset.preset=n;b.setAttribute('aria-label','Choose Afterlogue avatar '+n);b.setAttribute('aria-pressed','false');const art=document.createElement('span');art.className='avatar-art';const p=position(n);art.style.backgroundPosition=p.x+'% '+p.y+'%';b.append(art);b.addEventListener('click',()=>choosePreset(n));$('avatar-grid').append(b);}
function message(s){status.textContent=s;}
async function init(){
 try{
  const {data,error}=await client.auth.getUser();if(error)throw error;
  if(!data.user){location.replace('signup.html?mode=signin');return;}
  user=data.user;
  const {data:profile,error:profileError}=await client.from('member_profiles').select('username,display_name,avatar_path,avatar_preset').eq('user_id',user.id).maybeSingle();
  if(profileError)throw profileError;
  $('username').value=profile?.username||'';
  $('display-name').value=profile?.display_name||user.user_metadata?.full_name||'';
  originalPath=profile?.avatar_path||null;
  selectedPreset=profile?.avatar_preset||null;if(selectedPreset){previewPreset(selectedPreset);document.querySelector('[data-preset="'+selectedPreset+'"]')?.setAttribute('aria-pressed','true');}else if(originalPath) $('avatar-preview').src=client.storage.from('member-avatars').getPublicUrl(originalPath).data.publicUrl;
 }catch(e){console.error(e);message('Could not load your account. Please refresh.');}
}
$('avatar-file').addEventListener('change',()=>{
 const file=$('avatar-file').files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152){message('Choose a JPEG, PNG, or WebP image under 2 MB.');$('avatar-file').value='';return;}
 selectedFile=file;removeAvatar=false;selectedPreset=null;clearPreset();document.querySelectorAll('.avatar-option').forEach(b=>b.setAttribute('aria-pressed','false'));$('avatar-preview').src=URL.createObjectURL(file);message('Photo selected. Save changes to upload.');
});
$('avatar-remove').addEventListener('click',()=>{selectedFile=null;removeAvatar=true;selectedPreset=null;clearPreset();document.querySelectorAll('.avatar-option').forEach(b=>b.setAttribute('aria-pressed','false'));$('avatar-file').value='';$('avatar-preview').src=fallback;message('Photo will be removed when you save.');});
$('profile-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!user)return;
 const name=$('display-name').value.trim(),username=$('username').value.trim().toLowerCase();
 if(!name||name.length>60||! /^[a-z0-9_]{3,24}$/.test(username)){message('Enter a display name and a valid username.');return;}
 const button=$('save-profile');button.disabled=true;message('Saving your profile…');
 let uploaded=null;
 try{
  let path=(removeAvatar||selectedPreset)?null:originalPath;
  const payload={user_id:user.id,username,display_name:name,avatar_path:path,avatar_preset:selectedPreset};
  // Prefer a concrete insert or update over an upsert without a returned representation.
  const lookup=await client.from('member_profiles').select('user_id').eq('user_id',user.id).maybeSingle();
  if(lookup.error)throw lookup.error;
  const write=lookup.data
   ? await client.from('member_profiles').update(payload).eq('user_id',user.id).select('user_id,username').single()
   : await client.from('member_profiles').insert(payload).select('user_id,username').single();
  if(write.error)throw write.error;
  if(!write.data||write.data.username!==username)throw new Error('Profile could not be verified after saving.');
  // Identity must persist independently of optional photo uploads.
  if(selectedFile){
   const file=selectedFile;
   if(!file.size){message('Your name and username were saved. The selected photo is empty; please choose it again.');selectedFile=null;return;}
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
   const uploadPath=user.id+'/'+crypto.randomUUID()+'.'+ext;
   const bytes=await file.arrayBuffer();
   if(!bytes.byteLength)throw new Error('The photo file is empty. Please choose it again.');
   const uploadResult=await client.storage.from('member-avatars').upload(uploadPath,bytes,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(uploadResult.error){
    console.warn('Photo upload failed',uploadResult.error);
    selectedFile=null;originalPath=path;
    message('Name and username saved. Photo upload failed: '+uploadResult.error.message);
    return;
   }
   uploaded=uploadPath;
   const avatarUpdate=await client.from('member_profiles').update({avatar_path:uploadPath,avatar_preset:null}).eq('user_id',user.id);
   if(avatarUpdate.error)throw avatarUpdate.error;
   path=uploadPath;
  }
  const previous=originalPath;originalPath=path;selectedFile=null;removeAvatar=false;
  if(previous&&previous!==path)client.storage.from('member-avatars').remove([previous]).catch(console.warn);
  if(selectedPreset)previewPreset(selectedPreset);else if(path){clearPreset();$('avatar-preview').src=client.storage.from('member-avatars').getPublicUrl(path).data.publicUrl;}else{clearPreset();$('avatar-preview').src=fallback;}
  message('Changes saved. Your profile is looking good.');
 }catch(e){
  console.error(e);
  if(uploaded)await client.storage.from('member-avatars').remove([uploaded]);
  message(e.code==='23505'?'That username is taken. Try another.':'Unable to save changes: '+(e.message||'Please try again.'));
 }finally{button.disabled=false;}
});
init();
})();