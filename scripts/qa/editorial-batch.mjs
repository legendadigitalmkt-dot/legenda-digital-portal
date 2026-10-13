// Read-only production check: no consent, sign-in, form submission or database writes.
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const origin=process.argv[2]||'https://legendadigital.com.br';
if(!['https://legendadigital.com.br','https://www.legendadigital.com.br'].includes(origin))throw Error('Portal origin required');
const stage=process.argv[3]||'after';
if(!['before','after'].includes(stage))throw Error('Choose before or after');
const output=resolve(process.env.QA_OUTPUT||'artifacts/editorial-stabilization/'+stage);
await mkdir(output,{recursive:true});
const manifest=JSON.parse(await readFile('content/editorial/batch1-manifest.json','utf8'));
const proxyURL=process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.PORTAL_TEST_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],...(proxyURL?{proxy:{server:proxyURL.protocol+'//'+proxyURL.host,username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}}:{})});
const widths=stage==='before'?[[1440,900],[390,844]]:[[1366,768],[1440,900],[1920,1080],[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180]];
const results=[];
try{
 for(const [width,height] of widths){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',ignoreHTTPSErrors:true});
  await context.addInitScript(()=>localStorage.setItem('ld-analytics-consent','no'));
  const page=await context.newPage();
  for(const [i,item] of manifest.articles.entries()){
   const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
   const response=await page.goto(origin+'/artigos/'+item.post.slug,{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('.article-body').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>[...document.querySelectorAll('.article-hero img')].every(i=>i.complete&&i.naturalWidth),{},{timeout:20000});
   const metrics=await page.evaluate(()=>{
    const body=document.querySelector('.article-body'),column=document.querySelector('.article-main-column'),side=document.querySelector('.article-aside');
    const b=column.getBoundingClientRect(),s=side.getBoundingClientRect();
    const schemas=JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    return {url:location.pathname,title:document.querySelector('h1').textContent,canonical:document.querySelector('link[rel="canonical"]').href,category:document.querySelector('.article-head .category').textContent,font:getComputedStyle(body).fontSize,bodyWidth:b.width,centerDelta:Math.abs(b.x+b.width/2-innerWidth/2),overflow:document.documentElement.scrollWidth>innerWidth,heroFit:getComputedStyle(document.querySelector('.article-hero img')).objectFit,heroWidth:document.querySelector('.article-hero img').naturalWidth,sidebarWidth:s.width,sidebarRight:s.x>=b.right,inlineCTA:getComputedStyle(document.querySelector('.article-main-column .promo-mobile')).display,cta:document.querySelector('.sidebar-promo a').href,schemaTypes:schemas.map(s=>s['@type']),articleSchema:schemas.find(s=>s['@type']==='Article'),headings:body.querySelectorAll('h2,h3').length,tables:body.querySelectorAll('table').length,commentsWidth:document.querySelector('.article-comments')?.getBoundingClientRect().width};
   });
   const result={slug:item.post.slug,width,height,status:response.status(),errors,...metrics};results.push(result);
   const schema=metrics.articleSchema;
   if(result.status!==200||errors.length||metrics.title!==item.post.title||metrics.category!==item.post.category||metrics.canonical!==origin.replace('www.','')+'/conteudos/'+item.post.slug||metrics.overflow||metrics.heroFit!=='contain'||metrics.centerDelta>1||!metrics.schemaTypes.includes('BreadcrumbList')||schema.headline!==item.post.title||!schema.datePublished||!schema.dateModified||!schema.author?.name||metrics.headings!==item.integrity.headings||metrics.tables!==item.integrity.tables)throw Error('Editorial smoke failed: '+JSON.stringify(result));
   if(stage==='after'&&(metrics.font!=='18px'||metrics.cta!=='https://app.legendadigital.com.br/'||width>=1366&&(!metrics.sidebarRight||metrics.sidebarWidth<260||metrics.sidebarWidth>320)||width<1366&&metrics.inlineCTA==='none'))throw Error('New article layout failed: '+JSON.stringify(result));
   if(i===0&&[1440,390].includes(width)){
    await page.screenshot({path:output+'/article-'+width+'.jpg',type:'jpeg',quality:75});
    await page.locator('.article-layout').scrollIntoViewIfNeeded();
    await page.screenshot({path:output+'/article-reading-'+width+'.jpg',type:'jpeg',quality:75});
   }
   page.off('pageerror',onError);
  }
  await context.close();
 }
 await writeFile(output+'/metrics.json',JSON.stringify({origin,stage,checked_at:new Date().toISOString(),read_only:true,results},null,2)+'\n');
 console.log(JSON.stringify({origin,stage,samples:results.length,errors:results.flatMap(r=>r.errors).length,output}));
}finally{await browser.close()}
