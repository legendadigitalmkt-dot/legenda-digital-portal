import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  toolRegistry,
  legacyToolRegistry,
  getToolVersion,
  initialAnswers,
  calculateTool,
  normalizeToolAnswers,
  upgradeToolAnswers,
  exportToolCSV,
} from "../../src/lib/tools-engine.mjs";
const tool = (id) => toolRegistry.find((t) => t.id === id);
test("Wave registry preserves historical versions, has eight tools, and matches public metadata", () => {
  assert.equal(toolRegistry.length, 8);
  assert.equal(legacyToolRegistry.length, 4);
  const catalog = JSON.parse(readFileSync("src/lib/tool-catalog.json"));
  for (const t of toolRegistry) {
    assert.equal(catalog.find((x) => x.id === t.id).version, t.version);
    assert.equal(catalog.find((x) => x.id === t.id).name, t.name);
    assert.ok(!("input_schema" in catalog.find((x) => x.id === t.id)));
    assert.equal(
      new Set(t.input_schema.map((f) => f.id)).size,
      t.input_schema.length,
    );
  }
  assert.equal(getToolVersion("claro", 1).version, 1);
  assert.equal(getToolVersion("claro", 2).version, 2);
});
test("CLARO formats and migrations organize only supplied data, with actionable missing criteria", () => {
  const t = tool("claro");
  const a = {
    ...initialAnswers(t),
    context: "Contexto real",
    action: "Revisar",
    objective: "Ajudar o leitor",
    audience: "Gestores",
    result: "Brief revisado",
  };
  for (const format of ["prompt", "brief", "plan", "checklist"]) {
    const r = calculateTool(t, { ...a, output_format: format });
    assert.ok(r.text.includes("Contexto real"));
    assert.ok(!r.text.includes("Receita inventada"));
    assert.ok(r.result.title);
  }
  assert.throws(() => calculateTool(t, initialAnswers(t)));
  const old = upgradeToolAnswers(
    t,
    { context: "Anterior", action: "Revisar", result: "Texto" },
    1,
  );
  assert.equal(old.context, "Anterior");
  assert.equal(old.audience, "");
  assert.ok(
    calculateTool(t, old).result.recommendations.some((x) =>
      x.title.includes("Audiência"),
    ),
  );
});
test("Assessments show coverage, unknown dimensions and own score, without automatic promotion of old checkboxes", () => {
  for (const id of ["checklist-conteudo", "maturidade-growth", "seo-aeo-geo"]) {
    const t = tool(id),
      a = initialAnswers(t);
    assert.throws(() => calculateTool(t, a));
    const first = t.input_schema.find((f) => f.type === "rating");
    a[first.id] = "4";
    const r = calculateTool(t, a).result;
    assert.match(r.value, /100\/100 · parcial/);
    assert.equal(
      r.breakdown.find((d) => first.id.startsWith(d.id + "_")).score,
      100,
    );
    assert.ok(r.breakdown.some((d) => d.score === null));
    assert.ok(r.lines.some((x) => x.includes("Cobertura: 1 de")));
    for (const f of t.input_schema.filter((f) => f.type === "rating"))
      a[f.id] = "0";
    assert.match(calculateTool(t, a).result.value, /^0\/100$/);
    a[first.id] = "9";
    assert.throws(() => calculateTool(t, a));
  }
  const old = {
    ...initialAnswers(getToolVersion("checklist-conteudo", 1)),
    criterion_1: true,
  };
  const migrated = upgradeToolAnswers(tool("checklist-conteudo"), old, 1);
  assert.equal(migrated.clarity_1, "");
  assert.match(migrated.legacy_notes, /\[x\]/);
  assert.throws(() => calculateTool(tool("checklist-conteudo"), migrated));
});
test("Full funnel handles three cohorts, zero bases, losses and invalid/nonmonotonic scenarios", () => {
  const t = tool("calculadora-conversao"),
    a = { ...initialAnswers(t), mode: "full" };
  const stages = [
    "visits",
    "leads",
    "mql",
    "sql",
    "demos",
    "proposals",
    "sales",
  ];
  [1000, 200, 100, 50, 30, 20, 10].forEach(
    (v, i) => (a["current_" + stages[i]] = String(v)),
  );
  const r = calculateTool(t, a).result;
  assert.equal(r.value, "1%");
  assert.equal(r.tables[0].rows[1][2], "20%");
  assert.equal(r.tables[0].rows[1][3], "800");
  assert.equal(r.funnels[0].stages[6].count, 10);
  stages.forEach((k) => (a["target_" + k] = "0"));
  assert.equal(calculateTool(t, a).result.funnels.length, 2);
  assert.match(calculateTool(t, a).result.tables[1].rows[1][2], /Indisponível/);
  a.target_sales = "";
  assert.throws(() => calculateTool(t, a));
  a.target_sales = "1";
  assert.throws(() => calculateTool(t, a));
  a.target_sales = "0";
  a.current_leads = "1200";
  assert.throws(() => calculateTool(t, a));
  assert.equal(
    calculateTool(t, { mode: "simple", visits: "100", actions: "0" }).result
      .value,
    "0%",
  );
});
test("CAC/LTV/payback covers margin, zero denominators and invalid assumptions", () => {
  const t = tool("cac-ltv-payback"),
    a = {
      spend: "12000",
      customers: "20",
      monthly_revenue: "100",
      gross_margin: "80",
      retention_months: "24",
      period: "Outubro",
    };
  const r = calculateTool(t, a).result;
  assert.match(r.value, /600,00/);
  assert.ok(r.lines.some((x) => x === "LTV:CAC: 3,2:1"));
  assert.ok(r.lines.some((x) => x === "Payback simples: 7,5 meses"));
  const zero = calculateTool(t, { ...a, gross_margin: "0" }).result;
  assert.ok(zero.lines.some((x) => x.includes("contribuição zero")));
  assert.ok(
    calculateTool(t, { ...a, spend: "0" }).result.lines.some((x) =>
      x.includes("CAC zero"),
    ),
  );
  for (const bad of [
    { customers: "0" },
    { customers: "1.5" },
    { gross_margin: "101" },
    { spend: "-1" },
    { retention_months: "0" },
    { monthly_revenue: "Infinity" },
  ])
    assert.throws(() => calculateTool(t, { ...a, ...bad }));
});
test("Follow-up reports overlapping conditions independently and validates denominators", () => {
  const t = tool("follow-up"),
    a = {
      total: "10",
      ownerless: "5",
      no_next_step: "6",
      overdue: "4",
      waiting: "3",
      stalled: "2",
      stalled_days: "7",
    };
  const r = calculateTool(t, a).result;
  assert.equal(r.tables[0].rows[0][2], "50%");
  assert.ok(r.lines.some((x) => x.includes("não somamos")));
  assert.throws(() => calculateTool(t, { ...a, ownerless: "11" }));
  const zero = calculateTool(t, {
    ...a,
    total: "0",
    ownerless: "0",
    no_next_step: "0",
    overdue: "0",
    waiting: "0",
    stalled: "0",
  }).result;
  assert.match(zero.tables[0].rows[0][2], /base zero/);
  assert.equal(zero.recommendations.length, 0);
});
test("Planner validates IDs, dates, published URLs, includes all fields in CSV and prevents formula injection", () => {
  const t = tool("planner-editorial"),
    a = {
      rows: [
        {
          theme: "=cmd",
          question: "Pergunta real",
          thesis: "Tese",
          persona: "Gestor",
          intent: "Aprender",
          format: "Artigo",
          channel: "Site",
          date: "2026-10-15",
          status: "published",
          publication_url: "https://example.test/post",
          cta: "Ler",
          sources: "Fonte",
          derivatives: "Vídeo",
        },
      ],
    };
  const r = calculateTool(t, a);
  assert.equal(r.answers.rows[0].row_id, "row_1");
  const csv = exportToolCSV(t, a);
  assert.match(csv, /Pergunta central/);
  assert.match(csv, /"'=cmd"/);
  assert.match(csv, /Fonte/);
  for (const bad of [
    { publication_url: "javascript:alert(1)" },
    { publication_url: "https://user:pass@example.test" },
    { date: "2026-02-30" },
    { status: "unknown" },
    { publication_url: "" },
  ])
    assert.throws(() => calculateTool(t, { rows: [{ ...a.rows[0], ...bad }] }));
  assert.throws(() =>
    normalizeToolAnswers(t, {
      rows: [
        { ...a.rows[0], row_id: "same" },
        { ...a.rows[0], row_id: "same" },
      ],
    }),
  );
  const old = getToolVersion("planner-editorial", 1);
  assert.match(
    exportToolCSV(old, {
      rows: [
        { theme: "Original", format: "Artigo", channel: "Site", date: "" },
      ],
    }),
    /Original/,
  );
});
