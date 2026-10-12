import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync("content/editorial/batch1-manifest.json", "utf8"),
);
const owner = "00000000-0000-4000-8000-000000000001";
const jwt = (obj: object) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");
const accessToken =
  jwt({ alg: "HS256", typ: "JWT" }) +
  "." +
  jwt({ sub: owner, role: "authenticated", exp: 4102444800 }) +
  ".fixture_not_a_real_signature";
const user = {
  id: owner,
  aud: "authenticated",
  role: "authenticated",
  email: "editorial-admin@example.test",
  email_confirmed_at: "2026-10-12T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-10-12T00:00:00Z",
};
async function fixtures(page: Page) {
  let authenticated = false;
  const posts = manifest.articles.map((a: any, i: number) => ({
    ...a.post,
    id: "00000000-0000-4000-8000-" + String(100 + i).padStart(12, "0"),
    version: 1,
    status: "published",
    published_at: "2026-10-12T00:00:00Z",
    updated_at: "2026-10-12T00:00:00Z",
  }));
  const writes: any[] = [];
  const analytics: string[] = [];
  const contacts: any[] = [];
  const comments: any[] = [
    {
      id: "00000000-0000-4000-8000-000000000301",
      article_id: posts[0].id,
      user_id: "00000000-0000-4000-8000-000000000002",
      parent_id: null,
      root_id: null,
      depth: 0,
      body: "Uma contribuição inicial publicada.",
      status: "published",
      created_at: "2026-10-12T00:00:00Z",
      pinned: false,
      featured: false,
      locked: false,
    },
  ];
  const commentProfiles: any[] = [
    {
      user_id: "00000000-0000-4000-8000-000000000002",
      display_name: "Leitor inicial",
    },
  ];
  const reports: any[] = [];
  const categories = [
    "Futuro",
    "Aplicação",
    "Construção",
    "Growth & Negócios",
    "Pesquisa",
  ].map((name, i) => ({ id: "category-" + i, name, slug: "category-" + i }));
  await page.route(
    "https://yltnjgngkomelfltdyky.supabase.co/**",
    async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const headers = {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
      };
      const respond = (data: any, status = 200) =>
        route.fulfill({ status, headers, body: JSON.stringify(data) });
      if (req.method() === "OPTIONS") return respond({});
      if (url.pathname.endsWith("/token")) {
        authenticated = true;
        return respond({
          access_token: accessToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: 4102444800,
          refresh_token: "fixture_refresh_not_a_credential",
          user,
        });
      }
      if (url.pathname.endsWith("/user"))
        return respond(
          authenticated ? user : { error: "not_authenticated" },
          authenticated ? 200 : 401,
        );
      if (url.pathname.endsWith("/logout")) {
        authenticated = false;
        return respond({});
      }
      const table = url.pathname.split("/").pop();
      if (table === "site_staff")
        return respond(authenticated ? { role: "admin" } : null);
      if (table === "content_posts") {
        if (req.method() === "POST") {
          const p = {
            ...req.postDataJSON(),
            id: "00000000-0000-4000-8000-000000000200",
            created_by: owner,
            version: 1,
            updated_at: new Date().toISOString(),
          };
          posts.unshift(p);
          writes.push(p.status);
          return respond(p, 201);
        }
        if (req.method() === "PATCH") {
          const id = url.searchParams.get("id")?.slice(3);
          const p = posts.find((p: any) => p.id === id);
          if (!p) return respond(null);
          Object.assign(p, req.postDataJSON(), {
            version: p.version + 1,
            updated_at: new Date().toISOString(),
          });
          if (p.status === "approved") p.approved_at = new Date().toISOString();
          writes.push(p.status);
          return respond(p);
        }
        const id = url.searchParams.get("id")?.slice(3);
        const slug = url.searchParams.get("slug")?.slice(3);
        return respond(
          id || slug
            ? posts.find((p: any) => (id ? p.id === id : p.slug === slug))
            : posts,
        );
      }
      if (table === "comment_profiles") {
        if (req.method() === "POST") {
          const p = req.postDataJSON();
          const existing = commentProfiles.find((p) => p.user_id === owner);
          if (existing) Object.assign(existing, p);
          else commentProfiles.push(p);
          return respond({});
        }
        const uid = url.searchParams.get("user_id");
        return respond(
          uid?.startsWith("eq.")
            ? commentProfiles.find((p) => p.user_id === uid.slice(3)) || null
            : commentProfiles,
        );
      }
      if (table === "article_comments") {
        if (req.method() === "POST") {
          const p = req.postDataJSON();
          const parent = comments.find((c) => c.id === p.parent_id);
          comments.push({
            ...p,
            id:
              "00000000-0000-4000-8000-" +
              String(400 + comments.length).padStart(12, "0"),
            status: "pending",
            root_id: parent?.root_id || parent?.id || null,
            depth: parent ? parent.depth + 1 : 0,
            created_at: new Date().toISOString(),
            pinned: false,
            featured: false,
            locked: false,
          });
          return respond({});
        }
        if (req.method() === "PATCH") {
          const c = comments.find(
            (c) => c.id === url.searchParams.get("id")?.slice(3),
          );
          if (c) {
            const p = req.postDataJSON();
            Object.assign(c, p);
            if (p.body && p.status === "pending")
              c.edited_at = new Date().toISOString();
          }
          return respond({});
        }
        const id = url.searchParams.get("article_id")?.slice(3);
        return respond(
          id ? comments.filter((c) => c.article_id === id) : comments,
        );
      }
      if (table === "comment_reports") {
        if (req.method() === "POST") {
          reports.push({
            ...req.postDataJSON(),
            id: "report-" + reports.length,
            status: "open",
            created_at: new Date().toISOString(),
          });
          return respond({});
        }
        if (req.method() === "PATCH") {
          Object.assign(
            reports.find((r) => r.id === url.searchParams.get("id")?.slice(3)),
            req.postDataJSON(),
          );
          return respond({});
        }
        return respond(reports.filter((r) => r.status === "open"));
      }
      if (table === "content_categories") return respond(categories);
      if (table === "authors")
        return respond([
          {
            id: "author-redacao",
            name: "Redação Legenda Digital",
            bio: "Editorial da marca",
          },
        ]);
      if (table === "content_tags")
        return respond([{ id: "tag-ia", name: "IA", slug: "ia" }]);
      if (table === "contact_messages" && req.method() === "POST") { contacts.push(req.postDataJSON()); return respond(null,201); }
      if (table === "site_settings") return respond({ config: {} });
      if (table === "editorial_notes")
        return respond(req.method() === "GET" ? null : {});
      if (table === "article_versions") return respond([]);
      if (table === "track_editorial") {
        analytics.push(req.postDataJSON().p_event);
        return respond(null);
      }
      return respond([]);
    },
  );
  return { posts, writes, comments, reports, analytics, contacts };
}
async function login(page: Page) {
  await page.goto("/admin/articles");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("editorial-admin@example.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("fixture_password_not_a_real_credential");
  await page.getByRole("button", { name: "Entrar no admin" }).click();
  await expect(page.getByRole("button", { name: "Novo artigo" })).toBeVisible();
}

test("public article: real SSR, TOC, sources, images, share and mobile overflow", async ({
  page,
}) => {
  await fixtures(page);
  const post = manifest.articles[0].post;
  await page.goto("/conteudos/" + post.slug);
  await expect(
    page.getByRole("heading", { level: 1, name: post.title }),
  ).toBeVisible();
  await expect(page.locator(".article-body h2,.article-body h3")).toHaveCount(
    manifest.articles[0].integrity.headings,
  );
  await expect(page.locator(".article-hero img")).toHaveJSProperty(
    "naturalWidth",
    1200,
  );
  await page.locator(".article-toc a").nth(3).click();
  await expect(page).toHaveURL(/#/);
  await expect(
    page.getByRole("link", { name: "WhatsApp", exact: true }),
  ).toHaveAttribute("href", new RegExp(encodeURIComponent(post.slug)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/conteudos/" + post.slug);
  await expect(page.locator(".article-hero img")).toHaveJSProperty(
    "naturalWidth",
    720,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Entrar ou criar conta" }),
  ).toBeVisible();
  expect(
    await page.locator('script[type="application/ld+json"]').textContent(),
  ).toContain("BreadcrumbList");
});

test("visual editor: autosave, preview and review→approval→publication without HTML editing", async ({
  page,
}) => {
  const f = await fixtures(page);
  page.on("dialog", (d) => d.accept());
  await login(page);
  await page.getByRole("button", { name: "Novo artigo" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Teste visual do CMS");
  await page.getByRole("button", { name: "Gerar a partir do título" }).click();
  await page
    .getByLabel("Resumo para os cards")
    .fill("Resumo do artigo de teste.");
  await page
    .getByRole("textbox", { name: "Corpo do artigo — editor visual" })
    .fill("Uma contribuição de teste ao fluxo editorial.");
  await page
    .getByLabel("URL da capa", { exact: true })
    .fill(
      "/images/editorial/batch1/" +
        manifest.articles[0].post.slug +
        "-hero.webp",
    );
  await page
    .getByLabel("Texto alternativo (alt)", { exact: true })
    .fill("Diagrama conceitual para o teste.");
  await expect
    .poll(() => f.posts.some((p: any) => p.slug === "teste-visual-do-cms"))
    .toBe(true);
  await page.getByRole("button", { name: "Prévia", exact: true }).click();
  await page.getByRole("button", { name: "Celular 390px" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { level: 1, name: "Teste visual do CMS" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(
    page.getByRole("button", { name: "Aprovar versão" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aprovar versão" }).click();
  await expect(
    page.getByRole("button", { name: "Publicar agora" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publicar agora" }).click();
  await expect
    .poll(
      () => f.posts.find((p: any) => p.slug === "teste-visual-do-cms")?.status,
    )
    .toBe("published");
  expect(f.writes).toContain("draft");
  expect(f.writes.indexOf("review")).toBeLessThan(f.writes.indexOf("approved"));
  expect(f.writes.indexOf("approved")).toBeLessThan(
    f.writes.indexOf("published"),
  );
  await expect(page.getByLabel("Conteúdo HTML")).toHaveCount(0);
});

test("approved import: visual editor preserves paragraphs, headings, source links and tables", async ({
  page,
}) => {
  await fixtures(page);
  await login(page);
  for (const item of manifest.articles) {
    await page
      .getByRole("row")
      .filter({ hasText: item.post.title })
      .getByRole("button", { name: "Editar / prévia" })
      .click();
    const editor = page.getByRole("textbox", {
      name: "Corpo do artigo — editor visual",
    });
    await expect(editor).toBeVisible();
    const original = item.post.body;
    const comparison = await editor.evaluate((el, body) => {
      const root = document.createElement("div");
      root.innerHTML = body;
      const normalize = (s: string | null) => s?.replace(/\s+/g, " ").trim();
      const text = (r: Element, selector: string) =>
        Array.from(r.querySelectorAll(selector))
          .filter((e) => selector !== "p" || !e.closest("li,td,th"))
          .map((e) => normalize(e.textContent));
      const selectors = ["h2,h3", "p", "li", "td,th", "figcaption", "summary"];
      return {
        before: selectors.map((s) => text(root, s)),
        after: selectors.map((s) => text(el, s)),
        sourcesBefore: Array.from(
          root.querySelectorAll('a[href^="https"]'),
        ).map((a) => a.getAttribute("href")),
        sourcesAfter: Array.from(el.querySelectorAll('a[href^="https"]')).map(
          (a) => a.getAttribute("href"),
        ),
      };
    }, original);
    expect(comparison.after[0]).toEqual(comparison.before[0]);
    for (const p of comparison.before[1])
      expect(comparison.after[1]).toContain(p);
    for (const i of [2, 3, 4, 5])
      expect(comparison.after[i]).toEqual(comparison.before[i]);
    expect(comparison.sourcesAfter).toEqual(comparison.sourcesBefore);
    await page.getByRole("button", { name: "Prévia", exact: true }).click();
    await expect(
      page.getByRole("dialog").locator(".article-body table"),
    ).toHaveCount(item.integrity.tables);
    await page.getByRole("button", { name: "Fechar prévia" }).click();
    await page
      .locator(".editor-topbar")
      .getByRole("button", { name: "Artigos", exact: true })
      .click();
  }
});

test("portal account: contribution, nested reply, moderation and private report flow", async ({
  page,
}) => {
  const f = await fixtures(page);
  const post = manifest.articles[0].post;
  await page.goto("/conteudos/" + post.slug);
  await page.getByRole("button", { name: "Entrar ou criar conta" }).click();
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("editorial-admin@example.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("fixture_password_not_a_real_credential");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Nome público")).toBeVisible();
  await page.getByLabel("Nome público").fill("Leitor de teste");
  await page
    .getByLabel("Comentário", { exact: true })
    .fill("Uma contribuição que passará pela revisão.");
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Contribuição recebida" }),
  ).toBeVisible();
  expect(f.comments.at(-1).status).toBe("pending");
  await page.goto("/admin/comments");
  await expect(
    page.getByRole("heading", { name: "Comentários e moderação" }),
  ).toBeVisible();
  const card = page
    .locator(".moderation-card")
    .filter({ hasText: "Uma contribuição que passará pela revisão." });
  await card.getByRole("button", { name: "Aprovar", exact: true }).click();
  await expect.poll(() => f.comments.at(-1).status).toBe("published");
  await page.goto("/conteudos/" + post.slug);
  const initial = page
    .locator(".comment-item")
    .filter({
      has: page.locator("article>.comment-text", {
        hasText: "Uma contribuição inicial publicada.",
      }),
    })
    .first();
  await initial.getByRole("button", { name: "Responder", exact: true }).click();
  await page
    .getByLabel("Comentário", { exact: true })
    .fill("Uma resposta com contexto.");
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await expect.poll(() => f.comments.at(-1).parent_id).toBe(f.comments[0].id);
  expect(f.comments.at(-1).depth).toBe(1);
  await page.goto("/admin/comments");
  await page
    .locator(".moderation-card")
    .filter({ hasText: "Uma resposta com contexto." })
    .getByRole("button", { name: "Aprovar", exact: true })
    .click();
  await page.goto("/conteudos/" + post.slug);
  const reply = page
    .locator(".comment-item")
    .filter({
      has: page.locator("article>.comment-text", {
        hasText: "Uma resposta com contexto.",
      }),
    })
    .last();
  await reply.getByRole("button", { name: "Denunciar", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Motivo", exact: true })
    .selectOption("off_topic");
  await page.getByRole("button", { name: "Enviar denúncia" }).click();
  await expect.poll(() => f.reports.length).toBe(1);
  expect(f.reports[0].reason).toBe("off_topic");
  await page.goto("/admin/comments");
  await expect(page.getByText("off_topic", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Marcar resolvida" }).click();
  await expect.poll(() => f.reports[0].status).toBe("resolved");
});

test("editorial analytics respects consent and starts collecting after explicit opt-in", async ({
  page,
}) => {
  const f = await fixtures(page);
  await page.goto("/conteudos/" + manifest.articles[0].post.slug);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: manifest.articles[0].post.title,
    }),
  ).toBeVisible();
  expect(f.analytics).toEqual([]);
  await page.getByRole("button", { name: "Permitir estatísticas" }).click();
  await expect.poll(() => f.analytics.includes("article_viewed")).toBe(true);
  await page
    .getByRole("heading", { name: "Comentários", exact: true })
    .scrollIntoViewIfNeeded();
  await expect.poll(() => f.analytics.includes("article_scroll_75")).toBe(true);
  expect(f.analytics.filter((e) => e === "article_viewed")).toHaveLength(1);
});

for (const width of [1440,390]) for (const [name,path] of Object.entries({home:'/',contents:'/conteudos',article:'/conteudos/'+manifest.articles[0].post.slug,growth:'/produtos/growth-os'})) {
 test(`UX v2 accessibility: ${name} ${width}`,async({page})=>{
  await fixtures(page);await page.setViewportSize({width,height:900});await page.goto(path);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.slice(0,12).map(n=>({target:n.target,summary:n.failureSummary?.slice(0,280)}))}))).toEqual([]);
 });
}
test('UX v2 mobile drawers, separate filters, tabs and demo form remain human-controlled',async({page})=>{
 const f=await fixtures(page);await page.setViewportSize({width:390,height:844});await page.goto('/conteudos');
 const menu=page.getByRole('button',{name:'Abrir menu'});await menu.click();await expect(page.getByRole('dialog',{name:'Menu de navegação'})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
 await page.getByRole('button',{name:'Filtros',exact:true}).click();const filters=page.locator('.filter-dialog');await filters.getByRole('button',{name:'IA',exact:true}).click();await filters.getByLabel('Formatos').selectOption('guide');await filters.getByRole('button',{name:/Ver .* conteúdo/}).click();await expect(page.locator('.post-card')).toHaveCount(1);
 await page.goto('/produtos/growth-os');await expect(page.locator('.preview-caption')).toHaveCount(3);const tabs=page.getByRole('tablist');await tabs.getByRole('tab',{name:'Hoje',exact:true}).focus();await page.keyboard.press('End');await expect(tabs.getByRole('tab',{name:'Resultados',exact:true})).toBeFocused();await expect(page.getByRole('tabpanel')).toContainText('Sem forecast');
 await tabs.getByRole('tab',{name:'Próxima ação',exact:true}).click();await page.getByRole('button',{name:'Revisar próxima ação'}).click();await expect(page.getByRole('tabpanel')).toContainText('nenhuma mensagem foi enviada');expect(f.contacts).toHaveLength(0);
 const form=page.locator('#demonstracao form');await expect(form.getByLabel('Assunto',{exact:true})).toHaveValue('Demonstração Growth OS');await form.getByLabel('Nome',{exact:true}).fill('Pessoa de teste');await form.getByLabel('E-mail',{exact:true}).fill('demo@example.test');await form.getByLabel('Mensagem',{exact:true}).fill('Quero conhecer o acompanhamento de oportunidades.');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Enviar mensagem'}).click();await expect.poll(()=>f.contacts.length).toBe(1);expect(f.contacts[0].subject).toBe('Demonstração Growth OS');expect(f.contacts[0].consent).toBe(true);await expect(form.getByRole('status')).toContainText('Mensagem recebida');
});
