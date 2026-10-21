/* Continue a guest's explicit Save-to-Watchlist intent across Supabase sign-in
 * and, for new accounts, First Impressions. Do not collect passwords or tokens.
 * A 45-minute, single-action localStorage record supports email verification
 * links opened in another tab. No storage across accounts after completion.
 */
(()=>{
'use strict';
const STORAGE_KEY='afterlogue.pending-watchlist.v1';
const MAX_AGE=45*60*1000;
const validKey=key=>/^tmdb-(movie|tv)-[1-9][0-9]{0,9}$/.test(key)||
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
const safeURL=value=>{
 try{
  const url=new URL(String(value),location.origin);
  if(url.origin!==location.origin||!/\/film-details\.html$/.test(url.pathname))return null;
  const allowed=new URLSearchParams();
  for(const key of ['title','tmdb','type','from']){
   const v=url.searchParams.get(key);
   if(v!==null)allowed.set(key,v.slice(0,300));
  }
  return 'film-details.html?'+allowed.toString();
 }catch(_){return null;}
};
function read(){
 try{
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw)return null;
  const record=JSON.parse(raw);
  if(!record||!validKey(record.key)||!['movies','tv'].includes(record.category)||
    !Number.isFinite(record.createdAt)||Date.now()-record.createdAt>MAX_AGE||
    record.createdAt>Date.now()+60*1000||!safeURL(record.url)){
   localStorage.removeItem(STORAGE_KEY);return null;
  }
  return record;
 }catch(_){return null;}
}
function remember(title){
 const key=String(title.key||'');
 const category=title.category==='tv'?'tv':'movies';
 const url=safeURL(title.url||location.href);
 if(!validKey(key)||!url)return false;
 const intent={key,category,url,createdAt:Date.now(),
  title:String(title.title||'').slice(0,250),
  year:Number(title.year)||null,
  poster:String(title.poster||'').slice(0,400)};
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(intent));return true;}
 catch(error){console.warn('Could not remember pending Watchlist save',error);return false;}
}
function discard(){try{localStorage.removeItem(STORAGE_KEY);}catch(_){}}
let inFlight=null;
async function complete(client,verifiedUser){
 if(inFlight)return inFlight;
 const saved=read();
 if(!saved||!client)return null;
 inFlight=(async()=>{
  const {data:auth,error:authError}=verifiedUser?.id
   ?{data:{user:verifiedUser},error:null}:await client.auth.getUser();
  if(authError||!auth?.user?.id)throw (authError||Error('Sign in to complete this save'));
  const owner=auth.user.id;
  // TMDB titles need a catalog record so they appear with name/artwork in Log.
  // Existing static catalog titles already carry their own metadata.
  if(/^tmdb-(movie|tv)-/.test(saved.key)){
   if(!window.AfterlogueCatalogMetadata?.save)throw Error('Film metadata helper unavailable');
   await window.AfterlogueCatalogMetadata.save(client,owner,{
    key:saved.key,title:saved.title,year:saved.year,poster:saved.poster,category:saved.category
   });
  }
  const {error}=await client.from('watchlist').insert({
   user_id:owner,title_key:saved.key,category:saved.category
  });
  if(error&&error.code!=='23505')throw error;
  const url=safeURL(saved.url);
  discard();
  return url+(url.includes('?')?'&':'?')+'watchlist_saved=1';
 })();
 try{return await inFlight;}
 finally{inFlight=null;}
}
window.AfterloguePendingWatchlist=Object.freeze({
 remember,read,discard,complete,
 // Authentication owns the destination. Newly registered members finish
 // their First Impressions before the pending title is automatically saved.
 async postLogin(client,user,onboardingComplete){
  if(!onboardingComplete||!read())return null;
  return complete(client,user);
 }
});
})();
