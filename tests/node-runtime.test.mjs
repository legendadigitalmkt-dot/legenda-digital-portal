import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,symlink,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import runtime from '../dist/portal-runtime.cjs';
const {createPortalHandler,renderArticle,cleanBody,BACKEND} = runtime;
const root = resolve('dist');
const routes = JSON.parse(await readFile('dist/portal-runtime.json','utf8')).routes;
const config = {url:BACKEND,key:'sb_publishable_fixture',routes};
const instant = Date.parse('2026-10-12T00:00:00Z');
const post = {id:1,title:'Inteligência prática <script>meta</script>',slug:'artigo-do-cms',body:'<h2>Aplicação</h2><p>Texto português: ação e direção.</p>',excerpt:'Um artigo publicado no CMS.',category:'IA',author:'Legenda Digital',kind:'article',status:'published',tags:['IA'],featured_image:'/images/hero.webp',published_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-10T12:00:00Z',reading_time:4,seo_title:'SEO do CMS',seo_description:'Descrição <teste>'};

async function serve(t, fetchImpl = async () => Response.json([post])) {
  const handler = await createPortalHandler({root,config,renderArticle,fetchImpl,now:() => instant});
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => {server.close(resolve);server.closeAllConnections();}));
  return 'http://127.0.0.1:' + server.address().port;
}

test('Node build has standalone entry, routes and no PHP artifacts',async () => {
  assert.equal(routes.length,31);
  for (const name of ['index.php','sitemap.php','site-runtime.php','.htaccess']) await assert.rejects(readFile('dist/' + name));
  assert.match(await readFile('dist/portal-runtime.cjs','utf8'),/createPortalHandler/);
});

test('Backend selection and privileged keys fail before serving anything',async () => {
  for (const candidate of [{...config,url:'https://cknlzuinwcdupdxilzcf.supabase.co'},{...config,key:'sb_secret_synthetic'},{...config,key:''}]) {
    await assert.rejects(createPortalHandler({root,config:candidate,renderArticle}),/publishable/);
  }
});

test('Home, contacts, admin and assets load with guards without backend requests',async t => {
  const origin = await serve(t,async () => {throw new Error('Unexpected API call');});
  for (const path of ['/','/contato','/admin','/admin/conteudos','/favicon.ico','/favicon-16x16.png','/favicon-32x32.png','/favicon-48x48.png','/apple-touch-icon.png','/images/legenda-digital-logo.png','/images/legenda-digital-logo-footer.svg','/fonts/InterVariable.woff2']) {
    const response = await fetch(origin + path);
    assert.equal(response.status,200,path);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    if (path.startsWith('/admin')) {
      assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
      assert.match(await response.text(),/acesso restrito/);
    } else await response.arrayBuffer();
  }
});

test('CMS articles render live SEO and full React layout without forwarding user sessions',async t => {
  let observed;
  const origin = await serve(t,async (url,options) => {observed={url:new URL(url),options};return Response.json([post]);});
  const response = await fetch(origin + '/conteudos/artigo-do-cms',{headers:{Cookie:'synthetic-private-session',Authorization:'Bearer synthetic-user-token'}});
  assert.equal(response.status,200);
  const html = await response.text();
  assert.match(html,/<title>SEO do CMS \| Legenda Digital<\/title>/);
  assert.match(html,/Texto português: ação e direção/);
  assert.match(html,/class="brand-logo"/);
  assert.match(html,/class="footer"/);
  assert.match(html,/https:\/\/legendadigital.com.br\/conteudos\/artigo-do-cms/);
  assert.ok(!html.includes('<script>meta</script>'));
  assert.equal(observed.url.origin,BACKEND);
  assert.equal(observed.url.searchParams.get('slug'),'eq.artigo-do-cms');
  assert.equal(observed.url.searchParams.get('status'),'eq.published');
  assert.match(observed.url.searchParams.get('published_at'),/^lte\./);
  assert.deepEqual(Object.keys(observed.options.headers).sort(),['Accept','apikey']);
  assert.equal(observed.options.headers.apikey,config.key);
  assert.equal(observed.options.method,'GET');
});

test('Article HTML index URLs cannot bypass publication checks',async t => {
  const origin = await serve(t,async () => Response.json([]));
  for (const path of ['/conteudos/como-aplicar-ia-no-negocio','/conteudos/como-aplicar-ia-no-negocio/index.html']) {
    assert.equal((await fetch(origin + path)).status,404,path);
  }
});

test('Drafts, future dates, wrong slugs and missing articles remain 404',async t => {
  let rows;
  const origin = await serve(t,async () => Response.json(rows));
  for (const candidate of [{...post,status:'draft'},{...post,status:'archived'},{...post,published_at:'2099-01-01'},{...post,slug:'different'},{...post,published_at:'invalid'},null]) {
    rows = candidate ? [candidate] : [];
    assert.equal((await fetch(origin + '/conteudos/artigo-do-cms')).status,404);
  }
});

