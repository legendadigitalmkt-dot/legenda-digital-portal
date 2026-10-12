import React, { useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Post } from "../types";
import { PostCard, Empty, SectionHead } from "./editorial";
const themes = [
  "IA",
  "Marketing",
  "Vendas",
  "Tecnologia",
  "Growth",
  "Negócios",
  "Conteúdo",
  "Creators",
];
const formats = [
  ["article", "Artigos"],
  ["guide", "Guias"],
  ["news", "Notícias"],
  ["case", "Cases"],
  ["building", "Building"],
];
const labels: Record<string, string> = {
  guide: "Guias para aplicar.",
  news: "Notícias com contexto.",
  case: "Cases e aprendizados.",
  building: "Construindo em público.",
};
export function ContentPage({
  posts,
  kind,
  path,
  categoryTitle,
}: {
  posts: Post[];
  kind?: string;
  path: string;
  categoryTitle?: string;
}) {
  const params = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const requested = params.get("categoria") || "Todos";
  const [query, setQuery] = useState(params.get("q") || "");
  const [theme, setTheme] = useState(
    themes.includes(requested) ? requested : "Todos",
  );
  const [category, setCategory] = useState(
    themes.includes(requested) ? "Todos" : requested,
  );
  const [tag, setTag] = useState(params.get("tag") || "Todos");
  const [format, setFormat] = useState(kind || "Todos");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const editorias = [...new Set(posts.map((p) => p.category))];
  const tags = [...new Set(posts.flatMap((p) => p.tags || []))].sort();
  const hasTheme = (p: Post, t: string) => {
    const text = [
      p.title,
      p.excerpt,
      p.category,
      ...(p.tags || []),
      ...(p.topics || []),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    if (t === "IA")
      return /\bia\b|inteligência artificial|inteligencia artificial|ai search|agentes de ia/.test(
        text,
      );
    return text.includes(t.toLocaleLowerCase("pt-BR"));
  };
  const filtered = posts.filter(
    (p) =>
      (format === "Todos" ? p.kind !== "building" : p.kind === format) &&
      (category === "Todos" || p.category === category) &&
      (theme === "Todos" || hasTheme(p, theme)) &&
      (tag === "Todos" || p.tags?.includes(tag)) &&
      [p.title, p.excerpt, ...p.tags]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const reset = () => {
    setQuery("");
    setTheme("Todos");
    setCategory("Todos");
    setTag("Todos");
    setFormat(kind || "Todos");
  };
  const controls = (
    <>
      <fieldset className="theme-filters">
        <legend>Temas</legend>
        <div className="theme-chips">
          {["Todos", ...themes].map((t) => (
            <button
              type="button"
              aria-pressed={theme === t}
              className={theme === t ? "active" : ""}
              key={t}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="hub-selects">
        <label>
          Formatos
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={Boolean(kind)}
          >
            <option value="Todos">Todos os formatos</option>
            {formats.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Editorias
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Todos">Todas as editorias</option>
            {editorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Tags
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option>Todos</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className="text-link reset-filters" onClick={reset}>
        Limpar filtros
      </button>
    </>
  );
  return (
    <>
      <section className="page-intro hub-intro">
        <div className="container">
          <p className="eyebrow">
            {kind === "building"
              ? "BUILDING LEGENDA DIGITAL"
              : "LD MEDIA · CONHECIMENTO E APLICAÇÃO"}
          </p>
          <h1>
            {categoryTitle ||
              labels[kind || ""] ||
              "Conhecimento que encontra a prática."}
          </h1>
          <p>
            Entenda o que muda, encontre contexto e escolha seu próximo passo.
            Explore os temas da Legenda Digital.
          </p>
        </div>
      </section>
      <section className="section content-hub">
        <div className="container">
          <div className="hub-search">
            <label className="search-field">
              <Search size={22} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque um assunto ou uma ideia"
                aria-label="Buscar conteúdos"
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary mobile-filter-trigger"
              aria-expanded={open}
              onClick={() => {
                dialog.current?.showModal();
                setOpen(true);
              }}
            >
              <SlidersHorizontal size={18} />
              Filtros
            </button>
          </div>
          <div className="desktop-filters">{controls}</div>
          <dialog
            ref={dialog}
            className="filter-dialog"
            onClose={() => setOpen(false)}
            onClick={(e) => {
              if (e.target === dialog.current) dialog.current?.close();
            }}
          >
            <div className="dialog-heading">
              <h2>Filtros de conteúdo</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar filtros"
                onClick={() => dialog.current?.close()}
              >
                <X />
              </button>
            </div>
            <div className="dialog-filters">{controls}</div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dialog.current?.close()}
            >
              Ver {filtered.length} conteúdo{filtered.length !== 1 ? "s" : ""}
            </button>
          </dialog>
          <div className="hub-results-head">
            <p role="status" aria-live="polite">
              <b>{filtered.length}</b> conteúdo
              {filtered.length !== 1 ? "s" : ""}
              {theme !== "Todos" ? ` sobre ${theme}` : ""}
            </p>
            <span>
              {categoryTitle || "Inteligência prática, em diferentes formatos."}
            </span>
          </div>
          {filtered.length ? (
            <div className="post-grid">
              {filtered.map((p) => (
                <PostCard post={p} key={p.slug} />
              ))}
            </div>
          ) : (
            <Empty
              title="Nada por aqui com esses filtros."
              text="Tente outro termo, tema ou formato. Novos conteúdos aparecem após revisão editorial."
            />
          )}
          <div className="hub-editorial-note">
            <SectionHead
              label="GROWTH INTELLIGENCE"
              title="Análises com contexto. Aplicação com limites."
              description="Dados verificados, análise e hipóteses aparecem com suas fontes. A leitura editorial continua independente da oferta de produto."
              href="/newsletter"
              link="Acompanhar pelo LD Brief"
            />
          </div>
        </div>
      </section>
    </>
  );
}
