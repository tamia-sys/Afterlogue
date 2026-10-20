const {test,expect}=require('@playwright/test');

// Use a local stub for Supabase here. Never create real users or send
// confirmation emails in browser tests: built-in SMTP limits are shared.
const fakeSupabase = `
window.__afterlogueFakeAuth={
  session: new URLSearchParams(location.search).has('verified_test')
    ? {user:{id:'qa-id'}} : null,
  profileCompleted:false,
  signupError:null,
  signupSession:null,
  signInError:null,
};
window.supabase={
  createClient:()=>({
    auth:{
      getSession:async()=>({data:{session:window.__afterlogueFakeAuth.session},error:null}),
      getUser:async()=>({data:{user:window.__afterlogueFakeAuth.session?.user||null},error:null}),
      signUp:async()=>window.__afterlogueFakeAuth.signupError
        ? {data:null,error:window.__afterlogueFakeAuth.signupError}
        : {data:{user:{id:'qa-id'},session:window.__afterlogueFakeAuth.signupSession},error:null},
      signInWithPassword:async()=>window.__afterlogueFakeAuth.signInError
        ? {data:null,error:window.__afterlogueFakeAuth.signInError}
        : {data:{user:{id:'qa-id'}},error:null},
    },
    from:()=>({
      select:()=>({
        eq:()=>({
          maybeSingle:async()=>({data:{onboarding_completed:window.__afterlogueFakeAuth.profileCompleted},error:null})
        })
      })
    })
  })
};
`;
async function start(page,query=''){
  await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
    status:200,contentType:'application/javascript',body:fakeSupabase
  }));
  await page.goto('signup.html'+query);
  // A verified returning session redirects automatically; the form may
  // disappear before Playwright could ever expect it to be visible.
  if(!query.includes('verified_test')) {
    await expect(page.locator('.signup-submit')).toBeVisible();
  }
}
async function fill(page){
  await page.locator('#signup-email').fill('qa-tester@example.invalid');
  await page.locator('#signup-password').fill('A-long-password-123');
}
test('Account page logo returns to the welcome landing page',async({page})=>{
  await start(page,'?mode=signin');
  await expect(page.locator('.site-header .logo')).toHaveAttribute('href','index.html');
  await page.locator('.site-header .logo').click();
  await expect(page).toHaveURL(/\/index\.html$/);
});
test('New account with an active session immediately enters First Impressions',async({page})=>{
  await start(page);
  await page.evaluate(()=>window.__afterlogueFakeAuth.signupSession={user:{id:'qa-id'}});
  await fill(page);
  await page.locator('.signup-submit').click();
  await expect(page).toHaveURL(/\/log\.html$/,{timeout:20000});
});
test('Email-confirmation required: say what to do without forcing another sign-in',async({page})=>{
  await start(page);
  await fill(page);
  await page.locator('.signup-submit').click();
  await expect(page.locator('#signup-message')).toContainText('Your Afterlogue account needs email confirmation');
  await expect(page.locator('#signup-message')).toContainText('confirmation link');
  await expect(page.locator('#signup-message')).toContainText('no second sign-in required');
  await expect(page).toHaveURL(/\/signup\.html$/);
});
test('After a valid session returns from verification, continue First Impressions automatically',async({page})=>{
  // Simulated confirmed Supabase session, not a real verification email.
  await start(page,'?verified_test=1');
  await expect(page).toHaveURL(/\/log\.html$/,{timeout:20000});
});
test('Rate-limited email signup shows useful message without automatic retries',async({page})=>{
  await start(page);
  await page.evaluate(()=>window.__afterlogueFakeAuth.signupError={
    status:429,code:'over_email_send_rate_limit',message:'Too many requests'
  });
  await fill(page);
  await page.locator('.signup-submit').click();
  await expect(page.locator('#signup-message')).toContainText('email limit was reached');
  await expect(page.locator('.signup-submit')).toBeEnabled();
  await expect(page).toHaveURL(/\/signup\.html$/);
});
test('Completed member signing in goes to Discover instead of repeating onboarding',async({page})=>{
  await start(page,'?mode=signin');
  await page.evaluate(()=>window.__afterlogueFakeAuth.profileCompleted=true);
  await fill(page);
  await page.locator('.signup-submit').click();
  await expect(page).toHaveURL(/\/discover\.html$/,{timeout:20000});
});
