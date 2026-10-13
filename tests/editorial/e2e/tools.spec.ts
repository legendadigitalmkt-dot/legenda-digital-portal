import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { toolRegistry } from "../../../src/lib/tools-engine.mjs";
const owner = "00000000-0000-4000-8000-000000000901";
const user = {
  id: owner,
  aud: "authenticated",
  role: "authenticated",
  email: "tools-fixture@example.test",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-10-12T00:00:00Z",
};
const encode = (x: object) =>
  Buffer.from(JSON.stringify(x)).toString("base64url");
const token =
  encode({ alg: "HS256", typ: "JWT" }) +
  "." +
  encode({ sub: owner, role: "authenticated", exp: 4102444800 }) +
  ".fixture_signature";
async function fixture(page: Page, allowRegistration = false) {
  const runs: any[] = [],
    events: any[] = [],
    saves: any[] = [],
    errors: string[] = [],
    signups: any[] = [];
  let authenticated = false;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem("ld-analytics-consent"))
      localStorage.setItem("ld-analytics-consent", "no");
  });
  await page.route(
    "https://yltnjgngkomelfltdyky.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const respond = (data: any, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (req.method() === "OPTIONS") return respond({});
      if (url.pathname.endsWith("/settings"))
        return respond({ disable_signup: !allowRegistration, external: { email: true } });
      if (url.pathname.endsWith('/signup')) {
        signups.push({redirect:url.searchParams.get('redirect_to'),body:req.postDataJSON()});
        return respond({user:{...user,email_confirmed_at:null},session:null});
      }
      if (url.pathname.endsWith("/token")) {
        authenticated = true;
        return respond({
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: 4102444800,
          refresh_token: "fixture_refresh",
          user,
        });
      }
      if (url.pathname.endsWith("/user"))
        return respond(
          authenticated ? user : { message: "not_authenticated" },
          authenticated ? 200 : 401,
        );
      if (url.pathname.endsWith("/logout")) {
        authenticated = false;
        return respond({});
      }
      const table = url.pathname.split("/").pop();
      if (table === "save_tool_run" || table === "save_tool_run_v2") {
        const p = req.postDataJSON();
        saves.push(p);
        if (!authenticated)
          return respond({ message: "sign in required" }, 401);
        if (!runs.some((r) => r.id === p.p_id))
          runs.unshift({
            id: p.p_id,
            tool_id: p.p_tool_id,
            tool_version: p.p_version,
            name: p.p_name,
            parent_run_id: p.p_parent_id || null,
            favorite: false,
            answers: p.p_answers,
            result_summary: p.p_result,
            completed_at: new Date().toISOString(),
          });
        return respond(p.p_id);
      }
      if (table === "tool_events") {
        events.push(req.postDataJSON());
        return respond(null, 201);
      }
      if (table === "tool_runs") {
        if (!authenticated) return respond([]);
        const id = url.searchParams.get("id")?.slice(3);
        if (req.method() === "PATCH") {
          Object.assign(
            runs.find((r) => r.id === id) || {},
            req.postDataJSON(),
          );
          return respond({ id });
        }
        if (req.method() === "DELETE") {
          const i = runs.findIndex((r) => r.id === id);
          if (i >= 0) runs.splice(i, 1);
          return respond({ id });
        }
        return respond(id ? runs.find((r) => r.id === id) || null : runs);
      }
      if (table === "tool_exports") return respond(null, 201);
      if (table === "tools") {
        const id = url.searchParams.get("id")?.slice(3);
        if (req.method() === "PATCH") return respond(null);
        return respond(
          id ? toolRegistry.find((t) => t.id === id) : toolRegistry,
        );
      }
      if (table === "site_staff")
        return respond(authenticated ? { role: "admin" } : null);
      if (table === "tool_usage_summary")
        return respond(
          toolRegistry.map((t) => ({
            tool_id: t.id,
            views: 0,
            starts: 0,
            completions: 0,
            saves: 0,
            exports: 0,
          })),
        );
      if (table === "site_settings") return respond(null);
      if (table === "content_categories") return respond([]);
      return respond([]);
    },
  );
  return { runs, events, saves, errors, signups };
}
async function login(page: Page) {
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("tools-fixture@example.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("fixture-password-not-real");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test('Portal signup requires consent and confirms back to the owned account route',async({page})=>{
 const f=await fixture(page,true);
 await page.goto('/conta');
 const account=page.locator('.portal-auth');
 await account.getByRole('button',{name:'Criar conta do portal',exact:true}).click();
 await account.getByLabel('E-mail',{exact:true}).fill('signup-fixture@example.test');
 await account.getByLabel('Senha',{exact:true}).fill('fictional-signup-password-123');
 await account.getByRole('button',{name:'Criar conta',exact:true}).click();
 expect(f.signups).toHaveLength(0);
 await account.getByRole('checkbox').check();
 await account.getByRole('button',{name:'Criar conta',exact:true}).click();
 await expect(account.getByRole('status')).toContainText('Confira seu e-mail para confirmar');
 expect(f.signups).toHaveLength(1);
 expect(f.signups[0].redirect).toBe('https://legendadigital.com.br/conta');
 expect(f.signups[0].body.email).toBe('signup-fixture@example.test');
 expect(f.errors).toEqual([]);
});
async function compute(page: Page, visits = "100", actions = "12") {
  await page.getByLabel("Visitas ou oportunidades").fill(visits);
  await page.getByLabel("Ações concluídas").fill(actions);
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.getByText("12%", { exact: true })).toBeVisible();
}

