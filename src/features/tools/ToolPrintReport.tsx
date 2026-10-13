import React from "react";
import type { ToolDefinition, ToolResult } from "../../lib/tools-engine.mjs";
export default function ToolPrintReport({
  tool,
  result,
}: {
  tool: ToolDefinition;
  result: ToolResult;
}) {
  return (
    <article className="tool-print-report">
      <header>
        <img
          src="/images/legenda-digital-logo.png"
          width="200"
          alt="Legenda Digital"
        />
        <p>
          Ferramentas para aplicar · {tool.name} · v{tool.version}
        </p>
        <h1>{result.title}</h1>
        {result.value && <p className="tool-print-value">{result.value}</p>}
      </header>
      {result.lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {result.tables?.map((table, i) => (
        <section key={i}>
          <h2>{table.title}</h2>
          {table.rows.map((row, j) => (
            <p key={j}>
              {row.map((cell, k) => table.headers[k] + ": " + cell).join(" · ")}
            </p>
          ))}
        </section>
      ))}
      {result.recommendations?.map((r, i) => (
        <section key={i}>
          <h2>{r.title}</h2>
          <p>{r.text}</p>
        </section>
      ))}
      <section>
        <h2>Metodologia e limites</h2>
        <p>{result.methodology}</p>
        <p>{result.limits}</p>
        <h2>Próximo passo</h2>
        <p>{result.next_action}</p>
      </section>
      <footer>
        Resultado preparado no seu navegador. Compartilhamento sob seu controle;
        não foi publicado no portal.
      </footer>
    </article>
  );
}
