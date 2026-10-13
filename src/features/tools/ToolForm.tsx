import React, { useState } from "react";
import {
  type ToolDefinition,
  type ToolAnswers,
  type ToolField,
  claroTemplates,
} from "../../lib/tools-engine.mjs";
import { Button } from "../../components/ui/button";
import PlannerBoard from "./PlannerBoard";
import { ToolQuestion } from "./ToolQuestion";
export default function ToolForm({
  tool,
  answers,
  onChange,
  onStep,
}: {
  tool: ToolDefinition;
  answers: ToolAnswers;
  onChange: (a: ToolAnswers) => void;
  onStep: (key: string) => void;
}) {
  const visible = tool.input_schema.filter(
      (f) => !f.showWhen || answers[f.showWhen.field] === f.showWhen.value,
    ),
    groups = [
      ...new Set(visible.map((f) => f.group).filter(Boolean)),
    ] as string[],
    [group, setGroup] = useState(""),
    [template, setTemplate] = useState("");
  const current = groups.includes(group) ? group : groups[0];
  const filled = visible.filter(
    (f) =>
      f.type !== "rows" && answers[f.id] !== "" && answers[f.id] !== undefined,
  ).length;
  return (
    <>
      {tool.id === "claro" && tool.version === 2 && (
        <div className="tool-template">
          <label>
            Exemplo / template
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              <option value="">Escolha um modelo</option>
              {claroTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={!template}
            onClick={() =>
              onChange({
                ...answers,
                ...claroTemplates.find((t) => t.id === template)!.answers,
              })
            }
          >
            Aplicar template (substitui campos)
          </Button>
          <p className="microcopy">
            Exemplos editáveis; revise e substitua as informações antes de usar.
          </p>
        </div>
      )}
      {groups.length > 0 && (
        <div className="tool-stepper">
          <p className="microcopy">
            {filled} de {visible.filter((f) => f.type !== "rows").length} campos
            preenchidos. Critérios desconhecidos podem ficar em branco.
          </p>
          <div
            role="group"
            aria-label="Seções da ferramenta"
            className="tool-filters"
          >
            {groups.map((g) => (
              <Button
                type="button"
                variant="secondary"
                size="small"
                key={g}
                aria-pressed={current === g}
                onClick={() => setGroup(g)}
              >
                {g}
              </Button>
            ))}
          </div>
          <h3>{current}</h3>
        </div>
      )}
      {visible
        .filter((f) => !f.group || f.group === current)
        .map((f) =>
          f.type === "rows" ? (
            <PlannerBoard
              key={f.id}
              rows={answers.rows}
              onChange={(rows) => onChange({ ...answers, rows })}
              onStep={() => onStep(f.id)}
            />
          ) : (
            <ToolQuestion
              key={f.id}
              field={f}
              value={answers[f.id]}
              onChange={(v) => onChange({ ...answers, [f.id]: v })}
              onStep={() => onStep(f.id)}
            />
          ),
        )}
      {groups.length > 1 && (
        <div className="tool-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={groups.indexOf(current) === 0}
            onClick={() => setGroup(groups[groups.indexOf(current) - 1])}
          >
            Seção anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={groups.indexOf(current) === groups.length - 1}
            onClick={() => setGroup(groups[groups.indexOf(current) + 1])}
          >
            Próxima seção
          </Button>
        </div>
      )}
    </>
  );
}
