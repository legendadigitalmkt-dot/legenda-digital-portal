import test from "node:test";
import assert from "node:assert/strict";
import {
  toolRegistry,
  calculateTool,
  initialAnswers,
  exportToolCSV,
  safeAttribution,
  normalizeToolAnswers,
} from "../../src/lib/tools-engine.mjs";
const tool = (id) => toolRegistry.find((t) => t.id === id);
test("Tools deterministic calculations, limits and stable question IDs", () => {
  const c = tool("calculadora-conversao");
  assert.equal(
    calculateTool(c, { visits: "100", actions: "12" }).result.value,
    "12%",
  );
  assert.equal(
    calculateTool(c, { visits: "100", actions: "0" }).result.value,
    "0%",
  );
  for (const data of [
    { visits: "0", actions: "0" },
    { visits: "10", actions: "11" },
    { visits: "100", actions: "-1" },
    { visits: "12.5", actions: "1" },
    { visits: "9007199254740992", actions: "1" },
  ])
    assert.throws(() => calculateTool(c, data));
  const claro = calculateTool(tool("claro"), {
    context: "Contexto real",
    action: "Revisar texto",
    unknown: "secret",
  });
  assert.match(claro.text, /CONTEXTO\nContexto real/);
  assert.ok(!claro.text.includes("secret"));
  assert.equal(claro.result.value, null);
  const checks = initialAnswers(tool("checklist-conteudo"));
  checks.criterion_1 = true;
  checks.criterion_2 = true;
  assert.equal(
    calculateTool(tool("checklist-conteudo"), checks).result.value,
    "2 de 10 critérios revisados",
  );
  assert.equal(
    new Set(
      toolRegistry.flatMap((t) => t.input_schema.map((f) => t.id + "/" + f.id)),
    ).size,
    18,
  );
});
test("Planner CSV handles formula injection, invalid dates and draft validation", () => {
  const p = tool("planner-editorial");
  const a = {
    rows: [
      {
        theme: '=HYPERLINK("https://evil.test")',
        format: "Artigo",
        channel: "Site",
        date: "2026-10-15",
      },
    ],
  };
  assert.match(exportToolCSV(p, a), /"'=HYPERLINK/);
  assert.throws(() =>
    calculateTool(p, { rows: [{ theme: "x", date: "2026-02-30" }] }),
  );
  assert.throws(() => calculateTool(p, { rows: Array(51).fill({}) }));
  assert.throws(() => normalizeToolAnswers(p, { rows: "not an array" }));
  assert.equal(
    normalizeToolAnswers(tool("claro"), { context: "" }).context,
    "",
  );
  assert.throws(() => calculateTool(tool("claro"), {}));
});
test("Attribution strips personal data, query strings, credentials and invalid identifiers", () => {
  assert.deepEqual(
    safeAttribution(
      "?utm_source=linkedin&utm_campaign=launch-1&utm_term=person%40example.com",
      "https://example.test/private?email=secret",
    ),
    {
      utm_source: "linkedin",
      utm_campaign: "launch-1",
      referrer: "https://example.test",
    },
  );
  assert.deepEqual(
    safeAttribution("?utm_source=hello%20world", "javascript:alert(1)"),
    {},
  );
});
