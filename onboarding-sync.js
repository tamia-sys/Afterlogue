
/* AFTERLOGUE — SAVE FIRST IMPRESSIONS */

window.saveFirstImpressions = async function (client) {

  // Identify the signed-in account.
  const { data, error: userError } = await client.auth.getUser();

  if (userError || !data.user) {
    throw new Error("Please sign in to save your impressions.");
  }

  const user = data.user;

  // Check whether onboarding has already been completed.
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  // Returning members may revisit First Impressions to correct earlier
  // choices; save the current ratings rather than silently ignoring them.

  const validRatings = ["Loved", "Liked", "Okay", "Not for me"];
  const impressions = [];

  // Collect the impressions stored on this device.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key || !key.startsWith("afterlogue-")) continue;

    const rating = localStorage.getItem(key);

    if (!validRatings.includes(rating)) continue;

    impressions.push({
      user_id: user.id,
      title_key: key.slice("afterlogue-".length),
      rating: rating,
      updated_at: new Date().toISOString()
    });
  }

  // Save impressions before completing onboarding.
  if (impressions.length > 0) {
    const { error: saveError } = await client
      .from("impressions")
      .upsert(impressions, {
        onConflict: "user_id,title_key"
      });

    if (saveError) throw saveError;
  }

 // Sync extra TMDB titles along with ratings, preserving poster and year.
 const tmdbRows=[];
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);
  if(!k?.startsWith('afterlogue.onboarding.tmdb.'))continue;
  try{
   const item=JSON.parse(localStorage.getItem(k)||'null');
   if(!item || !/^tmdb-(movie|tv)-[1-9][0-9]{0,9}$/.test(item.key))continue;
   if(!validRatings.includes(localStorage.getItem('afterlogue-'+item.key)))continue;
   const title=String(item.title||'').trim().slice(0,250);
   if(!title)continue;
   const yr=Number(item.year);
   tmdbRows.push({
    user_id:user.id,title_key:item.key,title,
    year:Number.isInteger(yr)&&yr>=1870&&yr<=2100?yr:null,
    poster:/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/[A-Za-z0-9_./-]+\.(?:jpg|png|webp)$/.test(item.poster||'')?item.poster:null,
    category:item.key.startsWith('tmdb-tv-')?'tv':'movies'
   });
  }catch(_){}
 }
 if(tmdbRows.length){
  const {error:metadataError}=await client.from('user_catalog_titles').upsert(tmdbRows,{onConflict:'user_id,title_key'});
  if(metadataError)throw metadataError;
 }

 // Preserve the First Impressions country/language choices in the
 // member's private profile. Missing tab preferences must NOT clear existing
 // preferences when this helper runs from an unrelated import flow.
 const validCountry=/^[A-Z]{2}$/;
 const validLanguage=/^[a-z]{2,3}$/;
 const profileUpdate={user_id:user.id};
 const countryKey="afterlogue.onboarding.country";
 const languageKey="afterlogue.onboarding.language";
 const country=sessionStorage.getItem(countryKey);
 const language=sessionStorage.getItem(languageKey);
 if(country!==null)profileUpdate.discovery_country=validCountry.test(country)?country:null;
 if(language!==null)profileUpdate.discovery_language=validLanguage.test(language)?language:null;
 if(!profile?.onboarding_completed){
  profileUpdate.onboarding_completed=true;
  profileUpdate.onboarding_completed_at=new Date().toISOString();
 }
 if(Object.keys(profileUpdate).length>1){
  const {error:completionError}=await client.from("profiles")
   .upsert(profileUpdate,{onConflict:"user_id"});
  if(completionError)throw completionError;
 }
 return profile?.onboarding_completed?"impressions-refreshed":"onboarding-completed";
};
