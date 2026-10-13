// LD methodology v1: deterministic self-assessments, never market benchmarks.
export const field = (id, label, type = "textarea", extra = {}) => ({
  id,
  label,
  type,
  ...extra,
});
const ratingOptions = [
  ["", "Selecione ou deixe desconhecido"],
  ["0", "0 · Não existe / não foi verificado"],
  ["1", "1 · Informal / rascunho"],
  ["2", "2 · Parcialmente definido"],
  ["3", "3 · Revisado / usado na rotina"],
  ["4", "4 · Consistente e com evidência"],
];
const rating = (id, label, group, action) =>
  field(id, label, "rating", { group, options: ratingOptions, action });
export const plannerFields = [
  field("theme", "Tema", "text"),
  field("question", "Pergunta central"),
  field("thesis", "Tese"),
  field("persona", "Persona", "text"),
  field("intent", "Intenção", "text"),
  field("format", "Formato", "select", {
    options: ["Artigo", "Guia", "Post", "Vídeo", "Newsletter", "Shorts"].map(
      (v) => [v, v],
    ),
    default: "Artigo",
  }),
  field("channel", "Canal", "text", { default: "Site" }),
  field("date", "Data", "date"),
  field("status", "Status", "select", {
    options: [
      ["idea", "Ideia"],
      ["research", "Pesquisa"],
      ["draft", "Produção"],
      ["review", "Revisão"],
      ["scheduled", "Agendado"],
      ["published", "Publicado"],
    ],
    default: "idea",
  }),
  field("cta", "CTA", "text"),
  field("sources", "Fontes"),
  field("derivatives", "Derivados"),
  field("publication_url", "URL publicada", "url"),
];
const contentDimensions = [
  [
    "clarity",
    "Clareza",
    "O público e a pergunta estão explícitos.",
    "O título e a tese correspondem ao conteúdo.",
    "Especifique público, pergunta e uma tese verificável.",
  ],
  [
    "utility",
    "Utilidade",
    "Há uma aplicação concreta para o leitor.",
    "O próximo passo pode ser executado.",
    "Adicione um exemplo e uma ação possível.",
  ],
  [
    "sources",
    "Fontes",
    "As fontes relevantes estão identificadas.",
    "Links de referência foram conferidos.",
    "Inclua referências primárias e teste os links.",
  ],
  [
    "evidence",
    "Evidência",
    "Afirmações factuais têm sustentação.",
    "Fato, análise e hipótese estão separados.",
    "Cheque fatos e identifique o que é hipótese.",
  ],
  [
    "structure",
    "Estrutura",
    "Títulos descrevem a sequência do texto.",
    "Parágrafos e listas favorecem a leitura.",
    "Organize os títulos e reduza blocos extensos.",
  ],
  [
    "seo",
    "SEO",
    "Título, descrição e links descrevem a página.",
    "Indexabilidade foi verificada na fonte apropriada.",
    "Revise title, links e indexabilidade com ferramentas de busca.",
  ],
  [
    "aeo",
    "AEO",
    "A pergunta central tem resposta direta.",
    "Termos e perguntas frequentes estão contextualizados.",
    "Responda a pergunta central e explique termos relevantes.",
  ],
  [
    "geo",
    "GEO",
    "Autoria e referências podem ser reconhecidas.",
    "Nomes, entidades e contexto são consistentes.",
    "Torne autoria, entidades e referências claras; não prometa citações.",
  ],
  [
    "cta",
    "CTA",
    "A chamada corresponde à intenção do leitor.",
    "O destino e a ação foram testados.",
    "Defina um próximo passo coerente e teste seu destino.",
  ],
  [
    "distribution",
    "Distribuição",
    "Canais e formatos estão definidos.",
    "Há plano de distribuição com responsável e data.",
    "Planeje canais, responsáveis e datas possíveis.",
  ],
  [
    "freshness",
    "Atualização",
    "Datas e informações foram revisadas.",
    "Há uma data ou gatilho para nova revisão.",
    "Registre quando e por que revisar novamente.",
  ],
  [
    "accessibility",
    "Acessibilidade",
    "Imagens têm texto alternativo relevante.",
    "Leitura, contraste e navegação foram testados.",
    "Valide celular, teclado, contraste e alternativas textuais.",
  ],
];
const maturityDimensions = [
  [
    "acquisition",
    "Aquisição",
    "Canais e público prioritários estão definidos.",
    "Campanhas possuem objetivo e critério de parada.",
    "Origem e custos são acompanhados.",
    "Defina canais prioritários, hipóteses e custos de aquisição.",
  ],
  [
    "content",
    "Conteúdo",
    "Existe uma linha editorial ligada a dúvidas reais.",
    "Produção e distribuição têm responsáveis.",
    "Aprendizados de conteúdo são registrados.",
    "Conecte perguntas do público a uma rotina editorial viável.",
  ],
  [
    "conversion",
    "Conversão",
    "Etapas do funil têm definições consistentes.",
    "Passagens entre etapas são medidas.",
    "Experimentos têm hipótese e avaliação.",
    "Defina denominadores e meça as passagens do funil.",
  ],
  [
    "crm",
    "CRM & Vendas",
    "Oportunidades possuem responsável e etapa.",
    "Próximo passo e data estão registrados.",
    "Ganhos, perdas e follow-up são revisados.",
    "Revise responsáveis, próximos passos e motivos de perda.",
  ],
  [
    "automation",
    "Automação & IA",
    "Processos e entradas estão documentados.",
    "Automação tem revisão humana e tratamento de falhas.",
    "Permissões, riscos e qualidade são acompanhados.",
    "Documente processos e valide uso de IA com revisão e limites.",
  ],
  [
    "data",
    "Dados & Receita",
    "Métricas possuem definição e fonte.",
    "Dados de receita e custos são reconciliados.",
    "Decisões e consentimentos são registrados.",
    "Conecte definições, origem dos dados, custos e decisões.",
  ],
];
const seoDimensions = [
  [
    "indexability",
    "Indexabilidade",
    "A página responde e não exige login.",
    "Robots/noindex/canonical foram verificados.",
    "Verifique resposta HTTP, indexação e canonical; não presuma inclusão.",
  ],
  [
    "structure",
    "Estrutura",
    "Title e headings descrevem a página.",
    "Texto principal é acessível e organizado.",
    "Revise título, headings e disponibilidade do texto principal.",
  ],
  [
    "answer",
    "Resposta",
    "A pergunta tem resposta clara no conteúdo.",
    "Contexto e limites estão explícitos.",
    "Responda diretamente e explicite contexto e limites.",
  ],
  [
    "sources",
    "Fontes",
    "Afirmações importantes possuem referências.",
    "Fontes e links foram revisados.",
    "Use referências primárias e teste os links.",
  ],
  [
    "authorship",
    "Autoria",
    "Autor ou organização responsável está identificado.",
    "Há contexto sobre experiência e atualização.",
    "Identifique autoria e responsabilidade editorial.",
  ],
  [
    "entities",
    "Entidades",
    "Pessoas, produtos e conceitos estão claros.",
    "Nomenclatura é consistente ao longo da página.",
    "Padronize nomes e explique as entidades relevantes.",
  ],
  [
    "links",
    "Links",
    "Links internos orientam aprofundamento.",
    "Destinos e textos dos links são adequados.",
    "Revise destinos e textos de links, sem criar links artificiais.",
  ],
  [
    "freshness",
    "Atualização",
    "Datas e informações foram conferidas.",
    "Existe uma rotina ou gatilho de revisão.",
    "Registre data e gatilho de atualização.",
  ],
];
const stages = [
  ["visits", "Visitas"],
  ["leads", "Leads"],
  ["mql", "MQL"],
  ["sql", "SQL"],
  ["demos", "Demos"],
  ["proposals", "Propostas"],
  ["sales", "Vendas"],
];
export const funnelStages = stages;
const generalLimits =
  "Autoavaliação baseada nas respostas informadas. Escala própria da Legenda Digital, sem validação externa ou benchmark de mercado. Campos desconhecidos não recebem zero.";
