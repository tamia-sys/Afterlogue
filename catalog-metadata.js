/* Persist metadata for members' TMDB titles without exposing their Log or API token. */
(()=>{
'use strict';
const keyPattern=/^tmdb-(movie|tv)-([1-9][0-9]{0,9})$/;
const posterPattern=/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/[A-Za-z0-9_./-]+\.(?:jpg|png|webp)$/;
const identify=key=>{
 const match=keyPattern.exec(String(key||''));
 return match ? {media:match[1],id:Number(match[2])} : null;
};
function normalize(input){
 const key=String(input?.key||input?.title_key||'');
 const parsed=identify(key);
 if(!parsed)return null;
 const title=String(input.title||'').trim().slice(0,250);
 if(!title)throw Error('TMDB title name is required');
 const year=Number(input.year);
 const poster=typeof input.poster==='string'&&posterPattern.test(input.poster)?input.poster:null;
 return {
  title_key:key,title,year:Number.isInteger(year)&&year>=1870&&year<=2100?year:null,
  poster,category:parsed.media==='tv'?'tv':'movies'
 };
}
async function save(client,userId,input){
 const meta=normalize(input);
 if(!meta)return null;
 if(!client||!userId)throw Error('Sign in to save metadata');
 const row={user_id:userId,...meta};
 const result=await client.from('user_catalog_titles').upsert(row,{onConflict:'user_id,title_key'});
 if(result.error)throw result.error;
 return row;
}
window.AfterlogueCatalogMetadata=Object.freeze({identify,normalize,save});
})();
