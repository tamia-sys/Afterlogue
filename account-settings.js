(() => {
'use strict';
const client=window.afterlogueSupabase;
const $=id=>document.getElementById(id);
const status=$('profile-status');
const fallback=$('avatar-preview').src;
let user,originalPath=null,removeAvatar=false,selectedFile=null;
function message(s){status.textContent=s;}
async function init(){
 try{
  const {data,error}=await client.auth.getUser();if(error)throw error;
  if(!data.user){location.replace('signup.html?mode=signin');return;}
  user=data.user;
  const {data:profile,error:profileError}=await client.from('member_profiles').select('username,display_name,avatar_path').eq('user_id',user.id).maybeSingle();
  if(profileError)throw profileError;
  $('username').value=profile?.username||'';
  $('display-name').value=profile?.display_name||user.user_metadata?.full_name||'';
  originalPath=profile?.avatar_path||null;
  if(originalPath) $('avatar-preview').src=client.storage.from('member-avatars').getPublicUrl(originalPath).data.publicUrl;
 }catch(e){console.error(e);message('Could not load your account. Please refresh.');}
}
$('avatar-file').addEventListener('change',()=>{
 const file=$('avatar-file').files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152){message('Choose a JPEG, PNG, or WebP image under 2 MB.');$('avatar-file').value='';return;}
 selectedFile=file;removeAvatar=false;$('avatar-preview').src=URL.createObjectURL(file);message('Photo selected. Save changes to upload.');
});
$('avatar-remove').addEventListener('click',()=>{selectedFile=null;removeAvatar=true;$('avatar-file').value='';$('avatar-preview').src=fallback;message('Photo will be removed when you save.');});
$('profile-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!user)return;
 const name=$('display-name').value.trim(),username=$('username').value.trim().toLowerCase();
 if(!name||name.length>60||! /^[a-z0-9_]{3,24}$/.test(username)){message('Enter a display name and a valid username.');return;}
 const button=$('save-profile');button.disabled=true;message('Saving your profile…');
 let uploaded=null;
 try{
  let path=removeAvatar?null:originalPath;
  if(selectedFile){
   const ext=selectedFile.type==='image/png'?'png':selectedFile.type==='image/webp'?'webp':'jpg';
   uploaded=user.id+'/'+crypto.randomUUID()+'.'+ext;
   const result=await client.storage.from('member-avatars').upload(uploaded,selectedFile,{contentType:selectedFile.type,upsert:false});
   if(result.error)throw result.error;
   path=uploaded;
  }
  const {error}=await client.from('member_profiles').upsert({user_id:user.id,username,display_name:name,avatar_path:path},{onConflict:'user_id'});
  if(error)throw error;
  const previous=originalPath;originalPath=path;selectedFile=null;removeAvatar=false;
  if(previous&&previous!==path)client.storage.from('member-avatars').remove([previous]).catch(console.warn);
  if(path)$('avatar-preview').src=client.storage.from('member-avatars').getPublicUrl(path).data.publicUrl;
  message('Changes saved. Your profile is looking good.');
 }catch(e){
  console.error(e);
  if(uploaded)await client.storage.from('member-avatars').remove([uploaded]);
  message(e.code==='23505'?'That username is taken. Try another.':'Unable to save changes: '+(e.message||'Please try again.'));
 }finally{button.disabled=false;}
});
init();
})();