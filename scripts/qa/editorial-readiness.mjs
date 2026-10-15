// Production read-only audit: GET/HEAD and safe CORS preflight only; no writes.
import {chromium} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {PORTAL_ORIGIN, editorialAuditScope, editorialMetadata, assessEditorialPage} from './editorial-readiness-rules.mjs';

const backend = 'https://yltnjgngkomelfltdyky.supabase.co';
const env = loadEnv('production', process.cwd(), 'VITE_');
if (env.VITE_SUPABASE_URL !== backend || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY || '')) throw Error('Portal publishable configuration required');
const output = resolve(process.env.QA_OUTPUT || 'artifacts/editorial-readiness');
await mkdir(output, {recursive:true});
const url = new URL('/rest/v1/content_posts', backend);
url.searchParams.set('select', 'id,title,slug,kind,status,published_at,updated_at,excerpt,body,author,subtitle,hero_image_alt,hero_image_credit,hero_image_caption,seo_title,seo_description,og_image,references,show_comments,show_share');
url.searchParams.set('status','eq.published');
url.searchParams.set('published_at','lte.'+new Date().toISOString());
url.searchParams.set('order','slug.asc');
url.searchParams.set('limit','1000');
const response = await fetch(url, {headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Prefer:'count=exact'},signal:AbortSignal.timeout(20000)});
if (!response.ok) throw Error('Public editorial catalog unavailable (HTTP '+response.status+')');
const total = Number(response.headers.get('content-range')?.split('/')[1]);
const catalog = await response.json();
if (!Array.isArray(catalog) || !catalog.length || !Number.isSafeInteger(total) || catalog.length !== total) throw Error('Incomplete public editorial catalog');
const {posts,viewports,full_scope}=editorialAuditScope(catalog,process.argv.slice(2));
const metadata = catalog.map(editorialMetadata);
const bodies = catalog.map(p=>({slug:p.slug,sha256:createHash('sha256').update(p.body).digest('hex')}));
const proxyURL = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({headless:true, executablePath:process.env.PORTAL_TEST_CHROMIUM_PATH,
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],
  ...(proxyURL ? {proxy:{server:proxyURL.protocol+'//'+proxyURL.host,username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}} : {})});
