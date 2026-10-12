import { db } from "./supabase";
import {
  PRIVACY_VERSION,
  safeAttribution,
  type ToolDefinition,
  type ToolAnswers,
  type ToolResult,
} from "../lib/tools-engine.mjs";
export type SavedRun = {
  id: string;
  tool_id: string;
  tool_version: number;
  name: string;
  favorite: boolean;
  completed_at: string;
  answers: ToolAnswers;
  result_summary: ToolResult;
};
function normalizeRun(row: Record<string, any>): SavedRun {
  const r = row.result_summary || {},
    text = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    ...row,
    result_summary: {
      title: text(r.title),
      value: text(r.value) || null,
      lines: Array.isArray(r.lines)
        ? r.lines.filter((x: unknown) => typeof x === "string").slice(0, 100)
        : [],
      methodology: text(r.methodology),
      limits: text(r.limits),
      next_action: text(r.next_action),
    },
  } as SavedRun;
}
export async function toolEvent(toolId: string, event: string, step?: string) {
  if (
    !db ||
    typeof window === "undefined" ||
    localStorage.getItem("ld-analytics-consent") !== "yes"
  )
    return;
  // No responses, result values, user/session IDs or arbitrary metadata.
  try {
    await db.from("tool_events").insert({
      tool_id: toolId,
      event_name: event,
      step_key: step || null,
      consent: true,
      privacy_version: PRIVACY_VERSION,
    });
  } catch {}
}
export async function saveRun(
  tool: ToolDefinition,
  runId: string,
  name: string,
  answers: ToolAnswers,
  result: ToolResult,
  startedAt: string,
  sessionId: string,
) {
  if (!db) throw new Error("Histórico temporariamente indisponível.");
  if (
    new TextEncoder().encode(JSON.stringify(answers)).length > 32768 ||
    new TextEncoder().encode(JSON.stringify(result)).length > 32768
  )
    throw new Error(
      "Este resultado excede o limite do histórico. Reduza os textos ou exporte o arquivo no seu computador.",
    );
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user)
    throw new Error("Entre na sua conta do portal para salvar.");
  const { data, error } = await db.rpc("save_tool_run", {
    p_id: runId,
    p_tool_id: tool.id,
    p_version: tool.version,
    p_name: name.trim(),
    p_answers: answers,
    p_result: result,
    p_started_at: startedAt,
    p_session_id: sessionId,
    p_attribution: safeAttribution(location.search, document.referrer),
  });
  if (error || !data)
    throw new Error(
      "Não foi possível salvar. Confira sua conexão e tente novamente; seu resultado continua aqui.",
    );
  return String(data);
}
export async function loadRuns(offset = 0) {
  if (!db) throw new Error("Histórico indisponível.");
  const { data, error } = await db
    .from("tool_runs")
    .select(
      "id,tool_id,tool_version,name,favorite,completed_at,answers,result_summary",
    )
    .order("completed_at", { ascending: false })
    .range(offset, offset + 19);
  if (error) throw new Error("Não foi possível carregar seu histórico.");
  return (data || []).map(normalizeRun);
}
export async function getRun(id: string) {
  if (!db || !/^[a-f0-9-]{36}$/i.test(id))
    throw new Error("Resultado indisponível.");
  const { data, error } = await db
    .from("tool_runs")
    .select(
      "id,tool_id,tool_version,name,favorite,completed_at,answers,result_summary",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data)
    throw new Error("Resultado indisponível para esta conta.");
  return normalizeRun(data);
}
export async function updateRun(
  id: string,
  values: { name?: string; favorite?: boolean },
) {
  if (!db) throw new Error("Histórico indisponível.");
  const { data, error } = await db
    .from("tool_runs")
    .update(values)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error("Não foi possível atualizar este resultado.");
}
export async function deleteRun(id: string) {
  if (!db) throw new Error("Histórico indisponível.");
  const { data, error } = await db
    .from("tool_runs")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error("Não foi possível excluir este resultado.");
}
export async function recordExport(runId: string, format: string) {
  if (!db) return;
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user)
    await db
      .from("tool_exports")
      .insert({ run_id: runId, user_id: user.id, format });
}
