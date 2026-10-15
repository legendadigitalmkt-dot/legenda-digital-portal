export const PORTAL_ORIGIN = 'https://legendadigital.com.br';
export const EDITORIAL_VIEWPORTS = [[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180],[1366,768],[1440,900],[1920,1080]];

export function editorialAuditScope(catalog, args = []) {
  let slug, width;
  for (const arg of args) {
    if (arg.startsWith('--slug=') && slug === undefined) {
      slug=arg.slice(7);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('Invalid article selector');
    } else if (arg.startsWith('--width=') && width === undefined) {
      const value=arg.slice(8);
      if (!/^\d+$/.test(value)) throw Error('Invalid viewport selector');
      width=Number(value);
    } else throw Error('Unsupported or repeated audit selector');
  }
  const posts=slug ? catalog.filter(p=>p.slug===slug) : catalog;
  const viewports=width === undefined ? EDITORIAL_VIEWPORTS : EDITORIAL_VIEWPORTS.filter(v=>v[0]===width);
  if (!posts.length || !viewports.length) throw Error('Selected published article or approved viewport not found');
  return {posts,viewports,full_scope:slug===undefined&&width===undefined};
}

export function editorialMetadata(post) {
  const warnings = [];
  for (const field of ['subtitle','hero_image_alt','hero_image_credit','hero_image_caption','seo_title','seo_description','og_image']) {
    if (!String(post[field] || '').trim()) warnings.push('missing_' + field);
  }
  if (!post.references?.length) warnings.push('no_structured_references');
  // Missing editorial data requires review, never fabricated citations or credits.
  return {slug:post.slug, kind:post.kind, warnings};
}

export function assessEditorialPage(post, page, width) {
  const issues = [];
  const fail = (condition, code) => {if (condition) issues.push(code);};
  const expected = PORTAL_ORIGIN + '/conteudos/' + post.slug;
  fail(page.status !== 200, 'http_status');
  fail(page.path !== '/conteudos/' + post.slug, 'canonical_route');
  fail(page.canonical !== expected || page.ogUrl !== expected, 'canonical_or_og_url');
  fail(page.h1Count !== 1 || page.title !== post.title, 'article_title');
  fail(!page.description || page.description !== (post.seo_description || post.excerpt), 'meta_description');
  fail(!page.subtitle || !page.author || !page.publication || page.publication.includes('A definir'), 'article_metadata');
  fail(!page.breadcrumb || !page.category || !page.bodyText, 'article_structure');
  fail(page.overflow || page.centerDelta > 1 || page.bodyWidth > 721, 'reading_layout');
  fail(page.font !== '18px', 'body_font');
  fail(page.headings < 1 || page.headingIds !== page.uniqueHeadingIds, 'heading_ids');
  fail(!page.tocLinks || page.missingTocTargets > 0, 'toc_targets');
  fail(!page.heroLoaded || !page.heroAlt, 'hero_image');
  fail(page.failedBodyImages.length > 0, 'body_image');
  fail(page.relatedCount < 1 || page.relatedSelfLink, 'related_content');
  fail(post.show_share !== false && !page.shareControls, 'share_controls');
  fail(post.show_comments !== false && !page.commentsPresent, 'comments_section');
  fail(page.unsafeLinks > 0, 'unsafe_content_link');
  fail(page.jsErrors.length > 0, 'javascript_error');
  const schema = page.articleSchema;
  fail(!schema || schema.headline !== post.title || !schema.datePublished || !schema.dateModified || !schema.author?.name || schema.mainEntityOfPage !== expected, 'article_schema');
  fail(!page.schemaTypes.includes('BreadcrumbList'), 'breadcrumb_schema');
  if (width >= 1366) fail(!page.sidebarRight || page.sidebarWidth < 260 || page.sidebarWidth > 320, 'desktop_sidebar');
  return issues;
}
