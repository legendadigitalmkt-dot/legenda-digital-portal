import * as legacy from "./tools-v1.mjs";
import {
  waveOneRegistry,
  claroTemplates,
  plannerFields,
  funnelStages,
} from "./tools-wave-one.mjs";
import {
  calculateWave,
  normalizeWaveAnswers,
  waveInitialAnswers,
  safePublicationUrl,
} from "./tools-wave-calculations.mjs";
export const PRIVACY_VERSION = legacy.PRIVACY_VERSION;
export const legacyToolRegistry = legacy.toolRegistry;
export const toolRegistry = waveOneRegistry;
export { claroTemplates, plannerFields, funnelStages, safePublicationUrl };
export const csvCell = legacy.csvCell;
export const safeAttribution = legacy.safeAttribution;
export function getToolVersion(id, version) {
  return [...toolRegistry, ...legacyToolRegistry].find(
    (t) => t.id === id && t.version === version,
  );
}
export function initialAnswers(tool) {
  return tool.version === 1 && legacyToolRegistry.some((t) => t.id === tool.id)
    ? legacy.initialAnswers(tool)
    : waveInitialAnswers(tool);
}
const historical = (tool) =>
  tool.version === 1 && legacyToolRegistry.some((t) => t.id === tool.id);
export function normalizeToolAnswers(tool, raw) {
  return historical(tool)
    ? legacy.normalizeToolAnswers(tool, raw)
    : normalizeWaveAnswers(tool, raw);
}
export function calculateTool(tool, raw) {
  return historical(tool)
    ? legacy.calculateTool(tool, raw)
    : calculateWave(tool, raw);
}
export function upgradeToolAnswers(tool, raw, version) {
  if (version === tool.version) return normalizeToolAnswers(tool, raw);
  if (version !== 1 || tool.version !== 2)
    throw Error(
      "Esta versão não pode ser migrada automaticamente. Exporte o histórico original.",
    );
  const old = legacy.normalizeToolAnswers(getToolVersion(tool.id, 1), raw),
    a = initialAnswers(tool);
  if (tool.id === "claro") Object.assign(a, old);
  else if (tool.id === "calculadora-conversao")
    Object.assign(a, {
      mode: "simple",
      visits: old.visits,
      actions: old.actions,
    });
  else if (tool.id === "planner-editorial") a.rows = old.rows;
  else if (tool.id === "checklist-conteudo") {
    const previous = legacy.calculateTool(getToolVersion(tool.id, 1), old);
    a.legacy_notes = previous.result.lines.join("\n");
  }
  return normalizeToolAnswers(tool, a);
}
export function exportToolCSV(tool, answers) {
  if (historical(tool)) return legacy.exportToolCSV(tool, answers);
  const data = calculateTool(tool, answers);
  const rows =
    tool.id === "planner-editorial"
      ? [
          plannerFields.map((f) => f.label),
          ...data.answers.rows.map((r) => plannerFields.map((f) => r[f.id])),
        ]
      : [
          ["Campo", "Valor"],
          ...tool.input_schema
            .filter(
              (f) =>
                !f.showWhen ||
                data.answers[f.showWhen.field] === f.showWhen.value,
            )
            .map((f) => [f.label, data.answers[f.id]]),
          [],
          ["Resultado", data.result.value || data.result.title],
          ...data.result.lines.map((v) => ["Detalhe", v]),
          ...(data.result.tables || []).flatMap((t) => [
            [],
            [t.title],
            t.headers,
            ...t.rows,
          ]),
          [],
          ["Método", tool.methodology],
          ["Limites", tool.limits],
        ];
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
