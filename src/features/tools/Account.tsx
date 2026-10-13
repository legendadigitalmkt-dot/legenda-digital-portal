import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { PageIntro } from "../../pages/PublicPages";
import { downloadText } from "../../pages/Tools";
import {
  calculateTool,
  toolRegistry,
  getToolVersion,
  exportToolCSV,
  csvCell,
} from "../../lib/tools-engine.mjs";
import {
  deleteRun,
  loadRuns,
  updateRun,
  type SavedRun,
} from "../../services/tools";
import { db } from "../../services/supabase";
import { PortalAuth, usePortalUser } from "./PortalAuth";
export default function Account() {
  const { user, ready, error: authError } = usePortalUser(),
    [rows, setRows] = useState<SavedRun[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [favoriteOnly, setFavoriteOnly] = useState(false),
    [more, setMore] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(""),
    [busy, setBusy] = useState("");
  const [renameId, setRenameId] = useState(""),
    [newName, setNewName] = useState("");
  useEffect(() => {
    let active = true;
    setRows([]);
    setSelected([]);
    if (user) {
      setLoading(true);
      loadRuns()
        .then((data) => {
          if (active) {
            setRows(data);
            setMore(data.length === 20);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [user]);
  const action = async (
    id: string,
    fn: () => Promise<void>,
    done: () => void,
  ) => {
    setBusy(id);
    setError("");
    try {
      await fn();
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const exportAll = () =>
    downloadText(
      "\uFEFF" +
        [
          ["Nome", "Ferramenta", "Versão", "Data", "Respostas", "Resultado"],
          ...rows.map((r) => [
            r.name,
            r.tool_id,
            r.tool_version,
            r.completed_at,
            JSON.stringify(r.answers),
            JSON.stringify(r.result_summary),
          ]),
        ]
          .map((r) => r.map(csvCell).join(","))
          .join("\r\n"),
      "meu-historico-carregado.csv",
      "text/csv;charset=utf-8",
    );
  const compare = rows.filter((r) => selected.includes(r.id));
  const comparable =
    compare.length === 2 &&
    compare[0].tool_id === compare[1].tool_id &&
    compare[0].tool_version === compare[1].tool_version;
  return (
    <>
      <PageIntro
        label="MINHA CONTA / PORTAL"
        title="Seu histórico, com contexto."
        text="Resultados privados para retomar, comparar e aplicar. Esta conta pertence ao portal Legenda Digital."
      />
      <section className="section">
        <div className="container account-tools">
          {!ready ? (
            <p role="status">Verificando sua conta…</p>
          ) : !user ? (
            <PortalAuth />
          ) : (
            <>
              <div className="tools-directory-head">
                <p>
                  Conta conectada. Seus resultados são visíveis somente para
                  você.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => db!.auth.signOut()}
                >
                  Sair da conta
                </Button>
              </div>
              <nav className="tool-account-nav" aria-label="Minha conta">
                <a href="/conta/ferramentas">Histórico de ferramentas</a>
                <a href="/ferramentas">Explorar ferramentas</a><a href="/conta/newsletter">Newsletter</a>
                <a href="#preferencias">Privacidade</a>
              </nav>
              <h2>Resultados salvos</h2>
              <div className="tool-actions">
                <Button
                  type="button"
                  variant="secondary"
                  aria-pressed={favoriteOnly}
                  onClick={() => setFavoriteOnly(!favoriteOnly)}
                >
                  {favoriteOnly ? "Mostrar todos" : "Somente favoritos"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!rows.length}
                  onClick={exportAll}
                >
                  Exportar registros carregados
                </Button>
              </div>
              {loading && !rows.length ? (
                <p role="status">Carregando resultados…</p>
              ) : !rows.length ? (
                <div className="info-card">
                  <h3>Seu próximo resultado começa aqui.</h3>
                  <p>
                    Use uma ferramenta e escolha salvar. Nenhuma resposta
                    anônima é importada automaticamente.
                  </p>
                  <a className="text-link" href="/ferramentas">
                    Explorar ferramentas →
                  </a>
                </div>
              ) : (
                <div className="tool-history-grid">
                  {rows
                    .filter((r) => !favoriteOnly || r.favorite)
                    .map((r) => {
                      const tool = getToolVersion(r.tool_id, r.tool_version);
                      return (
                        <article key={r.id} className="tool-history-card">
                          <small>
                            {tool?.name || r.tool_id} · v{r.tool_version}
                          </small>
                          <h3>{r.name}</h3>
                          {r.parent_run_id && (
                            <p className="microcopy">
                              Revisão de uma execução anterior. O original foi
                              preservado.
                            </p>
                          )}
                          <time dateTime={r.completed_at}>
                            {new Date(r.completed_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </time>
                          <details>
                            <summary>Ver resultado</summary>
                            <div className="tool-result-lines">
                              {r.result_summary.value && (
                                <strong>{r.result_summary.value}</strong>
                              )}
                              {r.result_summary.lines.map((line, i) => (
                                <p key={i}>{line}</p>
                              ))}
                              <p className="microcopy">
                                {r.result_summary.limits}
                              </p>
                            </div>
                          </details>
                          <div className="tool-actions">
                            <a
                              className="btn btn-secondary btn-small"
                              href={
                                "/ferramentas/" + r.tool_id + "?run=" + r.id
                              }
                            >
                              Duplicar e ajustar
                            </a>
                            <Button
                              type="button"
                              size="small"
                              variant="ghost"
                              disabled={busy === r.id}
                              aria-pressed={r.favorite}
                              onClick={() =>
                                action(
                                  r.id,
                                  () =>
                                    updateRun(r.id, { favorite: !r.favorite }),
                                  () =>
                                    setRows(
                                      rows.map((x) =>
                                        x.id === r.id
                                          ? { ...x, favorite: !r.favorite }
                                          : x,
                                      ),
                                    ),
                                )
                              }
                            >
                              {r.favorite ? "Favorito ★" : "Favoritar ☆"}
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              variant="ghost"
                              onClick={() => {
                                setRenameId(r.id);
                                setNewName(r.name);
                              }}
                            >
                              Renomear
                            </Button>
                            {tool && (
                              <Button
                                type="button"
                                size="small"
                                variant="ghost"
                                onClick={() => {
                                  try {
                                    downloadText(
                                      exportToolCSV(tool, r.answers),
                                      r.tool_id + ".csv",
                                      "text/csv;charset=utf-8",
                                    );
                                  } catch {
                                    setError(
                                      "Esta versão não permite exportar pelo formato atual. Use a exportação dos registros carregados.",
                                    );
                                  }
                                }}
                              >
                                CSV
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="small"
                              variant="ghost"
                              onClick={() => setConfirmDelete(r.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                          {renameId === r.id && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                action(
                                  r.id,
                                  () =>
                                    updateRun(r.id, { name: newName.trim() }),
                                  () => {
                                    setRows(
                                      rows.map((x) =>
                                        x.id === r.id
                                          ? { ...x, name: newName.trim() }
                                          : x,
                                      ),
                                    );
                                    setRenameId("");
                                  },
                                );
                              }}
                            >
                              <label>
                                Novo nome
                                <input
                                  value={newName}
                                  maxLength={120}
                                  onChange={(e) => setNewName(e.target.value)}
                                />
                              </label>
                              <Button
                                disabled={busy === r.id || !newName.trim()}
                              >
                                Salvar nome
                              </Button>
                            </form>
                          )}
                          {confirmDelete === r.id && (
                            <div className="info-card">
                              <p>
                                Excluir este resultado e seus registros de
                                exportação?
                              </p>
                              <Button
                                type="button"
                                size="small"
                                disabled={busy === r.id}
                                onClick={() =>
                                  action(
                                    r.id,
                                    () => deleteRun(r.id),
                                    () => {
                                      setRows(
                                        rows.filter((x) => x.id !== r.id),
                                      );
                                      setSelected(
                                        selected.filter((x) => x !== r.id),
                                      );
                                      setConfirmDelete("");
                                    },
                                  )
                                }
                              >
                                Confirmar exclusão
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="small"
                                onClick={() => setConfirmDelete("")}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                          <label className="tool-check">
                            <input
                              type="checkbox"
                              checked={selected.includes(r.id)}
                              disabled={
                                !selected.includes(r.id) && selected.length >= 2
                              }
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, r.id]
                                    : selected.filter((x) => x !== r.id),
                                )
                              }
                            />
                            Selecionar para comparar
                          </label>
                        </article>
                      );
                    })}
                </div>
              )}
              {more && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const data = await loadRuns(rows.length);
                      setRows([...rows, ...data]);
                      setMore(data.length === 20);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Carregar mais resultados
                </Button>
              )}
              {compare.length === 2 && (
                <section className="tool-comparison">
                  <h2>Comparar resultados</h2>
                  {!comparable ? (
                    <p>
                      Selecione dois resultados da mesma ferramenta e versão.
                    </p>
                  ) : (
                    <>
                      <p>
                        Compare os contextos e os períodos informados.
                        Diferenças não provam efeito causal.
                      </p>
                      <div className="tool-compare-grid">
                        {compare.map((r) => (
                          <div className="info-card" key={r.id}>
                            <h3>{r.name}</h3>
                            {r.parent_run_id && (
                              <p className="microcopy">
                                Revisão de uma execução anterior. O original foi
                                preservado.
                              </p>
                            )}
                            <p>{r.result_summary.value}</p>
                            <div className="tool-result-lines">
                              {r.result_summary.lines.map((line, i) => (
                                <p key={i}>{line}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}
              <section id="preferencias" className="tool-privacy">
                <h2>Privacidade e preferências</h2>
                <p>
                  Respostas e resultados salvos ficam na sua conta por até 365
                  dias. Excluir um resultado também exclui seus registros de
                  exportação. Nada é publicado ou enviado ao Growth OS.
                </p>
                <p>
                  Estatísticas opcionais registram somente ações de uso, sem
                  respostas ou resultados. Os registros são mantidos por até 90
                  dias.
                </p>
                <div className="tool-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      localStorage.setItem("ld-analytics-consent", "no");
                      window.dispatchEvent(
                        new Event("ld-analytics-consent-changed"),
                      );
                      setError("Estatísticas desativadas para este navegador.");
                    }}
                  >
                    Desativar estatísticas
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      localStorage.setItem("ld-analytics-consent", "yes");
                      window.dispatchEvent(
                        new Event("ld-analytics-consent-changed"),
                      );
                      setError("Estatísticas ativadas para este navegador.");
                    }}
                  >
                    Permitir estatísticas
                  </Button>
                </div>
                <a href="/privacidade#ferramentas">
                  Política de privacidade das ferramentas
                </a>
              </section>
            </>
          )}
          {(error || authError) && <p role="status">{error || authError}</p>}
        </div>
      </section>
    </>
  );
}
