import {normalizeExtras} from '../src/lib/article-extras.mjs';
import contentFields from '../src/lib/content-fields.json' with {type:'json'};
import {readFile, realpath, stat} from 'node:fs/promises';
import {join, relative, resolve, extname} from 'node:path';
import sanitizeHtml from 'sanitize-html';

export const DOMAIN = 'https://legendadigital.com.br';
export const BACKEND = 'https://yltnjgngkomelfltdyky.supabase.co';
const PUBLIC_RELATIONS=',author_profile:authors!content_posts_author_id_fkey(name,bio,avatar_url,links),category_profile:content_categories!content_posts_category_id_fkey(name,slug,active)';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TYPES = {'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const PUBLIC_ICONS = new Set(['/favicon.ico','/favicon-16x16.png','/favicon-32x32.png','/favicon-48x48.png','/apple-touch-icon.png']);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function safeUrl(value) {
  const text = String(value ?? '');
  return /^(https?:\/\/|\/(?!\/))/.test(text) && !/[\x00-\x20\\]/.test(text) ? text : '';
}
export function cleanBody(body) {
  return sanitizeHtml(String(body ?? ''), {
    allowedTags: ['div','aside','section','pre','code','details','summary','p','h2','h3','h4','ul','ol','li','strong','b','em','i','a','blockquote','img','figure','figcaption','br','hr','table','thead','tbody','tr','th','td'],
    allowedAttributes: {a:['href','rel','target','download'],img:['src','alt','width','height','srcset','sizes','loading','decoding'],h2:['id'],h3:['id'],aside:['class','data-block','data-tone'],section:['class','data-block','data-tone'],div:['class','data-block','tabindex'],th:['colspan','rowspan'],td:['colspan','rowspan']},
    allowedSchemes: ['http','https'], allowProtocolRelative: false,
    nonTextTags: ['style','script','textarea','option','xmp','iframe','object','embed'],
    transformTags: {'*': (tagName, attributes) => {
      const attribs = {...attributes};
      if ('srcset' in attribs && !attribs.srcset.split(',').every(v => safeUrl(v.trim().split(/\s+/)[0]))) delete attribs.srcset;
      if ('class' in attribs && !/^(?:editorial-[a-z-]+|table-scroll|figure-scroll)(?: (?:editorial-[a-z-]+|table-scroll|figure-scroll))*$/.test(attribs.class)) delete attribs.class;
      if ('id' in attribs && !/^[a-zA-Z0-9_-]+$/.test(attribs.id)) delete attribs.id;
      if ('data-block' in attribs && !/^[a-z-]+$/.test(attribs['data-block'])) delete attribs['data-block'];
      if ('data-tone' in attribs && !['info','insight','warning'].includes(attribs['data-tone'])) delete attribs['data-tone'];
      for (const key of ['href','src']) if (key in attribs && !safeUrl(attribs[key])) delete attribs[key];
      if (tagName === 'a') attribs.rel = 'noopener noreferrer';
      return {tagName, attribs};
    }},
  });
}
function published(post, now) {
  return post?.status === 'published' && Number.isFinite(Date.parse(post.published_at)) && Date.parse(post.published_at) <= now && typeof post.slug === 'string' && post.slug.length <= 160 && SLUG.test(post.slug);
}
function normalizePost(post) {
  const publicPost = Object.fromEntries(contentFields.article.split(',').filter(key=>key in post).map(key=>[key,post[key]]));
  const author = post.author_profile && typeof post.author_profile.name==='string' ? {name:post.author_profile.name,bio:String(post.author_profile.bio||''),avatar_url:safeUrl(post.author_profile.avatar_url),links:Array.isArray(post.author_profile.links)?post.author_profile.links.filter(l=>typeof l.label==='string'&&safeUrl(l.url)).slice(0,10).map(l=>({label:l.label,url:l.url})):[]} : undefined;
  const category = post.category_profile && typeof post.category_profile.name==='string' ? {name:post.category_profile.name,slug:String(post.category_profile.slug||''),active:post.category_profile.active!==false} : undefined;
  return {...publicPost, article_extras:normalizeExtras(post.article_extras), author_profile:author,category_profile:category,category_slug:category?.slug, title:String(post.title ?? ''), excerpt:String(post.excerpt ?? ''), category:String(category?.name || post.category || ''), author:String(author?.name || post.author || ''),
    canonical_url:safeUrl(post.canonical_url)?.startsWith(DOMAIN+'/')?post.canonical_url:undefined,
    hero_image_mobile:safeUrl(post.hero_image_mobile)||undefined,hero_image_fallback:safeUrl(post.hero_image_fallback)||undefined,
    references:Array.isArray(post.references)?post.references.filter(r=>r&&typeof r.title==='string'&&/^https?:\/\//.test(safeUrl(r.url))):[],
    featured_image:safeUrl(post.featured_image) || '/images/hero.webp', body:cleanBody(post.body),
    reading_time:Math.min(120, Math.max(1, Number(post.reading_time) || 1)),
    tags:Array.isArray(post.tags) ? post.tags.filter(tag => typeof tag === 'string').slice(0,50) : [],
  };
}
function articleHtml(base, post, body) {
  const title = (post.seo_title || post.title) + ' | Legenda Digital';
  const description = post.seo_description || post.excerpt;
  const url = safeUrl(post.canonical_url)?.startsWith(DOMAIN + '/') ? post.canonical_url : DOMAIN + '/conteudos/' + post.slug;
  const sourceImage = safeUrl(post.og_image) || post.featured_image;
  const image = sourceImage.startsWith('/') ? DOMAIN + sourceImage : sourceImage;
  const schema = {'@context':'https://schema.org','@type':'Article',headline:post.title,description:post.excerpt,image,
    datePublished:post.published_at,dateModified:post.updated_at || post.published_at,author:{'@type':'Organization',name:post.author},
    publisher:{'@type':'Organization',name:'Legenda Digital',logo:{'@type':'ImageObject',url:DOMAIN + '/images/legenda-digital-logo.png'}},mainEntityOfPage:url};
  const breadcrumb = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Início',item:DOMAIN},{'@type':'ListItem',position:2,name:'Conteúdos',item:DOMAIN+'/conteudos'},{'@type':'ListItem',position:3,name:post.title,item:url}]};
  const head = `${post.allow_index === false ? '<meta name="robots" content="noindex, follow">' : ''}<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(url)}"><meta property="og:title" content="${escape(post.og_title || title)}"><meta property="og:description" content="${escape(post.og_description || description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(image)}"><meta property="og:type" content="article"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}"><script type="application/ld+json">${JSON.stringify([schema,breadcrumb]).replace(/</g,'\\u003c')}</script>`;
  let html = base.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta (?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>|<link rel="canonical"[^>]*>|<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace('</head>', head + '</head>');
  const start = html.indexOf('<div id="root">'), end = html.lastIndexOf('</div>');
  if (start < 0 || end <= start) throw new Error('Invalid page template');
  const page = html.slice(0,start) + '<div id="root">' + body + '</div>' + html.slice(end + 6);
  return page.replace('</body>','<script type="application/json" id="ld-initial-content">'+JSON.stringify([post]).replace(/</g,'\\u003c')+'</script></body>');
}

export async function createPortalHandler({root, config, renderArticle, renderCollection, renderNewsletter, fetchImpl = fetch, now = () => Date.now()}) {
  if (config?.url !== BACKEND || typeof config.key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key)) throw new Error('Only the portal publishable configuration is accepted');
  const rootReal = await realpath(resolve(root));
  const routeSet = new Set(config.routes);
  if (!routeSet.has('/') || !routeSet.has('/404') || !routeSet.has('/admin')) throw new Error('Missing route manifest');
  async function file(name) {
    const path = join(rootReal, name), actual = await realpath(path);
    if (relative(rootReal, actual).startsWith('..') || (await stat(actual)).isDirectory()) throw new Error('Invalid asset path');
    return readFile(actual);
  }
  const base = (await file('index.html')).toString();
  const notFound = (await file('404/index.html')).toString();
  async function api(query, signal,table='content_posts') {
    if(!['content_posts','content_categories','newsletter_issues'].includes(table))throw new Error('Invalid public resource');
    const url = new URL('/rest/v1/'+table, BACKEND);
    for (const [key,value] of Object.entries(query)) url.searchParams.set(key,value);
    const response = await fetchImpl(url, {method:'GET',headers:{apikey:config.key,Accept:'application/json'},signal,redirect:'error'});
    if (!response.ok) throw new Error('Public content unavailable');
    const chunks = []; let size = 0;
    for await (const part of response.body) {
      size += part.byteLength;
      if (size > 3 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error('Content response limit exceeded'); }
      chunks.push(Buffer.from(part));
    }
    const rows = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(rows)) throw new Error('Invalid content response');
    return rows;
  }
  return async function handle(req,res) {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Cache-Control','no-cache');
    const send = (code, body, type = 'text/html; charset=utf-8') => { const data = Buffer.isBuffer(body) ? body : Buffer.from(body); res.writeHead(code,{'Content-Type':type,'Content-Length':data.byteLength}); res.end(req.method === 'HEAD' ? undefined : data); };
    try {
      if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); send(405,'Method not allowed','text/plain'); return; }
      if ((req.url?.length ?? 0) > 2048) { send(414,'URI too long','text/plain'); return; }
      let path;
      try { path = decodeURIComponent(new URL(req.url, DOMAIN).pathname); } catch { send(400,'Invalid URL','text/plain'); return; }
      if (/[\\\x00-\x1f]/.test(path) || path.split('/').some(part => part === '.' || part === '..')) { send(400,'Invalid path','text/plain'); return; }
      path = path.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
      const admin = path === '/admin' || path.startsWith('/admin/');
      const privatePage=['/newsletter/confirmar','/newsletter/preferencias'].includes(path)||admin||path==='/conta'||path.startsWith('/conta/')||path.startsWith('/ferramentas/')&&new URL(req.url,DOMAIN).searchParams.has('run');
      if (privatePage) { res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Robots-Tag','noindex, nofollow'); }
      if (path === '/api/health') { send(200,JSON.stringify({status:'ok',release:'editorial-batch1-stable-v1',runtime:'node'}),'application/json'); return; }
      const signal = AbortSignal.timeout(6000), instant = now();
      const filter = {status:'eq.published',published_at:'lte.' + new Date(instant).toISOString()};
      if (path === '/sitemap.xml') {
        const posts = [];
        let complete = false;
        for (let page=0; page<20; page++) {
          const rows = await api({...filter,select:'slug,updated_at,status,published_at,allow_index',order:'slug.asc',limit:'1000',offset:String(page * 1000)},signal);
          posts.push(...rows.filter(post => published(post,instant) && post.allow_index !== false));
          if (rows.length < 1000) { complete = true; break; }
        }
        if (!complete) throw new Error('Sitemap size limit reached');
        const categories = await api({select:'name,slug,active',active:'eq.true',limit:'100'},signal,'content_categories');
        const categoryRoutes=categories.filter(c=>typeof c.name==='string'&&SLUG.test(c.slug)&&c.active!==false).map(c=>'/categorias/'+c.slug);
        const fixed = [...routeSet].filter(route => !['/admin','/conta','/conta/ferramentas','/conta/newsletter','/newsletter/confirmar','/newsletter/preferencias','/busca','/404'].includes(route) && !route.startsWith('/conteudos/') && !route.startsWith('/categorias/')).concat(categoryRoutes);
        const publicIssues=await api({select:'slug,status,is_public,sent_at',status:'eq.sent',is_public:'eq.true',sent_at:'lte.'+new Date(instant).toISOString(),limit:'1000'},signal,'newsletter_issues');
        fixed.push(...publicIssues.filter(i=>SLUG.test(i.slug)&&i.status==='sent'&&i.is_public&&Date.parse(i.sent_at)<=instant).map(i=>'/newsletter/'+i.slug));
        const seen = new Set();
        const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + fixed.map(route => '<url><loc>' + escape(DOMAIN + route) + '</loc></url>').join('') + posts.filter(post => !seen.has(post.slug) && seen.add(post.slug)).map(post => '<url><loc>' + DOMAIN + '/conteudos/' + escape(post.slug) + '</loc>' + (/^\d{4}-\d{2}-\d{2}/.test(post.updated_at ?? '') ? '<lastmod>' + post.updated_at.slice(0,10) + '</lastmod>' : '') + '</url>').join('') + '</urlset>';
        res.setHeader('Cache-Control','public, max-age=300'); send(200,xml,'application/xml; charset=utf-8'); return;
      }
      if (path === '/artigos' || /^\/artigos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) { res.writeHead(301,{Location:path.replace('/artigos','/conteudos')});res.end();return; }
      if (path === '/feed.xml') {
        const rows = await api({...filter,allow_index:'eq.true',select:'title,slug,excerpt,category,status,published_at,allow_index',order:'published_at.desc',limit:'100'},signal);
        const rss = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Legenda Digital</title><link>'+DOMAIN+'</link><description>Inteligência prática na era da IA</description><language>pt-BR</language>' + rows.filter(p=>published(p,instant)&&p.allow_index!==false).map(p=>'<item><title>'+escape(p.title)+'</title><link>'+DOMAIN+'/conteudos/'+escape(p.slug)+'</link><guid isPermaLink="true">'+DOMAIN+'/conteudos/'+escape(p.slug)+'</guid><description>'+escape(p.excerpt)+'</description><category>'+escape(p.category)+'</category><pubDate>'+new Date(p.published_at).toUTCString()+'</pubDate></item>').join('') + '</channel></rss>';
        res.setHeader('Cache-Control','public, max-age=300');send(200,rss,'application/rss+xml; charset=utf-8');return;
      }
      if ((path === '/conteudos' || path.startsWith('/categorias/')) && renderCollection) {
        let category=null;
        if(path.startsWith('/categorias/')){const slug=path.slice(12);if(!SLUG.test(slug)||slug.length>160){send(404,notFound);return;}const matches=await api({select:'id,name,slug,description,active',slug:'eq.'+slug,active:'eq.true',limit:'1'},signal,'content_categories');category=matches.find(c=>c.slug===slug&&typeof c.name==='string'&&c.active!==false)||null;if(!category){send(404,notFound);return;}}
        const rows = await api({...filter,...(category?{...(category.id?{or:'(category_id.eq.'+category.id+',and(category_id.is.null,category.eq.'+JSON.stringify(category.name)+'))'}:{category:'eq.'+category.name})}:{}),select:contentFields.cards+PUBLIC_RELATIONS,order:'published_at.desc',limit:'100'},signal);
        const title = (category?.name || 'Conteúdos') + ' | Legenda Digital';
        let html=base.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escape(title)+'</title>').replace(/<link rel="canonical"[^>]*>/g,'').replace('</head>','<link rel="canonical" href="'+DOMAIN+path+'"></head>');
        const start=html.indexOf('<div id="root">'),end=html.lastIndexOf('</div>');
        html=html.slice(0,start)+'<div id="root">'+renderCollection(path,rows.filter(p=>published(p,instant)).map(normalizePost),category)+'</div>'+html.slice(end+6);html=html.replace('</body>','<script type="application/json" id="ld-initial-content">'+JSON.stringify(rows.filter(p=>published(p,instant)).map(normalizePost)).replace(/</g,'\\u003c')+'</script></body>');if(category)html=html.replace('</body>','<script type="application/json" id="ld-initial-category">'+JSON.stringify(category).replace(/</g,'\\u003c')+'</script></body>');send(200,html);return;
      }
      if (path.startsWith('/newsletter/') && !['/newsletter/confirmar','/newsletter/preferencias'].includes(path)) {
        const slug=path.slice(12);if(!SLUG.test(slug)||slug.length>160){send(404,notFound);return;}
        const rows=await api({select:'id,slug,subject,preheader,content,author,issue_date,sent_at,status,is_public',slug:'eq.'+slug,status:'eq.sent',is_public:'eq.true',sent_at:'lte.'+new Date(instant).toISOString(),limit:'1'},signal,'newsletter_issues');
        const issue=rows.find(i=>i.slug===slug&&i.status==='sent'&&i.is_public&&Date.parse(i.sent_at)<=instant);
        if(!issue||!renderNewsletter){send(404,notFound);return;}
        const title=issue.subject+' | LD Brief | Legenda Digital',url=DOMAIN+'/newsletter/'+slug;
        let html=base.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escape(title)+'</title>').replace(/<meta (?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>|<link rel="canonical"[^>]*>|<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
        html=html.replace('</head>','<meta name="description" content="'+escape(issue.preheader)+'"><link rel="canonical" href="'+url+'"><meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(issue.preheader)+'"><meta property="og:url" content="'+url+'"><meta property="og:image" content="'+DOMAIN+'/images/hero.webp"></head>');
        const start=html.indexOf('<div id="root">'),end=html.lastIndexOf('</div>');html=html.slice(0,start)+'<div id="root">'+renderNewsletter(issue)+'</div>'+html.slice(end+6);
        html=html.replace('</body>','<script type="application/json" id="ld-initial-issue">'+JSON.stringify(issue).replace(/</g,'\\u003c')+'</script></body>');send(200,html);return;
      }
      if (path.startsWith('/conteudos/')) {
        const slug = path.slice('/conteudos/'.length);
        if (!SLUG.test(slug) || slug.length > 160) { send(404,notFound); return; }
        const rows = await api({...filter,select:contentFields.article+PUBLIC_RELATIONS,slug:'eq.' + slug,limit:'1'},signal);
        const source = rows.find(post => post.slug === slug && published(post,instant));
        if (!source) { send(404,notFound); return; }
        const post = normalizePost(source);
        send(200,articleHtml(base, post, renderArticle(post))); return;
      }
      if (admin || routeSet.has(path)) { send(path === '/404' ? 404 : 200,await file(path === '/' ? 'index.html' : (admin ? 'admin' : path.slice(1)) + '/index.html')); return; }
      const publicAsset = PUBLIC_ICONS.has(path) || path === '/logo.svg' || path === '/robots.txt' || path === '/fonts/OFL.txt' || /^\/(assets|images|fonts)\/[A-Za-z0-9_./-]+$/.test(path) && TYPES[extname(path)] && !path.split('/').some(part => part.startsWith('.'));
      if (publicAsset) {
        try {
          const value = await file(path.slice(1));
          res.setHeader('Cache-Control',path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
          send(200,value,TYPES[extname(path)] || 'application/octet-stream');
        } catch { send(404,notFound); }
        return;
      }
      send(404,notFound);
    } catch {
      res.setHeader('Cache-Control','no-store');
      send(503,'Conteúdo temporariamente indisponível. Tente novamente em instantes.','text/plain; charset=utf-8');
    }
  };
}
