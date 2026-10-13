export type ToolField = {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  default?: string;
  group?: string;
  options?: [string, string][];
  action?: string;
  row_fields?: ToolField[];
  showWhen?: { field: string; value: string };
};
export type ToolDefinition = {
  id: string;
  slug: string;
  name: string;
  category: string;
  type: string;
  description: string;
  image: string;
  version: number;
  status: string;
  input_schema: ToolField[];
  methodology: string;
  limits: string;
  next_action: string;
  related_content: string[];
  related_tools: string[];
  dimensions?: { id: string; label: string }[];
  sources?: { label: string; url: string }[];
  [key: string]: unknown;
};
export type ToolAnswers = Record<string, any>;
export type ToolResult = {
  title: string;
  value: string | null;
  lines: string[];
  methodology: string;
  limits: string;
  next_action: string;
  breakdown?: {
    id: string;
    label: string;
    score: number | null;
    answered: number;
    total: number;
  }[];
  recommendations?: { title: string; text: string }[];
  tables?: { title: string; headers: string[]; rows: string[][] }[];
  funnels?: { label: string; stages: { label: string; count: number }[] }[];
};
export const PRIVACY_VERSION: string;
export const toolRegistry: ToolDefinition[];
export const legacyToolRegistry: ToolDefinition[];
export const claroTemplates: {
  id: string;
  name: string;
  answers: ToolAnswers;
}[];
export const plannerFields: ToolField[];
export const funnelStages: [string, string][];
export function getToolVersion(
  id: string,
  version: number,
): ToolDefinition | undefined;
export function initialAnswers(tool: ToolDefinition): ToolAnswers;
export function normalizeToolAnswers(
  tool: ToolDefinition,
  raw: ToolAnswers,
): ToolAnswers;
export function upgradeToolAnswers(
  tool: ToolDefinition,
  raw: ToolAnswers,
  version: number,
): ToolAnswers;
export function calculateTool(
  tool: ToolDefinition,
  raw: ToolAnswers,
): { answers: ToolAnswers; result: ToolResult; text: string };
export function csvCell(value: unknown): string;
export function exportToolCSV(
  tool: ToolDefinition,
  answers: ToolAnswers,
): string;
export function safeAttribution(
  search?: string,
  referrer?: string,
): Record<string, string>;
export function safePublicationUrl(value: string): string;
