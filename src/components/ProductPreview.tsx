import React, { useState, useId } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageCircle,
  ListTodo,
  Users,
  Layers,
  BarChart3,
  ChevronRight,
} from "lucide-react";
export const previewViews = [
  "Hoje",
  "Conversas",
  "Oportunidade",
  "Pipeline",
  "Próxima ação",
  "Resultados",
] as const;
type View = (typeof previewViews)[number];
const companies = ["Estúdio Exemplo", "Consultoria Demo", "Equipe Modelo"];
const rows = [
  [
    "Estúdio Exemplo",
    "Proposta aguardando retorno",
    "Ana",
    "Confirmar escopo",
    "Hoje · 10h",
  ],
  [
    "Consultoria Demo",
    "Diagnóstico combinado",
    "Bruno",
    "Preparar perguntas",
    "Hoje · 14h",
  ],
  ["Equipe Modelo", "Novo contato", "Ana", "Entender contexto", "Amanhã"],
];
export function ProductPreview({
  compact = false,
  interactive = false,
  initial = "Hoje",
}: {
  compact?: boolean;
  interactive?: boolean;
  initial?: View;
}) {
  const uid = useId().replace(/:/g, "");
  const [view, setView] = useState<View>(initial);
  const [reviewed, setReviewed] = useState(false);
  const select = (next: View) => {
    setView(next);
    setReviewed(false);
  };
  return (
    <div className={`growth-preview ${compact ? "preview-compact" : ""}`}>
      <div className="preview-chrome">
        <div>
          <img
            src="/images/legenda-digital-mark.png"
            alt=""
            width="28"
            height="28"
          />
          <b>Growth OS</b>
          <span>por Legenda Digital</span>
        </div>
        <span className="preview-state">Prévia de interface</span>
      </div>
      {interactive && (
        <div
          className="preview-tabs"
          role="tablist"
          aria-label="Telas demonstrativas do Growth OS"
        >
          {previewViews.map((v, i) => (
            <button
              type="button"
              role="tab"
              id={`${uid}-preview-tab-${i}`}
              aria-controls={`${uid}-product-preview-panel`}
              aria-selected={view === v}
              tabIndex={view === v ? 0 : -1}
              key={v}
              onClick={() => select(v)}
              onKeyDown={(e) => {
                if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? previewViews.length - 1
                        : (i +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            previewViews.length) %
                          previewViews.length;
                  select(previewViews[next]);
                  document
                    .getElementById(`${uid}-preview-tab-${next}`)
                    ?.focus();
                }
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}
      <div className="preview-workspace">
        <aside className="preview-nav" aria-hidden="true">
          <span className="selected">
            <ListTodo size={17} />
            Hoje
          </span>
          <span>
            <MessageCircle size={17} />
            Conversas
          </span>
          <span>
            <Users size={17} />
            CRM
          </span>
          <span>
            <Layers size={17} />
            Pipeline
          </span>
          <span>
            <BarChart3 size={17} />
            Resultados
          </span>
        </aside>
        <div
          className="preview-content"
          id={`${uid}-product-preview-panel`}
          role={interactive ? "tabpanel" : undefined}
          aria-labelledby={
            interactive
              ? `${uid}-preview-tab-${previewViews.indexOf(view)}`
              : undefined
          }
        >
          <div className="preview-heading">
            <div>
              <span className="preview-eyebrow">EXECUÇÃO COMERCIAL</span>
              <h3>{view === "Hoje" ? "Um próximo passo para hoje." : view}</h3>
            </div>
            <span className="preview-avatar">LD</span>
          </div>
          {view === "Hoje" && (
            <>
              <div className="preview-kpis">
                {[
                  ["3", "Oportunidades abertas"],
                  ["2", "Retornos hoje"],
                  ["R$ 18 mil", "Pipeline aberto"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="preview-list-head">
                <b>Próximos contatos</b>
                <span>Prioridade e contexto</span>
              </div>
              <div
                className="preview-scroll"
                tabIndex={0}
                role="region"
                aria-label="Próximos contatos de demonstração; role para ver todas as colunas"
              >
                <table className="preview-table">
                  <thead>
                    <tr>
                      {[
                        "Oportunidade",
                        "Motivo de atenção",
                        "Responsável",
                        "Próxima ação",
                        "Prazo",
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, compact ? 2 : 3).map((row) => (
                      <tr key={row[0]}>
                        {row.map((text, i) => (
                          <td key={i}>{i === 0 ? <b>{text}</b> : text}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="preview-next">
                <CheckCircle2 size={19} />
                <span>Contexto, responsável e retorno no mesmo fluxo.</span>
                <ArrowRight size={17} />
              </div>
            </>
          )}
          {view === "Conversas" && (
            <div className="preview-inbox">
              <div className="preview-conversations">
                {companies.map((c, i) => (
                  <div className={i === 0 ? "active" : ""} key={c}>
                    <span className="preview-avatar">{c[0]}</span>
                    <div>
                      <b>{c}</b>
                      <span>
                        {i === 0
                          ? "Revisar escopo da proposta"
                          : "Conversa de demonstração"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="preview-chat">
                <p className="preview-note">
                  WhatsApp · integração em validação
                </p>
                <div className="preview-bubble">
                  Podemos conversar sobre o escopo da proposta?
                </div>
                <div className="preview-bubble outgoing">
                  Vamos organizar os pontos e combinar um retorno.
                </div>
                <div className="preview-context">
                  <b>Estúdio Exemplo · Proposta</b>
                  <p>Responsável: Ana. Próximo passo: confirmar escopo.</p>
                  <span>
                    Criar oportunidade <ChevronRight size={15} /> Definir
                    próximo passo
                  </span>
                </div>
              </div>
            </div>
          )}
          {view === "Oportunidade" && (
            <>
              <div className="preview-deal">
                <p>Estúdio Exemplo</p>
                <h4>Projeto de posicionamento</h4>
                <dl>
                  <div>
                    <dt>Valor potencial</dt>
                    <dd>R$ 8.000</dd>
                  </div>
                  <div>
                    <dt>Responsável</dt>
                    <dd>Ana</dd>
                  </div>
                  <div>
                    <dt>Etapa</dt>
                    <dd>Proposta</dd>
                  </div>
                </dl>
              </div>
              <div className="preview-two">
                <div className="preview-context">
                  <b>Contexto da conversa</b>
                  <p>
                    Diagnóstico: revisar escopo e alinhar prioridades antes de
                    avançar.
                  </p>
                  <b>Próxima ação · Hoje, 10h</b>
                  <p>Confirmar os pontos que precisam de ajuste.</p>
                </div>
                <div className="preview-context">
                  <b>Últimos eventos / histórico</b>
                  <ul>
                    <li>Diagnóstico registrado</li>
                    <li>Proposta preparada</li>
                    <li>Retorno combinado</li>
                  </ul>
                </div>
              </div>
            </>
          )}
          {view === "Pipeline" && (
            <div
              className="preview-scroll"
              tabIndex={0}
              aria-label="Pipeline demonstrativo; role para ver as etapas"
            >
              <div className="preview-pipeline">
                {[
                  "Novo lead",
                  "Em contato",
                  "Qualificado",
                  "Proposta",
                  "Negociação",
                  "Ganho",
                  "Perdido",
                ].map((s, i) => (
                  <div key={s}>
                    <b>{s}</b>
                    {[0, 2, 3].includes(i) && (
                      <div className="preview-deal-card">
                        <span>{companies[[0, 2, 3].indexOf(i)]}</span>
                        <b>
                          {i === 3
                            ? "R$ 8.000"
                            : i === 2
                              ? "R$ 6.000"
                              : "R$ 4.000"}
                        </b>
                        <p>Ana · responsável</p>
                        <p>
                          Próximo passo:
                          <br />
                          {i === 3 ? "Confirmar escopo" : "Entender contexto"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {view === "Próxima ação" && (
            <div className="preview-task">
              <span className="category">Estúdio Exemplo</span>
              <h4>Confirmar escopo da proposta</h4>
              <p>
                Retome o contexto antes de conversar. A oportunidade está em
                Proposta e Ana é a responsável.
              </p>
              <div>
                <Clock size={18} />
                <span>Hoje · 10h · prioridade do exemplo</span>
              </div>
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => setReviewed(!reviewed)}
              >
                {reviewed
                  ? "Revisão concluída no exemplo"
                  : "Revisar próxima ação"}
                <CheckCircle2 size={17} />
              </button>
              <p className="preview-note" role="status">
                {reviewed
                  ? "Estado alterado apenas nesta demonstração; nenhuma mensagem foi enviada."
                  : "Interação local de demonstração; não modifica dados do produto."}
              </p>
            </div>
          )}
          {view === "Resultados" && (
            <>
              <div className="preview-kpis">
                {[
                  ["3", "Oportunidades abertas"],
                  ["1", "Venda ganha registrada"],
                  ["2", "Tarefas atrasadas"],
                ].map(([n, t]) => (
                  <div key={t}>
                    <span>{t}</span>
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
              <div className="preview-context">
                <b>Oportunidades por etapa</b>
                <ul className="preview-bars">
                  {[
                    ["Novo lead", 1],
                    ["Em contato", 0],
                    ["Qualificado", 1],
                    ["Proposta", 1],
                    ["Negociação", 0],
                  ].map(([s, n]) => (
                    <li key={s}>
                      <span>{s}</span>
                      <i style={{ width: `${Number(n) * 60 + 4}%` }} />
                      <b>{n}</b>
                    </li>
                  ))}
                </ul>
                <p className="preview-note">
                  Resultados registrados no exemplo. Sem forecast ou promessa de
                  receita futura.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="preview-caption">
        Prévia conceitual baseada no produto atual. Demonstração com dados
        fictícios.
      </p>
    </div>
  );
}
export function SidebarPromo({
  onClick,
  mobile = false,
}: {
  onClick?: () => void;
  mobile?: boolean;
}) {
  return (
    <aside
      className={`sidebar-promo ${mobile ? "promo-mobile" : "promo-desktop"}`}
      aria-label="Conheça o software da Legenda Digital"
    >
      <p className="eyebrow">GROWTH OS · POR LEGENDA DIGITAL</p>
      <h3>Suas oportunidades têm um próximo passo?</h3>
      <p>
        Organize conversas, responsáveis e retornos comerciais em um só fluxo.
      </p>
      <div className="promo-mini" aria-hidden="true">
        <span>
          <CheckCircle2 size={16} /> Próxima ação
        </span>
        <b>Retomar a conversa</b>
        <span>Contexto → responsável → retorno</span>
      </div>
      <a className="text-link" href="/produtos/growth-os" onClick={onClick}>
        Conhecer o Growth OS
        <ArrowRight size={18} />
      </a>
    </aside>
  );
}
