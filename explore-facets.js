/* AFTERLOGUE — Multi-select mood discovery preferences.
   OR within a category; AND across categories. Preserved in this tab. */
(()=>{
'use strict';
const bar=document.querySelector('.explore-filters');
if(!bar)return;
const presets={
 genres:[["Drama","Drama"],["Comedy","Comedy"],["Romance","Romance"],["Thriller","Thriller"],["Mystery","Mystery"],["Horror","Horror"],["Action","Action"],["Adventure","Adventure"],["Science Fiction","Sci-fi"],["Fantasy","Fantasy"],["Animation","Animation"],["Crime","Crime"],["Documentary","Documentary"],["Family","Family"],["History","History"],["Music","Music"],["Western","Western"]],
 countries:[["US","United States"],["GB","United Kingdom"],["CA","Canada"],["AU","Australia"],["FR","France"],["DE","Germany"],["IT","Italy"],["ES","Spain"],["MX","Mexico"],["BR","Brazil"],["AR","Argentina"],["IN","India"],["JP","Japan"],["KR","South Korea"],["CN","China"],["TW","Taiwan"],["NG","Nigeria"],["ZA","South Africa"],["TH","Thailand"],["TR","Turkey"],["SE","Sweden"],["NL","Netherlands"],["NZ","New Zealand"],["EG","Egypt"],["PH","Philippines"],["PL","Poland"],["DK","Denmark"],["NO","Norway"]],
 languages:[["en","English"],["es","Spanish"],["fr","French"],["de","German"],["it","Italian"],["pt","Portuguese"],["hi","Hindi"],["ja","Japanese"],["ko","Korean"],["zh","Chinese"],["ar","Arabic"],["ta","Tamil"],["te","Telugu"],["bn","Bengali"],["th","Thai"],["tr","Turkish"],["sv","Swedish"],["nl","Dutch"],["pl","Polish"],["id","Indonesian"],["tl","Filipino"],["ru","Russian"]],
 decades:[["2020","2020s"],["2010","2010s"],["2000","2000s"],["1990","1990s"],["1980","1980s"],["1970","1970s"],["1960","1960s"],["1950","1950s"],["1940","1940s"],["1930","1930s"]],
 ratings:[["G","G"],["PG","PG"],["PG-13","PG-13"],["R","R"],["NC-17","NC-17"],["TV-Y","TV-Y"],["TV-Y7","TV-Y7"],["TV-G","TV-G"],["TV-PG","TV-PG"],["TV-14","TV-14"],["TV-MA","TV-MA"]]
};
const labels={genres:"Genres",countries:"Countries",languages:"Languages",decades:"Decades",ratings:"Age rating"};
const storageKey="afterlogue.explore.mood-filters.v1";
const picked=Object.fromEntries(Object.keys(presets).map(x=>[x,new Set()]));
const listeners=new Set();
try{
 const stored=JSON.parse(sessionStorage.getItem(storageKey)||"{}");
 for(const [key,options] of Object.entries(presets)){
  const allowed=new Set(options.map(x=>x[0]));
  for(const value of Array.isArray(stored[key])?stored[key]:[]){
   if(allowed.has(value))picked[key].add(value);
  }
 }
}catch(_){}
function value(){return Object.fromEntries(Object.entries(picked).map(([key,set])=>[key,[...set]]));}
function active(){return Object.values(picked).some(set=>set.size>0);}
function emit(){
 try{sessionStorage.setItem(storageKey,JSON.stringify(value()));}catch(_){}
 for(const cb of listeners)cb(value());
}
const formatLabel=bar.querySelector('label:has(#explore-format)');
for(const id of ['explore-genre','explore-year','explore-country']){
 const el=document.getElementById(id);
 el?.closest('label')?.remove();
}
const clear=document.getElementById('explore-clear');
const menus=[];
for(const [kind,options] of Object.entries(presets)){
 const details=document.createElement('details');
 details.className='explore-filter-menu';
 details.dataset.facet=kind;
 const summary=document.createElement('summary');
 const heading=document.createElement('span');heading.className='explore-filter-name';heading.textContent=labels[kind];
 const count=document.createElement('span');count.className='explore-filter-selected';
 const caret=document.createElement('span');caret.className='explore-filter-chevron';caret.textContent='⌄';
 summary.append(heading,count,caret);
 const popup=document.createElement('div');popup.className='explore-filter-options';popup.setAttribute('role','group');popup.setAttribute('aria-label','Choose '+labels[kind].toLowerCase());
 for(const [code,name] of options){
  const label=document.createElement('label');label.className='explore-filter-option';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=code;checkbox.checked=picked[kind].has(code);
  const span=document.createElement('span');span.textContent=name;
  checkbox.addEventListener('change',()=>{
   if(checkbox.checked)picked[kind].add(code);else picked[kind].delete(code);
   draw();emit();
  });
  label.append(checkbox,span);popup.append(label);
 }
 details.append(summary,popup);
 bar.insertBefore(details,formatLabel||clear);
 menus.push({details,count,kind});
}
function draw(){
 for(const {details,count,kind} of menus){
  const n=picked[kind].size;count.textContent=n?String(n):"All";
  details.classList.toggle('has-selection',Boolean(n));
  details.querySelectorAll('input').forEach(input=>input.checked=picked[kind].has(input.value));
 }
 if(clear)clear.hidden=!active()&&(document.getElementById('explore-format')?.value||'all')==='all'&&!document.getElementById('explore-search')?.value;
}
for(const {details} of menus)details.addEventListener('toggle',()=>{
 if(details.open)for(const item of menus)if(item.details!==details)item.details.open=false;
});
document.addEventListener('click',event=>{
 if(!bar.contains(event.target))for(const item of menus)item.details.open=false;
});
function reset(){
 for(const set of Object.values(picked))set.clear();
 draw();emit();
}
draw();
window.AfterlogueExploreFilters=Object.freeze({
 get:value,active,reset,subscribe:callback=>listeners.add(callback),refresh:draw
});
})();
