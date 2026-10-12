import React, { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { safeUrl } from "../../lib/validation";
type Entry = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  bio?: string;
  avatar_url?: string;
  links?: { label: string; url: string }[];
  active?: boolean;
};
export default function TaxonomyAdmin({
  table,
}: {
  table: "authors" | "content_categories" | "content_tags";
}) {
  const [rows, setRows] = useState<Entry[]>([]);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const title = {
    authors: "Autores",
    content_categories: "Categorias",
    content_tags: "Tags",
  }[table];
  const load = async () => {
    const { data, error } = await db!.from(table).select("*").order("name");
    setRows(data || []);
    if (error) setMessage("Falha ao carregar " + title.toLowerCase());
  };
  useEffect(() => {
    setEditing(null);
    void load();
  }, [table]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (
      editing.name.trim().length < 2 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(editing.slug) ||
      (editing.avatar_url && !safeUrl(editing.avatar_url)) ||
      (editing.links || []).some((l) => !safeUrl(l.url))
    ) {
      setMessage("Informe nome, slug válido e endereços seguros.");
      return;
    }
    setBusy(true);
    const fields =
      table === "authors"
        ? ["name", "slug", "bio", "avatar_url", "links"]
        : table === "content_categories"
          ? ["name", "slug", "description", "active"]
          : ["name", "slug", "description"];
    const payload = Object.fromEntries(
      fields.map((k) => [
        k,
        editing[k as keyof Entry] ??
          (k === "active" ? true : k === "links" ? [] : ""),
      ]),
    );
    const { error } = editing.id
      ? await db!.from(table).update(payload).eq("id", editing.id)
      : await db!.from(table).insert(payload);
    setBusy(false);
    setMessage(
      error
        ? "Não foi possível salvar. Verifique duplicidade e permissões."
        : title + " atualizado.",
    );
    if (!error) {
      setEditing(null);
      await load();
    }
  };
  return (
    <div>
      <div className="section-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setEditing({
              name: "",
              slug: "",
              description: "",
              bio: "",
              avatar_url: "",
              links: [],
              active: true,
            })
          }
        >
          Adicionar
        </button>
      </div>
      <p role="status">{message}</p>
      {editing && (
        <form className="admin-editor" onSubmit={save}>
          <div className="form-grid">
            <label>
              Nome
              <input
                maxLength={100}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Slug
              <input
                value={editing.slug || ""}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setEditing({
                  ...editing,
                  slug: editing.name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                })
              }
            >
              Gerar slug
            </button>
            <label>
              {table === "authors" ? "Biografia" : "Descrição"}
              <textarea
                maxLength={2000}
                value={
                  table === "authors"
                    ? editing.bio || ""
                    : editing.description || ""
                }
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    [table === "authors" ? "bio" : "description"]:
                      e.target.value,
                  })
                }
              />
            </label>
            {table === "authors" && (
              <>
                <label>
                  Avatar (URL)
                  <input
                    value={editing.avatar_url || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, avatar_url: e.target.value })
                    }
                  />
                </label>
                <h3>Links públicos</h3>
                {(editing.links || []).map((l, i) => (
                  <div className="form-grid" key={i}>
                    <label>
                      Rótulo
                      <input
                        value={l.label}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            links: editing.links!.map((x, n) =>
                              n === i ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      URL
                      <input
                        value={l.url}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            links: editing.links!.map((x, n) =>
                              n === i ? { ...x, url: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          links: editing.links!.filter((_, n) => n !== i),
                        })
                      }
                    >
                      Remover link
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      links: [...(editing.links || []), { label: "", url: "" }],
                    })
                  }
                >
                  Adicionar link
                </button>
              </>
            )}
            {table === "content_categories" && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editing.active !== false}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />
                Categoria ativa
              </label>
            )}
          </div>
          <div className="comment-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {rows.map((r) => (
        <div className="resource-row" key={r.id}>
          <div>
            <b>{r.name}</b>
            <small>
              {r.slug || "Slug não definido"}
              {r.active === false ? " · inativa" : ""}
            </small>
            <p>{r.bio || r.description}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setEditing(r)}
          >
            Editar
          </button>
        </div>
      ))}
    </div>
  );
}
