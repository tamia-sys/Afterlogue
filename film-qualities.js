/* Afterlogue / optional observed-film qualities.
 * Members choose privately before post-submission aggregates appear.
 * No detail-page changes and no ranking changes.
 */
(function(root){
 "use strict";
 const TAGS=Object.freeze([
  ["observational-filmmaking","Observational filmmaking"],
  ["everyday-rituals","Everyday rituals"],
  ["measured-pacing","Measured pacing"],
  ["intimate-character-study","Intimate character study"],
  ["reflective-atmosphere","Reflective atmosphere"],
  ["expressive-cinematography","Expressive cinematography"],
  ["nonlinear-storytelling","Nonlinear storytelling"],
  ["minimal-dialogue","Minimal dialogue"],
  ["dialogue-driven","Dialogue-driven"],
  ["ensemble-dynamics","Ensemble dynamics"],
  ["quiet-tension","Quiet tension"],
  ["playful-humor","Playful humor"],
  ["family-relationships","Family relationships"],
  ["sense-of-place","Strong sense of place"],
  ["emotional-restraint","Emotional restraint"],
  ["immersive-sound","Immersive sound"],
  ["brisk-pacing","Brisk pacing"],
  ["visual-symbolism","Visual symbolism"]
 ]);
 const names=new Map(TAGS);
 const dialog=document.getElementById("film-qualities-dialog");
 if(!dialog){root.AfterlogueFilmQualities={available:false};return}
 const $=id=>document.getElementById(id);
 const intro=$("quality-intro"),stageText=$("quality-stage"),question=$("quality-question");
 const description=$("quality-description"),tagsNode=$("quality-tags"),feedback=$("quality-feedback");
 const back=$("quality-back"),next=$("quality-next"),skip=$("quality-skip");
 const close=$("quality-close"),hint=$("quality-hint");
 let context=null,stage=1,observed=new Set(),enjoyed=new Set(),pending=false;
 function status(message){feedback.textContent=message||""}
 function currentSelected(){return [...observed]}
 function checkedBenefits(){return [...enjoyed].filter(t=>observed.has(t))}
 function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function setPhase(n){
  stage=n;status("");
  stageText.textContent=n+" / 3";
  back.hidden=n===1||n===3;
  next.hidden=n===3;skip.hidden=n===3;
  tagsNode.replaceChildren();
  hint.textContent="";
  if(n===1){
   question.textContent="What stood out to you?";
   description.textContent="Choose up to five qualities you noticed. You don't have to love something to recognize it.";
   next.textContent="Continue";
   for(const [key,label] of TAGS){
    const button=el("button","quality-chip",label);
    button.type="button";button.setAttribute("aria-pressed",String(observed.has(key)));
    button.addEventListener("click",()=>{
     if(pending)return;
     if(observed.has(key)){observed.delete(key);enjoyed.delete(key)}
     else if(observed.size>=5){status("Choose up to five qualities for this film.");return}
     else observed.add(key);
     button.setAttribute("aria-pressed",String(observed.has(key)));
     hint.textContent=observed.size+" / 5 selected";status("");
    });
    tagsNode.append(button);
   }
   hint.textContent=observed.size+" / 5 selected";
  }else if(n===2){
   question.textContent="Which of these spoke to you?";
   description.textContent="Your personal preferences stay private. Select any of the qualities you enjoyed, or leave all unchecked.";
   next.textContent="Reveal observations";
   for(const key of observed){
    const label=el("label","quality-check");
    const input=document.createElement("input");
    input.type="checkbox";input.checked=enjoyed.has(key);
    input.addEventListener("change",()=>input.checked?enjoyed.add(key):enjoyed.delete(key));
    label.append(input,document.createTextNode(names.get(key)));
    tagsNode.append(label);
   }
   hint.textContent="Others' choices will appear only after yours are saved.";
  }else{
   question.textContent="You weren't the only one who noticed.";
   description.textContent="Here's what other viewers observed about this film.";
   hint.textContent="Counts represent unique contributing accounts, not likes or recommendations.";
  }
 }
 function hide(){
  if(pending)return;
  if(dialog.open)dialog.close();
  context=null;
 }
 function reveal(results){
  setPhase(3);
  const rows=Array.isArray(results)?results.filter(x=>names.has(x.tag_key)):[];
  const byKey=new Map(rows.map(x=>[x.tag_key,x]));
  const known=rows.filter(x=>typeof x.people==="number"&&x.people>=3)
    .sort((a,b)=>b.people-a.people);
  // Don't imply that other viewers agreed if this film has very few
  // independent contributors so far.
  if(!known.length){
   question.textContent="Your perspective is part of the story.";
   description.textContent="You're among the first to contribute. Once more viewers weigh in, we'll show what they noticed too.";
  }
  const selected=currentSelected();
  const order=[...selected,...known.map(x=>x.tag_key).filter(x=>!observed.has(x)).slice(0,3)];
  for(const key of order){
   const entry=byKey.get(key);
   if(!entry)continue;
   const row=el("div","quality-result");
   const label=el("span","quality-result-name",names.get(key));
   const count=entry.people>=3
    ?entry.people+" people noticed"
    :"One of the first observations";
   row.append(label,el("span","quality-result-count",count));
   tagsNode.append(row);
  }
  if(!order.length)tagsNode.append(el("p","quality-empty","You're among the first to share an observation."));
  back.hidden=true;skip.hidden=true;next.hidden=true;
  hint.textContent="Very small totals remain private until at least three members have contributed that quality.";
  close.textContent="Done";
 }
 async function submit(){
  if(pending||!context)return;
  if(observed.size<1){setPhase(1);status("Choose at least one quality to reveal community observations.");return}
  pending=true;next.disabled=true;back.disabled=true;skip.disabled=true;
  next.textContent="Saving…";status("");
  try{
   const response=await context.client.rpc("submit_film_qualities",{
    p_title_key:context.key,p_tag_keys:currentSelected(),p_enjoyed_tag_keys:checkedBenefits()
   });
   if(response.error)throw response.error;
   if(!response.data?.submitted||!Array.isArray(response.data.results))throw Error("Incomplete confirmation");
   reveal(response.data.results);
  }catch(err){
   status("Couldn't save your observations. Your earlier choices are unchanged; please try again.");
   console.warn("Afterlogue quality submission was not confirmed",err?.code||"unavailable");
   next.textContent="Try saving again";
  }finally{
   pending=false;next.disabled=false;back.disabled=false;skip.disabled=false;
  }
 }
 async function open({client,user,key,title}={}){
  if(!client||!user?.id||!key||!title)return false;
  context={client,userId:user.id,key,title};
  observed=new Set();enjoyed=new Set();
  intro.textContent=title+" · Your observation";
  close.textContent="Close";
  setPhase(1);next.disabled=true;
  if(!dialog.open)dialog.showModal();
  status("Loading your previous selections…");
  try{
   const response=await client.from("film_quality_observations")
    .select("tag_key,personally_enjoyed").eq("user_id",user.id).eq("title_key",key);
   if(response.error)throw response.error;
   if(!context||context.key!==key||!dialog.open)return false;
   for(const row of response.data||[]){
    if(!names.has(row.tag_key))continue;
    observed.add(row.tag_key);
    if(row.personally_enjoyed)enjoyed.add(row.tag_key);
   }
   setPhase(1);return true;
  }catch(err){
   status("Your previous selections couldn't be loaded. Close and try again.");
   console.warn("Afterlogue quality history unavailable",err?.code||"unavailable");
   return false;
  }finally{
   if(context?.key===key&&dialog.open&&stage===1) {
    // Never let a failed history fetch overwrite an earlier contribution.
    next.disabled=feedback.textContent.includes("couldn't be loaded");
   }
  }
 }
 next.addEventListener("click",()=>{
  if(stage===1){if(!observed.size){status("Choose at least one quality or skip.");return}setPhase(2)}
  else if(stage===2)submit();
 });
 back.addEventListener("click",()=>setPhase(1));
 skip.addEventListener("click",hide);close.addEventListener("click",hide);
 dialog.addEventListener("cancel",e=>{if(pending)e.preventDefault()});
 dialog.addEventListener("close",()=>{context=null;pending=false});
 root.AfterlogueFilmQualities=Object.freeze({available:true,open,tagCount:TAGS.length});
})(window);
