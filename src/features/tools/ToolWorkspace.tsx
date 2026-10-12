import React, { useEffect, useRef, useState } from "react";
import { Copy, Download, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  calculateTool,
  initialAnswers,
  normalizeToolAnswers,
  exportToolCSV,
  type ToolDefinition,
  type ToolAnswers,
  type ToolResult,
} from "../../lib/tools-engine.mjs";
import { db } from "../../services/supabase";
import { getRun, saveRun, toolEvent, recordExport } from "../../services/tools";
import { PortalAuth, usePortalUser } from "./PortalAuth";
import { downloadText } from "../../pages/Tools";

export function ToolForm({
  tool,
  answers,
  onChange,
  onStep,
}: {
  tool: ToolDefinition;
  answers: ToolAnswers;
  onChange: (a: ToolAnswers) => void;
  onStep: (key: string) => void;
}) {
  return (
    <>
      {tool.input_schema.map((f) =>
        f.type === "rows" ? (
          <div key={f.id} className="tool-planner">
            <h3>Pautas</h3>
            {answers.rows.map((r: Record<string, string>, i: number) => (
              <fieldset key={i}>
                <legend>Pauta {i + 1}</legend>
                {[
                  ["theme", "Tema", "text"],
                  ["format", "Formato", "text"],
                  ["channel", "Canal", "text"],
                  ["date", "Data", "date"],
                ].map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    <input
                      type={type}
                      maxLength={500}
                      value={r[key]}
                      onBlur={() => onStep(f.id)}
                      onChange={(e) =>
                        onChange({
                          ...answers,
                          rows: answers.rows.map((row: unknown, j: number) =>
                            j === i ? { ...r, [key]: e.target.value } : row,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={"Remover pauta " + (i + 1)}
                  onClick={() =>
                    onChange({
                      ...answers,
                      rows: answers.rows.filter(
                        (_: unknown, j: number) => j !== i,
                      ),
                    })
                  }
                >
                  <Trash2 size={18} />
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={answers.rows.length >= 50}
              onClick={() =>
                onChange({
                  ...answers,
                  rows: [
                    ...answers.rows,
                    { theme: "", format: "Artigo", channel: "Site", date: "" },
                  ],
                })
              }
            >
              <Plus size={17} />
              Adicionar pauta
            </Button>
          </div>
        ) : f.type === "checkbox" ? (
          <label className="tool-check" key={f.id}>
            <input
              type="checkbox"
              checked={answers[f.id] === true}
              onChange={(e) => {
                onChange({ ...answers, [f.id]: e.target.checked });
                onStep(f.id);
              }}
            />
            {f.label}
          </label>
        ) : (
          <label key={f.id}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                rows={3}
                maxLength={2000}
                placeholder={f.placeholder}
                value={answers[f.id]}
                onBlur={() => onStep(f.id)}
                onChange={(e) =>
                  onChange({ ...answers, [f.id]: e.target.value })
                }
              />
            ) : (
              <input
                type={f.type}
                min={f.min}
                step="1"
                value={answers[f.id]}
                onBlur={() => onStep(f.id)}
                onChange={(e) =>
                  onChange({ ...answers, [f.id]: e.target.value })
                }
              />
            )}
          </label>
        ),
      )}
    </>
  );
}
export function ToolResultPanel({ result }: { result: ToolResult }) {
  return (
    <>
      <h2>{result.title}</h2>
      {result.value && (
        <strong className="tool-result-value">{result.value}</strong>
      )}
      <div className="tool-result-lines">
        {result.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <h3>Como interpretar</h3>
      <p>{result.methodology}</p>
      <p className="microcopy">{result.limits}</p>
      <h3>Próximo passo</h3>
      <p>{result.next_action}</p>
    </>
  );
}

export default function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const { user, ready } = usePortalUser();
  const [answers, setAnswers] = useState<ToolAnswers>(() =>
      initialAnswers(tool),
    ),
    [result, setResult] = useState<ReturnType<typeof calculateTool> | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saveOpen, setSaveOpen] = useState(false),
    [name, setName] = useState(tool.name),
    [saveConsent, setSaveConsent] = useState(false),
    [localConsent, setLocalConsent] = useState(false),
    [savedId, setSavedId] = useState(""),
    [paused, setPaused] = useState(false),
    [legacyAnswers, setLegacyAnswers] = useState<ToolAnswers | null>(null);
  const viewed = useRef(false);
  const runId = useRef(""),
    sessionId = useRef(""),
    startedAt = useRef(""),
    started = useRef(false),
    completed = useRef(false),
    steps = useRef(new Set<string>()),
    resultPanel = useRef<HTMLElement>(null);
  const localKey = "ld-tool-draft-v1-" + tool.id;
  useEffect(() => {
    runId.current = crypto.randomUUID();
    sessionId.current = crypto.randomUUID();
    startedAt.current = new Date().toISOString();
    if (!viewed.current) {
      viewed.current = true;
      toolEvent(tool.id, "tool_viewed");
    }
    let active = true;
    try {
      if (tool.id === "checklist-conteudo") {
        const old = JSON.parse(localStorage.getItem("ld-checklist") || "null");
        if (
          Array.isArray(old) &&
          old.length === 10 &&
          old.every((x) => typeof x === "boolean")
        )
          setLegacyAnswers(
            Object.fromEntries(
              old.map((value, i) => ["criterion_" + (i + 1), value]),
            ),
          );
      } else if (tool.id === "planner-editorial") {
        const old = JSON.parse(
          localStorage.getItem("ld-editorial-plan") || "null",
        );
        if (Array.isArray(old))
          setLegacyAnswers(normalizeToolAnswers(tool, { rows: old }));
      }
    } catch {}
    db?.from("tools")
      .select("status")
      .eq("id", tool.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setPaused(data?.status === "paused");
      });
    const restore = async () => {
      const id = new URLSearchParams(location.search).get("run");
      if (id) {
        try {
          const run = await getRun(id);
          if (run.tool_id !== tool.id || run.tool_version !== tool.version)
            throw Error("Esta versão não pode ser duplicada nesta ferramenta.");
          if (active) {
            setAnswers(normalizeToolAnswers(tool, run.answers));
            setName(run.name + " (cópia)");
            setMessage("Cópia carregada. O resultado original foi preservado.");
          }
        } catch (e) {
          if (active) setError((e as Error).message);
        }
        return;
      }
      try {
        const saved = JSON.parse(sessionStorage.getItem(localKey) || "null");
        if (saved && Date.now() - saved.at < 7 * 86400000) {
          setAnswers(normalizeToolAnswers(tool, saved.answers));
          setLocalConsent(true);
          setMessage("Rascunho recuperado nesta aba.");
        } else sessionStorage.removeItem(localKey);
      } catch {
        sessionStorage.removeItem(localKey);
      }
    };
    restore();
    return () => {
      active = false;
    };
  }, [tool.id]);
  useEffect(() => {
    try {
      if (localConsent)
        sessionStorage.setItem(
          localKey,
          JSON.stringify({ answers, at: Date.now() }),
        );
      else sessionStorage.removeItem(localKey);
    } catch {
      setError(
        "O navegador não permitiu guardar o rascunho. Você pode continuar usando a ferramenta.",
      );
    }
  }, [answers, localConsent, localKey]);
  const change = (a: ToolAnswers) => {
    setAnswers(a);
    setResult(null);
    setSavedId("");
    setError("");
    setMessage("");
    setSaveOpen(false);
    setSaveConsent(false);
    if (completed.current) {
      completed.current = false;
      started.current = false;
      steps.current.clear();
    }
    if (!started.current) {
      started.current = true;
      toolEvent(tool.id, "tool_started");
    }
    runId.current = crypto.randomUUID();
  };
  const step = (key: string) => {
    const field = tool.input_schema.find((f) => f.id === key),
      value = answers[key];
    const filled =
      field?.type === "checkbox" ||
      (field?.type === "rows" &&
        Array.isArray(value) &&
        value.some((r) => r.theme)) ||
      (typeof value === "string" && value.trim().length > 0);
    if (filled && started.current && !steps.current.has(key)) {
      steps.current.add(key);
      toolEvent(tool.id, "tool_step_completed", key);
    }
  };
  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const next = calculateTool(tool, answers);
      setResult(next);
      setError("");
      setMessage("Resultado preparado. Revise a interpretação abaixo.");
      if (!started.current) {
        started.current = true;
        toolEvent(tool.id, "tool_started");
      }
      if (!completed.current) {
        completed.current = true;
        toolEvent(tool.id, "tool_completed");
      }
      requestAnimationFrame(() => {
        resultPanel.current?.focus({ preventScroll: true });
        resultPanel.current?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const save = async () => {
    if (!result || !saveConsent || !user) return;
    setBusy(true);
    try {
      const id = await saveRun(
        tool,
        runId.current,
        name,
        result.answers,
        result.result,
        startedAt.current,
        sessionId.current,
      );
      setSavedId(id);
      setMessage("Resultado salvo no seu histórico privado.");
      setSaveOpen(false);
      toolEvent(tool.id, "tool_saved");
      sessionStorage.removeItem(localKey);
      setLocalConsent(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportFile = (format: "csv" | "txt") => {
    if (!result) return;
    downloadText(
      format === "csv" ? exportToolCSV(tool, result.answers) : result.text,
      tool.slug + "." + format,
      format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8",
    );
    toolEvent(tool.id, "tool_exported");
    if (savedId) recordExport(savedId, format);
  };
  if (paused)
    return (
      <div className="info-card">
        <h2>Ferramenta em manutenção</h2>
        <p>
          Este recurso está pausado pela equipe. Explore as outras ferramentas.
        </p>
      </div>
    );
  return (
    <div className="tools-engine">
      <div className="tool-workspace engine-workspace">
        <section className="tool-input">
          <h2>1. Informe seu contexto</h2>
          <p>
            Use dados do seu processo. Evite informações pessoais ou
            confidenciais.
          </p>
          {legacyAnswers && (
            <div className="info-card">
              <p>Há um rascunho da versão anterior neste navegador.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  change(legacyAnswers);
                  setLegacyAnswers(null);
                  setMessage(
                    "Rascunho anterior recuperado. Nada foi enviado ao servidor.",
                  );
                }}
              >
                Recuperar rascunho anterior
              </Button>
            </div>
          )}
          <form onSubmit={calculate}>
            <ToolForm
              tool={tool}
              answers={answers}
              onChange={change}
              onStep={step}
            />
            <label className="tool-check tool-local-consent">
              <input
                type="checkbox"
                checked={localConsent}
                onChange={(e) => setLocalConsent(e.target.checked)}
              />
              Guardar este rascunho só nesta aba, até ela ser fechada.
            </label>
            <Button type="submit">Preparar resultado</Button>
          </form>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <p role="status">{message}</p>
        </section>
        <section
          ref={resultPanel}
          tabIndex={-1}
          className="output-panel engine-result"
          aria-label="Resultado da ferramenta"
        >
          {result ? (
            <>
              <ToolResultPanel result={result.result} />
              <div className="tool-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(result.text)
                      .then(() => setMessage("Resultado copiado."))
                      .catch(() =>
                        setError("Selecione o resultado e copie manualmente."),
                      )
                  }
                >
                  <Copy size={17} />
                  Copiar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exportFile("txt")}
                >
                  <Download size={17} />
                  TXT
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exportFile("csv")}
                >
                  <Download size={17} />
                  CSV
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(savedId)}
                  onClick={() => setSaveOpen(true)}
                >
                  {savedId ? <CheckCircle2 size={17} /> : <Save size={17} />}{" "}
                  {savedId ? "Salvo" : "Salvar resultado"}
                </Button>
              </div>
              {saveOpen && (
                <div className="tool-save">
                  {!ready ? (
                    <p>Verificando sua conta…</p>
                  ) : !user ? (
                    <PortalAuth />
                  ) : (
                    <>
                      <h3>Salvar no histórico privado</h3>
                      <label>
                        Nome do resultado
                        <input
                          value={name}
                          maxLength={120}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                      <label className="tool-check">
                        <input
                          type="checkbox"
                          checked={saveConsent}
                          onChange={(e) => setSaveConsent(e.target.checked)}
                        />
                        Quero guardar estas respostas e este resultado na minha
                        conta, por até 365 dias. Posso excluir no histórico.{" "}
                        <a href="/privacidade#ferramentas">Ver detalhes</a>.
                      </label>
                      <Button
                        type="button"
                        disabled={busy || !saveConsent || !name.trim()}
                        onClick={save}
                      >
                        {busy ? "Salvando…" : "Confirmar e salvar"}
                      </Button>
                    </>
                  )}
                </div>
              )}
              <a className="text-link" href="/conta/ferramentas">
                Abrir meu histórico →
              </a>
            </>
          ) : (
            <>
              <p className="eyebrow">2. RESULTADO COM CONTEXTO</p>
              <h2>Uma saída para aplicar.</h2>
              <p>
                Preencha os campos e prepare o resultado. Você pode copiar ou
                exportar sem criar conta.
              </p>
              <p className="microcopy">
                Salvar no histórico é opcional e requer login.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
