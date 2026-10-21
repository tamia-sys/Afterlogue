const {test,expect}=require('@playwright/test');

// No real accounts, emails, or external film API credentials in these tests.
const fakeSupabase = String.raw`
window.supabase={createClient:()=>({
  auth:{
    getSession:async()=>({data:{session:null},error:null}),
    getUser:async()=>({data:{user:null},error:null}),
    signOut:async()=>({error:null})
  },
  from:()=>({
    select:()=>({
      eq:()=>({
        maybeSingle:async()=>({data:null,error:null}),
        then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)
      })
    })
  })
})};
`;

async function mockCatalog(page){
 await page.route('**/npm/@supabase/supabase-js@2',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:fakeSupabase
 }));
 const requests=[];
 await page.route('**/functions/v1/afterlogue-catalog',async route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  requests.push(body);
  const type=body.media==='tv'?'tv':'movie';
  const item=type==='movie'
    ?{media:'movie',id:111,title:'The Search Film',year:2021,poster:'https://image.tmdb.org/t/p/w500/film.jpg'}
    :{media:'tv',id:222,title:'The Search Show',year:2022,poster:'https://image.tmdb.org/t/p/w500/show.jpg'};
  const data=body.mode==='onboarding'
    ?{items:[]}
    :body.mode==='search'||body.mode==='discover'
      ?{items:body.page===2&&type==='tv'?[]:[item],
         hasMore:body.genre==='Drama'?type==='movie'&&body.page===1:false,
         nextCursor:body.genre==='Drama'&&type==='movie'&&body.page===1?'2:0':null}
      :{items:[]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 return requests;
}

test('First Impressions has an account menu and a working combined search',async({page})=>{
 const requests=await mockCatalog(page);
 await page.goto('log.html?guest=1');
 await expect(page.locator('header details.account-menu > summary')).toBeVisible();
 await page.locator('header details.account-menu > summary').click();
 await expect(page.locator('#account-signin')).toBeVisible();
 await expect(page.locator('#impressions-skip')).toBeVisible();
 await expect(page.locator('#impressions-type')).toHaveValue('all');
 await page.locator('#impressions-search').fill('the search');
 await expect(page.locator('#impressions-search-grid .impressions-more-card')).toHaveCount(2);
 expect(requests.filter(x=>x.mode==='search').map(x=>x.media).sort()).toEqual(['movie','tv']);
 await expect(page.locator('#impressions-search-grid')).toContainText('The Search Film');
 await expect(page.locator('#impressions-search-grid')).toContainText('The Search Show');
 await page.locator('#impressions-type').selectOption('tv');
 await expect(page.locator('#impressions-search-grid .impressions-more-card')).toHaveCount(1);
 await expect(page.locator('#impressions-search-grid')).toContainText('TV show');
});

test('Account icon remains visible on a narrow onboarding screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mockCatalog(page);
 await page.goto('log.html?guest=1');
 await expect(page.locator('header details.account-menu > summary')).toBeVisible();
 await page.locator('header details.account-menu > summary').click();
 await expect(page.locator('#account-signin')).toBeVisible();
});

test('All Films & TV combined search requests both types and keeps type-specific links',async({page})=>{
 const requests=await mockCatalog(page);
 await page.goto('explore.html?guest=1');
 await page.locator('#catalog-open').click();
 await expect(page.locator('#catalog-media')).toHaveValue('all');
 await page.locator('#catalog-search').fill('the search');
 await expect(page.locator('#catalog-grid .catalog-tile')).toHaveCount(2,{timeout:30000});
 const searchRequests=requests.filter(x=>x.mode==='search');
 expect(searchRequests.map(x=>x.media).sort()).toEqual(['movie','tv']);
 await expect(page.locator('#catalog-grid')).toContainText('The Search Film');
 await expect(page.locator('#catalog-grid')).toContainText('The Search Show');
 await expect(page.locator('#catalog-grid .catalog-tile[href*="type=movie"]')).toHaveCount(1);
 await expect(page.locator('#catalog-grid .catalog-tile[href*="type=tv"]')).toHaveCount(1);
 await page.locator('#catalog-media').selectOption('tv');
 await expect(page.locator('#catalog-grid .catalog-tile')).toHaveCount(1);
 await expect(page.locator('#catalog-grid')).toContainText('The Search Show');
});

test('Combined filtered catalog pagination does not repeat exhausted TV results',async({page})=>{
 const requests=await mockCatalog(page);
 await page.goto('explore.html?guest=1');
 await page.locator('#catalog-open').click();
 await page.locator('#catalog-search').fill('the search');
 await page.locator('#catalog-genre').selectOption('Drama');
 await expect(page.locator('#catalog-grid .catalog-tile')).toHaveCount(2,{timeout:30000});
 await expect(page.locator('#catalog-next')).toBeEnabled();
 await page.locator('#catalog-next').click();
 await expect(page.locator('#catalog-grid .catalog-tile')).toHaveCount(1,{timeout:30000});
 await expect(page.locator('#catalog-grid')).toContainText('The Search Film');
 const paged=requests.filter(x=>x.page===2&&x.mode==='search');
 expect(paged.map(x=>x.media)).toEqual(['movie']);
 expect(paged[0].cursor).toBe('2:0');
});
