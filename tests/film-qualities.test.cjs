'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'film-qualities.js'),'utf8');
const html=fs.readFileSync(path.join(root,'my-log.html'),'utf8');
const log=fs.readFileSync(path.join(root,'my-log.js'),'utf8');
const db=fs.readFileSync(path.join(root,'sql/film-quality-observations.sql'),'utf8');
test('Log loads the optional quality form before its original archive script',()=>{
 assert.match(html,/film-qualities\.css\?v=1/);
 assert.match(html,/film-qualities\.js\?v=1/);
 assert.ok(html.indexOf('film-qualities.js?v=1')<html.indexOf('my-log.js?v=11'));
 for(const id of ['film-qualities-dialog','quality-intro','quality-question','quality-tags',
  'quality-feedback','quality-hint','quality-stage','quality-next','quality-back',
  'quality-close','quality-skip','quality-description']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.doesNotThrow(()=>new vm.Script(log));
});
test('community counts can only be requested by submitting observed tags after consent',()=>{
 assert.match(js,/client\.rpc\("submit_film_qualities"/);
 assert.match(js,/p_tag_keys:currentSelected\(\)/);
 assert.match(js,/p_enjoyed_tag_keys:checkedBenefits\(\)/);
 assert.match(js,/reveal\(response\.data\.results\)/);
 assert.match(js,/response\.data\?\.submitted/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|from\("film_quality_counts"\)/);
 assert.doesNotMatch(log,/from\('film_quality_observations'\)/);
 assert.match(db,/if v_user is null then raise exception/);
 assert.match(db,/and s\.category='movies'/);
 assert.match(db,/cardinality\(p_tag_keys\) not between 1 and 5/);
 assert.match(db,/if cardinality\(v_tags\)<>cardinality\(p_tag_keys\)/);
});
test('row-level privacy and post-submit functions do not expose people or prior choices',()=>{
 assert.match(db,/alter table public\.film_quality_observations enable row level security/);
 assert.match(db,/using \(user_id = \(select auth\.uid\(\)\)\)/);
 assert.match(db,/revoke all on public\.film_quality_observations from public,anon,authenticated/);
 assert.match(db,/grant select on public\.film_quality_observations to authenticated/);
 assert.match(db,/revoke all on function public\.submit_film_qualities\(text,text\[\],text\[\]\) from public,anon,authenticated/);
 assert.match(db,/grant execute on function public\.submit_film_qualities\(text,text\[\],text\[\]\) to authenticated/);
 assert.match(db,/case when count_rows\.n>=3 then count_rows\.n else null end/);
 assert.match(db,/pg_advisory_xact_lock/);
 assert.doesNotMatch(db,/grant (?:insert|update|delete).*film_quality_observations to authenticated/i);
});
test('quality contributions are optional and confined to Watched film Log',()=>{
 assert.match(log,/state\.currentTab === 'watched' && record\.category === 'movies'/);
 assert.match(log,/filmQualities\.open\(\{client:client,user:state\.user,key:key,title:latest\.title\}\)/);
 assert.match(log,/!oldRating && wantedRating && latest\.category === 'movies'/);
 assert.match(log,/filmQualities\?\.available/);
 assert.match(html,/Maybe later/);
});
function setup(){
 const events=new Map();
 class Element {
  constructor(){this.children=[];this.events={};this.textContent='';this.hidden=false;
   this.disabled=false;this.open=false;this.attributes={};this.checked=false;this.style={};}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
  setAttribute(k,v){this.attributes[k]=v}
  getAttribute(k){return this.attributes[k]}
  addEventListener(k,fn){this.events[k]=fn}
  click(){if(this.disabled||this.hidden)return;this.events.click?.({preventDefault(){}})}
  change(){this.events.change?.({})}
  showModal(){this.open=true}
  close(){this.open=false;this.events.close?.({})}
 }
 const nodes={};const get=id=>nodes[id]||(nodes[id]=new Element());
 const context={window:{},document:{getElementById:get,createElement:()=>new Element(),
  createTextNode:s=>({textContent:s})},console:{warn(){}},Set,Map,Object,Array,Promise};
 vm.runInNewContext(js,context);
 return {api:context.window.AfterlogueFilmQualities, get,Element};
}
test('blind flow does not expose counts until member chooses and server confirms',async()=>{
 const {api,get}=setup();
 let calls=0;
 const client={from(name){
  assert.equal(name,'film_quality_observations');
  return {select(){return this},eq(){return this},then(resolve){resolve({data:[],error:null})}};
 },async rpc(name,args){
  calls++;assert.equal(name,'submit_film_qualities');
  assert.equal(args.p_tag_keys.length,1);
  return {data:{submitted:true,results:[
   {tag_key:args.p_tag_keys[0],people:9,growing:false}]},error:null};
 }};
 await api.open({client,user:{id:'mock-member'},key:'perfect-days',title:'Perfect Days'});
 assert.equal(calls,0);
 assert.equal(get('quality-tags').children.length,18);
 assert.doesNotMatch(get('quality-description').textContent,/other viewers observed/);
 const first=get('quality-tags').children[0];first.click();
 get('quality-next').click();assert.equal(calls,0);
 assert.equal(get('quality-next').textContent,'Reveal observations');
 get('quality-next').click();await Promise.resolve();await Promise.resolve();
 assert.equal(calls,1);
 assert.equal(get('quality-tags').children[0].children[1].textContent,'9 people noticed');
});
test('skip and failed response do not trigger the community reveal',async()=>{
 const {api,get}=setup();
 const client={from(){return {select(){return this},eq(){return this},then(resolve){resolve({data:[]})}}},async rpc(){return {error:{code:'42501'}}}};
 await api.open({client,user:{id:'mock-member'},key:'moonlight',title:'Moonlight'});
 get('quality-skip').click();
 assert.equal(get('film-qualities-dialog').open,false);
 await api.open({client,user:{id:'mock-member'},key:'moonlight',title:'Moonlight'});
 get('quality-tags').children[0].click();
 get('quality-next').click();
 get('quality-next').click();await Promise.resolve();await Promise.resolve();
 assert.notEqual(get('quality-stage').textContent,'3 / 3');
 assert.match(get('quality-feedback').textContent,/Couldn't save/);
});
