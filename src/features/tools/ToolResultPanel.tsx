import React from "react";
import type { ToolResult, ToolDefinition } from "../../lib/tools-engine.mjs";
export function ToolTable({
  table,
}: {
  table: NonNullable<ToolResult["tables"]>[number];
}) {
  return (
    <section className="tool-result-table">
      <h3>{table.title}</h3>
      <table>
        <caption className="sr-only">{table.title}</caption>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} data-label={table.headers[j]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
export default function ToolResultPanel({
  result,
  tool,
}: {
  result: ToolResult;
  tool?: ToolDefinition;
}) {
  return (
    <>
      <h2>{result.title}</h2>
      {result.value && (
        <strong className="tool-result-value">{result.value}</strong>
      )}
      {result.breakdown && (
        <div className="tool-breakdown" aria-label="Notas por dimensão">
          {result.breakdown.map((d) => (
            <div key={d.id}>
              <div>
                <b>{d.label}</b>
                <span>
                  {d.score === null
                    ? "Desconhecido"
                    : d.score.toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      }) + "/100"}{" "}
                  · {d.answered}/{d.total}
                </span>
              </div>
              <div className="tool-score-bar" aria-hidden="true">
                <span style={{ width: (d.score || 0) + "%" }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {result.funnels?.map((f) => (
        <section className="tool-funnel" key={f.label}>
          <h3>{f.label}</h3>
          <ol>
            {f.stages.map((s) => (
              <li key={s.label}>
                <div>
                  <span>{s.label}</span>
                  <b>{s.count.toLocaleString("pt-BR")}</b>
                </div>
                <div className="tool-score-bar" aria-hidden="true">
                  <span
                    style={{
                      width:
                        (f.stages[0].count
                          ? (s.count / f.stages[0].count) * 100
                          : 0) + "%",
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <div className="tool-result-lines">
        {result.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {result.tables?.map((table, i) => (
        <ToolTable key={i} table={table} />
      ))}
      {result.recommendations && result.recommendations.length > 0 && (
        <section className="tool-recommendations">
          <h3>Ações recomendadas</h3>
          {result.recommendations.map((r, i) => (
            <div className="info-card" key={i}>
              <h4>{r.title}</h4>
              <p>{r.text}</p>
            </div>
          ))}
        </section>
      )}
      <h3>Como interpretar</h3>
      <p>{result.methodology}</p>
      <p className="microcopy">{result.limits}</p>
      <h3>Próximo passo</h3>
      <p>{result.next_action}</p>
      {tool?.sources && (
        <details className="tool-sources">
          <summary>Referências do método</summary>
          <ul>
            {tool.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="microcopy">
            Os scores da Legenda Digital são próprios. Referências não
            representam endosso ao diagnóstico.
          </p>
        </details>
      )}
    </>
  );
}