const define = (t) => ({
  ...t,
  slug: t.id,
  image: t.category === "Conteúdo" ? "/images/team.webp" : "/images/work.jpg",
  status: "published",
  requires_auth: false,
  allows_anonymous: true,
  capture_strategy: "optional-save",
  related_content: t.related_content || [],
  related_tools: t.related_tools || [],
  calculation_schema: { method: t.id, version: t.version },
  result_schema: { format: "structured-result-v2" },
  primary_cta: "Salvar resultado",
  secondary_cta: "Exportar resultado",
  seo_title: t.name,
  seo_description: t.description,
});
export const waveOneRegistry = [
  define({
    id: "claro",
    version: 2,
    name: "CLARO Workspace",
    category: "IA",
    type: "Workspace",
    description:
      "Estruture contexto, audiência e objetivo em um prompt, brief, plano ou checklist revisável.",
    input_schema: [
      field("context", "Contexto"),
      field("limits", "Limites"),
      field("audience", "Audiência"),
      field("objective", "Objetivo"),
      field("action", "Ação"),
      field("result", "Resultado esperado"),
      field("notes", "Observações"),
      field("output_format", "Formato de saída", "select", {
        default: "prompt",
        options: [
          ["prompt", "Prompt"],
          ["brief", "Brief"],
          ["plan", "Plano"],
          ["checklist", "Checklist"],
        ],
      }),
    ],
    methodology:
      "Organiza as informações no método CLARO; sugestões e templates são determinísticos. Não chama modelos de IA.",
    limits:
      "A ferramenta organiza o trabalho, sem inventar pesquisa, fontes ou informações de mercado. Revise o que está incompleto.",
    next_action:
      "Escolha uma tarefa pequena e compare a execução com seus critérios de qualidade.",
    related_tools: ["checklist-conteudo", "planner-editorial"],
  }),
  define({
    id: "checklist-conteudo",
    version: 2,
    name: "Auditoria de qualidade de conteúdo",
    category: "Conteúdo",
    type: "Diagnóstico",
    description:
      "Revise 12 dimensões, identifique lacunas e prepare uma nova versão do conteúdo.",
    input_schema: [
      field("content_label", "Conteúdo / versão", "text"),
      field("legacy_notes", "Revisão anterior (referência, sem nota)"),
      ...contentDimensions.flatMap(([id, group, q1, q2, action]) => [
        rating(id + "_1", q1, group, action),
        rating(id + "_2", q2, group, action),
      ]),
    ],
    dimensions: contentDimensions.map(([id, label]) => ({ id, label })),
    methodology:
      "Cada dimensão usa duas respostas de 0 a 4. Nota = média dos itens respondidos ÷ 4 × 100. A média geral usa dimensões respondidas com peso igual. A cobertura é mostrada separadamente; desconhecidos não são zero.",
    limits:
      generalLimits + " Não substitui checagem de fatos ou revisão editorial.",
    next_action:
      "Revise as dimensões mais baixas e salve uma nova execução para comparar.",
    related_tools: ["seo-aeo-geo", "claro", "planner-editorial"],
  }),
  define({
    id: "calculadora-conversao",
    version: 2,
    name: "Calculadora de conversão e funil",
    category: "Growth",
    type: "Calculadora",
    description:
      "Compare conversão, perdas por etapa e cenários atual, meta e alternativo com seus dados.",
    input_schema: [
      field("mode", "Modo de análise", "select", {
        default: "simple",
        options: [
          ["simple", "Conversão simples"],
          ["full", "Funil completo e cenários"],
        ],
      }),
      field("visits", "Visitas ou oportunidades", "number", {
        min: 1,
        showWhen: { field: "mode", value: "simple" },
      }),
      field("actions", "Ações concluídas", "number", {
        min: 0,
        showWhen: { field: "mode", value: "simple" },
      }),
      ...["current", "target", "alternative"].flatMap((s) =>
        stages.map(([id, label]) =>
          field(
            s + "_" + id,
            { current: "Atual", target: "Meta", alternative: "Alternativo" }[
              s
            ] +
              " · " +
              label,
            "number",
            {
              min: 0,
              group: {
                current: "Funil atual",
                target: "Meta (opcional)",
                alternative: "Alternativo (opcional)",
              }[s],
              showWhen: { field: "mode", value: "full" },
            },
          ),
        ),
      ),
    ],
    methodology:
      "Conversão = etapa seguinte ÷ etapa anterior × 100; perdas = etapa anterior − seguinte. Total = vendas ÷ visitas × 100. Use contagens do mesmo período e coorte, com etapas cumulativas. Denominador zero produz resultado indisponível.",
    limits:
      "Metas e cenários são premissas do usuário, não previsões. Não há taxa ideal universal. Não compare eventos ou coortes incompatíveis.",
    next_action:
      "Investigue as passagens com perda, considerando custos, qualidade e objetivo do funil.",
    related_tools: ["cac-ltv-payback", "follow-up"],
  }),
  define({
    id: "planner-editorial",
    version: 2,
    name: "Planner editorial",
    category: "Conteúdo",
    type: "Workspace",
    description:
      "Planeje tema, pergunta, tese, distribuição e publicação em lista, calendário ou Kanban.",
    input_schema: [
      field("rows", "Pautas", "rows", { row_fields: plannerFields }),
    ],
    methodology:
      "Organiza até 50 pautas informadas; lista, calendário e Kanban são visões dos mesmos dados. Alterar status não publica conteúdo no CMS.",
    limits:
      "Desempenho e receita não são estimados. URL publicada é registrada pelo usuário; marcar publicado não comprova resultados.",
    next_action:
      "Escolha uma pauta viável, revise suas fontes e defina distribuição e CTA.",
    related_tools: ["claro", "checklist-conteudo"],
  }),
  define({
    id: "maturidade-growth",
    version: 1,
    name: "Diagnóstico de maturidade de crescimento",
    category: "Growth",
    type: "Diagnóstico",
    description:
      "Avalie seis dimensões do seu sistema de crescimento e organize prioridades.",
    input_schema: maturityDimensions.flatMap(([id, group, ...qs]) =>
      qs.slice(0, 3).map((q, i) => rating(id + "_" + (i + 1), q, group, qs[3])),
    ),
    dimensions: maturityDimensions.map(([id, label]) => ({ id, label })),
    methodology:
      "Três perguntas por dimensão, escala 0–4. Nota de dimensão = média respondida ÷ 4 × 100; média geral com peso igual por dimensão respondida. Prioridade usa as menores notas; cobertura é explícita.",
    limits:
      generalLimits +
      " Não é benchmark brasileiro nem diagnóstico auditado da empresa.",
    next_action:
      "Escolha uma dimensão prioritária e um processo observável para melhorar.",
    related_tools: ["follow-up", "calculadora-conversao"],
  }),
  define({
    id: "cac-ltv-payback",
    version: 1,
    name: "Calculadora CAC, LTV e payback",
    category: "Growth",
    type: "Calculadora",
    description:
      "Conecte custo de aquisição, receita, margem e retenção em um cenário de assinatura.",
    input_schema: [
      field("period", "Período / canal", "text"),
      field("spend", "Custo total de aquisição no período (R$)", "number", {
        min: 0,
        step: "0.01",
      }),
      field("customers", "Novos clientes no período", "number", { min: 1 }),
      field(
        "monthly_revenue",
        "Receita mensal média por cliente (R$)",
        "number",
        { min: 0, step: "0.01" },
      ),
      field("gross_margin", "Margem bruta (%)", "number", {
        min: 0,
        max: 100,
        step: "0.01",
      }),
      field("retention_months", "Retenção média estimada (meses)", "number", {
        min: 0,
        step: "0.01",
      }),
    ],
    methodology:
      "CAC = custo de aquisição ÷ novos clientes. Contribuição mensal = receita média × margem bruta. LTV de contribuição estimado = contribuição × meses de retenção informados. LTV:CAC = LTV ÷ CAC. Payback simples = CAC ÷ contribuição mensal.",
    limits:
      "Modelo simplificado para assinaturas com receita/margem constantes. Retenção é premissa, não previsão. LTV não é lucro líquido; não inclui desconto temporal, impostos, expansão, sazonalidade ou mudanças de churn. Zero no denominador é informado como indisponível.",
    next_action:
      "Revise custos completos, margem e retenção por coortes antes de tomar decisões financeiras.",
    sources: [
      {
        label: "Stripe: cálculo do payback",
        url: "https://stripe.com/resources/more/what-is-the-cac-payback-period",
      },
      {
        label: "Stripe: modelo econômico de SaaS",
        url: "https://stripe.com/guides/atlas/business-of-saas",
      },
    ],
    related_tools: ["calculadora-conversao", "maturidade-growth"],
  }),
  define({
    id: "follow-up",
    version: 1,
    name: "Auditoria de follow-up",
    category: "Vendas",
    type: "Diagnóstico",
    description:
      "Identifique oportunidades sem responsável, próximo passo ou retorno no prazo.",
    input_schema: [
      field("period", "Período / carteira analisada", "text"),
      field("total", "Oportunidades na carteira", "number", { min: 0 }),
      ...["ownerless", "no_next_step", "overdue", "waiting", "stalled"].map(
        (id, i) =>
          field(
            id,
            [
              "Sem responsável",
              "Sem próximo passo",
              "Atrasadas",
              "Aguardando cliente",
              "Paradas além do prazo definido",
            ][i],
            "number",
            { min: 0 },
          ),
      ),
      field(
        "stalled_days",
        "Prazo considerado para uma oportunidade parada (dias)",
        "number",
        { min: 1 },
      ),
    ],
    methodology:
      "Calcula cada condição ÷ total da carteira × 100. Condições podem se sobrepor; não são somadas como pessoas/oportunidades únicas. O prazo de parada é informado pelo usuário.",
    limits:
      "Diagnóstico autodeclarado, sem conexão automática com CRM/WhatsApp. Aguardar o cliente não representa necessariamente um problema. Não calcula vendas perdidas ou receita inventada.",
    next_action:
      "Atribua responsável, próximo passo e data às oportunidades que precisam de ação.",
    related_tools: ["maturidade-growth", "calculadora-conversao"],
  }),
  define({
    id: "seo-aeo-geo",
    version: 1,
    name: "Auditoria SEO, AEO e GEO",
    category: "Conteúdo",
    type: "Diagnóstico",
    description:
      "Revise indexabilidade, respostas, fontes, autoria e atualização do conteúdo.",
    input_schema: [
      field("content_label", "Página / conteúdo analisado", "text"),
      ...seoDimensions.flatMap(([id, group, q1, q2, action]) => [
        rating(id + "_1", q1, group, action),
        rating(id + "_2", q2, group, action),
      ]),
    ],
    dimensions: seoDimensions.map(([id, label]) => ({ id, label })),
    methodology:
      "Autoavaliação por oito dimensões, duas perguntas cada. Nota = média dos itens respondidos ÷ 4 × 100. Cobertura e critérios pendentes aparecem separados. Nenhuma página externa é rastreada automaticamente.",
    limits:
      generalLimits +
      " Não garante indexação, posição, tráfego ou citação por sistemas de IA; não exige um schema especial para IA.",
    next_action:
      "Verifique os aspectos técnicos em ferramentas oficiais e revise as lacunas editoriais.",
    sources: [
      {
        label: "Google Search Central: recursos de IA e seu site",
        url: "https://developers.google.com/search/docs/appearance/ai-features",
      },
    ],
    related_tools: ["checklist-conteudo", "planner-editorial"],
  }),
];
export const claroTemplates = [
  {
    id: "article",
    name: "Brief de artigo",
    answers: {
      context: "Criar um artigo útil para a Legenda Digital.",
      audience:
        "Profissionais que querem aplicar conhecimento no próprio negócio.",
      objective:
        "Responder uma dúvida concreta com evidências e próximos passos.",
      limits: "Não inventar dados, fontes, depoimentos ou resultados.",
      action: "Pesquisar, estruturar e revisar a resposta.",
      result: "Texto com tese, fontes, exemplos, limites e CTA coerente.",
      notes: "Substitua a pergunta e as fontes antes de usar.",
      output_format: "brief",
    },
  },
  {
    id: "experiment",
    name: "Plano de experimento",
    answers: {
      context: "Validar uma hipótese de aquisição em um processo existente.",
      audience: "Definir o segmento a testar.",
      objective: "Aprender se uma mensagem gera a ação esperada.",
      limits:
        "Definir duração, custo máximo e critério de parada antes de iniciar.",
      action: "Executar um teste pequeno e revisar os dados.",
      result: "Plano com hipótese, ação, métrica e decisão.",
      notes: "Meta não é previsão.",
      output_format: "plan",
    },
  },
];
