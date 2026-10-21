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
const googleButton=document.getElementById("google-signin");
const appleButton=document.getElementById("apple-signin");
const resendButton=document.getElementById("signup-resend");
const callbackUrl=new URL("signup.html?mode=signin",location.href).href;
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
 if(error){
   console.warn("Profile check unavailable; opening onboarding.",error.code||error.message);
   navigating=true;location.replace("log.html");return;
 }
 if(!profile?.onboarding_completed&&offerImport&&typeof window.saveFirstImpressions==="function"){
  const ratings=new Set(["Loved","Liked","Okay","Not for me"]);
  const importGuest=localStorage.getItem("afterlogue.guest.impressions.pending.v1")==="1";
  const drafts=importGuest?localStorage:sessionStorage;
  let savedCount=0;
  try{
   for(let i=0;i<drafts.length;i++){
    const k=drafts.key(i);
    if(k?.startsWith("afterlogue-")&&ratings.has(drafts.getItem(k)))savedCount++;
   }
  }catch(_){}
  if(savedCount&&window.confirm("Save "+savedCount+" impressions from this browser to your Afterlogue account?")){
   await window.saveFirstImpressions(client,{importGuest});
  }
 }
 // An imported First Impressions collection can complete onboarding,
 // so check again before choosing the final destination.
 if(offerImport&&!profile?.onboarding_completed){
  const latest=await client.from("profiles")
   .select("onboarding_completed").eq("user_id",user.id).maybeSingle();
  if(latest.error)console.warn("Profile refresh unavailable",latest.error.code||latest.error.message);
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
     emailRedirectTo:callbackUrl
    }
   });
   if(error)throw error;
   // With email confirmation disabled or already fulfilled, Supabase
   // returns a real session. Go directly to First Impressions.
   if(data?.session?.user){
    await memberDestination(data.session.user,true);
    return;
   }
   // Confirmation-enabled projects intentionally return NO session.
   // The verification link returns here, where resumeSession() routes.
   passwordField.value="";
   if(resendButton)resendButton.hidden=false;
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
  const query=new URLSearchParams(location.search);
  if(callback.has("error")||callback.has("error_code")||query.has("error")||query.has("error_code")){
   const desc=callback.get("error_description")||query.get("error_description")||"";
   inform("The confirmation link was rejected"+(desc?": "+desc:"")+". You can request a new link below; use only the newest email.","error");
   if(resendButton)resendButton.hidden=false;
   return;
  }
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(!data?.session?.user)return;
  inform("You're signed in. Opening Afterlogue…");
  // Confirmation can return in a new tab; preserve guest choices if present.
  await memberDestination(data.session.user,
    localStorage.getItem("afterlogue.guest.impressions.pending.v1")==="1");
 }catch(error){
  console.warn("Afterlogue: Unable to resume authentication.",String(error?.code||"session unavailable"));
  setMode("signin");
  inform("We couldn't finish opening your account automatically. Please sign in to continue.","error");
 }
}
googleButton?.addEventListener("click",()=>socialSignIn("google",googleButton));
appleButton?.addEventListener("click",()=>socialSignIn("apple",appleButton));
async function socialSignIn(provider,control){
 if(navigating)return;
 for(const b of [googleButton,appleButton])if(b)b.disabled=true;
 control.textContent="Connecting to "+(provider==="google"?"Google":"Apple")+"…";
 inform("");
 try{
  const {error}=await client.auth.signInWithOAuth({
    provider,options:{redirectTo:callbackUrl}
  });
  if(error)throw error;
  navigating=true;
 }catch(error){
  for(const b of [googleButton,appleButton])if(b)b.disabled=false;
  googleButton.textContent="Continue with Google";
  appleButton.textContent="Continue with Apple";
  inform("This sign-in option couldn't start. You can use email while provider setup is completed. "+describeAuthError(error),"error");
 }
}
resendButton?.addEventListener("click",async()=>{
 const email=emailField.value.trim();
 if(!email){inform("Enter the email address used to create your account, then request a new link.","error");emailField.focus();return;}
 resendButton.disabled=true;resendButton.textContent="Sending…";inform("");
 try{
  const {error}=await client.auth.resend({
   type:"signup",email,options:{emailRedirectTo:callbackUrl}
  });
  if(error)throw error;
  inform("If a confirmation is pending, a fresh Afterlogue email is on its way. Open only the newest link.");
 }catch(error){inform(describeAuthError(error),"error");}
 finally{resendButton.disabled=false;resendButton.textContent="Resend confirmation";}
});
resumeSession();
})();
