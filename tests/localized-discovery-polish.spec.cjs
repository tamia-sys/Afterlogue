const {test,expect}=require('@playwright/test');

test('Landing tagline retains the exact logo color and two editorial lines',async({page})=>{
 await page.goto('index.html');
 const title=page.locator('#welcome-title');
 await expect(title.locator('span')).toHaveCount(2);
 await expect(title.locator('span').nth(0)).toHaveText('A film ends.');
 await expect(title.locator('span').nth(1)).toHaveText('The conversation doesn’t.');
 const result=await page.evaluate(()=>{
  const logo=document.querySelector('.welcome-header .brand');
  const heading=document.querySelector('#welcome-title');
  const spans=[...heading.children];
  const footer=document.querySelector('footer');
  return{
   logo:getComputedStyle(logo).color,headline:getComputedStyle(heading).color,
   y:[...spans].map(s=>Math.round(s.getBoundingClientRect().top)),
   border:getComputedStyle(footer).borderTopWidth
  };
 });
 expect(result.headline).toBe(result.logo);
 expect(result.y[1]).toBeGreaterThan(result.y[0]);
 expect(result.border).toBe('1px');
});

test('Korean and Spanish Explore copy is localized instead of staying English',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null})}})};'
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>{
   const input=JSON.parse(route.request().postData()||'{}');
   const items=input.mode==='mood'?[101,102,103,104,105].map(id=>({
     id,media:'movie',title:'Example '+id,year:2024,
     poster:'https://image.tmdb.org/t/p/w500/test.jpg',
     moodReason:'A verified thematic match to your mood.',matchedFilters:[]
   })):[];
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items,hasMore:false})});
 });
 await page.goto('explore.html?guest=1');
 await page.locator('.afterlogue-language-select').selectOption('ko');
 await expect(page.locator('#explore-title')).toHaveText('어떤 기분에도 어울리는 이야기가 있어요.');
 await expect(page.locator('.mood-card[data-mood="yearning"] .mood-title')).toHaveText('그리운 마음에 어울리는 이야기.');
 await page.locator('.mood-card[data-mood="yearning"] .mood-open').click();
 await expect(page.locator('#explore-question')).toHaveText('어떤 작품을 보고 싶으세요?');
 await page.locator('.choice[data-value="movies"]').click();
 await page.locator('#explore-next').click();
 await page.locator('.choice[data-value="medium"]').click();
 await page.locator('#explore-next').click();
 await expect(page.locator('#explore-picks .explore-pick')).toHaveCount(5,{timeout:30000});
 await expect(page.locator('#explore-picks .explore-mood-why strong').first()).toHaveText('지금 기분에 어울리는 이유');
 await expect(page.locator('#explore-picks .explore-mood-explanation').first()).toHaveText('말로 표현하기 어려운 감정을 담은 이야기.');
 await page.locator('.afterlogue-language-select').selectOption('es');
 await expect(page.locator('#explore-picks .explore-mood-why strong').first()).toHaveText('PARA TU ESTADO DE ÁNIMO');
 await expect(page.locator('#explore-picks .explore-mood-explanation').first()).toHaveText('Historias sobre emociones difíciles de nombrar.');
 await page.locator('.afterlogue-language-select').selectOption('en');
 await expect(page.locator('#explore-picks .explore-mood-explanation').first()).toHaveText('A verified thematic match to your mood.');
});
test('First Impressions uses a compact corner tick and one readable completion action',async({page})=>{
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',
  body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null})}})};'
 }));
 await page.route('**/functions/v1/afterlogue-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({items:[]})
 }));
 await page.goto('log.html?guest=1');
 const first=page.locator('#films .log-poster-placeholder').first();
 await first.click();
 await first.locator('[data-rating="Loved"]').click();
 await expect(first).toHaveClass(/is-rated/);
 await expect(first.locator('.rating-check')).toHaveCSS('width','26px');
 await expect(first.locator('.rating-check')).toHaveCSS('border-radius','50%');
 await page.locator('#impressions-step-next').click();
 await expect(page.locator('#impressions-step-next')).toHaveText('See my five picks');
});
