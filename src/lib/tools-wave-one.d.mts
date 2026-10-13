export { type ToolDefinition, type ToolField } from "./tools-engine.mjs";
import type {
  ToolDefinition,
  ToolField,
  ToolAnswers,
} from "./tools-engine.mjs";
export const waveOneRegistry: ToolDefinition[];
export const plannerFields: ToolField[];
export const funnelStages: [string, string][];
export const claroTemplates: {
  id: string;
  name: string;
  answers: ToolAnswers;
}[];
