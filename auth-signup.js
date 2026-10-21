/* Afterlogue — account creation, sign-in, and onboarding routing.
 * The Supabase client owns all sessions. Never store passwords or bypass
 * email verification; a null signup session means confirmation is pending.
 */
(()=>{
"use strict";
const client=window.afterlogueSupabase;
const form=document.getElementById("signup-form");
const message=document.getElementById("signup-message");
const button=form.querySelector(".signup-submit");
const emailField=document.getElementById("signup-email");
const passwordField=document.getElementById("signup-password");
const switchLink=document.getElementById("signin-link");
const heading=document.querySelector(".signup-container h1");
const prompt=document.querySelector(".signup-login");
let mode=new URLSearchParams(window.location.search).get("mode")==="signin"?"signin":"signup";
let navigating=false;

function inform(text,state="info"){
 message.textContent=text;
 message.dataset.state=state;
}
function setMode(next){
 mode=next;
 const signingIn=mode==="signin";
 heading.textContent=signingIn?"Welcome back.":"Make it yours.";
 button.textContent=signingIn?"Sign in →":"Create account →";
 passwordField.autocomplete=signingIn?"current-password":"new-password";
 prompt.firstChild.textContent=signingIn?"New to Afterlogue? ":"Already have an account? ";
 switchLink.textContent=signingIn?"Create account":"Sign in";
 inform("");
}
switchLink.addEventListener("click",event=>{
 event.preventDefault();
 if(button.disabled)return;
 setMode(mode==="signin"?"signup":"signin");
});
setMode(mode);

function describeAuthError(error){
 const code=String(error?.code||"").toLowerCase();
 const detail=String(error?.message||"").toLowerCase();
 const status=Number(error?.status);
 if(status===429||/rate.limit|too many requests|too many emails|email send rate limit|security purposes/.test(code+" "+detail)){
  return "Afterlogue cannot send another confirmation email right now because the email limit was reached. Please wait and contact the person who invited you. Do not keep submitting signup requests.";
 }
 if(/email.not.confirmed|email not confirmed/.test(code+" "+detail)){
  return "Please open the confirmation link in your email first. Once verified, you'll go directly to First Impressions.";
 }
 if(/email.address.not.authorized|email address not authorized/.test(code+" "+detail)){
  return "Email confirmations aren't available for this address yet. Please contact the Afterlogue beta team; this requires a change to the email service.";
 }
 return error?.message||"Something went wrong. Please try again.";
}
async function memberDestination(user,offerImport=false){
 if(!user?.id)throw Error("Unable to verify your account.");
 const {data:profile,error}=await client.from("profiles")
  .select("onboarding_completed").eq("user_id",user.id).maybeSingle();
 if(error)throw error;
 if(!profile?.onboarding_completed&&offerImport&&typeof window.saveFirstImpressions==="function"){
  const ratings=new Set(["Loved","Liked","Okay","Not for me"]);
  let savedCount=0;
  try{
   for(let i=0;i<sessionStorage.length;i++){
    const k=sessionStorage.key(i);
    if(k?.startsWith("afterlogue-")&&ratings.has(sessionStorage.getItem(k)))savedCount++;
   }
  }catch(_){}
  if(savedCount&&window.confirm("Save "+savedCount+" impressions from this browser to your Afterlogue account?")){
   await window.saveFirstImpressions(client);
  }
 }
 // An imported First Impressions collection can complete onboarding,
 // so check again before choosing the final destination.
 if(offerImport&&!profile?.onboarding_completed){
  const latest=await client.from("profiles")
   .select("onboarding_completed").eq("user_id",user.id).maybeSingle();
  if(latest.error)throw latest.error;
  if(latest.data?.onboarding_completed){location.replace("discover.html");return;}
 }
 navigating=true;
 location.replace(profile?.onboarding_completed?"discover.html":"log.html");
}
form.addEventListener("submit",async event=>{
 event.preventDefault();
 if(navigating)return;
 const email=emailField.value.trim();
 const password=passwordField.value;
 const signingIn=mode==="signin";
 button.disabled=true;
 button.textContent=signingIn?"Signing in…":"Creating account…";
 inform("");
 try{
  if(signingIn){
   const {data,error}=await client.auth.signInWithPassword({email,password});
   if(error)throw error;
   await memberDestination(data?.user,true);
  }else{
   const {data,error}=await client.auth.signUp({
    email,password,options:{
     // This is already on the Supabase redirect allowlist.
     emailRedirectTo:new URL("signup.html",location.href).href
    }
   });
   if(error)throw error;
   // With email confirmation disabled or already fulfilled, Supabase
   // returns a real session. Go directly to First Impressions.
   if(data?.session?.user){
    navigating=true;
    location.replace("log.html");
    return;
   }
   // Confirmation-enabled projects intentionally return NO session.
   // The verification link returns here, where resumeSession() routes.
   passwordField.value="";
   inform("Your Afterlogue account needs email confirmation. Check your inbox and spam folder for the confirmation link. After confirming, you'll be taken straight to First Impressions—no second sign-in required. If no email arrives, please tell the person who invited you instead of creating another account.","info");
  }
 }catch(error){
  inform(describeAuthError(error),"error");
 }finally{
  if(!navigating){
   button.disabled=false;
   button.textContent=signingIn?"Sign in →":"Create account →";
  }
 }
});

async function resumeSession(){
 // Supabase resolves a verification callback and saves the session when
 // getSession() runs. Never treat an unverified signup as authenticated.
 try{
  const callback=new URLSearchParams(window.location.hash.slice(1));
  if(callback.has("error")||callback.has("error_code")){
   inform("That confirmation link could not be completed or has expired. Please try again using a valid link.","error");
   return;
  }
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(!data?.session?.user)return;
  inform("You're signed in. Opening Afterlogue…");
  await memberDestination(data.session.user,false);
 }catch(error){
  console.warn("Afterlogue: Unable to resume authentication.",String(error?.code||"session unavailable"));
  setMode("signin");
  inform("We couldn't finish opening your account automatically. Please sign in to continue.","error");
 }
}
resumeSession();
})();