const results=[], blockedWrites=[];
let executionError;
try {
  async function auditViewport([width,height]) {
    const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce',ignoreHTTPSErrors:true});
    await context.addInitScript(()=>localStorage.setItem('ld-analytics-consent','no'));
    await context.route('**/*', async route=>{
      const request=route.request(), u=new URL(request.url());
      if (!['GET','HEAD','OPTIONS'].includes(request.method())) {
        blockedWrites.push({method:request.method(),host:u.hostname,path:u.pathname});
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    const page = await context.newPage();
    for (const [index, post] of posts.entries()) {
      console.log(JSON.stringify({checking:post.slug,viewport:width}));
      const jsErrors=[];
      const onError=e=>jsErrors.push(e.name+': '+e.message.slice(0,200));
      page.on('pageerror',onError);
      const result=await page.goto(PORTAL_ORIGIN+'/conteudos/'+post.slug,{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('.article-body').waitFor();
      // Finish the catalog-driven React update before visiting image locators:
      // that update replaces the article DOM and adds the related cards.
      const relatedStart=Date.now();
      await page.locator('.article-related').waitFor({state:'visible',timeout:60000}).catch(()=>{});
      const relatedWaitMs=Date.now()-relatedStart;
      await page.evaluate(()=>document.fonts.ready);
      // Visit each lazy image before assessing it; jumping straight to the footer
      // does not cause images above the viewport to load in a real browser.
      const imageSources=await page.evaluate(()=>[...new Set([...document.querySelectorAll('.article-body img,.article-hero img')]
        .filter(i=>!i.closest('details:not([open])')&&i.getClientRects().length&&(!i.checkVisibility||i.checkVisibility()))
        .map(i=>i.currentSrc||i.src))]);
      for(const source of imageSources) {
        // Resolve from the current document on every operation: React may
        // replace nodes while public data arrives, but the image URL is stable.
        await page.evaluate(src=>[...document.querySelectorAll('.article-body img,.article-hero img')]
          .find(i=>i.currentSrc===src||i.src===src)?.scrollIntoView({block:'center'}),source);
        await page.waitForFunction(src=>[...document.querySelectorAll('.article-body img,.article-hero img')]
          .find(i=>i.currentSrc===src||i.src===src)?.complete,source,{timeout:20000});
      }
      await page.evaluate(()=>document.querySelector('.article-author-section')?.scrollIntoView({block:'center'}));
      if(post.show_comments!==false)await page.locator('.article-comments').waitFor({timeout:15000});
      const metrics=await page.evaluate(()=>{
        const body=document.querySelector('.article-body'), main=document.querySelector('.article-main-column'), side=document.querySelector('.article-aside');
        const b=main.getBoundingClientRect(),s=side.getBoundingClientRect();
        const headings=[...body.querySelectorAll('h2,h3')];
        const schemas=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>{try{const x=JSON.parse(el.textContent);return Array.isArray(x)?x:[x]}catch{return []}});
        const hero=document.querySelector('.article-hero img');
        const links=[...body.querySelectorAll('a[href]')];
        const toc=[...document.querySelectorAll('.article-toc a')];
        const related=[...document.querySelectorAll('.article-related a[href^="/conteudos/"]')];
        return {path:location.pathname,title:document.querySelector('h1')?.textContent,h1Count:document.querySelectorAll('h1').length,
          canonical:document.querySelector('link[rel="canonical"]')?.href,ogUrl:document.querySelector('meta[property="og:url"]')?.content,
          description:document.querySelector('meta[name="description"]')?.content,subtitle:document.querySelector('.article-head>p')?.textContent,
          author:document.querySelector('.article-meta b')?.textContent,publication:document.querySelector('.article-meta')?.textContent,
          breadcrumb:!!document.querySelector('.breadcrumbs'),category:document.querySelector('.article-head .category')?.textContent,
          bodyText:body.textContent.trim().length,font:getComputedStyle(body).fontSize,bodyWidth:b.width,centerDelta:Math.abs(b.x+b.width/2-innerWidth/2),
          overflow:document.documentElement.scrollWidth>innerWidth,sidebarWidth:s.width,sidebarRight:s.x>=b.right,
          headings:headings.length,headingIds:headings.length,uniqueHeadingIds:new Set(headings.map(h=>h.id).filter(Boolean)).size,
          tocLinks:toc.length,missingTocTargets:toc.filter(a=>!document.getElementById(a.getAttribute('href').slice(1))).length,
          heroLoaded:!!hero?.naturalWidth,heroAlt:hero?.alt,heroFit:hero?getComputedStyle(hero).objectFit:null,
          failedBodyImages:[...body.querySelectorAll('img')].filter(i=>!i.closest('details:not([open])')&&i.getClientRects().length&&(!i.checkVisibility||i.checkVisibility())&&i.complete&&!i.naturalWidth).map(i=>new URL(i.src).pathname),
          relatedCount:new Set(related.map(a=>a.getAttribute('href'))).size,relatedSelfLink:related.some(a=>new URL(a.href).pathname===location.pathname),
          shareControls:!!document.querySelector('.article-share button'),commentsPresent:!!document.querySelector('.article-comments'),
          public_update_warning:document.querySelector('.update-warning')?.textContent||null,
          comment_load_warning:document.querySelector('.comment-message')?.textContent||null,
          unsafeLinks:links.filter(a=>!['http:','https:'].includes(new URL(a.href).protocol)).length,
          schemaTypes:schemas.map(s=>s['@type']),articleSchema:schemas.find(s=>s['@type']==='Article')};
      });
      const sample={slug:post.slug,width,height,status:result.status(),related_wait_ms:relatedWaitMs,...metrics,jsErrors};
      sample.issues=assessEditorialPage(post,sample,width);
      results.push(sample);
      if(sample.issues.length)console.log(JSON.stringify({slug:post.slug,viewport:width,issues:sample.issues}));
      if(index===0&&[390,1440].includes(width)) {
        await page.evaluate(()=>document.querySelector('.article-layout')?.scrollIntoView({block:'start'}));
        await page.screenshot({path:output+'/article-'+width+'.jpg',type:'jpeg',quality:70});
      }
      page.off('pageerror',onError);
    }
    console.log(JSON.stringify({viewport:width,articles:posts.length,checked:results.filter(r=>r.width===width).length,issues:results.filter(r=>r.width===width&&r.issues.length).length}));
    await context.close();
  }
  const pending=[...viewports];
  const workers=await Promise.allSettled([0,1].map(async()=>{
    while(pending.length)await auditViewport(pending.shift());
  }));
  const failure=workers.find(r=>r.status==='rejected');
  if(failure)throw failure.reason;
} catch (error) {
  executionError=error;
} finally {
  results.sort((a,b)=>a.width-b.width||a.slug.localeCompare(b.slug));
  const report={checked_at:new Date().toISOString(),read_only:true,scope:'public_editorial_existing_features',origin:PORTAL_ORIGIN,
    published_articles:catalog.length,audited_articles:posts.length,viewports,full_scope,expected_samples:posts.length*viewports.length,samples:results.length,
    technical_pass:!executionError&&results.length===posts.length*viewports.length&&results.every(r=>!r.issues.length)&&!blockedWrites.length,
    metadata_review_required:metadata.some(m=>m.warnings.length),new_reader_signup_verified:false,authenticated_session_verified_by_agent:false,
    blocked_writes:blockedWrites,metadata,bodies,
    ...(executionError?{execution_error:executionError.message.slice(0,300)}:{}),results};
  report.full_editorial_matrix_pass=report.technical_pass&&full_scope;
  await writeFile(output+'/public-editorial.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({articles:posts.length,samples:results.length,technical_pass:report.technical_pass,metadata_review_required:report.metadata_review_required,blocked_writes:blockedWrites.length,output}));
  if(!report.technical_pass)process.exitCode=1;
  await browser.close();
}
