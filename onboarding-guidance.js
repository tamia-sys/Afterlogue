/* Afterlogue / First Impressions. Keep the original rating and save logic;
 * only make the next action clear at each stage.
 */
(()=>{
"use strict";
const filmSection=document.getElementById("films");
const tvSection=document.getElementById("television");
const guide=document.querySelector(".impressions-journey");
const optionalSearch=document.querySelector(".impressions-more");
const forward=document.querySelector(".impressions-forward");
const done=document.querySelector(".log-continue-section");
const continueLink=document.querySelector(".log-continue-button");
const header=document.getElementById("impressions-current-step");
const heading=document.getElementById("impressions-step-title");
const help=document.getElementById("impressions-step-help");
const count=document.getElementById("impressions-rating-count");
const primary=document.getElementById("impressions-step-next");
const secondary=document.getElementById("impressions-films-next");
const back=document.getElementById("impressions-step-back");
if(!filmSection||!tvSection||!guide||!primary||!secondary||!back||!done||!continueLink)return;
const guest=new URLSearchParams(location.search).get("guest")==="1";
let current="films",queued=false;
const ratedWithin=element=>element?.querySelectorAll(".log-poster-placeholder.is-rated,.impressions-more-poster.is-rated").length||0;
function selectionText(n,kind){
 if(n===0)return "No "+kind+" rated yet. You can continue without rating everything.";
 return n+" "+kind+" "+(n===1?"impression":"impressions")+" selected. You're ready to continue.";
}
function updateCount(){
 const n=ratedWithin(current==="films"?filmSection:tvSection);
 count.textContent=selectionText(n,current==="films"?"film":"TV show");
}
function moveTo(nextStage,scroll=true){
 current=nextStage==="tv"?"tv":"films";
 const films=current==="films";
 filmSection.hidden=!films;
 tvSection.hidden=films;
 forward.hidden=!films;
 if(optionalSearch)optionalSearch.hidden=films;
 done.hidden=films;
 back.hidden=films;
 header.textContent=films?"STEP 1 OF 2 / FILMS":"STEP 2 OF 2 / TV SHOWS";
 heading.textContent=films?"Start with films you know.":"Now, the TV shows you know.";
 help.textContent=films
   ?"Tap any familiar poster, then choose your impression. You only need to rate a few—or none."
   :"Rate a few shows if you like. When you're done, we'll find your first five picks.";
 primary.textContent=films?"Continue to TV Shows →":guest?"See my five picks →":"Save & see my five picks →";
 updateCount();
 if(scroll){
  guide.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  primary.focus({preventScroll:true});
 }
}
function advance(){
 if(current==="films")moveTo("tv");
 else continueLink.click();
}
primary.addEventListener("click",advance);
secondary.addEventListener("click",()=>moveTo("tv"));
back.addEventListener("click",()=>moveTo("films"));
// A rating chosen on the poster updates the step count immediately;
// an imported or restored member impression updates it too.
const observer=new MutationObserver(mutations=>{
 if(!mutations.some(m=>m.type==="attributes"&&m.attributeName==="class"))return;
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;updateCount();});
});
observer.observe(filmSection,{subtree:true,attributes:true,attributeFilter:["class"]});
observer.observe(tvSection,{subtree:true,attributes:true,attributeFilter:["class"]});
document.addEventListener("afterlogue:saved-ratings",updateCount);
// Some browsers restore position or hash after a refresh; keep TV reachable.
moveTo(location.hash==="#television"?"tv":"films",false);
})();
