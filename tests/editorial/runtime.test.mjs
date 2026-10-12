import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import runtime from "../../dist/portal-runtime.cjs";
const { createPortalHandler, renderArticle, renderCollection, BACKEND } =
  runtime;
const manifest = JSON.parse(
  await readFile("content/editorial/batch1-manifest.json"),
);
const posts = manifest.articles.map((a) => ({
  ...a.post,
  status: "published",
  published_at: "2026-10-12T00:00:00Z",
  updated_at: "2026-10-12T00:00:00Z",
}));
const config = {
  url: BACKEND,
  key: "sb_publishable_fixture",
  routes: JSON.parse(await readFile("dist/portal-runtime.json")).routes,
};
test('SSR safely renders attachments, highlighted text, banners and manually selected links',async(t)=>{
 const row={...posts[0],body:'<h2>Leitura</h2><aside data-block="callout" data-tone="warning"><p><strong>Importante</strong></p><p>Texto em destaque.</p></aside><aside data-block="attachment"><a href="https://example.test/material.pdf" download target="_blank">Material PDF</a><p>Pesquisa.</p></aside><aside data-tone="url(evil)" onclick="boom">Texto</aside>',article_extras:{hideGrowthPromo:true,banners:[{title:'Banner de exemplo',description:'Contexto',placement:'sidebar',url:'/contato',label:'Conversar'},{title:'Sem script',url:'javascript:alert(1)',label:'Não abrir'}],links:[{label:'Manual',url:'/pesquisa'},{label:'Inseguro',url:'//evil.test'}]}};
 const url=await server(t,[row]);const html=await(await fetch(url+'/conteudos/'+row.slug)).text();
 assert.ok(html.includes('data-tone="warning"'));assert.ok(html.includes('Material PDF'));assert.ok(html.includes('Banner de exemplo'));assert.ok(html.includes('Links selecionados'));assert.ok(html.includes('href="/pesquisa"'));
 assert.ok(!html.includes('javascript:alert'));assert.ok(!html.includes('url(evil)'));assert.ok(!html.includes('onclick="boom"'));assert.ok(!html.includes('href="//evil.test"'));
});
async function server(t, rows = posts) {
  const handler = await createPortalHandler({
    root: resolve("dist"),
    config,
    renderArticle,
    renderCollection,
    fetchImpl: async (url) => {
      const u = new URL(url);
      if (u.pathname.endsWith("/content_categories"))
        return Response.json(
          u.searchParams.get("slug") === "eq.growth-negocios"
            ? [
                {
                  name: "Growth & Negócios",
                  slug: "growth-negocios",
                  active: true,
                },
              ]
            : [],
        );
      const slug = u.searchParams.get("slug")?.slice(3);
      return Response.json(slug ? rows.filter((p) => p.slug === slug) : rows);
    },
    now: () => Date.parse("2026-10-12T12:00:00Z"),
  });
  const s = createServer(handler);
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  t.after(
    () =>
      new Promise((r) => {
        s.close(r);
        s.closeAllConnections();
      }),
  );
  return "http://127.0.0.1:" + s.address().port;
}
test("Article SEO uses real canonical, OG, Article and Breadcrumb; noindex stays out of sitemap/RSS", async (t) => {
  const rows = [
    posts[0],
    { ...posts[1], allow_index: false },
    { ...posts[2], status: "draft" },
    { ...posts[3], published_at: "2099-01-01" },
  ];
  const url = await server(t, rows);
  const html = await (await fetch(url + "/conteudos/" + posts[0].slug)).text();
  assert.ok(html.includes(posts[0].og_image));
  const schema = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
  );
  assert.ok(schema.some((s) => s["@type"] === "Article"));
  assert.ok(schema.some((s) => s["@type"] === "BreadcrumbList"));
  assert.ok(!html.includes("data:image"));
  const noindex = await (
    await fetch(url + "/conteudos/" + posts[1].slug)
  ).text();
  assert.match(noindex, /noindex, follow/);
  for (const path of ["/feed.xml", "/sitemap.xml"]) {
    const response = await fetch(url + path);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(body.includes(posts[0].slug));
    for (const p of rows.slice(1)) assert.ok(!body.includes(p.slug), p.slug);
  }
});
test("Editorial collection SSR and article aliases preserve existing URLs and use publication checks", async (t) => {
  const url = await server(t);
  const response = await fetch(url + "/categorias/growth-negocios");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(posts[0].title));
  assert.match(
    html,
    /canonical" href="https:\/\/legendadigital.com.br\/categorias\/growth-negocios/,
  );
  assert.equal((await fetch(url + "/categorias/unknown")).status, 404);
  const alias = await fetch(url + "/artigos/" + posts[0].slug, {
    redirect: "manual",
  });
  assert.equal(alias.status, 301);
  assert.equal(alias.headers.get("location"), "/conteudos/" + posts[0].slug);
  assert.equal(
    (await fetch(url + "/artigos", { redirect: "manual" })).headers.get(
      "location",
    ),
    "/conteudos",
  );
});
