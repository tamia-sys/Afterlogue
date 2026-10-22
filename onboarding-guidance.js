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
 const lang=window.AfterlogueLanguage?.current?.()||"en";
 if(n===0){
  const empty={
   en:kind==="film"?"No film rated yet. You can continue without rating everything.":"No TV show rated yet. You can continue without rating everything.",
   es:kind==="film"?"Aún no has valorado ninguna película. Puedes continuar sin valorarlas todas.":"Aún no has valorado ninguna serie. Puedes continuar sin valorarlas todas.",
   fr:kind==="film"?"Aucun film noté pour le moment. Vous pouvez continuer sans tout noter.":"Aucune série notée pour le moment. Vous pouvez continuer sans tout noter.",
   pt:kind==="film"?"Nenhum filme avaliado ainda. Você pode continuar sem avaliar todos.":"Nenhuma série avaliada ainda. Você pode continuar sem avaliar todas.",
   ko:kind==="film"?"아직 평가한 영화가 없어요. 모두 평가하지 않아도 계속할 수 있어요.":"아직 평가한 TV 시리즈가 없어요. 모두 평가하지 않아도 계속할 수 있어요."
  };
  return empty[lang]||empty.en;
 }
 const media={
  en:kind==="film"?"film":"TV show",
  es:kind==="film"?"película":"serie",
  fr:kind==="film"?"film":"série",
  pt:kind==="film"?"filme":"série",
  ko:kind==="film"?"영화":"TV 시리즈"
 };
 if(lang==="ko")return media.ko+" "+n+"편 평가 완료. 준비되면 계속해 주세요.";
 if(lang==="es")return n+" "+media.es+(n===1?" valorada":" valoradas")+". Puedes continuar.";
 if(lang==="fr")return n+" "+media.fr+(n===1?" noté":" notés")+". Vous pouvez continuer.";
 if(lang==="pt")return n+" "+media.pt+(n===1?" avaliado":" avaliados")+". Você pode continuar.";
 return n+" "+media.en+" "+(n===1?"impression":"impressions")+" selected. You're ready to continue.";
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
 primary.textContent=films?"Continue to TV Shows":guest?"See my five picks":"Save & see my five picks";
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
 if(!mutations.some(m=>m.type==="childList"||(m.type==="attributes"&&m.attributeName==="class")))return;
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;updateCount();});
});
observer.observe(filmSection,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
observer.observe(tvSection,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
document.addEventListener("afterlogue:saved-ratings",updateCount);
document.addEventListener("afterlogue:language-changed",updateCount);
// Some browsers restore position or hash after a refresh; keep TV reachable.
moveTo(location.hash==="#television"?"tv":"films",false);
})();
