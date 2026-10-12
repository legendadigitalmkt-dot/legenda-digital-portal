import React from "react";
import {
  ArrowRight,
  MessageCircle,
  Users,
  Layers,
  ListTodo,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Sparkles,
  CircleCheck,
  LockKeyhole,
} from "lucide-react";
import { ProductPreview } from "../components/ProductPreview";
import { SectionHead } from "../components/editorial";
import { ContactForm } from "../components/forms";
import { growthProduct } from "../lib/growth-product";
import { track } from "../services/supabase";
const demoClick = () => void track("growth_os_cta_clicked");
export function GrowthPage() {
  const steps = [
    ["Conversa", "Reúna o contexto do contato."],
    ["Oportunidade", "Registre o que pode avançar."],
    ["Responsável", "Deixe claro quem conduz."],
    ["Próxima ação", "Defina o que fazer e quando."],
    ["Follow-up", "Acompanhe o retorno combinado."],
    ["Resultado", "Registre ganhos e perdas."],
    ["Aprendizado", "Use o histórico para decidir."],
  ];
  return (
    <div className="growth-product">
      <section className="growth-product-hero">
        <div className="container growth-hero-grid">
          <div>
            <p className="eyebrow">GROWTH OS · POR LEGENDA DIGITAL</p>
            <span className="status-badge">
              PRODUTO EM CONSTRUÇÃO E VALIDAÇÃO
            </span>
            <h1>
              Cada oportunidade precisa de um <span>próximo passo.</span>
            </h1>
            <p className="product-deck">
              O Growth OS conecta conversas, oportunidades, responsáveis e
              retornos comerciais para pequenas equipes venderem com mais
              contexto e organização.
            </p>
            <div className="hero-buttons">
              <a
                className="btn btn-primary"
                href="#como-funciona"
                onClick={demoClick}
              >
                Ver como funciona
                <ArrowRight size={18} />
              </a>
              <a
                className="btn btn-secondary"
                href="#demonstracao"
                onClick={demoClick}
              >
                Solicitar demonstração
              </a>
            </div>
            <p className="microcopy">
              CRM + pipeline + follow-up. WhatsApp e assistência de IA em
              validação.
            </p>
          </div>
          <ProductPreview compact />
        </div>
      </section>
      <section className="section">
        <div className="container product-problem">
          <div>
            <p className="eyebrow">O PROBLEMA É A CONTINUIDADE</p>
            <h2>Conversas não viram processo sozinhas.</h2>
            <p>
              O contexto se espalha. A proposta fica sem retorno. Ninguém sabe
              quem conduz a negociação — e o fundador acaba cobrando cada passo
              manualmente.
            </p>
          </div>
          <ul>
            {[
              "Contexto em várias conversas",
              "Propostas sem próximo retorno",
              "Responsável indefinido",
              "Negociações paradas",
            ].map((t, i) => (
              <li key={t}>
                <span>0{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="section section-soft" id="como-funciona">
        <div className="container">
          <SectionHead
            label="COMO FUNCIONA"
            title="Um ciclo simples. Contexto em cada etapa."
            description={growthProduct.promise}
          />
          <ol className="product-cycle">
            {steps.map(([title, description], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section" id="produto-em-telas">
        <div className="container">
          <SectionHead
            label="PRODUTO EM TELAS"
            title="Veja o próximo passo ganhar forma."
            description="Explore seis prévias de interface. Os exemplos são fictícios e não acessam contas, enviam mensagens ou alteram o software."
          />
          <ProductPreview interactive />
        </div>
      </section>
      <section className="section section-soft">
        <div className="container">
          <SectionHead
            label="NÚCLEO ATUAL"
            title="Do contato ao resultado registrado."
            description="Capacidades presentes no código do produto. A disponibilidade de acesso e integrações é confirmada pela equipe."
          />
          <div className="product-core">
            {[
              [
                "CRM e oportunidades",
                "Empresa, contato, contexto e valor potencial reunidos.",
                Users,
              ],
              [
                "Pipeline comercial",
                "Etapas e histórico para acompanhar negociações.",
                Layers,
              ],
              [
                "Responsáveis e tarefas",
                "Quem conduz, qual a ação e qual o prazo.",
                ListTodo,
              ],
              [
                "Follow-up",
                "Retornos e tarefas atrasadas na visão de Hoje.",
                CheckCircle2,
              ],
              [
                "Resultados registrados",
                "Oportunidades por etapa, ganhos e conversão dos fechamentos.",
                BarChart3,
              ],
              [
                "WhatsApp · em validação",
                "Inbox e Cloud API dependem de configuração e validação da Meta.",
                MessageCircle,
              ],
            ].map(([title, copy, I]) => {
              const Icon = I as typeof Users;
              return (
                <div className="info-card" key={String(title)}>
                  <Icon size={28} />
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section product-ai">
        <div className="container split-layout">
          <div>
            <p className="eyebrow">ASSISTÊNCIA DE IA — EM VALIDAÇÃO</p>
            <h2>
              Contexto para revisar.
              <br />
              Controle para decidir.
            </h2>
            <p>
              A direção do Growth AI é resumir o histórico, sugerir um próximo
              passo e preparar uma mensagem para revisão. A ativação do provedor
              ainda está em validação.
            </p>
            <p>
              O humano revisa e decide. Nenhuma mensagem é enviada autonomamente
              pela IA.
            </p>
          </div>
          <div className="assistive-card">
            <Sparkles size={30} />
            <h3>Assistência, com limites claros.</h3>
            <ul>
              <li>Resumo baseado nos registros disponíveis</li>
              <li>Sugestão separada de fatos</li>
              <li>Rascunho antes de qualquer envio</li>
              <li>Revisão humana obrigatória</li>
            </ul>
            <span className="status-badge">
              EM VALIDAÇÃO · SEM ENVIO AUTÔNOMO
            </span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container split-layout">
          <div>
            <p className="eyebrow">REVENUE INTELLIGENCE</p>
            <h2>Enxergue o que foi registrado.</h2>
            <p>
              Veja oportunidades por etapa, vendas ganhas, conversão dos
              fechamentos e tarefas atrasadas a partir do CRM.
            </p>
            <p>
              Resultados históricos ajudam a fazer perguntas melhores. Eles não
              garantem vendas futuras.
            </p>
            <p className="microcopy">
              Aging e cobertura avançada de follow-up: planejados. Sem forecast
              preditivo nesta versão.
            </p>
          </div>
          <ProductPreview initial="Resultados" compact />
        </div>
      </section>
      <section className="section section-soft">
        <div className="container product-fit">
          <div>
            <p className="eyebrow">PARA QUEM SERVE</p>
            <h2>
              Pequenas equipes.
              <br />
              Negociações com contexto.
            </h2>
            <p>
              Agências, consultorias e equipes B2B que vendem em várias
              interações e usam WhatsApp com frequência.
            </p>
            <ul>
              {[
                "Mais de uma conversa para fechar",
                "Necessidade de responsável e retorno",
                "Contexto que precisa acompanhar a oportunidade",
              ].map((t) => (
                <li key={t}>
                  <CircleCheck size={19} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="fit-limits">
            <p className="eyebrow">QUANDO OUTRA SOLUÇÃO FAZ MAIS SENTIDO</p>
            <h3>O escopo inicial tem limites.</h3>
            <p>
              Não foi desenhado inicialmente como ERP, operação enterprise
              complexa, omnichannel avançado, sistema para centenas de usuários
              ou bot autônomo.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <SectionHead
            label="DA CONVERSA AO COMPROMISSO"
            title="WhatsApp → oportunidade → próxima ação"
            description="Quando o canal estiver configurado e validado, a conversa entra no contexto comercial — mantendo responsáveis e decisões humanas."
          />
          <div className="product-flow">
            {[
              [MessageCircle, "Conversa", "Entenda a mensagem no contexto."],
              [Layers, "Oportunidade", "Associe empresa, etapa e responsável."],
              [ListTodo, "Próxima ação", "Combine retorno e registre prazo."],
            ].map(([I, t, d], i) => {
              const Icon = I as typeof Users;
              return (
                <div key={String(t)}>
                  <span>0{i + 1}</span>
                  <Icon size={26} />
                  <h3>{String(t)}</h3>
                  <p>{String(d)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section product-control">
        <div className="container">
          <SectionHead
            label="SEGURANÇA E CONTROLE HUMANO"
            title="A equipe continua no comando."
          />
          <div className="three-grid">
            {[
              [
                ShieldCheck,
                "Acesso por equipe",
                "Dados privados com autenticação e regras de acesso por workspace.",
              ],
              [
                LockKeyhole,
                "Integrações com cuidado",
                "Chaves de API ficam no servidor; conexão do WhatsApp exige validação.",
              ],
              [
                CheckCircle2,
                "Revisão antes da ação",
                "Sugestões de IA e rascunhos não substituem a decisão de quem conduz.",
              ],
            ].map(([I, t, d]) => {
              const Icon = I as typeof Users;
              return (
                <div key={String(t)}>
                  <Icon size={29} />
                  <h3>{String(t)}</h3>
                  <p>{String(d)}</p>
                </div>
              );
            })}
          </div>
          <p className="product-vision">
            A visão maior é um <b>AI Growth Operating System</b>. O ponto de
            partida é concreto: acompanhamento comercial com contexto.
          </p>
        </div>
      </section>
      <section className="section" id="demonstracao">
        <div className="container demo-layout">
          <div>
            <p className="eyebrow">CONHEÇA O PRODUTO NO SEU CONTEXTO</p>
            <h2>Vamos olhar para seu processo comercial.</h2>
            <p>
              Conte como sua equipe acompanha oportunidades e retornos. O
              formulário registra seu pedido para a Legenda Digital responder e
              combinar a demonstração.
            </p>
            <p className="microcopy">
              Sem compra, preço ou agendamento automático. As condições de
              acesso são confirmadas pela equipe.
            </p>
          </div>
          <ContactForm subject="Demonstração Growth OS" />
        </div>
      </section>
      <section className="section section-soft">
        <div className="container narrow">
          <SectionHead title="Perguntas frequentes" />
          <div className="faq">
            {growthProduct.faq.map((x) => (
              <details key={x.q}>
                <summary>
                  {x.q}
                  <span>+</span>
                </summary>
                <p>{x.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="section product-final">
        <div className="container">
          <p className="eyebrow">ACOMPANHAMENTO COMERCIAL COM CONTEXTO</p>
          <h2>Transforme conversas em próximos passos.</h2>
          <p>
            Comece pelo processo. Entenda o produto. Avalie o que faz sentido
            para a sua equipe.
          </p>
          <div className="hero-buttons">
            <a
              className="btn btn-primary"
              href="#demonstracao"
              onClick={demoClick}
            >
              Conhecer o Growth OS
              <ArrowRight size={18} />
            </a>
            <a className="btn btn-secondary" href="/newsletter">
              Assinar LD Brief
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
