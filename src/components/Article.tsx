import ArticleBanners from './ArticleBanners';
import {normalizeExtras} from '../lib/article-extras.mjs';
import { SidebarPromo } from "./ProductPreview";
import { imageKind, imagePosition } from "./ArticleCover";
import React, {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DOMPurify from "dompurify";
import {
  ArrowUpRight,
  Check,
  Copy,
  Link as LinkIcon,
  List,
  Mail,
  Share2,
} from "lucide-react";
import type { Post, SiteConfig } from "../types";
import { articleUrl, categorySlug } from "../types/editorial";
import { safeUrl } from "../lib/validation";
import { trackEditorial } from "../services/supabase";
import { PostCard, BriefSection, SectionHead } from "./editorial";
const Comments = lazy(() => import("./Comments"));
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
export function prepareArticle(body: string) {
  const headings: { id: string; title: string; level: number }[] = [];
  const ids = new Set<string>();
  const html = body.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_, level, attrs, content) => {
      const title = plain(content);
      const old = attrs.match(/\bid="([a-zA-Z0-9_-]+)"/);
      let id =
        old?.[1] ||
        title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") ||
        "secao";
      const base = id;
      let n = 2;
      while (ids.has(id)) id = base + "-" + n++;
      ids.add(id);
      headings.push({ id, title, level: Number(level) });
      return `<h${level} id="${id}">${content}</h${level}>`;
    },
  );
  return {
    html: html.replace(
      /<table\b([^>]*)>/gi,
      (_, attrs) =>
        `<table${attrs} tabindex="0" aria-label="Tabela do artigo; role para ver todas as colunas">`,
    ),
    headings,
  };
}
export function relevantPosts(post: Post, posts: Post[]) {
  const manual = post.related_articles || [];
  return posts
    .filter(
      (p) =>
        p.slug !== post.slug &&
        p.status === "published" &&
        Date.parse(p.published_at) <= Date.now(),
    )
    .sort((a, b) => {
      const score = (p: Post) =>
        (manual.includes(p.slug) ? 1000 - manual.indexOf(p.slug) : 0) +
        (p.category === post.category ? 20 : 0) +
        (p.tags || []).filter((t) => post.tags?.includes(t)).length * 3;
      return (
        score(b) - score(a) ||
        Date.parse(b.published_at) - Date.parse(a.published_at)
      );
    })
    .slice(0, 4);
}
export function ArticlePage({
  post,
  posts,
  config,
  server = false,
  preview = false,
}: {
  post: Post;
  posts: Post[];
  config: SiteConfig;
  server?: boolean;
  preview?: boolean;
}) {
  const prepared = useMemo(
    () =>
      prepareArticle(
        server
          ? post.body
          : DOMPurify.sanitize(post.body, {
              USE_PROFILES: { html: true },
              FORBID_TAGS: [
                "iframe",
                "object",
                "embed",
                "form",
                "input",
                "style",
              ],
              ADD_ATTR: ["data-block"],
            }),
      ),
    [post.body, server],
  );
  const extras = normalizeExtras(post.article_extras);
  const sidebarBanners = extras.banners.filter(b=>b.placement === "sidebar");
  const afterBanners = extras.banners.filter(b=>b.placement === "after");
  const showDefaultPromo = !extras.hideGrowthPromo && !sidebarBanners.length;
  const [progress, setProgress] = useState(0);
  const [shareStatus, setShareStatus] = useState("");
  const bodyRef = useRef<HTMLElement>(null);
  const recorded = useRef(new Set<string>());
  const canonical = post.canonical_url || articleUrl(post.slug);
  const event = (name: string) => {
    if (!preview) void trackEditorial(name, post.id);
  };
  useEffect(() => {
    if (server || preview) return;
    const once = (name: string) => {
      if (
        localStorage.getItem("ld-analytics-consent") === "yes" &&
        !recorded.current.has(name)
      ) {
        recorded.current.add(name);
        void trackEditorial(name, post.id);
      }
    };
    once("article_viewed");
    let tick = false;
    const measure = () => {
      tick = false;
      const el = bodyRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const value = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((window.innerHeight - r.top) / Math.max(1, r.height)) * 100,
          ),
        ),
      );
      setProgress(value);
      [25, 50, 75].forEach((n) => {
        if (value >= n) once("article_scroll_" + n);
      });
      if (value >= 95) once("article_read_completed");
    };
    const scroll = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(measure);
      }
    };
    const consent = () => {
      once("article_viewed");
      measure();
    };
    measure();
    window.addEventListener("ld-analytics-consent-changed", consent);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      window.removeEventListener("ld-analytics-consent-changed", consent);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
    };
  }, [post.id, server, preview]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      setShareStatus("Link copiado");
      event("article_shared");
    } catch {
      setShareStatus("Copie este endereço: " + canonical);
    }
  };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url: canonical });
        event("article_shared");
      } else await copy();
    } catch {
      setShareStatus("Compartilhamento cancelado");
    }
  };
  const date = (s?: string) =>
    s && Number.isFinite(Date.parse(s))
      ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" })
      : "A definir";
  const modified =
    post.updated_at &&
    post.updated_at.slice(0, 10) !== post.published_at?.slice(0, 10);
  return (
    <>
      {!preview && (
        <div className="reading-progress" aria-hidden="true">
          <span style={{ width: progress + "%" }} />
        </div>
      )}
      <section className="article-head container">
        <nav aria-label="Caminho de navegação" className="breadcrumbs">
          <a href="/">Início</a>
          <span>/</span>
          <a href="/conteudos">Conteúdos</a>
          <span>/</span>
          <a
            href={
              "/categorias/" +
              (post.category_slug || categorySlug(post.category))
            }
          >
            {post.category}
          </a>
        </nav>
        <span className="category">{post.category}</span>
        {post.featured && <span className="editorial-label">Em destaque</span>}
        <h1>{post.title}</h1>
        <p>{post.subtitle || post.excerpt}</p>
        <div className="article-meta">
          <span className="author-avatar">LD</span>
          <div>
            <b>{post.author}</b>
            <span>
              {preview
                ? "Prévia · " + post.status
                : "Publicado em " + date(post.published_at)}{" "}
              · {post.reading_time} min de leitura
              {modified && <> · Atualizado em {date(post.updated_at)}</>}
            </span>
            {post.reviewer_name && (
              <span>Revisão editorial: {post.reviewer_name}</span>
            )}
          </div>
        </div>
        {post.show_share !== false && (
          <div className="article-share" aria-label="Compartilhar artigo">
            <a
              href={
                "https://wa.me/?text=" +
                encodeURIComponent(post.title + " " + canonical)
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => event("article_shared")}
            >
              WhatsApp
              <ArrowUpRight size={14} />
            </a>
            <a
              href={
                "https://www.linkedin.com/sharing/share-offsite/?url=" +
                encodeURIComponent(canonical)
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => event("article_shared")}
            >
              LinkedIn
              <ArrowUpRight size={14} />
            </a>
            <button type="button" onClick={copy}>
              {shareStatus === "Link copiado" ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
              Copiar link
            </button>
            <button type="button" onClick={share}>
              <Share2 size={16} />
              Compartilhar
            </button>
            <p className="microcopy" role="status">
              {shareStatus}
            </p>
          </div>
        )}
      </section>
      {post.featured_image && (
        <figure className="container article-hero">
          <picture>
            {post.hero_image_mobile && (
              <source
                media="(max-width: 600px)"
                srcSet={post.hero_image_mobile}
              />
            )}
            {post.hero_image_fallback && (
              <source type="image/webp" srcSet={post.featured_image} />
            )}
            <img
              src={post.hero_image_fallback || post.featured_image}
              alt={
                post.hero_image_alt ||
                `Imagem editorial de apoio: ${post.title}`
              }
              className={`hero-cover cover-${imageKind(post)}`}
              style={{ objectPosition: imagePosition(post.hero_position) }}
              width="1200"
              height="630"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <figcaption>
            {post.hero_image_caption || "Imagem ilustrativa"}
            {post.hero_image_credit && <> · {post.hero_image_credit}</>}
          </figcaption>
        </figure>
      )}
      <div className="article-layout container">
        <aside className="article-aside">
          <details
            className="article-toc"
            open={
              typeof window === "undefined" ||
              window.matchMedia("(min-width: 1100px)").matches
            }
          >
            <summary>
              <List size={18} /> Nesta leitura
            </summary>
            <nav aria-label="Índice do artigo">
              {prepared.headings
                .filter((h) => h.level === 2)
                .map((h) => (
                  <a
                    key={h.id}
                    href={"#" + h.id}
                    onClick={() => event("article_toc_clicked")}
                  >
                    {h.title}
                  </a>
                ))}
            </nav>
          </details>
          <div className="tag-list">
            {post.tags?.map((t) => (
              <a href={"/conteudos?tag=" + encodeURIComponent(t)} key={t}>
                {t}
              </a>
            ))}
          </div>
          <a
            href="/newsletter"
            onClick={() => event("article_newsletter_clicked")}
          >
            <Mail size={20} />
            Receba o LD Brief
          </a>

          {!!extras.links.length&&<nav className="article-manual-links" aria-label="Links selecionados"><h2>Links selecionados</h2>{extras.links.map((l,i)=><a key={i} href={l.url} target={l.newTab?"_blank":undefined} rel={l.newTab?"noopener noreferrer":undefined}>{l.label}{l.newTab&&<span className="sr-only"> (abre em nova aba)</span>}</a>)}</nav>}
          <div className="article-banners-desktop"><ArticleBanners banners={sidebarBanners}/></div>
          {showDefaultPromo && <SidebarPromo onClick={() => event("article_growth_cta_clicked")} />}
        </aside>
        <div className="article-main-column">
          <article
            ref={bodyRef}
            className="article-body"
            onClick={(e) => {
              const a = (e.target as HTMLElement).closest("a");
              if (!a) return;
              const href = (a.getAttribute("href") || "").replace(
                "https://legendadigital.com.br",
                "",
              );
              event(
                href === "/newsletter"
                  ? "article_newsletter_clicked"
                  : href === "/produtos/growth-os"
                    ? "article_growth_cta_clicked"
                    : href.startsWith("/")
                      ? "article_internal_link_clicked"
                      : "article_source_clicked",
              );
            }}
            dangerouslySetInnerHTML={{ __html: prepared.html }}
          />
          <ArticleBanners banners={sidebarBanners} mobile/>
          <ArticleBanners banners={afterBanners}/>
          {showDefaultPromo&&<SidebarPromo mobile onClick={() => event("article_growth_cta_clicked")}/> }
          {post.references?.length &&
          !/fontes|refer[eê]ncias|registro de checagem/i.test(
            prepared.headings.map((h) => h.title).join(" "),
          ) ? (
            <section className="article-extra article-references">
              <h2>Fontes e referências</h2>
              <ol>
                {post.references.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => event("article_source_clicked")}
                    >
                      {s.title}
                      <LinkIcon size={14} />
                    </a>
                    {s.note && <p>{s.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {relevantPosts(post, posts).length > 0 && (
            <section className="article-extra article-related">
              <div className="article-related-inner">
                <SectionHead
                  title="Continue explorando"
                  description="Leituras conectadas a este tema."
                />
                <div className="post-grid">
                  {relevantPosts(post, posts).map((p) => (
                    <PostCard post={p} key={p.slug} />
                  ))}
                </div>
              </div>
            </section>
          )}
          {!preview && post.show_comments !== false && post.id && (
            <section className="article-extra article-comments-section">
              <Suspense fallback={<p>Carregando conversa…</p>}>
                <Comments post={post} />
              </Suspense>
            </section>
          )}
          <section className="article-extra article-author-section">
            <div className="article-author">
              {post.author_profile?.avatar_url &&
              safeUrl(post.author_profile.avatar_url) ? (
                <img
                  className="author-avatar"
                  src={post.author_profile.avatar_url}
                  alt={post.author}
                  width="48"
                  height="48"
                  loading="lazy"
                />
              ) : (
                <span className="author-avatar">LD</span>
              )}
              <div>
                <h2>{post.author}</h2>
                <p>
                  {post.author_profile?.bio ||
                    "Conteúdo editorial da Legenda Digital. Fontes, exemplos e limites estão apresentados nesta leitura."}
                </p>
                {post.author_profile?.links
                  ?.filter((l) => safeUrl(l.url))
                  .map((l) => (
                    <a
                      className="text-link"
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={l.url}
                    >
                      {l.label}
                      <ArrowUpRight size={14} />
                    </a>
                  ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <BriefSection config={config} />
    </>
  );
}
