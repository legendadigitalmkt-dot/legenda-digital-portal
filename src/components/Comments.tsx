import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Reply,
  Flag,
  Send,
  RefreshCw,
  LogOut,
} from "lucide-react";
import type { Post } from "../types";
import { db, trackEditorial } from "../services/supabase";
import { usePortalRegistration } from "../features/tools/PortalAuth";
type Comment = {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  root_id: string | null;
  depth: number;
  body: string;
  status: string;
  pinned: boolean;
  featured: boolean;
  locked: boolean;
  created_at: string;
  edited_at: string | null;
};
export default function Comments({ post }: { post: Post }) {
  const registration = usePortalRegistration();
  const started = useRef(false);
  const [rows, setRows] = useState<Comment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [user, setUser] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [report, setReport] = useState<Comment | null>(null);
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [sort, setSort] = useState("relevant");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const event = (s: string) => void trackEditorial(s, post.id);
  const load = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    const { data, error } = await db
      .from("article_comments")
      .select("*")
      .eq("article_id", post.id!)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) {
      setMessage("Não foi possível carregar a conversa. Tente atualizar.");
      setLoading(false);
      return;
    }
    setRows((data || []) as Comment[]);
    const ids = [...new Set((data || []).map((c) => c.user_id))];
    if (ids.length) {
      const { data: profiles } = await db
        .from("comment_profiles")
        .select("user_id,display_name")
        .in("user_id", ids);
      setNames(
        Object.fromEntries(
          (profiles || []).map((p) => [p.user_id, p.display_name]),
        ),
      );
    }
    setLoading(false);
  };
  useEffect(() => { started.current = false; }, [post.id]);
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let active = true;
    const apply = async () => {
      const {
        data: { user: u },
      } = await db!.auth.getUser();
      if (!active) return;
      setUser(u?.id || null);
      if (u) {
        const { data: p } = await db!
          .from("comment_profiles")
          .select("display_name")
          .eq("user_id", u.id)
          .maybeSingle();
        if (active) setName(p?.display_name || "");
      }
      await load();
    };
    void apply();
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(() => setTimeout(apply, 0));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [post.id, limit]);
  const tree = useMemo(() => {
    const all = new Map(rows.map((r) => [r.id, r]));
    const roots = rows.filter((r) => !r.parent_id || !all.has(r.parent_id));
    return roots.sort((a, b) => {
      if (sort === "oldest")
        return Date.parse(a.created_at) - Date.parse(b.created_at);
      if (sort === "newest")
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      return (
        Number(b.pinned) - Number(a.pinned) ||
        Number(b.featured) - Number(a.featured) ||
        rows.filter((c) => c.root_id === b.id).length -
          rows.filter((c) => c.root_id === a.id).length ||
        Date.parse(b.created_at) - Date.parse(a.created_at)
      );
    });
  }, [rows, sort]);
  const auth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (signup && registration !== true) return;
    setBusy(true);
    const r = signup
      ? await db.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo:
              "https://legendadigital.com.br/conteudos/" + post.slug,
          },
        })
      : await db.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
    setPassword("");
    setBusy(false);
    setMessage(
      r.error
        ? "Não foi possível entrar. Confira os dados e a confirmação da conta."
        : signup && !r.data.session
          ? "Confira seu e-mail para confirmar a conta do portal."
          : "Você entrou na sua conta do portal.",
    );
    if (r.data.session) setAuthOpen(false);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    if (
      name.trim().length < 2 ||
      body.trim().length < 3 ||
      body.length > 3000 ||
      /[<>]/.test(body)
    ) {
      setMessage(
        "Informe seu nome e uma contribuição de 3 a 3.000 caracteres, sem HTML.",
      );
      return;
    }
    setBusy(true);
    const profile = await db
      .from("comment_profiles")
      .upsert({ user_id: user, display_name: name.trim() });
    if (profile.error) {
      setBusy(false);
      setMessage("Não foi possível salvar seu nome público.");
      return;
    }
    const r = editing
      ? await db
          .from("article_comments")
          .update({ body: body.trim(), status: "pending" })
          .eq("id", editing.id)
      : await db
          .from("article_comments")
          .insert({
            article_id: post.id,
            user_id: user,
            body: body.trim(),
            parent_id: reply?.id || null,
          });
    setBusy(false);
    if (r.error) {
      const m = r.error.message;
      setMessage(
        /rate limit/.test(m)
          ? "Aguarde 30 segundos entre mensagens. O limite é de 10 por hora."
          : /suspended/.test(m)
            ? "Os comentários desta conta estão suspensos."
            : /thread/.test(m)
              ? "Esta conversa foi encerrada ou está em moderação."
              : /window/.test(m)
                ? "O prazo de 24 horas para editar terminou."
                : "Não foi possível enviar. Confira o tamanho, os links e tente novamente.",
      );
      return;
    }
    event(
      editing || !reply
        ? "comment_submitted"
        : "comment_replied",
    );
    setBody("");
    setReply(null);
    setEditing(null);
    setMessage(
      "Contribuição recebida. Ela ficará pública depois da moderação.",
    );
    await load();
  };
  const remove = async (c: Comment) => {
    if (
      !db ||
      !confirm("Remover seu comentário? As respostas serão preservadas.")
    )
      return;
    const { error } = await db
      .from("article_comments")
      .update({ status: "deleted", body: "" })
      .eq("id", c.id);
    setMessage(error ? "Não foi possível remover." : "Comentário removido.");
    await load();
  };
  const sendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !report) return;
    setBusy(true);
    const { error } = await db
      .from("comment_reports")
      .insert({ comment_id: report.id, user_id: user, reason, detail });
    setBusy(false);
    setMessage(
      error
        ? "Não foi possível denunciar. Você pode enviar uma denúncia por comentário, até 5 por hora."
        : "Denúncia recebida pela moderação.",
    );
    if (!error) {
      event("article_comment_reported");
      setReport(null);
      setDetail("");
    }
  };
  const render = (c: Comment, level = 0): React.ReactNode => (
    <li
      key={c.id}
      className={"comment-item " + (c.featured ? "comment-featured" : "")}
    >
      <article aria-label={"Comentário de " + (names[c.user_id] || "Leitor")}>
        <header>
          <b>{names[c.user_id] || "Leitor"}</b>
          <time dateTime={c.created_at}>
            {new Date(c.created_at).toLocaleDateString("pt-BR")}
          </time>
          {c.edited_at && <span>editado</span>}
          {c.pinned && <span>fixado</span>}
          {c.status === "pending" && <span>aguardando moderação</span>}
        </header>
        {c.parent_id && !rows.some((r) => r.id === c.parent_id) && (
          <p className="microcopy">Resposta em uma conversa moderada.</p>
        )}
        <p className="comment-text">
          {c.status === "deleted" ? "Comentário removido." : c.body}
        </p>
        {c.status === "published" && !c.locked && (
          <div className="comment-actions">
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  setAuthOpen(true);
                  setMessage("Entre para responder.");
                  return;
                }
                setReply(c);
                setEditing(null);
                setBody("");
                document
                  .getElementById("comment-compose")
                  ?.scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "auto"
                      : "smooth",
                    block: "center",
                  });
              }}
            >
              <Reply size={15} />
              Responder
            </button>
            {user && (
              <button type="button" onClick={() => setReport(c)}>
                <Flag size={15} />
                Denunciar
              </button>
            )}
          </div>
        )}
        {user === c.user_id && ["pending", "published"].includes(c.status) && (
          <div className="comment-actions">
            {Date.now() - Date.parse(c.created_at) < 864e5 && (
              <button
                type="button"
                onClick={() => {
                  setEditing(c);
                  setReply(null);
                  setBody(c.body);
                }}
              >
                Editar
              </button>
            )}
            <button type="button" onClick={() => remove(c)}>
              Remover
            </button>
          </div>
        )}
        {c.locked && (
          <p className="microcopy">Respostas encerradas pela moderação.</p>
        )}
      </article>
      {rows.some((r) => r.parent_id === c.id) && level < 30 && (
        <ol className={level < 2 ? "comment-replies" : "comment-replies-flat"}>
          {rows
            .filter((r) => r.parent_id === c.id)
            .map((child) => render(child, level + 1))}
        </ol>
      )}
    </li>
  );
  return (
    <div className="article-comments" id="comentarios">
      <div className="section-head">
        <div>
          <p className="eyebrow">CONVERSA COM CONTEXTO</p>
          <h2>
            <MessageCircle size={25} /> Comentários
          </h2>
        </div>
        <button type="button" className="text-link" onClick={load}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <p>
        Contribuições passam por revisão. Evite dados pessoais, publicidade e
        links sem contexto.
      </p>
      <label className="comment-order">
        Ordenar
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="relevant">Relevantes (fixados e respostas)</option>
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
        </select>
      </label>
      {loading ? (
        <p>Carregando conversa…</p>
      ) : !tree.length ? (
        <p className="empty-state">
          Seja a primeira pessoa a contribuir com esta leitura.
        </p>
      ) : (
        <ol className="comment-tree">{tree.map((c) => render(c))}</ol>
      )}
      {rows.length >= limit && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setLimit((n) => n + 100)}
        >
          Carregar mais comentários
        </button>
      )}
      <p role="status" className="comment-message">
        {message}
      </p>
      {report && (
        <form method="post" className="comment-report" onSubmit={sendReport}>
          <h3>Denunciar contribuição</h3>
          <label>
            Motivo
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {[
                ["spam", "Spam"],
                ["abuse", "Abuso"],
                ["off_topic", "Fora do tema"],
                ["privacy", "Dados pessoais"],
                ["other", "Outro"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contexto opcional
            <textarea
              maxLength={500}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </label>
          <button className="btn btn-secondary" disabled={busy}>
            Enviar denúncia
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => setReport(null)}
          >
            Cancelar
          </button>
        </form>
      )}
      {user ? (
        <form
          method="post"
          id="comment-compose"
          className="comment-compose"
          onSubmit={submit}
        >
          <h3>
            {editing
              ? "Editar contribuição"
              : reply
                ? "Responder a " + (names[reply.user_id] || "leitor")
                : "Sua contribuição"}
          </h3>
          <label>
            Nome público
            <input
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Comentário
            <textarea
              required
              minLength={3}
              maxLength={3000}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => {
                if (!started.current && localStorage.getItem("ld-analytics-consent") === "yes") {
                  started.current = true;
                  event("comment_started");
                }
              }}
            />
          </label>
          <small>{body.length}/3000 · edição por até 24 horas</small>
          <div className="comment-actions">
            <button className="btn btn-primary" disabled={busy}>
              <Send size={17} />
              {busy ? "Enviando…" : "Enviar para revisão"}
            </button>
            {(reply || editing) && (
              <button
                type="button"
                onClick={() => {
                  setReply(null);
                  setEditing(null);
                  setBody("");
                }}
              >
                Cancelar
              </button>
            )}
            <button type="button" onClick={() => db!.auth.signOut()}>
              <LogOut size={15} />
              Sair
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-login">
          <h3>Entre na conversa.</h3>
          <p>Use sua conta da Legenda Digital para comentar.</p>
          {!authOpen ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAuthOpen(true)}
            >
              Entrar na conta do portal
            </button>
          ) : (
            <form method="post" onSubmit={auth}>
              <label>
                E-mail
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  required
                  minLength={signup ? 12 : 1}
                  maxLength={128}
                  autoComplete={signup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="btn btn-primary" disabled={busy}>
                {busy
                  ? "Aguarde…"
                  : signup
                    ? "Criar conta do portal"
                    : "Entrar"}
              </button>
              {registration === true && <button
                type="button"
                className="text-link"
                onClick={() => setSignup(!signup)}
              >
                {signup ? "Já tenho uma conta" : "Criar minha conta"}
              </button>}
              <p className="microcopy">
                Ao contribuir, você aceita os <a href="/termos">termos</a> e a{" "}
                <a href="/privacidade">política de privacidade</a>. Seu e-mail
                não aparece nos comentários.
              </p>
            </form>
          )}
          {registration === false && <p className="microcopy">Novos cadastros do portal ainda não estão liberados. Contas existentes podem entrar e contribuir.</p>}
        </div>
      )}
    </div>
  );
}
