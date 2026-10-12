import React, { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Button } from "../../components/ui/button";
type ToolRow = {
  id: string;
  name: string;
  description: string;
  version: number;
  status: string;
};
type Metric = {
  tool_id: string;
  views: number;
  starts: number;
  completions: number;
  saves: number;
  exports: number;
};
export default function ToolsAdmin({ isAdmin }: { isAdmin: boolean }) {
  const [tools, setTools] = useState<ToolRow[]>([]),
    [metrics, setMetrics] = useState<Metric[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      db!
        .from("tools")
        .select("id,name,description,version,status")
        .order("name"),
      isAdmin
        ? db!.from("tool_usage_summary").select("*")
        : Promise.resolve({ data: [], error: null }),
    ])
      .then(([t, m]) => {
        if (active) {
          setTools(t.data || []);
          setMetrics((m.data || []) as Metric[]);
          if (t.error || m.error)
            setError(
              "Não foi possível carregar toda a plataforma de ferramentas.",
            );
        }
      })
      .catch(() => setError("Conexão indisponível."))
      .finally(() => {});
    return () => {
      active = false;
    };
  }, [isAdmin]);
  return (
    <>
      <p className="admin-note">
        Versões e fórmulas são revisadas por PR. Esta área gerencia a
        disponibilidade e acompanha eventos consentidos dos últimos 30 dias.
        Nenhuma resposta privada aparece aqui.
      </p>
      <div className="tool-history-grid">
        {tools.map((t) => {
          const m = metrics.find((x) => x.tool_id === t.id);
          return (
            <article className="info-card" key={t.id}>
              <h2>{t.name}</h2>
              <p>
                Versão {t.version} ·{" "}
                {t.status === "published" ? "Disponível" : "Pausada"}
              </p>
              {m && (
                <dl className="tool-metrics">
                  {[
                    ["Visualizações", m.views],
                    ["Inícios", m.starts],
                    ["Conclusões", m.completions],
                    ["Salvamentos", m.saves],
                    ["Exportações", m.exports],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="microcopy">
                Eventos não representam pessoas únicas. Bloqueios e escolhas de
                privacidade podem reduzir a contagem.
              </p>
              {isAdmin && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(t.id);
                    const { error } = await db!
                      .from("tools")
                      .update({
                        name: t.name,
                        description: t.description,
                        status: t.status,
                      })
                      .eq("id", t.id);
                    setBusy("");
                    setError(
                      error
                        ? "Falha ao atualizar. Verifique sua permissão."
                        : "Configuração salva com registro de auditoria.",
                    );
                  }}
                >
                  <label>
                    Nome
                    <input
                      maxLength={100}
                      minLength={3}
                      required
                      value={t.name}
                      onChange={(e) =>
                        setTools(
                          tools.map((x) =>
                            x.id === t.id ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Descrição
                    <textarea
                      maxLength={500}
                      value={t.description}
                      onChange={(e) =>
                        setTools(
                          tools.map((x) =>
                            x.id === t.id
                              ? { ...x, description: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Disponibilidade
                    <select
                      value={t.status}
                      onChange={(e) =>
                        setTools(
                          tools.map((x) =>
                            x.id === t.id
                              ? { ...x, status: e.target.value }
                              : x,
                          ),
                        )
                      }
                    >
                      <option value="published">Disponível</option>
                      <option value="paused">Pausada</option>
                    </select>
                  </label>
                  <Button disabled={busy === t.id}>
                    {busy === t.id ? "Salvando…" : "Salvar configuração"}
                  </Button>
                </form>
              )}
              <a
                className="text-link"
                href={"/ferramentas/" + t.id}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir ferramenta →
              </a>
            </article>
          );
        })}
      </div>
      {error && <p role="status">{error}</p>}
    </>
  );
}
