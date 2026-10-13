import React, { lazy, Suspense, useState, useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageIntro } from "./PublicPages";
import type { ToolDefinition } from "../lib/tools-engine.mjs";
import { toolCatalog as toolRegistry } from "../lib/tool-catalog";
import { db } from "../services/supabase";
export function downloadText(text: string, name: string, type = "text/plain") {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
const Workspace = lazy(() => import("../features/tools/ToolWorkspace"));
export function ToolHeader({ tool }: { tool: ToolDefinition }) {
  return (
    <PageIntro
      label={
        "LD TOOLS / " + tool.category.toUpperCase() + " · V" + tool.version
      }
      title={tool.name}
      text={tool.description}
    />
  );
}
export function ToolsPage() {
  const [category, setCategory] = useState("Todas");
  const [catalog, setCatalog] = useState(toolRegistry);
  useEffect(() => {
    let active = true;
    db?.from("tools")
      .select("id,name,description,status")
      .then(({ data }) => {
        if (active && data)
          setCatalog(
            toolRegistry.map((t) => ({
              ...t,
              ...data.find((x) => x.id === t.id),
              version: t.version,
            })),
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const visible = catalog
    .filter((t) => category === "Todas" || t.category === category)
    .filter((t) => t.status === "published");
  return (
    <>
      <PageIntro
        label="LD TOOLS / LABS"
        title="Ferramentas para aplicar."
        text="Calcule, organize e revise com contexto. Use sem conta; salve seus resultados quando quiser voltar a eles."
      />
      <section className="section tools-directory">
        <div className="container">
          <div className="tools-directory-head">
            <div
              role="group"
              aria-label="Filtrar ferramentas por categoria"
              className="tool-filters"
            >
              {[
                "Todas",
                "Growth",
                "Marketing",
                "Vendas",
                "Conteúdo",
                "IA",
                "Dados",
                "Negócios",
              ].map((c) => (
                <button
                  type="button"
                  aria-pressed={category === c}
                  key={c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <a className="text-link" href="/conta/ferramentas">
              Meu histórico →
            </a>
          </div>
          <div className="tools-grid">
            {visible.map((t) => (
              <a
                href={"/ferramentas/" + t.slug}
                className="tool-card visual-tool"
                key={t.id}
              >
                <img
                  src={t.image}
                  alt=""
                  loading="lazy"
                  width="500"
                  height="320"
                />
                <div>
                  <span className="accent-icon">
                    <Sparkles size={25} />
                  </span>
                  <small>
                    {t.category} · {t.type}
                  </small>
                  <h2>{t.name}</h2>
                  <p>{t.description}</p>
                  <span className="text-link">
                    Abrir ferramenta
                    <ArrowRight size={17} />
                  </span>
                </div>
              </a>
            ))}
          </div>
          {!visible.length && (
            <div className="info-card">
              <h2>Novas ferramentas em preparação</h2>
              <p>
                Esta categoria será ampliada após validação. Explore os recursos
                disponíveis nas outras categorias.
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="section section-soft">
        <div className="container narrow center">
          <h2>Volte ao que você construiu.</h2>
          <p>
            Uma conta do portal permite nomear, favoritar, comparar e duplicar
            resultados. O uso básico continua aberto.
          </p>
          <a href="/conta" className="btn btn-secondary">
            Minha conta
            <ArrowRight size={18} />
          </a>
        </div>
      </section>
    </>
  );
}
export function ToolPage({
  slug,
  server = false,
}: {
  slug: string;
  server?: boolean;
}) {
  const original = toolRegistry.find((t) => t.slug === slug);
  const [override, setOverride] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let active = true;
    if (original)
      db?.from("tools")
        .select("name,description")
        .eq("id", original.id)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setOverride(data);
        });
    return () => {
      active = false;
    };
  }, [slug]);
  if (!original) return null;
  const tool = { ...original, ...override };
  return (
    <>
      <ToolHeader tool={tool} />
      <section className="section tool-page">
        <div className="container">
          <a href="/ferramentas" className="back-link">
            ← Todas as ferramentas
          </a>
          {server ? (
            <div className="tool-workspace-placeholder">
              <p>
                A ferramenta abre no navegador. Não é necessário criar uma
                conta.
              </p>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="tool-workspace-placeholder" role="status">
                  Carregando a ferramenta…
                </div>
              }
            >
              <Workspace tool={tool} />
            </Suspense>
          )}
          <div className="tool-methodology">
            <h2>Quando usar</h2>
            <p>{tool.description}</p>
            <h2>Metodologia e limites</h2>
            <p>{tool.methodology}</p>
            <p>{tool.limits}</p>
            {tool.sources && (
              <ul>
                {tool.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <details>
              <summary>Preciso de uma conta?</summary>
              <p>
                Não para usar, copiar ou exportar. Uma conta é necessária
                somente para guardar o resultado no histórico privado.
              </p>
            </details>
            <details>
              <summary>Minhas respostas ficam públicas?</summary>
              <p>
                Não. As respostas anônimas ficam nesta página. O histórico da
                conta só pode ser lido por você. Não há compartilhamento público
                automático.
              </p>
            </details>
          </div>
          <RelatedTools tool={tool} />
        </div>
      </section>
    </>
  );
}
export function RelatedTools({ tool }: { tool: ToolDefinition }) {
  return (
    <section className="tool-related">
      <h2>Continue aplicando</h2>
      <div className="three-grid">
        {tool.related_tools
          .map((id) => toolRegistry.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => (
            <a
              className="info-card"
              key={t!.id}
              href={"/ferramentas/" + t!.slug}
            >
              <h3>{t!.name}</h3>
              <p>{t!.description}</p>
            </a>
          ))}
      </div>
      <a href="/conteudos" className="text-link">
        Explore conteúdos para aprofundar →
      </a>
    </section>
  );
}
