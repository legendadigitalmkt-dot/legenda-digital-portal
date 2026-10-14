// Read-only public smoke. No credentials, submitted forms or consented analytics.
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const output = resolve(process.env.QA_OUTPUT || 'artifacts/product-boundaries');
await mkdir(output, {recursive:true});
const proxyURL = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({headless:true, executablePath:process.env.PORTAL_TEST_CHROMIUM_PATH,
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],
  ...(proxyURL ? {proxy:{server:proxyURL.protocol+'//'+proxyURL.host, username:decodeURIComponent(proxyURL.username), password:decodeURIComponent(proxyURL.password)}} : {})});
const products = [
  {name:'portal', origin:'https://legendadigital.com.br', blocked:['app.legendadigital.com.br','cknlzuinwcdupdxilzcf.supabase.co'],
    paths:['/','/conteudos','/conteudos/o-novo-funil-de-vendas-na-era-da-ia','/newsletter','/ferramentas','/community','/building','/conta','/admin','/produtos/growth-os']},
  {name:'growth-os', origin:'https://app.legendadigital.com.br', blocked:['legendadigital.com.br','www.legendadigital.com.br','yltnjgngkomelfltdyky.supabase.co'],
    paths:['/','/login','/forgot-password','/app','/control-center']},
];
const results=[];
try {
  for (const product of products) for (const [width,height] of [[390,844],[1440,900]]) {
    const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce',ignoreHTTPSErrors:true});
    await context.addInitScript(() => localStorage.setItem('ld-analytics-consent','no'));
    const blocked=[];
    await context.route('**/*', async route => {
      const url=new URL(route.request().url());
      if (product.blocked.includes(url.hostname)) {blocked.push({host:url.hostname,path:url.pathname});await route.abort('blockedbyclient');}
      else await route.continue();
    });
    const page=await context.newPage();
    for (const path of product.paths) {
      const errors=[];
      const onError=e=>errors.push(e.name+': '+e.message.slice(0,200));
      page.on('pageerror',onError);
      const start=blocked.length;
      const response=await page.goto(product.origin+path,{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('h1').first().waitFor({timeout:20000});
      await page.evaluate(()=>document.fonts.ready);
      const state=await page.evaluate(()=>({path:location.pathname,title:document.querySelector('h1')?.textContent,
        overflow:document.documentElement.scrollWidth>innerWidth,
        visible:document.body.innerText.trim().length>100,
        forms:Array.from(document.forms).map(f=>({method:f.method,actionPath:new URL(f.action).pathname}))}));
      const result={product:product.name,requested_path:path,width,height,status:response.status(),...state,errors,blocked_requests:blocked.slice(start)};
      results.push(result);
      if(result.status!==200||!result.visible||result.overflow||errors.length)throw Error('Public independence smoke failed: '+JSON.stringify(result));
      if(path==='/'&&width===1440)await page.screenshot({path:output+'/'+product.name+'-1440.jpg',type:'jpeg',quality:70});
      page.off('pageerror',onError);
    }
    await context.close();
  }
} finally {
  await writeFile(output+'/public-smoke.json',JSON.stringify({checked_at:new Date().toISOString(),read_only:true,
    counterpart_hosts_blocked:true,authenticated_flows_verified:false,results},null,2)+'\n');
  await browser.close();
}
console.log(JSON.stringify({samples:results.length,passed:true,output,authenticated_flows_verified:false}));
