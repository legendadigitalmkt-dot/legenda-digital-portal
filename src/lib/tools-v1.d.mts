export type ToolField = {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  min?: number;
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
};
export const PRIVACY_VERSION: string;
export const toolRegistry: ToolDefinition[];
export function initialAnswers(tool: ToolDefinition): ToolAnswers;
export function normalizeToolAnswers(
  tool: ToolDefinition,
  raw: ToolAnswers,
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
