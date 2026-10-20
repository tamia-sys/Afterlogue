/* Afterlogue — full-catalog search integrated into the main Explore field.
   Curated mood results remain intact; remote matches appear beneath them. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const field=$('explore-search'), local=$('explore-match-picks');
if(!field||!local)return;
const section=$('explore-search-results');
const wrap=document.createElement('section');
wrap.className='explore-global-matches';
wrap.hidden=true;
wrap.innerHTML='<div class="explore-group-label"><p>ACROSS CINEMA & TELEVISION</p><span id="explore-global-count"></span></div><div class="explore-picks" id="explore-global-grid"></div><p id="explore-global-status" class="catalog-intro" role="status"></p>';
section.append(wrap);
const output=$('explore-global-grid'),state=$('explore-global-status'),count=$('explore-global-count');
const endpoint='https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog';
const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let timer=null,serial=0;
function card(item){
 const key='tmdb-'+item.media+'-'+item.id;
 const node=document.createElement('article');node.className='explore-pick';
 const imageLink=document.createElement('a');imageLink.className='explore-art';
 imageLink.href='film-details.html?tmdb='+encodeURIComponent(item.id)+'&type='+item.media+'&from=explore';
 imageLink.setAttribute('aria-label','View '+item.title+' details');
 const img=document.createElement('img');img.loading='lazy';img.alt=item.title+' poster';img.src=item.poster||'';
 imageLink.append(img);
 const title=document.createElement('h3');title.textContent=item.title;
 const year=document.createElement('p');year.className='explore-year';year.textContent=(item.year||'Year unknown')+' / '+(item.media==='tv'?'TV':'FILM');
 const actions=document.createElement('div');actions.className='explore-pick-actions';
 const eye=window.AfterlogueSeen?.button({key,title:item.title,year:item.year,poster:item.poster,category:item.media==='tv'?'tv':'movies'});
 const detail=document.createElement('a');detail.href=imageLink.href;detail.textContent='View details';
 detail.className='explore-global-detail';detail.setAttribute('aria-label','View details for '+item.title);
 if(eye)actions.append(eye);
 actions.append(detail);node.append(imageLink,title,year,actions);
 return node;
}
function finish(items,failed,query){
 const format=$('explore-format')?.value||'all';
 const genre=$('explore-genre')?.value||'all',year=$('explore-year')?.value||'all';
 const country=$('explore-country')?.value||'all';
 const locally=new Set([...local.querySelectorAll('.explore-pick')].map(node=>fold(node.querySelector('h3')?.textContent)));
 const seen=new Set();
 const relevant=items.filter(item=>{
   const title=fold(item.title);
   const key=item.media+'-'+item.id;
   if(seen.has(key)||locally.has(title)||!item.poster)return false;
   seen.add(key);
   if(format!=='all'&&item.media!== (format==='tv'?'tv':'movie'))return false;
   if(genre!=='all'&&!(item.genres||[]).some(g=>fold(g)===fold(genre)))return false;
   if(year!=='all'&&Math.floor((Number(item.year)||0)/10)*10!==Number(year))return false;
   // Search results do not include verified production-country metadata.
   if(country!=='all')return false;
   return true;
 }).slice(0,12);
 output.replaceChildren(...relevant.map(card));
 count.textContent=relevant.length+' '+(relevant.length===1?'story':'stories');
 if(relevant.length){
   $('explore-no-matches').hidden=true;
   state.textContent='';
 }else if(failed){
   state.textContent='The full catalog could not be searched right now. Try again shortly.';
 }else if(country!=='all'){
   state.textContent='Country filtering currently applies to curated stories. Clear Country to search the full library.';
 }else{
   state.textContent='No additional titles found for “'+query+'”.';
 }
 // Preserve the curated results count and avoid claiming it covers TMDB.
 $('explore-browse-note').textContent='Search results from our featured collection and the wider cinema catalog.';
}
async function search(){
 const id=++serial;const query=field.value.trim();
 const active=query.length>=2;
 wrap.hidden=!active;
 output.replaceChildren();
 if(!active){state.textContent='';return;}
 state.textContent='Searching the wider catalog…';count.textContent='';
 const format=$('explore-format')?.value||'all';
 const media=format==='movies'?['movie']:format==='tv'?['tv']:['movie','tv'];
 const results=await Promise.allSettled(media.map(async type=>{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'search',query,media:type,page:1})});
   if(!r.ok)throw Error('TMDB search unavailable');
   return (await r.json()).items||[];
 }));
 if(id!==serial||field.value.trim()!==query)return;
 const items=results.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
 finish(items,results.every(x=>x.status==='rejected'),query);
}
function schedule(){clearTimeout(timer);++serial;if(field.value.trim().length<2){wrap.hidden=true;output.replaceChildren();state.textContent='';return;}timer=setTimeout(search,380);}
field.addEventListener('input',schedule);
['explore-format','explore-genre','explore-year','explore-country'].forEach(id=>$(id)?.addEventListener('change',schedule));
$('explore-clear')?.addEventListener('click',()=>{clearTimeout(timer);++serial;wrap.hidden=true;output.replaceChildren();});
})();
