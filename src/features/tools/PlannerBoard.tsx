import React, { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "../../components/ui/button";
import { plannerFields, type ToolAnswers } from "../../lib/tools-engine.mjs";
import { ToolQuestion } from "./ToolQuestion";
type Row = Record<string, string>;
const statusOptions = plannerFields.find((f) => f.id === "status")!.options!;
const blank = (): Row =>
  Object.fromEntries([
    ["row_id", crypto.randomUUID()],
    ...plannerFields.map((f) => [f.id, f.default || ""]),
  ]);
export default function PlannerBoard({
  rows,
  onChange,
  onStep,
}: {
  rows: Row[];
  onChange: (r: Row[]) => void;
  onStep: () => void;
}) {
  const [view, setView] = useState("list"),
    [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)),
    [dragId, setDragId] = useState("");
  const update = (id: string, key: string, value: string) =>
    onChange(rows.map((r) => (r.row_id === id ? { ...r, [key]: value } : r)));
  const duplicate = (id: string) => {
    const r = rows.find((r) => r.row_id === id);
    if (r && rows.length < 50)
      onChange([
        ...rows,
        { ...r, row_id: crypto.randomUUID(), theme: r.theme + " (cópia)" },
      ]);
  };
  const setStatus = (id: string, status: string) => {
    update(id, "status", status);
    onStep();
  };
  const card = (r: Row) => (
    <article
      key={r.row_id}
      className="tool-plan-card"
      draggable={view === "kanban"}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", r.row_id);
        setDragId(r.row_id);
      }}
      onDragEnd={() => setDragId("")}
    >
      <p>
        <b>{r.theme || "Tema em definição"}</b>
      </p>
      <p>
        {r.date || "Sem data"} · {r.channel || "Canal em definição"}
      </p>
      <label>
        Mover pauta: {r.theme || "sem tema"}
        <select
          value={r.status}
          onChange={(e) => setStatus(r.row_id, e.target.value)}
        >
          {statusOptions.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="ghost"
        size="small"
        onClick={() => duplicate(r.row_id)}
        disabled={rows.length >= 50}
      >
        <Copy size={16} />
        Duplicar pauta
      </Button>
    </article>
  );
  const parts = month.split("-").map(Number),
    days =
      Number.isInteger(parts[0]) && parts[0] > 1900 && parts[0] < 9999
        ? new Date(parts[0], parts[1], 0).getDate()
        : 0;
  return (
    <div className="tool-planner">
      <div className="tool-filters" role="group" aria-label="Visão do planner">
        {[
          ["list", "Lista"],
          ["calendar", "Calendário"],
          ["kanban", "Kanban"],
        ].map(([v, label]) => (
          <Button
            type="button"
            size="small"
            variant="secondary"
            aria-pressed={view === v}
            key={v}
            onClick={() => setView(v)}
          >
            {label}
          </Button>
        ))}
      </div>
      {view === "list" ? (
        <div className="tool-planner-list">
          {rows.map((r, i) => (
            <fieldset key={r.row_id}>
              <legend>Pauta {i + 1}</legend>
              <div className="tool-plan-primary">
                {plannerFields
                  .filter((f) => ["theme", "date", "status"].includes(f.id))
                  .map((f) => (
                    <ToolQuestion
                      key={f.id}
                      field={f}
                      value={r[f.id]}
                      onChange={(v) => update(r.row_id, f.id, String(v))}
                      onStep={onStep}
                    />
                  ))}
              </div>
              <details>
                <summary>Contexto, distribuição e publicação</summary>
                {plannerFields
                  .filter((f) => !["theme", "date", "status"].includes(f.id))
                  .map((f) => (
                    <ToolQuestion
                      key={f.id}
                      field={f}
                      value={r[f.id]}
                      onChange={(v) => update(r.row_id, f.id, String(v))}
                      onStep={onStep}
                    />
                  ))}
              </details>
              <div className="tool-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => duplicate(r.row_id)}
                  disabled={rows.length >= 50}
                >
                  <Copy size={16} />
                  Duplicar pauta
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  aria-label={"Remover pauta " + (i + 1)}
                  onClick={() =>
                    onChange(rows.filter((x) => x.row_id !== r.row_id))
                  }
                >
                  <Trash2 size={16} />
                  Remover
                </Button>
              </div>
            </fieldset>
          ))}
        </div>
      ) : view === "calendar" ? (
        <div className="tool-calendar">
          <label>
            Mês do calendário
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <div className="tool-calendar-weekdays" aria-hidden="true">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="tool-calendar-grid">
            {Array.from(
              {
                length: days
                  ? (new Date(parts[0], parts[1] - 1, 1).getDay() + 6) % 7
                  : 0,
              },
              (_, i) => (
                <span
                  key={"offset-" + i}
                  className="tool-calendar-offset"
                  aria-hidden="true"
                />
              ),
            )}
            {Array.from({ length: days }, (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0"),
                items = rows.filter((r) => r.date === date);
              return (
                <section
                  className={
                    "tool-calendar-day " + (!items.length ? "empty" : "")
                  }
                  key={date}
                >
                  <h4>{i + 1}</h4>
                  {items.map(card)}
                </section>
              );
            })}
          </div>
          <h3>Sem data</h3>
          {rows.filter((r) => !r.date).map(card)}
          <p className="microcopy">
            Pautas de outros meses aparecem quando você seleciona o mês
            correspondente. Para editar os campos, volte à lista.
          </p>
        </div>
      ) : (
        <div className="tool-kanban">
          {statusOptions.map(([status, label]) => (
            <section
              key={status}
              aria-label={"Etapa " + label}
              onDragOver={(e) => {
                if (dragId) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (rows.some((r) => r.row_id === id)) setStatus(id, status);
                setDragId("");
              }}
            >
              <h3>
                {label}{" "}
                <small>{rows.filter((r) => r.status === status).length}</small>
              </h3>
              {rows.filter((r) => r.status === status).map(card)}
            </section>
          ))}
        </div>
      )}
      <Button
        type="button"
        disabled={rows.length >= 50}
        onClick={() => onChange([...rows, blank()])}
      >
        <Plus size={17} />
        Adicionar pauta
      </Button>
      <p className="microcopy">
        O Kanban funciona por arraste ou pelo seletor “Mover pauta”, inclusive
        no celular e com teclado. Nenhum status publica no CMS.
      </p>
    </div>
  );
}
