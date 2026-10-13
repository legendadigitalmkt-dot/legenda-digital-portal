import {LeadForm} from '../../components/forms';
import React, { useEffect, useRef, useState } from "react";
import { Copy, Download, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  calculateTool,
  toolRegistry,
  initialAnswers,
  normalizeToolAnswers,
  upgradeToolAnswers,
  exportToolCSV,
  type ToolDefinition,
  type ToolAnswers,
  type ToolResult,
} from "../../lib/tools-engine.mjs";
import { db } from "../../services/supabase";
import { getRun, saveRun, toolEvent, recordExport } from "../../services/tools";
import { PortalAuth, usePortalUser } from "./PortalAuth";
import ToolForm from "./ToolForm";
import ToolResultPanel from "./ToolResultPanel";
import ToolPrintReport from "./ToolPrintReport";
import { downloadText } from "../../pages/Tools";

export default function ToolWorkspace({
  tool: summaryTool,
}: {
  tool: ToolDefinition;
}) {
  const tool = {
    ...toolRegistry.find((t) => t.id === summaryTool.id)!,
    name: summaryTool.name,
    description: summaryTool.description,
  };
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
    [printReport, setPrintReport] = useState(false),
    [parentId, setParentId] = useState<string | null>(null),
    [legacyAnswers, setLegacyAnswers] = useState<ToolAnswers | null>(null);
  const viewed = useRef(false);
  const runId = useRef(""),
    sessionId = useRef(""),
    startedAt = useRef(""),
    started = useRef(false),
    completed = useRef(false),
    steps = useRef(new Set<string>()),
    resultPanel = useRef<HTMLElement>(null);
  const localKey = "ld-tool-draft-v" + tool.version + "-" + tool.id;
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
            upgradeToolAnswers(
              tool,
              Object.fromEntries(
                old.map((value, i) => ["criterion_" + (i + 1), value]),
              ),
              1,
            ),
          );
      } else if (tool.id === "planner-editorial") {
        const old = JSON.parse(
          localStorage.getItem("ld-editorial-plan") || "null",
        );
        if (Array.isArray(old))
          setLegacyAnswers(upgradeToolAnswers(tool, { rows: old }, 1));
      }
    } catch {}
    if (tool.version === 2) {
      try {
        const previous = JSON.parse(
          sessionStorage.getItem("ld-tool-draft-v1-" + tool.id) || "null",
        );
        if (previous?.answers && Date.now() - previous.at < 7 * 86400000)
          setLegacyAnswers(upgradeToolAnswers(tool, previous.answers, 1));
      } catch {}
    }
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
          if (run.tool_id !== tool.id)
            throw Error("Esta versão não pode ser duplicada nesta ferramenta.");
          if (active) {
            setAnswers(upgradeToolAnswers(tool, run.answers, run.tool_version));
            setParentId(run.id);
            setName(run.name.slice(0, 112) + " (cópia)");
            setMessage(
              run.tool_version === tool.version
                ? "Cópia carregada. O resultado original foi preservado."
                : "Revisão carregada na versão atual. Confira os novos critérios; a execução original foi preservada.",
            );
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
  useEffect(() => {
    if (!printReport) return;
    const finish = () => setPrintReport(false);
    window.addEventListener("afterprint", finish);
    const timer = setTimeout(() => window.print(), 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
    };
  }, [printReport]);
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
        parentId,
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
    <div
      className={
        "tools-engine " +
        (tool.id === "planner-editorial" ? "tools-engine-planner" : "")
      }
    >
      {printReport && result && (
        <ToolPrintReport tool={tool} result={result.result} />
      )}
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
              <ToolResultPanel result={result.result} tool={tool} />
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPrintReport(true)}
              >
                Imprimir / salvar PDF
              </Button>
              <p className="microcopy">
                Escolha “Salvar como PDF” no diálogo de impressão do navegador.
              </p>
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
        {result&&<div className="brief-tool-capture"><h2>Continue aprendendo no LD Brief</h2><p>Receba novos guias e ferramentas. A inscrição é opcional.</p><LeadForm source={"tool-"+tool.id}/></div>}</section>
      </div>
    </div>
  );
}
