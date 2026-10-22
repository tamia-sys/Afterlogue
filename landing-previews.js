/* Landing-only, illustrative interactions.
   Demo ratings never touch authentication, localStorage or member collections.
   Film-detail / Log previews only use the exact poster clicked. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const previews=Object.freeze({
 'perfect-days':{
  title:'Perfect Days',year:'2023',country:'Japan',
  kind:'Film',genres:'Drama',duration:'2h 4m',
  synopsis:'Hirayama finds contentment in the routines of his life in Tokyo. A series of small encounters offers glimpses of the memories and emotions beneath his quiet days.'
 },
 'sentimental-value':{
  title:'Sentimental Value',year:'2025',country:'Norway',
  kind:'Film',genres:'Drama',duration:'2h 13m',
  synopsis:'Two sisters reconnect with their estranged filmmaker father when he returns with plans for a new project, reopening long-held family tensions.'
 },
 'worst-person':{
  title:'The Worst Person in the World',year:'2021',country:'Norway',
  kind:'Film',genres:'Drama · Romance',duration:'2h 8m',
  synopsis:'Julie navigates love, work, and uncertainty as she tries to understand who she wants to become.'
 },
 blue:{title:'Three Colors: Blue',year:'1993',kind:'Film',impression:'Loved',symbol:'♥'},
 'normal-people':{title:'Normal People',year:'2020',kind:'TV series',impression:'Okay',symbol:'●'},
 severance:{title:'Severance',year:'2022',kind:'TV series',impression:'Not for me',symbol:'×'}
});
const ratingTitles={moonlight:'Moonlight',boyhood:'Boyhood',manchester:'Manchester by the Sea'};
const ratingPosters=[...document.querySelectorAll('#lp-rating-posters [data-preview-key]')];
const ratings=[...document.querySelectorAll('#preview-impressions [data-preview-rating]')];
const ratingStatus=$('lp-rating-status');
let currentRating=null;
const localize=t=>window.AfterlogueLanguage?.translate?.(t)||t;
function activate(button){
 currentRating=button?.dataset.previewKey||null;
 for(const poster of ratingPosters){
  const chosen=poster===button;
  poster.classList.toggle('is-active',chosen);
  poster.setAttribute('aria-pressed',String(chosen));
 }
 const reaction=button?.dataset.impression||null;
 for(const control of ratings){
  control.disabled=!button;
  control.classList.toggle('chosen',reaction===control.dataset.previewRating);
  control.setAttribute('aria-pressed',String(Boolean(reaction&&reaction===control.dataset.previewRating)));
 }
 if(!button)return;
 ratingStatus.textContent=reaction
  ?ratingTitles[currentRating]+' — '+localize(reaction)+'. '+localize('Choose another film to try again.')
  :ratingTitles[currentRating]+' '+localize('selected. Choose your impression below.');
}
ratingPosters.forEach(button=>button.addEventListener('click',()=>activate(button)));
ratings.forEach(button=>button.addEventListener('click',()=>{
 if(!currentRating||button.disabled)return;
 const selected=ratingPosters.find(p=>p.dataset.previewKey===currentRating);
 if(!selected)return;
 selected.dataset.impression=button.dataset.previewRating;
 selected.classList.add('is-rated');
 activate(selected);
}));
const modal=$('lp-modal'),modalBody=$('lp-modal-body'),close=$('lp-modal-close');
if(!modal||!modalBody||!close)return;
let previousFocus=null;
const element=(tag,className,text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
};
function previewButton(text){
 const fake=element('span','lp-demo-action',text);
 fake.setAttribute('aria-hidden','true');
 return fake;
}
function imageFor(poster,title,className){
 const img=element('img',className);
 img.src=poster.querySelector('img')?.getAttribute('src')||'';
 img.alt=title+' poster';
 return img;
}
function buildDetails(poster,film){
 const body=element('div','lp-details');
 const art=element('div','lp-details-art');
 art.append(imageFor(poster,film.title,'lp-details-image'));
 const summary=element('div','lp-details-copy');
 summary.append(element('p','lp-details-kicker','AFTERLOGUE / A FILM IN FOCUS'));
 summary.append(element('h2','lp-details-title',film.title));
 summary.append(element('p','lp-details-meta',[film.year,film.country,film.kind,film.genres,film.duration].filter(Boolean).join(' · ')));
 summary.append(element('p','lp-details-synopsis',film.synopsis));
 const actions=element('div','lp-details-actions');
 ['▷  Watch trailer','◉  Seen it','＋  Add to Watchlist','♡','•••'].forEach(label=>actions.append(previewButton(label)));
 summary.append(actions);
 body.append(art,summary);
 return body;
}
function buildLogCard(poster,film){
 const layout=element('div','lp-log-layout');
 const heading=element('div','lp-log-heading');
 heading.append(element('p','lp-log-kicker','1 STORY / WATCHED'));
 const entry=element('div','lp-log-entry');
 entry.append(imageFor(poster,film.title,'lp-log-image'));
 const right=element('div','lp-log-copy');
 const head=element('div','lp-log-card-head');
 head.append(element('h2','lp-log-title',film.title),element('span','lp-log-heart','♥'));
 right.append(head);
 right.append(element('p','lp-log-meta',film.year+' · '+film.kind));
 right.append(element('p','lp-log-impression',film.symbol+' '+localize(film.impression)));
 const actions=element('div','lp-log-actions');
 ['↗ Details','✎ Edit entry','↗ Share','Discuss'].forEach(label=>actions.append(previewButton(label)));
 right.append(actions);
 const note=element('div','lp-log-note');
 note.append(element('span','lp-log-note-heading','PRIVATE NOTE'),element('span','lp-log-note-text','Add a private note…'));
 right.append(note);
 entry.append(right);
 layout.append(heading,entry);
 return layout;
}
function openPreview(poster,mode){
 const key=mode==='details'?poster.dataset.previewDetail:poster.dataset.previewLog;
 const info=previews[key];
 if(!info)return;
 previousFocus=document.activeElement;
 $('lp-modal-title').textContent=mode==='details'?'AFTERLOGUE / A FILM IN FOCUS':'AFTERLOGUE / YOUR LOG';
 modalBody.replaceChildren(mode==='details'?buildDetails(poster,info):buildLogCard(poster,info));
 modal.hidden=false;
 document.body.classList.add('lp-preview-open');
 modal.setAttribute('aria-label',mode==='details'?'Film details preview: '+info.title:'Log preview: '+info.title);
 close.focus();
}
function closePreview(){
 if(modal.hidden)return;
 modal.hidden=true;
 document.body.classList.remove('lp-preview-open');
 modalBody.replaceChildren();
 if(previousFocus?.isConnected)previousFocus.focus();
}
document.querySelectorAll('[data-preview-detail]').forEach(poster=>
 poster.addEventListener('click',()=>openPreview(poster,'details')));
document.querySelectorAll('[data-preview-log]').forEach(poster=>
 poster.addEventListener('click',()=>openPreview(poster,'log')));
close.addEventListener('click',closePreview);
modal.addEventListener('click',event=>{if(event.target===modal)closePreview();});
document.addEventListener('keydown',event=>{
 if(modal.hidden)return;
 if(event.key==='Escape'){event.preventDefault();closePreview();}
 // Close is the only active control inside these demonstration previews.
 if(event.key==='Tab'){event.preventDefault();close.focus();}
});
})();
