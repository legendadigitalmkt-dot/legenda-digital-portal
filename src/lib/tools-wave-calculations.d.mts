import type {
  ToolDefinition,
  ToolAnswers,
  ToolResult,
} from "./tools-engine.mjs";
export function waveInitialAnswers(tool: ToolDefinition): ToolAnswers;
export function normalizeWaveAnswers(
  tool: ToolDefinition,
  raw: ToolAnswers,
): ToolAnswers;
export function calculateWave(
  tool: ToolDefinition,
  raw: ToolAnswers,
): { answers: ToolAnswers; result: ToolResult; text: string };
export function safePublicationUrl(value: string): string;
