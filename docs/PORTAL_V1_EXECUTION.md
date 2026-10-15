# Portal V1 — fases e gates

Ordem HQ de 14/10/2026: sequência obrigatória. Não iniciar fase seguinte com gate incompleto; não declarar V1 completo com integrações apenas implementadas. Sem redesenho, domínio/preço novo ou expansão SaaS. Sem 23 tools restantes, SSO ou rede social complexa.

| Fase | Existente | Gate / entrega restante |
|---|---|---|
| 0 Separação | Repos, bancos, Auth e fontes próprios | Auditoria/docs/CI/smoke público. Aceite integral depende de configuração privada hosted e fluxos autenticados; legado SaaS preservado e classificado |
| 1 Editorial | 14 conteúdos; CMS, uploads, destaques, banners/links, TOC, related, comentários, sharing, SEO/schema, mobile, eventos | Revalidar checklist completo, referências/autor/capas e independência SaaS. Não reescrever cinco artigos aprovados |
| 2 LD Brief | Opt-in/consent/provider, descadastro, preferências, Admin/edições/arquivo, planejamento de data/eventos | DNS/SMTP/secrets; envio, recebimento e cancelamento reais. Scheduler automático ainda não implementado |
| 3 Tools | Engine e oito ferramentas | Executar/salvar/reabrir/duplicar/exportar/histórico quando aplicável; uso anônimo; QA das oito |
| 4 Analytics & Intelligence | Dados consentidos separados; eventos específicos editorial/tools/newsletter | Taxonomia Portal e `/admin/intelligence` com dados reais; referral source_page/type/id/campaign sem PII; nenhum benchmark automático |
| 5 Community V1 | Interesse/eventos e comunicação inicial | Tópicos/posts/replies/perfis/salvos/moderação/reports/RLS; “em formação” até atividade real |
| 6 Conta | Auth/histórico tools/preferências newsletter | Perfil, artigos/tools salvos, histórico, posts/comentários e privacy; signup depende do gate email |
| 7 Admin + QA | CMS e módulos tools/newsletter/moderação | Overview/Editorial/Audience/Utility/Intelligence/System/Media/Settings; métricas reais ou “sem dados”; QA integral |

Oito ferramentas: CLARO Workspace; qualidade de conteúdo; conversão/funil; planner editorial; maturidade de crescimento; CAC/LTV/payback; follow-up; SEO/AEO/GEO. Não catalogar as demais como prontas.

## Gates comuns

Build, testes, CI, migration aplicada se houver, smoke, preservação dos dados, documentação. Sem migration: “não aplicável”, sem DDL artificial. Encerrar fase por PR, CI antes do merge, publicação independente quando houver código e smoke correspondente.

Entrega HQ: status, existente/alterado, arquitetura, migrations, rotas, DB/RLS/Auth, analytics, testes/build/CI, deploy/smoke, screenshots quando houver UI, riscos/pendências, PR/commits. Fase 0 registrada em `PORTAL_GROWTHOS_SEPARATION_AUDIT.md` e PR.

## Refinamentos nas fases correspondentes

Home sem novas seções: conteúdo, LD Brief, ferramentas, Community, Building, referral compacto. Navegação: Conteúdos, Newsletter, Comunidade, Ferramentas, Building, Sobre; SaaS como Produto. Footer separa marca/Produtos. Screenshots SaaS só em seção/página produto. Sitemap/busca apenas entidades Portal, incluindo bridge.

Media: filename/alt/caption/credit/type/dimensions/created_at, capas/OG/screenshots/documentos e permissões. Não apresentar zero como medição quando não houver coleta.

QA final: Home, conteúdo/artigo, newsletter/arquivo, catálogo e cada tool, Community, Building, Sobre, conta, Admin e bridge. Tamanhos: 360×800, 375×812, 390×844, 430×932, 768×1024, 820×1180, 1366×768, 1440×900, 1920×1080. Performance: LCP/CLS/INP, imagens/fontes/bundles e Admin isolado. Acessibilidade: teclado/foco/headings/contraste/forms/erros/labels/alt/comentários/tools.

## Gate externo atual

14/10: quatro registros do domínio de envio ausentes (NXDOMAIN); signup desativado, confirmação obrigatória; envio indisponível. Sign-in Hostinger restrito no navegador da sessão impede editar DNS; não repetir nem contornar. Hostinger Mail não gerencia DNS. Manter envio/cadastro desativados até provisionamento e validação; instalar plugin não fecha gate.

Mudança de estratégia/marca/domínio/pricing/escopo SaaS/modelo de negócio exige HQ; não resolver por conveniência técnica.

## Continuidade — 15/10/2026

O titular confirmou acesso à conta do Portal em seu próprio navegador; não equivale à sessão autenticada do agente. A verificação pública de funcionalidades editoriais existentes foi ampliada do Batch 1 para o catálogo publicado inteiro. Escopo, evidências, resultados e metadados pendentes em [PORTAL_EDITORIAL_READINESS_2026-10-15.md](PORTAL_EDITORIAL_READINESS_2026-10-15.md). Essa verificação não libera automaticamente novas fases, cadastro público ou envio de email.
