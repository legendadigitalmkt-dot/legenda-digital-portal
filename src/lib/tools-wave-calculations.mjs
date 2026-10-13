import { plannerFields, funnelStages } from "./tools-wave-one.mjs";
const text = (v) =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
export function safePublicationUrl(value) {
  const v = text(value);
  if (!v) return "";
  if (/[\s\\]/.test(v) || v.startsWith("//"))
    throw Error("Informe uma URL publicada válida, sem espaços.");
  try {
    const u = new URL(v, "https://legendadigital.com.br");
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      throw Error();
    return v;
  } catch {
    throw Error("Informe uma URL publicada válida (http ou https).");
  }
}
export function waveInitialAnswers(tool) {
  return Object.fromEntries(
    tool.input_schema.map((f) => [
      f.id,
      f.type === "rows"
        ? [
            Object.fromEntries([
              ["row_id", "row_1"],
              ...plannerFields.map((f) => [f.id, f.default || ""]),
            ]),
          ]
        : f.default || "",
    ]),
  );
}
export function normalizeWaveAnswers(tool, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Confira as respostas da ferramenta.");
  const a = waveInitialAnswers(tool);
  for (const f of tool.input_schema) {
    const value = raw[f.id];
    if (f.type === "rows") {
      if (!Array.isArray(value) || value.length > 50)
        throw Error("Use no máximo 50 pautas.");
      const used = new Set();
      a.rows = value.map((r, i) => {
        if (!r || typeof r !== "object" || Array.isArray(r))
          throw Error("Confira as pautas.");
        const id = /^[a-zA-Z0-9_-]{1,60}$/.test(text(r.row_id))
          ? r.row_id
          : "row_" + (i + 1);
        if (used.has(id))
          throw Error("As pautas precisam de identificadores distintos.");
        used.add(id);
        const row = { row_id: id };
        for (const rf of plannerFields) {
          const v = text(r[rf.id] ?? rf.default ?? "");
          if (v.length > 500)
            throw Error(rf.label + ": use até 500 caracteres.");
          if (rf.options && !rf.options.some((x) => x[0] === v))
            throw Error("Confira " + rf.label + ".");
          row[rf.id] = v;
        }
        if (
          row.date &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
            !Number.isFinite(Date.parse(row.date)) ||
            new Date(row.date).toISOString().slice(0, 10) !== row.date)
        )
          throw Error("Informe uma data real para a pauta.");
        row.publication_url = safePublicationUrl(row.publication_url);
        return row;
      });
    } else {
      const v = text(value ?? f.default ?? "");
      if (v.length > 2000) throw Error(f.label + ": use até 2.000 caracteres.");
      if (f.options && !f.options.some((x) => x[0] === v))
        throw Error("Confira " + f.label + ".");
      a[f.id] = v;
    }
  }
  return a;
}
const number = (a, key, { integer = false, min = 0, max = 1e12 } = {}) => {
  const v = Number(a[key]);
  if (
    a[key] === "" ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isSafeInteger(v))
  )
    throw Error(
      "Confira os valores informados: use " +
        (integer ? "números inteiros" : "números") +
        " dentro dos limites do formulário.",
    );
  return v;
};
const num = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const pct = (n, d) =>
  d > 0 ? num((n / d) * 100) + "%" : "Indisponível (base zero)";
