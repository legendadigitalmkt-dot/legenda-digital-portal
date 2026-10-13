// Versioned, deterministic tools. No remote AI, hidden benchmarks or personal-data capture.
export const PRIVACY_VERSION = "tools-v1-2026-10-12";
const field = (id, label, type = "textarea", extra = {}) => ({
  id,
  label,
  type,
  ...extra,
});
const checks = [
  "O público e a pergunta principal estão claros.",
  "O título descreve o que o leitor vai encontrar.",
  "As afirmações têm fonte ou estão identificadas como opinião.",
  "Datas, nomes e números foram revisados.",
  "A peça tem uma aplicação ou próximo passo útil.",
  "As imagens têm permissão de uso e texto alternativo.",
  "Links e chamadas para ação foram testados.",
  "O texto está legível no celular.",
  "O conteúdo respeita a voz da marca.",
  "O canal e a data de distribuição foram definidos.",
];
export const toolRegistry = [
  {
    id: "claro",
    slug: "claro",
    name: "Estruturador CLARO",
    category: "IA",
    type: "Mini ferramenta",
    description:
      "Transforme contexto, limites e objetivos em uma instrução organizada.",
    image: "/images/work.jpg",
    input_schema: [
      field("context", "Contexto", "textarea", {
        placeholder: "Quem é a marca? Qual é a situação?",
      }),
      field("limits", "Limite", "textarea", {
        placeholder: "Restrições, prazo e o que evitar.",
      }),
      field("action", "Ação", "textarea", {
        placeholder: "Qual tarefa precisa ser feita?",
      }),
      field("result", "Resultado", "textarea", {
        placeholder: "Formato e critérios de qualidade.",
      }),
      field("notes", "Observação", "textarea", {
        placeholder: "Informações adicionais e pontos de atenção.",
      }),
    ],
    methodology:
      "Organiza os campos preenchidos na sequência Contexto, Limite, Ação, Resultado e Observação. Não faz chamadas a modelos de IA.",
    limits:
      "A qualidade depende das informações fornecidas. Revise fatos e evite informações pessoais ou confidenciais.",
    next_action:
      "Revise a instrução e use em uma tarefa pequena, com critérios de avaliação.",
    related_content: ["como-aplicar-ia-no-negocio"],
    related_tools: ["checklist-conteudo"],
  },
  {
    id: "checklist-conteudo",
    slug: "checklist-conteudo",
    name: "Checklist de conteúdo",
    category: "Conteúdo",
    type: "Checklist",
    description:
      "Revise clareza, fontes, utilidade e distribuição antes de publicar.",
    image: "/images/team.webp",
    input_schema: checks.map((label, i) =>
      field("criterion_" + (i + 1), label, "checkbox"),
    ),
    methodology:
      "Cada critério marcado conta como uma revisão concluída. O total representa progresso de revisão, não uma nota de qualidade.",
    limits: "Não substitui avaliação editorial ou checagem de fatos.",
    next_action: "Investigue os critérios pendentes antes de publicar.",
    related_content: ["conteudo-e-audiencia-com-proposito"],
    related_tools: ["planner-editorial"],
  },
  {
    id: "calculadora-conversao",
    slug: "calculadora-conversao",
    name: "Calculadora de conversão",
    category: "Growth",
    type: "Calculadora",
    description:
      "Calcule a taxa entre visitas e ações com os seus próprios dados.",
    image: "/images/work.jpg",
    input_schema: [
      field("visits", "Visitas ou oportunidades", "number", { min: 1 }),
      field("actions", "Ações concluídas", "number", { min: 0 }),
    ],
    methodology:
      "Taxa de conversão = ações ÷ visitas × 100. Use inteiros do mesmo período e funil; ações não podem superar visitas.",
    limits:
      "Não há taxa ideal universal. A ferramenta não prevê vendas nem atribui causalidade.",
    next_action:
      "Compare períodos equivalentes e investigue a passagem que precisa de atenção.",
    related_content: ["metricas-alem-do-alcance"],
    related_tools: ["checklist-conteudo"],
  },
  {
    id: "planner-editorial",
    slug: "planner-editorial",
    name: "Planner editorial",
    category: "Conteúdo",
    type: "Planner",
    description:
      "Organize tema, formato, canal e data. Exporte seu planejamento.",
    image: "/images/team.webp",
    input_schema: [field("rows", "Pautas", "rows")],
    methodology:
      "Organiza até 50 pautas, com tema, formato, canal e data. O resultado reproduz o planejamento informado.",
    limits:
      "Não sugere audiência, receita ou desempenho. A data é uma intenção de publicação.",
    next_action:
      "Escolha uma pauta viável e revise fontes, responsável e distribuição.",
    related_content: ["creators-rotina-de-publicacao"],
    related_tools: ["checklist-conteudo", "claro"],
  },
].map((t) => ({
  ...t,
  version: 1,
  status: "published",
  requires_auth: false,
  allows_anonymous: true,
  capture_strategy: "optional-save",
  calculation_schema: { method: t.id, version: 1 },
  result_schema: { format: "text-lines-v1" },
  primary_cta: "Salvar resultado",
  secondary_cta: "Copiar resultado",
  seo_title: t.name,
  seo_description: t.description,
}));