test('API failures and malformed responses produce 503 without stale article fallback or secret text',async t => {
  let response;
  const origin = await serve(t,async () => {
    if (response === 'throw') throw new Error('synthetic-secret-upstream-error');
    return response.clone();
  });
  for (const candidate of [new Response('upstream-private-detail',{status:500}),new Response('{bad'),Response.json({private:'detail'}),'throw']) {
    response = candidate;
    const result = await fetch(origin + '/conteudos/como-aplicar-ia-no-negocio');
    assert.equal(result.status,503);
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.ok(!(await result.text()).includes('private'));
  }
});

test('Sanitizer preserves editorial formatting and drops executable markup and unsafe schemes',() => {
  const html = cleanBody('<h2>Heading</h2><p>Texto <strong>forte</strong></p><script>alert(1)</script><iframe>private</iframe><img src="javascript:alert(1)" onerror="boom"><a href="//evil.test">link</a><a href="java&#x73;cript:alert(1)">bad</a><a href="/guias" style="color:red" onclick="boom">guia</a><svg onload="boom"></svg>');
  assert.match(html,/<h2>Heading<\/h2>/);
  assert.match(html,/<strong>forte<\/strong>/);
  assert.match(html,/href="\/guias"/);
  assert.match(html,/rel="noopener noreferrer"/);
  for (const marker of ['alert(1)','private','onerror','onclick','style=','javascript:','//evil','<svg']) assert.ok(!html.includes(marker),marker);
});

test('Sitemap uses only currently published posts and excludes admin, search and seed snapshots',async t => {
  const origin = await serve(t,async () => Response.json([post,{...post,slug:'draft-post',status:'draft'},{...post,slug:'future-post',published_at:'2099-01-01'},{...post,slug:'../../private'},post]));
  const response = await fetch(origin + '/sitemap.xml');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/application\/xml/);
  const xml = await response.text();
  assert.equal((xml.match(/<loc>https:\/\/legendadigital.com.br\/conteudos\/artigo-do-cms<\/loc>/g) || []).length,1);
  for (const marker of ['draft-post','future-post','/admin','/busca','/404','como-aplicar-ia-no-negocio','../']) assert.ok(!xml.includes(marker),marker);
});

test('Sitemap paginates public API results',async t => {
  const offsets=[];
  const origin = await serve(t,async url => {
    const offset = new URL(url).searchParams.get('offset');offsets.push(offset);
    return Response.json(offset === '0' ? Array.from({length:1000},(_,i) => ({...post,slug:'artigo-' + i})) : [{...post,slug:'pagina-dois'}]);
  });
  const result = await fetch(origin + '/sitemap.xml');
  assert.equal(result.status,200);
  assert.match(await result.text(),/pagina-dois/);
  assert.deepEqual(offsets,['0','1000']);
});

test('Private output, PHP, source files and traversal are never served',async t => {
  const origin = await serve(t,async () => {throw new Error('Unexpected API call');});
  for (const path of ['/portal-runtime.json','/portal-runtime.cjs','/server.js','/package.json','/.env','/.git/config','/src/App.tsx','/site-runtime.php','/index.php','/assets/..%2fportal-runtime.json','/images/%5csecret','/missing']) {
    const result = await fetch(origin + path);
    assert.ok([400,404].includes(result.status),path + ': ' + result.status);
    assert.ok(!(await result.text()).includes('sb_publishable_fixture'));
  }
});

test('Symlinked assets cannot disclose files outside dist',async t => {
  const link = 'dist/images/outside.txt';
  await symlink(resolve('package.json'),link);
  t.after(() => unlink(link));
  const origin = await serve(t);
  assert.equal((await fetch(origin + '/images/outside.txt')).status,404);
});

test('POST is rejected without backend mutation and HEAD preserves metadata without body',async t => {
  let calls=0;
  const origin = await serve(t,async () => {calls++;return Response.json([post]);});
  const postResponse = await fetch(origin + '/api/anything',{method:'POST',body:'synthetic'});
  assert.equal(postResponse.status,405);
  assert.equal(calls,0);
  const headResponse = await fetch(origin + '/', {method:'HEAD'});
  assert.equal(headResponse.status,200);
  assert.equal(await headResponse.text(),'');
  assert.ok(Number(headResponse.headers.get('content-length')) > 500);
});

test('Health identifies Node release without credentials or user data',async t => {
  const origin = await serve(t,async () => {throw new Error('Health must not access backend');});
  assert.deepEqual(await (await fetch(origin + '/api/health')).json(),{status:'ok',release:'portal-node-v2',runtime:'node'});
});
