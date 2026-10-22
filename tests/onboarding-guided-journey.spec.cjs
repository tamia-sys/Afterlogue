const {test,expect}=require('@playwright/test');

const fakeAuth=String.raw`
window.supabase={createClient:()=>({
 auth:{
  getUser:async()=>({data:{user:null},error:null}),
  getSession:async()=>({data:{session:null},error:null})
 },
 from:()=>({
  select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})
 })
})};
`;
async function setup(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeAuth
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({items:[],hasMore:false})
 }));
}
test('Landing presents the tagline and a single clear first action',async({page})=>{
 await page.goto('index.html');
 await expect(page.locator('#welcome-title')).toHaveText('Welcome to afterlogue.');
 await expect(page.locator('.welcome-tagline')).toHaveText("A film ends. The conversation doesn't.");
 await expect(page.locator('.welcome-start .welcome-create')).toHaveText('Get started →');
 await expect(page.locator('.welcome-start .welcome-create')).toHaveAttribute('href','log.html?guest=1');
 await expect(page.locator('.welcome-reassurance')).toContainText('No account needed');
 await expect(page.locator('.welcome-start .welcome-guest')).toHaveAttribute('href','signup.html?mode=signup');
});
test('First Impressions shows one step at a time and clear instructions',async({page})=>{
 await setup(page);
 await page.goto('log.html?guest=1');
 await expect(page.locator('#films')).toBeVisible();
 await expect(page.locator('#television')).toBeHidden();
 await expect(page.locator('.impressions-more')).toBeHidden();
 await expect(page.locator('.impressions-optional-filters')).not.toHaveAttribute('open');
 await expect(page.locator('.impressions-optional-filters summary')).toBeVisible();
 await expect(page.locator('.log-continue-section')).toBeHidden();
 await expect(page.locator('#impressions-current-step')).toHaveText('STEP 1 OF 2 / FILMS');
 await expect(page.locator('#impressions-step-next')).toHaveText('Continue to TV Shows →');
 await expect(page.locator('#impressions-rating-count')).toContainText('You can continue');
 await page.locator('#impressions-step-next').click();
 await expect(page.locator('#films')).toBeHidden();
 await expect(page.locator('#television')).toBeVisible();
 await expect(page.locator('.log-continue-section')).toBeVisible();
 await expect(page.locator('#impressions-current-step')).toHaveText('STEP 2 OF 2 / TV SHOWS');
 await expect(page.locator('#impressions-step-next')).toHaveText('See my five picks →');
 await page.locator('#impressions-step-back').click();
 await expect(page.locator('#films')).toBeVisible();
});
test('Selecting a familiar poster gives immediate progress feedback',async({page})=>{
 await setup(page);
 await page.goto('log.html?guest=1');
 const poster=page.locator('#films .log-poster-placeholder').first();
 await poster.click();
 await poster.locator('button[data-rating="Loved"]').click();
 await expect(page.locator('#impressions-rating-count')).toContainText('1 film impression selected');
 await expect(poster).toHaveClass(/is-rated/);
 await page.locator('#impressions-step-next').click();
 await expect(page.locator('#television')).toBeVisible();
 await expect(page.locator('#impressions-rating-count')).toContainText('No TV show rated yet');
});
test('Guest can finish without choosing a rating and sees initial recommendations',async({page})=>{
 await setup(page);
 await page.goto('log.html?guest=1');
 await page.locator('#impressions-step-next').click();
 await page.locator('#impressions-step-next').click();
 await expect(page).toHaveURL(/\/discover\.html\?guest=1/,{timeout:20000});
});
test('Korean flow keeps its choice and stage labels after moving forward',async({page})=>{
 await setup(page);
 await page.goto('index.html');
 await page.locator('.afterlogue-language-select').selectOption('ko');
 await page.locator('.welcome-start .welcome-create').click();
 await expect(page.locator('#impressions-current-step')).toHaveText('1 / 2단계 · 영화');
 await page.locator('#impressions-step-next').click();
 await expect(page.locator('#impressions-current-step')).toHaveText('2 / 2단계 · TV 시리즈');
 await expect(page.locator('#impressions-step-next')).toHaveText('추천 다섯 작품 보기 →');
 await expect(page.locator('#impressions-rating-count')).toContainText('아직 평가한 TV 시리즈가 없어요');
});
test('On a phone the step action stays visible and works',async({page})=>{
 await setup(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('log.html?guest=1');
 await expect(page.locator('#impressions-step-next')).toBeVisible();
 await page.locator('#impressions-step-next').click();
 await expect(page.locator('#television')).toBeVisible();
});
