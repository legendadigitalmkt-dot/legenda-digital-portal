import catalog from "./tool-catalog.json";
import type { ToolDefinition } from "./tools-engine.mjs";
// Public metadata only. Calculation modules load with the requested workspace.
export const toolCatalog = catalog.map((t) => ({
  ...t,
  input_schema: [],
})) as ToolDefinition[];