export function initialAnswers(tool) {
  return Object.fromEntries(
    tool.input_schema.map((f) => [
      f.id,
      f.type === "checkbox"
        ? false
        : f.type === "rows"
          ? [{ theme: "", format: "Artigo", channel: "Site", date: "" }]
          : "",
    ]),
  );
}
export function normalizeToolAnswers(tool, raw) {
  if (!tool || !raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Preencha os campos da ferramenta.");
  const answers = initialAnswers(tool),
    errors = [];
  for (const f of tool.input_schema) {
    const value = raw[f.id];
    if (f.type === "checkbox") answers[f.id] = value === true;
    else if (f.type === "rows") {
      if (!Array.isArray(value) || value.length > 50)
        throw new Error("Use no máximo 50 pautas.");
      answers.rows = value.map((r) => {
        if (!r || typeof r !== "object") throw new Error("Confira as pautas.");
        const row = Object.fromEntries(
          ["theme", "format", "channel", "date"].map((k) => [
            k,
            typeof r[k] === "string" ? r[k].trim() : "",
          ]),
        );
        if (
          Object.values(row).some((v) => v.length > 500) ||
          (row.date &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
              !Number.isFinite(Date.parse(row.date)) ||
              new Date(row.date).toISOString().slice(0, 10) !== row.date))
        )
          throw new Error(
            "Confira o tamanho dos textos e as datas das pautas.",
          );
        return row;
      });
    } else {
      answers[f.id] =
        typeof value === "string"
          ? value.trim()
          : typeof value === "number"
            ? String(value)
            : "";
      if (answers[f.id].length > 2000)
        errors.push(f.label + ": use até 2.000 caracteres.");
    }
  }
  if (errors.length) throw new Error(errors[0]);
  return answers;
}
export function calculateTool(tool, raw) {
  const answers = normalizeToolAnswers(tool, raw);
  let title, lines, value;
  if (tool.id === "claro") {
    lines = tool.input_schema
      .filter((f) => answers[f.id])
      .map((f) => f.label.toUpperCase() + "\n" + answers[f.id]);
    if (!lines.length)
      throw new Error(
        "Preencha pelo menos um campo para organizar a instrução.",
      );
    title = "Sua instrução estruturada";
  } else if (tool.id === "checklist-conteudo") {
    const count = Object.values(answers).filter(Boolean).length;
    title = "Progresso da revisão";
    value = count + " de 10 critérios revisados";
    lines = tool.input_schema.map(
      (f) => (answers[f.id] ? "[x] " : "[ ] ") + f.label,
    );
  } else if (tool.id === "calculadora-conversao") {
    const v = Number(answers.visits),
      a = Number(answers.actions);
    if (
      !answers.visits ||
      !answers.actions ||
      !Number.isSafeInteger(v) ||
      !Number.isSafeInteger(a) ||
      v <= 0 ||
      a < 0 ||
      a > v
    )
      throw new Error(
        "Use números inteiros; ações devem ficar entre zero e o total de visitas.",
      );
    title = "Taxa de conversão";
    value =
      ((a / v) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
      "%";
    lines = [a + " ações em " + v + " visitas."];
  } else {
    answers.rows = answers.rows.filter((r) => r.theme || r.date);
    if (!answers.rows.length)
      throw new Error(
        "Adicione pelo menos um tema ou uma data ao planejamento.",
      );
    title = "Seu planejamento editorial";
    value = answers.rows.length + " pauta(s)";
    lines = answers.rows.map((r) =>
      [
        r.theme || "Tema em definição",
        r.format,
        r.channel,
        r.date || "Sem data",
      ].join(" · "),
    );
  }
  const result = {
    title,
    value: value || null,
    lines,
    methodology: tool.methodology,
    limits: tool.limits,
    next_action: tool.next_action,
  };
  return {
    answers,
    result,
    text: [
      tool.name,
      value || "",
      ...lines,
      "Método: " + tool.methodology,
      "Limites: " + tool.limits,
      "Próxima ação: " + tool.next_action,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
export function csvCell(value) {
  const s = String(value ?? "");
  return (
    '"' + (/^[\s]*[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'
  );
}
export function exportToolCSV(tool, answers) {
  const data = calculateTool(tool, answers);
  const rows =
    tool.id === "planner-editorial"
      ? [
          ["Tema", "Formato", "Canal", "Data"],
          ...data.answers.rows.map((r) => [
            r.theme,
            r.format,
            r.channel,
            r.date,
          ]),
        ]
      : [
          ["Campo", "Valor"],
          ...tool.input_schema.map((f) => [f.label, data.answers[f.id]]),
        ];
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function safeAttribution(search = "", referrer = "") {
  const q = new URLSearchParams(search),
    out = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]) {
    const v = q.get(key) || "";
    if (/^[a-zA-Z0-9_-]{1,80}$/.test(v)) out[key] = v;
  }
  try {
    const url = new URL(referrer);
    if (["https:", "http:"].includes(url.protocol)) out.referrer = url.origin;
  } catch {}
  return out;
}
