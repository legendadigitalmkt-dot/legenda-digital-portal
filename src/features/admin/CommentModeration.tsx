import React, { useEffect, useState } from "react";
import { db } from "../../services/supabase";
type Row = Record<string, any>;
export default function CommentModeration() {
  const [comments, setComments] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [articles, setArticles] = useState<
    Record<string, { title: string; slug: string }>
  >({});
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Row[]>([]);
  const [logId, setLogId] = useState("");
  const [bans, setBans] = useState<Row[]>([]);
  const load = async () => {
    const [c, r, p, a, b] = await Promise.all([
      db!
        .from("article_comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      db!
        .from("comment_reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(200),
      db!.from("comment_profiles").select("user_id,display_name"),
      db!
        .from("content_posts")
        .select("id,title,slug")
        .eq("status", "published"),
      db!.from("comment_bans").select("*"),
    ]);
    if (c.error || r.error) {
      setMessage("Falha ao carregar a fila de moderação.");
      return;
    }
    setComments(c.data || []);
    setReports(r.data || []);
    setNames(
      Object.fromEntries(
        (p.data || []).map((n) => [n.user_id, n.display_name]),
      ),
    );
    setArticles(
      Object.fromEntries(
        (a.data || []).map((p) => [p.id, { title: p.title, slug: p.slug }]),
      ),
    );
    setBans(b.data || []);
  };
  useEffect(() => {
    void load();
  }, []);
  const update = async (c: Row, values: Row, destructive = false) => {
    if (
      destructive &&
      !confirm("Confirmar ação de moderação? As respostas serão preservadas.")
    )
      return;
    setBusy(true);
    const { error } = await db!
      .from("article_comments")
      .update(values)
      .eq("id", c.id);
    setBusy(false);
    setMessage(
      error
        ? "Não foi possível moderar: " + error.message
        : "Moderação registrada.",
    );
    if (!error) await load();
  };
  const ban = async (c: Row) => {
    const reason = prompt(
      "Motivo da suspensão desta conta (3–500 caracteres):",
    );
    if (!reason || reason.trim().length < 3) return;
    const { error } = await db!
      .from("comment_bans")
      .upsert({
        user_id: c.user_id,
        reason: reason.trim().slice(0, 500),
        until_at: null,
      });
    setMessage(
      error
        ? "Não foi possível suspender."
        : "Conta suspensa para novos comentários.",
    );
    await load();
  };
  const resolve = async (r: Row, value: string) => {
    const { error } = await db!
      .from("comment_reports")
      .update({ status: value })
      .eq("id", r.id);
    setMessage(error ? "Falha ao atualizar denúncia." : "Denúncia atualizada.");
    await load();
  };
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Comentários e moderação</h2>
          <p>Até 500 comentários recentes; até 200 denúncias abertas.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Atualizar
        </button>
      </div>
      <p role="status">{message}</p>
      <div className="moderation-stats">
        {["pending", "published", "hidden", "spam", "deleted"].map((s) => (
          <button
            type="button"
            key={s}
            className={status === s ? "active" : ""}
            onClick={() => setStatus(s)}
          >
            {s} · {comments.filter((c) => c.status === s).length}
          </button>
        ))}
      </div>
      <h3>Denúncias abertas</h3>
      {!reports.length && (
        <p>Nenhuma denúncia aberta nos registros carregados.</p>
      )}
      {reports.map((r) => (
        <div className="moderation-card" key={r.id}>
          <b>{r.reason}</b>
          <p>{r.detail}</p>
          <blockquote>
            {comments.find((c) => c.id === r.comment_id)?.body ||
              "Comentário fora da lista carregada."}
          </blockquote>
          <div className="comment-actions">
            <button type="button" onClick={() => resolve(r, "resolved")}>
              Marcar resolvida
            </button>
            <button type="button" onClick={() => resolve(r, "dismissed")}>
              Descartar denúncia
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("all");
                document
                  .getElementById("moderate-" + r.comment_id)
                  ?.scrollIntoView({ block: "center" });
              }}
            >
              Ver comentário
            </button>
          </div>
        </div>
      ))}
      <h3>Fila: {status}</h3>
      <button
        type="button"
        className="text-link"
        onClick={() => setStatus("all")}
      >
        Mostrar todos
      </button>
      {comments
        .filter((c) => status === "all" || c.status === status)
        .map((c) => (
          <div className="moderation-card" id={"moderate-" + c.id} key={c.id}>
            <header>
              <b>{names[c.user_id] || "Leitor"}</b>
              <span>{c.status}</span>
              <time>{new Date(c.created_at).toLocaleString("pt-BR")}</time>
            </header>
            {articles[c.article_id] && (
              <a
                href={
                  "/conteudos/" + articles[c.article_id].slug + "#comentarios"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {articles[c.article_id].title}
              </a>
            )}
            <p className="comment-text">{c.body || "Comentário removido."}</p>
            <small>
              {c.parent_id
                ? "Resposta · profundidade " + c.depth
                : "Comentário principal"}
              {c.edited_at ? " · editado" : ""}
            </small>
            <div className="comment-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { status: "published" })}
              >
                {c.status === "deleted" ? "Restaurar e publicar" : "Aprovar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { status: "hidden" })}
              >
                Ocultar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { status: "spam" }, true)}
              >
                Spam
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { status: "deleted", body: "" }, true)}
              >
                Remover
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { pinned: !c.pinned })}
              >
                {c.pinned ? "Desafixar" : "Fixar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { featured: !c.featured })}
              >
                {c.featured ? "Retirar destaque" : "Destacar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(c, { locked: !c.locked })}
              >
                {c.locked ? "Reabrir respostas" : "Encerrar respostas"}
              </button>
              <button type="button" onClick={() => ban(c)}>
                Suspender conta
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { data, error } = await db!
                    .from("comment_moderation_log")
                    .select("actor_id,action,created_at")
                    .eq("comment_id", c.id)
                    .order("created_at", { ascending: false })
                    .limit(30);
                  setLog(data || []);
                  setLogId(c.id);
                  if (error) setMessage("Falha ao carregar histórico.");
                }}
              >
                Histórico
              </button>
            </div>
            {logId === c.id && (
              <ol>
                {log.map((l, i) => (
                  <li key={i}>
                    {l.action} ·{" "}
                    {new Date(l.created_at).toLocaleString("pt-BR")} · operador{" "}
                    {l.actor_id?.slice(0, 8) || "infraestrutura"}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      <h3>Contas suspensas</h3>
      {bans.map((b) => (
        <div className="resource-row" key={b.user_id}>
          <div>
            <b>{names[b.user_id] || "Conta " + b.user_id.slice(0, 8)}</b>
            <p>{b.reason}</p>
            <small>
              {b.until_at
                ? "Até " + new Date(b.until_at).toLocaleString("pt-BR")
                : "Suspensão sem prazo definido"}
            </small>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              if (!confirm("Encerrar a suspensão desta conta?")) return;
              const { error } = await db!
                .from("comment_bans")
                .update({ until_at: new Date().toISOString() })
                .eq("user_id", b.user_id);
              setMessage(
                error ? "Falha ao encerrar suspensão." : "Suspensão encerrada.",
              );
              await load();
            }}
          >
            Encerrar suspensão
          </button>
        </div>
      ))}
    </div>
  );
}
