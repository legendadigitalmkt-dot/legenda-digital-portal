import * as Dialog from "@radix-ui/react-dialog";
import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Plus, Save, Eye, ArrowLeft, Copy, Archive } from "lucide-react";
import type { Post } from "../../types";
import { can, articleUrl } from "../../types/editorial";
import { db } from "../../services/supabase";
import { defaultConfig } from "../../lib/data";
import { ArticlePage } from "../../components/Article";
import VisualEditor from "./VisualEditor";
type Taxonomy = { id: string; name: string; slug?: string; bio?: string };
const blank = (): Post => ({
  title: "",
  slug: "",
  subtitle: "",
  excerpt: "",
  body: "<p></p>",
  featured_image: "",
  hero_image_alt: "",
  hero_image_caption: "",
  hero_image_credit: "",
  author: "Redação Legenda Digital",
  reviewer_name: "",
  category: "Futuro",
  tags: [],
  topics: [],
  kind: "article",
  status: "draft",
  published_at: new Date().toISOString(),
  reading_time: 4,
  seo_title: "",
  seo_description: "",
  og_title: "",
  og_description: "",
  og_image: "",
  canonical_url: "",
  allow_index: true,
  show_comments: true,
  show_share: true,
  featured: false,
  references: [],
  related_articles: [],
});
const editableKeys = [
  "title",
  "slug",
  "subtitle",
  "excerpt",
  "body",
  "featured_image",
  "hero_image_alt",
  "hero_image_caption",
  "hero_image_credit",
  "hero_image_mobile",
  "hero_image_fallback",
  "author",
  "author_id",
  "reviewer_id",
  "reviewer_name",
  "category",
  "category_id",
  "tags",
  "topics",
  "kind",
  "status",
  "published_at",
  "reading_time",
  "seo_title",
  "seo_description",
  "canonical_url",
  "og_title",
  "og_description",
  "og_image",
  "allow_index",
  "references",
  "related_articles",
  "content_blocks",
  "show_comments",
  "show_share",
  "featured",
  "scheduled_at",
] as const;
const localDate = (s?: string) =>
  s
    ? new Date(Date.parse(s) - new Date(s).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
export default function EditorialAdmin({
  role,
  building = false,
}: {
  role: string;
  building?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [cats, setCats] = useState<Taxonomy[]>([]);
  const [authors, setAuthors] = useState<Taxonomy[]>([]);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [author, setAuthor] = useState("all");
  const [tag, setTag] = useState("all");
  const [kind, setKind] = useState("all");
  const [date, setDate] = useState("");
  const [preview, setPreview] = useState("");
  const [versions, setVersions] = useState<
    { version: number; snapshot: Post; created_at: string }[]
  >([]);
  const [reset, setReset] = useState(0);
  const [counts, setCounts] = useState<
    Record<string, { views?: number; comments?: number }>
  >({});
  const revision = useRef(0);
  const saving = useRef(false);
  const load = async () => {
    const [p, c, a, t] = await Promise.all([
      db!
        .from("content_posts")
        .select("*")
        .order("created_at", { ascending: false }),
      db!.from("content_categories").select("id,name,slug").order("name"),
      db!.from("authors").select("id,name,bio").order("name"),
      db!.from("content_tags").select("id,name,slug").order("name"),
    ]);
    if (p.error) {
      setMessage("Falha ao carregar artigos. Confira a conexão e a permissão.");
      return;
    }
    setPosts(p.data || []);
    setCats(c.data || []);
    setAuthors(a.data || []);
    setTags(t.data || []);
    if (can(role, "articles.publish")) {
      const [v, comments] = await Promise.all([
        db!
          .from("analytics_events")
          .select("article_id")
          .eq("event_name", "article_viewed")
          .limit(5000),
        db!.from("article_comments").select("article_id,status").limit(5000),
      ]);
      const values: Record<string, { views?: number; comments?: number }> = {};
      for (const row of v.data || []) {
        if (row.article_id)
          (values[row.article_id] ??= {}).views =
            (values[row.article_id]?.views || 0) + 1;
      }
      for (const row of comments.data || [])
        (values[row.article_id] ??= {}).comments =
          (values[row.article_id]?.comments || 0) + 1;
      setCounts(values);
    }
  };
  useEffect(() => {
    void load();
  }, [role, building]);
  const update = (key: keyof Post, value: unknown) => {
    revision.current++;
    setEditing((p) => (p ? { ...p, [key]: value } : p));
    setDirty(true);
  };
  const open = async (p: Post) => {
    if (dirty && !confirm("Sair da edição sem salvar as alterações pendentes?"))
      return;
    setEditing({ ...p });
    setDirty(false);
    setNotes("");
    setReset((n) => n + 1);
    setMessage("");
    setVersions([]);
    if (p.id) {
      const [n, v] = await Promise.all([
        db!
          .from("editorial_notes")
          .select("notes")
          .eq("post_id", p.id)
          .maybeSingle(),
        db!
          .from("article_versions")
          .select("version,snapshot,created_at")
          .eq("post_id", p.id)
          .order("version", { ascending: false })
          .limit(20),
      ]);
      setNotes(n.data?.notes || "");
      setVersions(v.data || []);
    }
  };
  const save = async (target?: string, autosave = false) => {
    if (!editing || saving.current) return false;
    const candidate = { ...editing, status: target || editing.status };
    if (
      candidate.title.trim().length < 3 ||
      candidate.title.length > 200 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate.slug) ||
      candidate.slug.length > 160 ||
      candidate.excerpt.length > 500
    ) {
      if (!autosave)
        setMessage(
          "Preencha título (3–200 caracteres), slug válido e resumo até 500 caracteres.",
        );
      return false;
    }
    if (
      ["published", "scheduled", "approved"].includes(candidate.status) &&
      (!candidate.body.replace(/<[^>]*>/g, "").trim() ||
        !candidate.featured_image ||
        !candidate.hero_image_alt)
    ) {
      setMessage("Adicione corpo, capa e alt antes de aprovar ou publicar.");
      return false;
    }
    if (target === "published")
      candidate.published_at = new Date().toISOString();
    if (
      candidate.canonical_url &&
      !/^https:\/\/legendadigital\.com\.br\/(conteudos|artigos)\/[a-z0-9-]+$/.test(
        candidate.canonical_url,
      )
    ) {
      setMessage("O canonical precisa ser uma URL de artigo do portal.");
      return false;
    }
    const start = revision.current;
    saving.current = true;
    setBusy(true);
    const payload = Object.fromEntries(
      editableKeys
        .filter((k) => candidate[k] !== undefined)
        .map((k) => [
          k,
          candidate[k] === "" &&
          [
            "author_id",
            "reviewer_id",
            "category_id",
            "scheduled_at",
            "canonical_url",
          ].includes(k)
            ? null
            : candidate[k],
        ]),
    );
    payload.body = DOMPurify.sanitize(candidate.body, {
      FORBID_TAGS: ["iframe", "object", "embed", "form", "input", "style"],
    });
    const operation = candidate.id
      ? db!
          .from("content_posts")
          .update(payload)
          .eq("id", candidate.id)
          .eq("version", candidate.version || 1)
      : db!.from("content_posts").insert(payload);
    const { data, error } = await operation.select("*").maybeSingle();
    if (error || !data) {
      saving.current = false;
      setBusy(false);
      setMessage(
        !error
          ? "Este artigo mudou em outra sessão. Reabra a versão atual para revisar suas alterações."
          : /Publish permission/.test(error.message)
            ? "Sua conta não tem permissão de publicação."
            : /Approve/.test(error.message)
              ? "Aprove o artigo antes de publicar."
              : "Falha ao salvar: " + error.message,
      );
      return false;
    }
    const { error: noteError } = await db!
      .from("editorial_notes")
      .upsert({
        post_id: data.id,
        notes,
        updated_at: new Date().toISOString(),
      });
    setEditing((current) =>
      current
        ? {
            ...current,
            id: data.id,
            version: data.version,
            status: data.status,
            approved_at: data.approved_at,
            updated_at: data.updated_at,
            published_at: data.published_at,
          }
        : current,
    );
    if (revision.current === start) setDirty(false);
    setMessage(
      noteError
        ? "Artigo salvo; as notas internas não foram salvas."
        : (autosave
            ? "Rascunho salvo automaticamente."
            : "Artigo salvo: " + data.status) +
            " · v" +
            data.version,
    );
    saving.current = false;
    setBusy(false);
    await load();
    const v = await db!
      .from("article_versions")
      .select("version,snapshot,created_at")
      .eq("post_id", data.id)
      .order("version", { ascending: false })
      .limit(20);
    setVersions(v.data || []);
    return true;
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty || !editing || !["draft", "review"].includes(editing.status))
      return;
    const timer = setTimeout(() => void saveRef.current(undefined, true), 2500);
    return () => clearTimeout(timer);
  }, [dirty, editing, notes]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const duplicate = (p: Post) => {
    const copy = {
      ...p,
      ...{
        id: undefined,
        title: p.title + " (cópia)",
        slug: p.slug + "-copia-" + Date.now().toString(36),
        status: "draft",
        version: undefined,
        created_by: undefined,
        approved_at: undefined,
        scheduled_at: undefined,
        canonical_url: "",
        published_at: new Date().toISOString(),
      },
    };
    setEditing(copy);
    setDirty(true);
    setReset((n) => n + 1);
    setNotes("");
    setVersions([]);
    setMessage(
      "Cópia preparada como rascunho. Salve para criar o novo registro.",
    );
  };
  if (editing) {
    const set =
      (key: keyof Post) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) =>
        update(key, e.target.value);
    const selectAuthor = (id: string) => {
      const a = authors.find((a) => a.id === id);
      update("author_id", id || null);
      if (a) update("author", a.name);
    };
    return (
      <div className="editorial-admin">
        <div className="editor-topbar">
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (
                !dirty ||
                confirm("Sair sem salvar as alterações pendentes?")
              ) {
                setEditing(null);
                setDirty(false);
              }
            }}
          >
            <ArrowLeft size={17} />
            Artigos
          </button>
          <span className="status-badge">
            {editing.status} · v{editing.version || 1}
          </span>
          <span role="status">
            {busy ? "Salvando…" : dirty ? "Alterações pendentes" : "Salvo"}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPreview("desktop")}
          >
            <Eye size={17} />
            Prévia
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => save()}
          >
            <Save size={17} />
            Salvar
          </button>
        </div>
        <p role="status" className="editor-message">
          {message}
        </p>
        <div className="editor-workspace">
          <div className="editor-main">
            <label>
              Título
              <input
                className="editor-title"
                maxLength={200}
                value={editing.title}
                onChange={set("title")}
              />
            </label>
            <label>
              Subtítulo
              <textarea
                rows={2}
                maxLength={500}
                value={editing.subtitle || ""}
                onChange={set("subtitle")}
              />
            </label>
            <label>
              Resumo para os cards
              <textarea
                rows={3}
                maxLength={500}
                value={editing.excerpt}
                onChange={set("excerpt")}
              />
            </label>
            <VisualEditor
              body={editing.body}
              resetKey={String(reset)}
              onChange={(html, doc) => {
                update("body", html);
                update("content_blocks", doc as Record<string, unknown>);
                update(
                  "reading_time",
                  Math.min(
                    120,
                    Math.max(
                      1,
                      Math.ceil(
                        html
                          .replace(/<[^>]*>/g, " ")
                          .split(/\s+/)
                          .filter(Boolean).length / 200,
                      ),
                    ),
                  ),
                );
              }}
            />
            <details className="editor-section">
              <summary>Referências estruturadas</summary>
              {(editing.references || []).map((r, i) => (
                <div className="form-grid" key={i}>
                  <label>
                    Título
                    <input
                      value={r.title}
                      onChange={(e) =>
                        update(
                          "references",
                          editing.references!.map((x, n) =>
                            n === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    URL
                    <input
                      value={r.url}
                      onChange={(e) =>
                        update(
                          "references",
                          editing.references!.map((x, n) =>
                            n === i ? { ...x, url: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Nota
                    <textarea
                      value={r.note || ""}
                      onChange={(e) =>
                        update(
                          "references",
                          editing.references!.map((x, n) =>
                            n === i ? { ...x, note: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      if (confirm("Remover esta referência?"))
                        update(
                          "references",
                          editing.references!.filter((_, n) => i !== n),
                        );
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  update("references", [
                    ...(editing.references || []),
                    { title: "", url: "", note: "" },
                  ])
                }
              >
                Adicionar referência
              </button>
            </details>
            <details className="editor-section">
              <summary>Notas internas e histórico</summary>
              <label>
                Notas privadas da equipe
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    revision.current++;
                    setDirty(true);
                  }}
                />
              </label>
              <p className="microcopy">
                As notas e versões nunca são enviadas à página pública.
              </p>
              {versions.map((v) => (
                <div className="resource-row" key={v.version}>
                  <span>
                    v{v.version} ·{" "}
                    {new Date(v.created_at).toLocaleString("pt-BR")}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (
                        confirm(
                          "Restaurar o conteúdo desta versão como rascunho?",
                        )
                      ) {
                        setEditing({
                          ...v.snapshot,
                          id: editing.id,
                          version: editing.version,
                          status: "draft",
                          approved_at: undefined,
                        });
                        setReset((n) => n + 1);
                        revision.current++;
                        setDirty(true);
                      }
                    }}
                  >
                    Restaurar como rascunho
                  </button>
                </div>
              ))}
            </details>
          </div>
          <aside className="editor-sidebar">
            <section>
              <h2>Publicação</h2>
              <p>
                O fluxo é rascunho → revisão → aprovado → publicado ou agendado.
              </p>
              {["draft", "review"].includes(editing.status) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() =>
                    save(editing.status === "draft" ? "review" : "draft")
                  }
                >
                  {editing.status === "draft"
                    ? "Enviar para revisão"
                    : "Voltar ao rascunho"}
                </button>
              )}
              {can(role, "articles.approve") && editing.status === "review" && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => save("approved")}
                >
                  Aprovar versão
                </button>
              )}
              {can(role, "articles.publish") &&
                editing.status === "approved" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("Publicar este artigo aprovado no portal?"))
                          void save("published");
                      }}
                    >
                      Publicar agora
                    </button>
                    <label>
                      Agendar (horário local)
                      <input
                        type="datetime-local"
                        value={localDate(editing.scheduled_at)}
                        onChange={(e) =>
                          update(
                            "scheduled_at",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy || !editing.scheduled_at}
                      onClick={() => save("scheduled")}
                    >
                      Agendar publicação
                    </button>
                  </>
                )}
              {can(role, "articles.publish") &&
                ["published", "scheduled"].includes(editing.status) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => save("review")}
                  >
                    Retornar à revisão
                  </button>
                )}
              {editing.id && can(role, "articles.publish") && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    if (
                      confirm(
                        "Arquivar este artigo? Ele deixará de aparecer no portal.",
                      )
                    )
                      void save("archived");
                  }}
                >
                  <Archive size={15} />
                  Arquivar
                </button>
              )}
              {editing.status === "published" && (
                <p className="microcopy">
                  Salvar altera a versão publicada. Revise a prévia antes de
                  salvar.
                </p>
              )}
            </section>
            <section>
              <h2>Organização</h2>
              <label>
                Slug
                <input value={editing.slug} onChange={set("slug")} />
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  update(
                    "slug",
                    editing.title
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  )
                }
              >
                Gerar a partir do título
              </button>
              <label>
                Categoria
                <select
                  value={editing.category_id || ""}
                  onChange={(e) => {
                    const c = cats.find((c) => c.id === e.target.value);
                    update("category_id", c?.id || null);
                    if (c) update("category", c.name);
                  }}
                >
                  <option value="">{editing.category}</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Autor
                <select
                  value={editing.author_id || ""}
                  onChange={(e) => selectAuthor(e.target.value)}
                >
                  <option value="">{editing.author}</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Revisão editorial
                <input
                  value={editing.reviewer_name || ""}
                  onChange={set("reviewer_name")}
                  placeholder="Pessoa ou organização responsável"
                />
              </label>
              <label>
                Tipo
                <select value={editing.kind} onChange={set("kind")}>
                  {["article", "guide", "news", "building", "case"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input
                  value={editing.tags.join(", ")}
                  onChange={(e) =>
                    update(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  list="editor-tags"
                />
                <datalist id="editor-tags">
                  {tags.map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
                </datalist>
              </label>
              <label>
                Topics
                <input
                  value={(editing.topics || []).join(", ")}
                  onChange={(e) =>
                    update(
                      "topics",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </label>
              <label>
                Leitura estimada (min)
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={editing.reading_time}
                  onChange={(e) =>
                    update("reading_time", Number(e.target.value))
                  }
                />
              </label>
              {[
                ["featured", "Destacar artigo"],
                ["show_comments", "Permitir comentários"],
                ["show_share", "Permitir compartilhamento"],
              ].map(([k, l]) => (
                <label className="checkbox" key={k}>
                  <input
                    type="checkbox"
                    checked={Boolean(editing[k as keyof Post])}
                    onChange={(e) => update(k as keyof Post, e.target.checked)}
                  />
                  {l}
                </label>
              ))}
            </section>
            <section>
              <h2>Capa e imagens</h2>
              {[
                ["featured_image", "URL da capa"],
                ["hero_image_mobile", "Capa para celular"],
                ["hero_image_alt", "Texto alternativo (alt)"],
                ["hero_image_caption", "Legenda"],
                ["hero_image_credit", "Crédito"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input
                    value={String(editing[k as keyof Post] || "")}
                    onChange={set(k as keyof Post)}
                  />
                </label>
              ))}
              <label>
                Enviar capa
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (
                      !f ||
                      f.size > 8388608 ||
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        f.type,
                      )
                    ) {
                      setMessage("Use PNG, JPEG ou WebP até 8 MB.");
                      return;
                    }
                    const {
                      data: { user },
                    } = await db!.auth.getUser();
                    if (!user) return;
                    const path =
                      user.id +
                      "/" +
                      crypto.randomUUID() +
                      "." +
                      (f.type === "image/png"
                        ? "png"
                        : f.type === "image/jpeg"
                          ? "jpg"
                          : "webp");
                    const { error } = await db!.storage
                      .from("content-images")
                      .upload(path, f, { upsert: false, contentType: f.type });
                    if (error)
                      setMessage(
                        "Falha no upload. Confira sua permissão de mídia.",
                      );
                    else
                      update(
                        "featured_image",
                        db!.storage.from("content-images").getPublicUrl(path)
                          .data.publicUrl,
                      );
                  }}
                />
              </label>
              {editing.featured_image && (
                <img
                  src={editing.featured_image}
                  alt={editing.hero_image_alt || "Prévia da capa"}
                />
              )}
            </section>
            <section>
              <h2>SEO e redes</h2>
              {[
                ["seo_title", "Título SEO"],
                ["seo_description", "Descrição SEO"],
                ["canonical_url", "URL canônica"],
                ["og_title", "Título OG"],
                ["og_description", "Descrição OG"],
                ["og_image", "Imagem OG 1200 × 630"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input
                    value={String(editing[k as keyof Post] || "")}
                    onChange={set(k as keyof Post)}
                    placeholder={
                      k === "canonical_url"
                        ? articleUrl(editing.slug)
                        : undefined
                    }
                  />
                </label>
              ))}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editing.allow_index !== false}
                  onChange={(e) => update("allow_index", e.target.checked)}
                />
                Permitir indexação
              </label>
              <p className="microcopy">
                {(editing.seo_title || editing.title).length} caracteres no
                título; {(editing.seo_description || editing.excerpt).length} na
                descrição.
              </p>
            </section>
            <section>
              <h2>Leituras relacionadas</h2>
              {posts
                .filter((p) => p.id !== editing.id && p.status === "published")
                .map((p) => (
                  <label className="checkbox" key={p.slug}>
                    <input
                      type="checkbox"
                      checked={
                        editing.related_articles?.includes(p.slug) || false
                      }
                      onChange={(e) =>
                        update(
                          "related_articles",
                          e.target.checked
                            ? [...(editing.related_articles || []), p.slug]
                            : editing.related_articles?.filter(
                                (s) => s !== p.slug,
                              ),
                        )
                      }
                    />
                    {p.title}
                  </label>
                ))}
            </section>
          </aside>
        </div>
        {preview && (
          <Dialog.Root
            open
            onOpenChange={(open) => {
              if (!open) setPreview("");
            }}
          >
            <Dialog.Portal>
              <Dialog.Content
                className="editor-preview-overlay"
                aria-label="Prévia do artigo"
              >
                <Dialog.Title className="sr-only">
                  Prévia do artigo
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  Visualize a versão desktop ou celular. Escape fecha a prévia.
                </Dialog.Description>
                <div className="editor-preview-bar">
                  <button type="button" onClick={() => setPreview("desktop")}>
                    Desktop
                  </button>
                  <button type="button" onClick={() => setPreview("mobile")}>
                    Celular 390px
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    autoFocus
                    onClick={() => setPreview("")}
                  >
                    Fechar prévia
                  </button>
                </div>
                <div
                  className={
                    "editor-preview-page " +
                    (preview === "mobile" ? "preview-mobile" : "")
                  }
                >
                  <ArticlePage
                    post={editing}
                    posts={posts}
                    config={defaultConfig}
                    preview
                  />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>
    );
  }
  const list = posts.filter(
    (p) =>
      (building ? p.kind === "building" : p.kind !== "building") &&
      (status === "all" || p.status === status) &&
      (category === "all" || p.category === category) &&
      (author === "all" || p.author === author) &&
      (tag === "all" || p.tags.includes(tag)) &&
      (kind === "all" || p.kind === kind) &&
      (!date || p.created_at?.slice(0, 10) === date) &&
      (p.title + " " + p.slug + " " + p.body.replace(/<[^>]*>/g, " "))
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="editorial-admin">
      <div className="section-head">
        <div>
          <h2>Artigos</h2>
          <p>Produção, revisão e publicação do portal.</p>
        </div>
        {can(role, "articles.create") && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              open({ ...blank(), kind: building ? "building" : "article" })
            }
          >
            <Plus size={17} />
            Novo artigo
          </button>
        )}
      </div>
      <p role="status">{message}</p>
      <div className="editorial-filters">
        <label>
          Buscar
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título, slug ou conteúdo"
          />
        </label>
        {[
          [
            "Status",
            status,
            setStatus,
            [
              "draft",
              "review",
              "approved",
              "scheduled",
              "published",
              "archived",
            ],
          ],
          [
            "Categoria",
            category,
            setCategory,
            [...new Set(posts.map((p) => p.category))],
          ],
          [
            "Autor",
            author,
            setAuthor,
            [...new Set(posts.map((p) => p.author))],
          ],
          ["Tag", tag, setTag, [...new Set(posts.flatMap((p) => p.tags))]],
          [
            "Tipo",
            kind,
            setKind,
            ["article", "guide", "news", "building", "case"],
          ],
        ].map(([l, v, f, options]) => (
          <label key={String(l)}>
            {String(l)}
            <select
              value={String(v)}
              onChange={(e) => (f as (s: string) => void)(e.target.value)}
            >
              <option value="all">Todos</option>
              {(options as string[]).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Data de criação
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Título / categoria</th>
              <th>Autor</th>
              <th>Status / datas</th>
              <th>Eventos / comentários</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.title}</b>
                  <small>
                    {p.category} · {p.kind}
                    {p.featured ? " · destaque" : ""}
                  </small>
                  <small>/{p.slug}</small>
                </td>
                <td>{p.author}</td>
                <td>
                  <span className="status-badge">{p.status}</span>
                  <small>
                    Atualizado:{" "}
                    {p.updated_at
                      ? new Date(p.updated_at).toLocaleString("pt-BR")
                      : "—"}
                  </small>
                  <small>
                    {p.status === "scheduled"
                      ? "Agendado: " +
                        new Date(p.scheduled_at!).toLocaleString("pt-BR")
                      : p.published_at
                        ? "Publicado: " +
                          new Date(p.published_at).toLocaleDateString("pt-BR")
                        : "Sem publicação"}
                  </small>
                </td>
                <td>
                  {counts[p.id!]?.views !== undefined
                    ? counts[p.id!].views + " eventos de leitura"
                    : "Sem dados de leitura"}
                  <small>
                    {counts[p.id!]?.comments !== undefined
                      ? counts[p.id!].comments + " comentários"
                      : "Sem dados de comentários"}
                  </small>
                </td>
                <td>
                  <div className="editorial-actions">
                    <button type="button" onClick={() => open(p)}>
                      Editar / prévia
                    </button>
                    <button type="button" onClick={() => duplicate(p)}>
                      <Copy size={14} />
                      Duplicar
                    </button>
                    {p.status === "published" && (
                      <a
                        href={"/conteudos/" + p.slug}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir público
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && (
        <p className="empty-state">Nenhum artigo com estes filtros.</p>
      )}
      <p className="microcopy">
        Contagens disponíveis refletem até 5.000 eventos e comentários.
        Estatísticas são opcionais; não representam usuários únicos.
      </p>
    </div>
  );
}