test("Tools anonymous calculation/export is open and has no response or analytics writes without consent", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/ferramentas/calculadora-conversao");
  await compute(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "calculadora-conversao.csv",
  );
  expect(f.saves).toEqual([]);
  expect(f.events).toEqual([]);
  expect(f.runs).toEqual([]);
  await page
    .getByRole("button", { name: "Salvar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Entrar na conta do portal" }),
  ).toBeVisible();
  await expect(
    page.getByText("Novos cadastros do portal ainda não estão liberados.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(f.errors).toEqual([]);
});
test("Tools in-place login retains input; explicit saving, favorite, rename, duplicate, compare and delete work", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/ferramentas/calculadora-conversao");
  await compute(page);
  await page
    .getByRole("button", { name: "Salvar resultado", exact: true })
    .click();
  await login(page);
  await expect(
    page.getByRole("button", { name: "Confirmar e salvar" }),
  ).toBeDisabled();
  await page.getByLabel("Nome do resultado").fill("Campanha de outubro");
  await page
    .getByLabel("Quero guardar estas respostas", { exact: false })
    .check();
  await page.getByRole("button", { name: "Confirmar e salvar" }).click();
  await expect(
    page.getByText("Resultado salvo no seu histórico privado."),
  ).toBeVisible();
  expect(f.saves).toHaveLength(1);
  await page.goto("/conta/ferramentas");
  await expect(
    page.getByRole("heading", { name: "Campanha de outubro" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Favoritar ☆" }).click();
  await expect(
    page.getByRole("button", { name: "Favorito ★" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Renomear" }).click();
  await page.getByLabel("Novo nome").fill("Outubro revisado");
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await page.getByRole("link", { name: "Duplicar e ajustar" }).click();
  await expect(page.getByLabel("Visitas ou oportunidades")).toHaveValue("100");
  await compute(page);
  await page
    .getByRole("button", { name: "Salvar resultado", exact: true })
    .click();
  await page
    .getByLabel("Quero guardar estas respostas", { exact: false })
    .check();
  await page.getByRole("button", { name: "Confirmar e salvar" }).click();
  await expect.poll(() => f.runs.length).toBe(2);
  await page.goto("/conta/ferramentas");
  await page.getByLabel("Selecionar para comparar").nth(0).check();
  await page.getByLabel("Selecionar para comparar").nth(1).check();
  await expect(
    page.getByRole("heading", { name: "Comparar resultados" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir", exact: true })
    .nth(0)
    .click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect.poll(() => f.runs.length).toBe(1);
  expect(f.events).toEqual([]);
  expect(f.errors).toEqual([]);
});
test("Consented events omit answers/results/identity; corrupt drafts and invalid inputs recover", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/ferramentas");
  await page.evaluate(() => {
    localStorage.setItem("ld-analytics-consent", "yes");
    sessionStorage.setItem(
      "ld-tool-draft-v2-planner-editorial",
      JSON.stringify({ at: Date.now(), answers: { rows: "corrupt" } }),
    );
  });
  await page.goto("/ferramentas/planner-editorial");
  await expect(page.getByLabel("Tema", { exact: true })).toBeVisible();
  expect(f.errors).toEqual([]);
  await page.goto("/ferramentas/calculadora-conversao");
  await page.getByLabel("Visitas ou oportunidades").fill("10");
  await page.getByLabel("Ações concluídas").fill("20");
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.getByRole("alert")).toContainText("Use números inteiros");
  await page.getByLabel("Ações concluídas").fill("2");
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect.poll(() => f.events.length).toBeGreaterThan(0);
  for (const event of f.events) {
    expect(event.consent).toBe(true);
    expect(Object.keys(event).sort()).toEqual([
      "consent",
      "event_name",
      "privacy_version",
      "step_key",
      "tool_id",
    ]);
  }
  expect(f.saves).toEqual([]);
});
for (const width of [360, 390, 768, 1440])
  test("Tools responsive flow and accessibility " + width, async ({ page }) => {
    await fixture(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ferramentas/calculadora-conversao");
    await compute(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
test("Private account routes are no-store/noindex and excluded from public sitemap", async ({
  page,
  request,
}) => {
  await fixture(page);
  const response = await page.goto("/conta/ferramentas");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const r = await request.get("/sitemap.xml");
  expect(await r.text()).not.toMatch(/\/conta(?:<|\/)/);
});

test("CLARO, checklist and planner preserve local drafts only by choice and keep legacy data", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/ferramentas/claro");
  await page
    .getByLabel("Contexto", { exact: true })
    .fill("Marca com um objetivo concreto");
  await page.getByLabel("Ação", { exact: true }).fill("Revisar uma publicação");
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.locator(".engine-result")).toContainText("CONTEXTO");
  expect(
    await page.evaluate(() => sessionStorage.getItem("ld-tool-draft-v2-claro")),
  ).toBeNull();
  await page.goto("/ferramentas");
  await page.evaluate(() =>
    localStorage.setItem(
      "ld-checklist",
      JSON.stringify([
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ]),
    ),
  );
  await page.goto("/ferramentas/checklist-conteudo");
  await expect(
    page.getByRole("button", { name: "Recuperar rascunho anterior" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("O público e a pergunta estão explícitos."),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Recuperar rascunho anterior" })
    .click();
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(
    page.getByLabel("Revisão anterior (referência, sem nota)"),
  ).toContainText("[x]");
  await page
    .getByLabel("O público e a pergunta estão explícitos.")
    .selectOption("4");
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.locator(".engine-result")).toContainText("parcial");
  expect(
    await page.evaluate(() => localStorage.getItem("ld-checklist")),
  ).not.toBeNull();
  await page.goto("/ferramentas/planner-editorial");
  await page.getByLabel("Tema", { exact: true }).fill("Uma pauta útil");
  await page
    .getByLabel("Guardar este rascunho só nesta aba, até ela ser fechada.")
    .check();
  await page.reload();
  await expect(page.getByLabel("Tema", { exact: true })).toHaveValue(
    "Uma pauta útil",
  );
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.getByText("1 pauta(s)", { exact: true })).toBeVisible();
  expect(f.saves).toEqual([]);
  expect(f.errors).toEqual([]);
});

async function prepareWaveResult(page: Page, id: string) {
  if (id === "claro") {
    await page
      .getByLabel("Contexto", { exact: true })
      .fill("Processo com contexto real");
    await page
      .getByLabel("Objetivo", { exact: true })
      .fill("Preparar um brief revisável");
  } else if (id === "checklist-conteudo")
    await page
      .getByLabel("O público e a pergunta estão explícitos.")
      .selectOption("3");
  else if (id === "maturidade-growth")
    await page
      .getByLabel("Canais e público prioritários estão definidos.")
      .selectOption("2");
  else if (id === "seo-aeo-geo")
    await page
      .getByLabel("A página responde e não exige login.")
      .selectOption("4");
  else if (id === "calculadora-conversao") {
    await page.getByLabel("Modo de análise").selectOption("full");
    for (const [label, value] of [
      ["Visitas", "1000"],
      ["Leads", "200"],
      ["MQL", "100"],
      ["SQL", "50"],
      ["Demos", "30"],
      ["Propostas", "20"],
      ["Vendas", "10"],
    ])
      await page.getByLabel("Atual · " + label, { exact: true }).fill(value);
  } else if (id === "planner-editorial") {
    await page
      .getByLabel("Tema", { exact: true })
      .fill("Planejamento com fontes");
    await page.getByLabel("Data", { exact: true }).fill("2026-10-15");
  } else if (id === "cac-ltv-payback") {
    for (const [label, value] of [
      ["Custo total de aquisição no período (R$)", "12000"],
      ["Novos clientes no período", "20"],
      ["Receita mensal média por cliente (R$)", "100"],
      ["Margem bruta (%)", "80"],
      ["Retenção média estimada (meses)", "24"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
  } else if (id === "follow-up") {
    for (const [label, value] of [
      ["Oportunidades na carteira", "10"],
      ["Sem responsável", "2"],
      ["Sem próximo passo", "3"],
      ["Atrasadas", "1"],
      ["Aguardando cliente", "4"],
      ["Paradas além do prazo definido", "2"],
      ["Prazo considerado para uma oportunidade parada (dias)", "7"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(
    page
      .locator(
        ".engine-result .tool-result-value, .engine-result .tool-result-lines",
      )
      .first(),
  ).toBeVisible();
}
for (const id of toolRegistry.map((t) => t.id))
  for (const width of [390, 1440])
    test(`Wave one ${id} usable and accessible at ${width}`, async ({
      page,
    }) => {
      const f = await fixture(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/ferramentas/" + id);
      await prepareWaveResult(page, id);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      expect(f.saves).toEqual([]);
      expect(f.events).toEqual([]);
      expect(f.errors).toEqual([]);
    });
test("Planner list/calendar/Kanban share data; duplicate, published URL and PDF report work", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/ferramentas/planner-editorial");
  await prepareWaveResult(page, "planner-editorial");
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await page.getByLabel("Mês do calendário").fill("2026-10");
  await expect(page.locator(".tool-calendar")).toContainText(
    "Planejamento com fontes",
  );
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await page
    .getByLabel("Mover pauta: Planejamento com fontes")
    .selectOption("review");
  await expect(
    page.getByRole("region", { name: "Etapa Revisão" }),
  ).toContainText("Planejamento com fontes");
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "review",
  );
  await page.getByRole("button", { name: "Duplicar pauta" }).click();
  await expect(page.getByLabel("Tema", { exact: true })).toHaveCount(2);
  await page
    .getByLabel("Status", { exact: true })
    .first()
    .selectOption("published");
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.getByRole("alert")).toContainText("URL publicada");
  await page
    .getByText("Contexto, distribuição e publicação", { exact: true })
    .first()
    .click();
  await page
    .getByLabel("URL publicada", { exact: true })
    .first()
    .fill("https://example.test/artigo");
  await page.getByRole("button", { name: "Preparar resultado" }).click();
  await expect(page.locator(".engine-result")).toContainText("2 pauta(s)");
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole("button", { name: "Imprimir / salvar PDF" }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".tool-print-report")).toBeVisible();
  await expect(page.locator(".tool-input")).not.toBeVisible();
  await expect(page.locator(".tool-print-report")).toContainText(
    "Metodologia e limites",
  );
  const bytes = await page.pdf({ format: "A4", printBackground: true });
  expect(bytes.byteLength).toBeGreaterThan(5000);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  expect(f.saves).toEqual([]);
  expect(f.errors).toEqual([]);
});
