const {test,expect}=require('@playwright/test');

const sessionScript=String.raw`
window.supabase={createClient:()=>({
 auth:{
  getSession:async()=>{
   await new Promise(resolve=>setTimeout(resolve,220));
   return {data:{session:{user:{id:'qa-mobile-member',email:'qa@afterlogue.test'}}},error:null};
  },
  // Simulate the iPhone PWA problem: the network-bound user check fails
  // even though the authenticated local Supabase session is still present.
  getUser:async()=>({data:{user:null},error:{message:'Temporary network failure'}}),
  onAuthStateChange:fn=>({data:{subscription:{unsubscribe(){}}}})
 },
 storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:'https://example.com/member.jpg'}})})},
 from:table=>({
  select:()=>({
   eq:()=>({
    maybeSingle:async()=>{
     if(table==='member_profiles'){
      await new Promise(resolve=>setTimeout(resolve,360));
      return {data:{avatar_preset:2,avatar_path:null},error:null};
     }
     return {data:{discovery_country:null,discovery_language:null},error:null};
    },
    order:async()=>({data:[],error:null}),
    eq:()=>({maybeSingle:async()=>({data:null,error:null})})
   }),
   order:async()=>({data:[],error:null})
  })
 })
})};`;
async function mockMember(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:sessionScript
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
  return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({items:[]})});
 });
}

test('Home Screen member remains authenticated with a working local session despite getUser failure',async({page})=>{
 await mockMember(page);
 await page.goto('discover.html');
 await expect(page.locator('#account-status')).toContainText('Signed in',{timeout:18000});
 await expect(page.locator('header a.logo')).toHaveAttribute('href','discover.html');
 await expect(page.locator('details.account-menu > summary')).toHaveClass(/member-avatar/);
 await expect(page.locator('html')).toHaveClass(/afterlogue-auth-ready/);
 expect(page.url()).toMatch(/discover\.html$/);
 expect(page.url()).not.toMatch(/signup\.html/);
});

test('Member avatar stays member-branded during Explore navigation and reloading',async({page})=>{
 await mockMember(page);
 await page.goto('discover.html');
 await expect(page.locator('details.account-menu > summary')).toHaveClass(/member-avatar/);
 await page.goto('explore.html');
 // Before async session resolution, the generic "signed out" outline
 // must be hidden so the header cannot visibly flash a guest icon.
 await expect(page.locator('html')).not.toHaveClass(/afterlogue-auth-ready/);
 const glyph=await page.locator('details.account-menu > summary svg').evaluate(
  el=>getComputedStyle(el).visibility
 );
 expect(glyph).toBe('hidden');
 await expect(page.locator('details.account-menu > summary')).toHaveClass(/member-avatar/);
 await expect(page.locator('header a.logo')).toHaveAttribute('href','discover.html');
 expect(page.url()).toMatch(/explore\.html$/);
});

test('Temporary session check error does not bounce Home into account creation',async({page})=>{
 const broken=String.raw`window.supabase={createClient:()=>({
  auth:{
   getSession:async()=>({data:{session:null},error:{message:'Storage temporarily unavailable'}}),
   getUser:async()=>({data:{user:null},error:{message:'Offline'}}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
  }
 })};`;
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:broken
 }));
 await page.goto('discover.html');
 await expect(page.locator('#impression-count')).toContainText("couldn't check your session");
 expect(page.url()).toMatch(/discover\.html$/);
});