const money = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function scoreAssessment(tool, a) {
  const breakdown = tool.dimensions.map((d) => {
    const fs = tool.input_schema.filter((f) => f.id.startsWith(d.id + "_"));
    const values = fs.filter((f) => a[f.id] !== "").map((f) => Number(a[f.id]));
    return {
      id: d.id,
      label: d.label,
      score: values.length
        ? (values.reduce((s, v) => s + v, 0) / values.length / 4) * 100
        : null,
      answered: values.length,
      total: fs.length,
    };
  });
  const answered = breakdown.reduce((s, d) => s + d.answered, 0),
    total = breakdown.reduce((s, d) => s + d.total, 0),
    valid = breakdown.filter((d) => d.score !== null);
  if (!answered)
    throw Error(
      "Avalie ao menos um critério; desconhecidos podem permanecer sem resposta.",
    );
  const score = valid.reduce((s, d) => s + d.score, 0) / valid.length;
  const lower = [...valid].sort((x, y) => x.score - y.score).slice(0, 3),
    high = [...valid]
      .sort((x, y) => y.score - x.score)
      .filter((d) => d.score >= 75)
      .slice(0, 3);
  const recommendations = lower.map((d) => ({
    title: "Revisar " + d.label,
    text: tool.input_schema.find((f) => f.id.startsWith(d.id + "_")).action,
  }));
  const missing = breakdown.filter((d) => d.answered < d.total);
  if (missing.length)
    recommendations.unshift({
      title: "Completar a avaliação",
      text: "Verifique os critérios desconhecidos antes de comparar ou priorizar pelo score.",
    });
  return {
    title: "Seu diagnóstico",
    value: num(score) + "/100" + (answered < total ? " · parcial" : ""),
    breakdown,
    recommendations,
    lines: [
      ...(a.content_label ? ["Conteúdo: " + a.content_label] : []),
      "Cobertura: " + answered + " de " + total + " critérios.",
      "Escala própria, respostas autodeclaradas; não é benchmark de mercado.",
      ...breakdown.map(
        (d) =>
          d.label +
          ": " +
          (d.score === null ? "Desconhecido" : num(d.score) + "/100") +
          " · " +
          d.answered +
          "/" +
          d.total +
          " respondidos",
      ),
      high.length
        ? "Pontos fortes relatados: " + high.map((d) => d.label).join(", ")
        : "Nenhum ponto forte foi identificado pelos critérios respondidos.",
    ],
  };
}
function claro(tool, a) {
  if (!a.context && !a.objective && !a.action)
    throw Error(
      "Preencha contexto, objetivo ou ação para organizar o trabalho.",
    );
  const fs = tool.input_schema.filter(
    (f) => f.id !== "output_format" && a[f.id],
  );
  const base = fs.map((f) => f.label.toUpperCase() + "\n" + a[f.id]);
  const missing = ["audience", "objective", "result"].filter((k) => !a[k]);
  const recommendations = missing.map((k) => ({
    title: "Completar " + tool.input_schema.find((f) => f.id === k).label,
    text: "Defina esse ponto antes de executar ou compartilhar o material.",
  }));
  const format = a.output_format;
  let lines = base;
  if (format === "brief")
    lines = [
      "BRIEF DE TRABALHO",
      ...base,
      "CRITÉRIOS DE REVISÃO\nVerificar aderência ao objetivo, fontes, limites e resultado esperado.",
    ];
  if (format === "plan")
    lines = [
      "PLANO DE EXECUÇÃO",
      ...base,
      "1. Conferir contexto, audiência e informações disponíveis.",
      "2. Executar a ação respeitando os limites informados.",
      "3. Revisar o resultado com os critérios definidos.",
      "4. Registrar aprendizados e decidir o próximo passo.",
    ];
  if (format === "checklist")
    lines = [
      "CHECKLIST DE TRABALHO",
      ...base,
      "[ ] Audiência e objetivo definidos.",
      "[ ] Informações e fontes verificadas.",
      "[ ] Limites respeitados.",
      "[ ] Resultado revisado antes de usar.",
    ];
  return {
    title: {
      prompt: "Sua instrução estruturada",
      brief: "Seu brief",
      plan: "Seu plano",
      checklist: "Seu checklist",
    }[format],
    value: null,
    lines,
    recommendations,
  };
}
function funnel(a) {
  if (a.mode === "simple") {
    const v = Number(a.visits),
      n = Number(a.actions);
    if (
      !a.visits ||
      !a.actions ||
      !Number.isSafeInteger(v) ||
      !Number.isSafeInteger(n) ||
      v <= 0 ||
      n < 0 ||
      n > v
    )
      throw Error(
        "Use números inteiros; ações devem ficar entre zero e o total de visitas.",
      );
    return {
      title: "Taxa de conversão",
      value: pct(n, v),
      lines: [n + " ações em " + v + " visitas."],
      funnels: [
        {
          label: "Conversão simples",
          stages: [
            { label: "Visitas", count: v },
            { label: "Ações", count: n },
          ],
        },
      ],
    };
  }
  const tables = [],
    funnels = [],
    lines = [],
    recommendations = [];
  let totalCurrent;
  for (const scenario of ["current", "target", "alternative"]) {
    const keys = funnelStages.map(([id]) => scenario + "_" + id);
    const any = keys.some((k) => a[k] !== "");
    if (!any && scenario !== "current") continue;
    if (keys.some((k) => a[k] === ""))
      throw Error(
        "Preencha todas as sete etapas do cenário " +
          { current: "atual", target: "meta", alternative: "alternativo" }[
            scenario
          ] +
          ".",
      );
    const counts = keys.map((k) =>
      number(a, k, { integer: true, max: Number.MAX_SAFE_INTEGER }),
    );
    for (let i = 1; i < counts.length; i++)
      if (counts[i] > counts[i - 1])
        throw Error(
          "As etapas devem diminuir ou manter a contagem no mesmo período e coorte.",
        );
    const label = {
      current: "Atual",
      target: "Meta informada",
      alternative: "Alternativo informado",
    }[scenario];
    const rows = funnelStages.map(([, stage], i) => [
      stage,
      num(counts[i]),
      i ? pct(counts[i], counts[i - 1]) : "Base",
      i ? num(counts[i - 1] - counts[i]) : "—",
    ]);
    tables.push({
      title: label,
      headers: ["Etapa", "Quantidade", "Conversão da etapa", "Perda absoluta"],
      rows,
    });
    funnels.push({
      label,
      stages: funnelStages.map(([, label], i) => ({ label, count: counts[i] })),
    });
    lines.push(
      label + ": " + pct(counts[6], counts[0]) + " de conversão total.",
    );
    if (scenario === "current") {
      totalCurrent = pct(counts[6], counts[0]);
      const losses = counts
        .slice(1)
        .map((n, i) => ({
          i,
          loss: counts[i] - n,
          rate: counts[i] ? 1 - n / counts[i] : null,
        }))
        .filter((x) => x.rate !== null)
        .sort((x, y) => y.rate - x.rate);
      if (losses[0]?.loss > 0)
        recommendations.push({
          title: "Investigar uma passagem",
          text:
            funnelStages[losses[0].i][1] +
            " → " +
            funnelStages[losses[0].i + 1][1] +
            ": maior perda proporcional no cenário atual. Isso não prova que essa seja a prioridade econômica.",
        });
    }
  }
  return {
    title: "Conversão total do funil atual",
    value: totalCurrent,
    lines,
    tables,
    funnels,
    recommendations,
  };
}
function planner(a) {
  a.rows = a.rows.filter((r) => r.theme || r.date);
  if (!a.rows.length)
    throw Error("Adicione pelo menos um tema ou uma data ao planejamento.");
  for (const r of a.rows)
    if (r.status === "published" && !r.publication_url)
      throw Error(
        "Adicione a URL publicada antes de marcar a pauta como publicada.",
      );
  const rows = a.rows.map((r) => [
    r.theme || "Tema em definição",
    r.date || "Sem data",
    r.channel,
    r.status,
    r.publication_url || "—",
  ]);
  return {
    title: "Seu planejamento editorial",
    value: a.rows.length + " pauta(s)",
    lines: a.rows.map((r) =>
      [
        r.theme || "Tema em definição",
        r.format,
        r.channel,
        r.date || "Sem data",
        r.status,
      ].join(" · "),
    ),
    tables: [
      {
        title: "Pautas informadas",
        headers: ["Tema", "Data", "Canal", "Status", "URL publicada"],
        rows,
      },
    ],
    recommendations: [
      {
        title: "Revisar e distribuir",
        text: "Confirme pergunta, tese, fontes e CTA. Marcar publicado é um registro manual e não publica no CMS.",
      },
    ],
  };
}
function economics(a) {
  const spend = number(a, "spend"),
    customers = number(a, "customers", { integer: true, min: 1 }),
    revenue = number(a, "monthly_revenue"),
    margin = number(a, "gross_margin", { max: 100 }),
    months = number(a, "retention_months", { min: 0.01, max: 1200 });
  const cac = spend / customers,
    contribution = (revenue * margin) / 100,
    ltv = contribution * months,
    ratio = cac > 0 ? num(ltv / cac) + ":1" : "Indisponível (CAC zero)",
    payback =
      contribution > 0
        ? num(cac / contribution) + " meses"
        : "Sem recuperação no modelo (contribuição zero)";
  const rows = [
    ["CAC", money(cac)],
    ["Contribuição mensal por cliente", money(contribution)],
    ["LTV de contribuição estimado", money(ltv)],
    ["LTV:CAC", ratio],
    ["Payback simples", payback],
  ];
  return {
    title: "Economia do cenário informado",
    value: "CAC " + money(cac),
    lines: [
      ...(a.period ? ["Período / canal: " + a.period] : []),
      ...rows.map(([k, v]) => k + ": " + v),
      "Premissas: " +
        num(months) +
        " meses de retenção e " +
        num(margin) +
        "% de margem bruta.",
    ],
    tables: [
      {
        title: "Cálculo com suas premissas",
        headers: ["Indicador", "Resultado"],
        rows,
      },
    ],
    recommendations: [
      {
        title: "Revisar as premissas",
        text: "Confira custos de marketing/vendas, receita, margem e retenção da mesma coorte. Não aplique um benchmark universal.",
      },
    ],
  };
}
function followup(a) {
  const total = number(a, "total", { integer: true }),
    days = number(a, "stalled_days", { integer: true, min: 1, max: 36500 });
  const conditions = [
    ["ownerless", "Sem responsável", "Defina um responsável por oportunidade."],
    [
      "no_next_step",
      "Sem próximo passo",
      "Registre a próxima ação e sua data.",
    ],
    [
      "overdue",
      "Atrasadas",
      "Replaneje tarefas e retome os retornos atrasados.",
    ],
    [
      "waiting",
      "Aguardando cliente",
      "Combine quando revisar a espera; ela pode fazer parte do processo.",
    ],
    [
      "stalled",
      "Paradas",
      "Revise oportunidades paradas há " + days + " dias ou mais.",
    ],
  ];
  const values = conditions.map(([id, label, text]) => ({
    id,
    label,
    text,
    count: number(a, id, { integer: true, max: total }),
  }));
  const rows = values.map((x) => [x.label, num(x.count), pct(x.count, total)]);
  return {
    title: "Condições da carteira",
    value: num(total) + " oportunidade(s)",
    lines: [
      ...(a.period ? ["Carteira / período: " + a.period] : []),
      "Prazo considerado para parada: " + days + " dias.",
      "As condições se sobrepõem; não somamos oportunidades afetadas.",
      ...rows.map((r) => r.join(" · ")),
    ],
    tables: [
      {
        title: "Situação informada",
        headers: ["Condição", "Quantidade", "Proporção da carteira"],
        rows,
      },
    ],
    recommendations: values
      .filter((x) => x.count > 0)
      .map((x) => ({ title: x.label, text: x.text })),
  };
}
export function calculateWave(tool, raw) {
  const answers = normalizeWaveAnswers(tool, raw);
  const data = tool.dimensions
    ? scoreAssessment(tool, answers)
    : tool.id === "claro"
      ? claro(tool, answers)
      : tool.id === "calculadora-conversao"
        ? funnel(answers)
        : tool.id === "planner-editorial"
          ? planner(answers)
          : tool.id === "cac-ltv-payback"
            ? economics(answers)
            : tool.id === "follow-up"
              ? followup(answers)
              : null;
  if (!data) throw Error("Ferramenta indisponível.");
  const result = {
    ...data,
    methodology: tool.methodology,
    limits: tool.limits,
    next_action: tool.next_action,
  };
  const text = [
    tool.name + " · v" + tool.version,
    data.value,
    ...data.lines,
    ...(data.tables || []).flatMap((t) => [
      t.title,
      t.headers.join(" | "),
      ...t.rows.map((r) => r.join(" | ")),
    ]),
    ...(data.recommendations || []).map((r) => r.title + ": " + r.text),
    "Método: " + tool.methodology,
    "Limites: " + tool.limits,
    "Próxima ação: " + tool.next_action,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { answers, result, text };
}
