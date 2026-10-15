import test from 'node:test';
import assert from 'node:assert/strict';
import {EDITORIAL_VIEWPORTS,editorialAuditScope,editorialMetadata,assessEditorialPage} from '../../scripts/qa/editorial-readiness-rules.mjs';

const post={slug:'leitura-publica',title:'Leitura pública',kind:'article',excerpt:'Resumo editorial.'};
const canonical='https://legendadigital.com.br/conteudos/leitura-publica';
function page(){return {status:200,path:'/conteudos/leitura-publica',canonical,ogUrl:canonical,h1Count:1,title:post.title,
  description:post.excerpt,subtitle:post.excerpt,author:'Legenda Digital',publication:'Publicado em 14/10/2026',breadcrumb:true,category:'IA',
  bodyText:400,font:'18px',bodyWidth:720,centerDelta:0,overflow:false,headings:2,headingIds:2,uniqueHeadingIds:2,tocLinks:2,missingTocTargets:0,
  heroLoaded:true,heroAlt:'Imagem editorial',failedBodyImages:[],relatedCount:2,relatedSelfLink:false,shareControls:true,commentsPresent:true,
  unsafeLinks:0,jsErrors:[],schemaTypes:['Article','BreadcrumbList'],
  articleSchema:{headline:post.title,datePublished:'2026-10-14',dateModified:'2026-10-14',author:{name:'Legenda Digital'},mainEntityOfPage:canonical},
  sidebarRight:true,sidebarWidth:280};}

test('Editorial audit separates rendered technical checks from missing metadata without inventing sources',()=>{
  assert.deepEqual(assessEditorialPage(post,page(),1440),[]);
  const before=JSON.stringify(post), audit=editorialMetadata(post);
  assert.ok(audit.warnings.includes('missing_hero_image_credit'));
  assert.ok(audit.warnings.includes('no_structured_references'));
  assert.equal(JSON.stringify(post),before);
});

test('Editorial audit rejects broken TOC targets, duplicate headings and broken images',()=>{
  const result=assessEditorialPage(post,{...page(),missingTocTargets:1,uniqueHeadingIds:1,failedBodyImages:['/images/missing.webp']},1440);
  assert.deepEqual(result,['heading_ids','toc_targets','body_image']);
});

test('Editorial audit rejects app canonical, hidden author/schema and overflow while respecting optional comments/share',()=>{
  const result=assessEditorialPage(post,{...page(),canonical:'https://app.legendadigital.com.br/',author:'',overflow:true,articleSchema:null},390);
  assert.ok(result.includes('canonical_or_og_url'));
  assert.ok(result.includes('article_metadata'));
  assert.ok(result.includes('reading_layout'));
  assert.ok(result.includes('article_schema'));
  assert.deepEqual(assessEditorialPage({...post,show_comments:false,show_share:false},{...page(),commentsPresent:false,shareControls:false,sidebarRight:false},390),[]);
});

test('Editorial audit covers all nine approved viewports and flags unreadable type and unsafe links',()=>{
  assert.deepEqual(EDITORIAL_VIEWPORTS,[[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180],[1366,768],[1440,900],[1920,1080]]);
  assert.deepEqual(assessEditorialPage(post,{...page(),font:'14px',unsafeLinks:1},390),['body_font','unsafe_content_link']);
});

test('An isolated recheck has an explicit partial scope instead of claiming the full matrix',()=>{
  const catalog=[post,{...post,slug:'segunda-leitura'}];
  const all=editorialAuditScope(catalog);
  assert.equal(all.full_scope,true);
  assert.equal(all.posts.length*all.viewports.length,18);
  const selected=editorialAuditScope(catalog,['--slug=leitura-publica','--width=390']);
  assert.equal(selected.full_scope,false);
  assert.equal(selected.posts.length,1);
  assert.deepEqual(selected.viewports,[[390,844]]);
});

test('Rechecks reject missing articles, unknown viewports, path escapes and repeated selectors',()=>{
  for(const args of [['--slug=ausente'],['--width=100'],['--slug=../admin'],['--width=360','--width=390'],['--other=1']]) {
    assert.throws(()=>editorialAuditScope([post],args));
  }
});
