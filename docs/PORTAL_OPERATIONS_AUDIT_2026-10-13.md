# Ordem consolidada — auditoria e estabilização do Batch 1

Escopo: `legendadigitalmkt-dot/legenda-digital-portal`, Supabase `yltnjgngkomelfltdyky`, `legendadigital.com.br` e `www.legendadigital.com.br`. Growth OS, seu repositório, Auth, banco e deploy estão fora desta entrega.

Fonte: ordem consolidada LD HQ recebida em 13/10/2026 (`Texto colado(20261013-180243).txt`). Esta ordem substitui a sequência de expansão anterior. Nenhum novo módulo, agente, ferramenta ou redesign foi iniciado.

## Matriz antes da mudança

| Requisito | Estado | Evidência / dependência |
|---|---|---|
| Cinco artigos aprovados | EXISTENTE | Todos publicados desde 12/10; textos e fontes preservados no manifest e no banco |
| Cinco URLs `/artigos/[slug]` | EXISTENTE | 301 para `/conteudos/[slug]`, seguido de HTTP 200; mantém backlinks e canonical existentes |
| Categorias do Batch 1 | EXISTENTE | Growth & Negócios (01/02), Futuro (03/05), Aplicação (04) |
| Capas hero/card large/card/mobile/OG | EXISTENTE | Variantes próprias a partir dos vetores aprovados; `contain`, sem corte de texto |
| Página de artigo e SEO | EXISTENTE | Breadcrumb, autoria, datas, tempo, corpo, tabelas, fontes, relacionados, share, Article/Breadcrumb JSON-LD, sitemap/RSS |
| Sidebar TOC + banner | PARCIAL | TOC e banner estavam em lados opostos; CTA ia à página institucional do produto |
| Texto de artigo 18–20 px | PARCIAL | Desktop 18 px; celular 16 px |
| Comentários e moderação | PARCIAL | Backend/RLS, edição, denúncia, respostas e moderação implementados; cadastro hosted desativado |
| Analytics editorial | PARCIAL | Consentido; nomes anteriores divergiam da taxonomia solicitada |
| LD Brief funcional | PARCIAL | PRs 14/15, Edge Function, consentimento, confirmação, preferências, admin, arquivo e cancelamento implementados; envio real ainda desativado |
| Provider de newsletter | PARCIAL | Resend conectado e infraestrutura preparada; `sending_ready=false`, `webhook_ready=false`; DNS/segredos pendentes |
| Tools Engine + oito ferramentas | PARCIAL | PRs 12/13; oito ferramentas e histórico privado implementados/testados; novas contas continuam dependentes de Auth hosted |
| Analytics unificado / identidade / atribuição | PARCIAL | Eventos editoriais e de ferramentas com consentimento; atribuição de execuções salvas. Sem identidade anônima unificada, atribuição global ou agregações solicitadas |
| `/admin/intelligence` | AUSENTE | Não iniciado; gate editorial/newsletter ainda aberto |
| Growth OS no Portal | PARCIAL | Página e referências existentes; screenshots reais do produto não validados nesta entrega |
| Community Foundation | PARCIAL | Landing e lista de interesse existentes; posts, perfis e moderação da comunidade ausentes |
| Refinamentos globais | PARCIAL | Cards compactos e navegação existentes; demais itens devem ser tratados no milestone próprio |
| Expansão das outras 23 ferramentas | AUSENTE | Bloqueada pela ordem, sem dados operacionais suficientes |

## Escopo desta branch

Branch: `feat/editorial-batch1-stabilization`. Release de health: `editorial-batch1-stable-v1`.

1. TOC e banner passam a compartilhar a sidebar direita. A coluna de leitura permanece centralizada, 720 px; sidebar 280 px no desktop a partir de 1366 px. A composição ocupa 1320 px, com espaço equivalente à esquerda. Em telas menores, o TOC é recolhível acima da leitura e o banner fica inline após o corpo, antes dos relacionados.
2. Artigos usam 18 px também no celular e na prévia móvel do CMS. Mantêm títulos 44/32 px, H2 30/26 px, H3 24/22 px e entrelinha 1,7. Esta ordem atualiza a escala e a disposição registradas em `ARTICLE_LAYOUT_V4.md`.
3. Banner: “Growth OS · por Legenda Digital”, “Acompanhamento comercial com contexto.” e “Conhecer o Growth OS”, diretamente para `https://app.legendadigital.com.br/`. Nenhum dado é transferido ao software.
4. Taxonomia editorial passa a usar os eventos abaixo. Clientes antigos continuam aceitos; o RPC normaliza nomes legados ao receber novas chamadas. Não há emissão dupla nem reescrita de eventos históricos.
5. Comentários consultam os mesmos parâmetros públicos de Auth usados na conta do Portal. Não oferecem cadastro quando ele está desativado. Contas existentes mantêm login e contribuição. Formulários de login, comentário e denúncia usam POST como fallback, sem credenciais em query strings.
6. Compartilhamento preserva WhatsApp, LinkedIn, cópia e Web Share. Links manuais, banners configurados e relacionados passam pelo tracking consentido. O início de comentário é emitido uma vez por página; os marcos de leitura também.

Corpos aprovados, datas de publicação, registros de comentários, contas, inscritos e resultados privados não são alterados. Não foram inseridos artigos, inscrições, métricas ou comentários fictícios em produção.

## Rotas

| Rota solicitada (301) | Canonical e página publicada (200) |
|---|---|
| `/artigos/o-novo-funil-de-vendas-na-era-da-ia` | `/conteudos/o-novo-funil-de-vendas-na-era-da-ia` |
| `/artigos/marketing-de-campanha-para-sistema` | `/conteudos/marketing-de-campanha-para-sistema` |
| `/artigos/ai-search-como-chatgpt-google-assistentes-mudam-descoberta` | `/conteudos/ai-search-como-chatgpt-google-assistentes-mudam-descoberta` |
| `/artigos/seo-aeo-geo-busca-por-ia` | `/conteudos/seo-aeo-geo-busca-por-ia` |
| `/artigos/agentes-de-ia-chatbots-sistemas-de-trabalho` | `/conteudos/agentes-de-ia-chatbots-sistemas-de-trabalho` |

## Migração, tabelas e RLS

Migração local: `20261013181236_editorial_batch1_stabilization.sql`, criada pelo CLI. Altera apenas a allowlist de `public.analytics_events` e o RPC existente `public.track_editorial(text,uuid)`. Sem novas tabelas, permissões de edição ou políticas públicas de leitura.

RLS continua ativa em analytics, comentários, perfis e denúncias. O RPC mantém `search_path=''`, revoga `PUBLIC`, aceita somente evento enumerado e artigo publicado com data passada, e monta metadata exclusivamente a partir dos campos públicos do artigo. Não aceita email, user ID, IP, corpo de comentário, URL arbitrária ou metadata enviada pelo cliente. Drafts não podem gerar evento.

Eventos: `article_viewed`, `article_25_percent`, `article_50_percent`, `article_75_percent`, `article_completed`, `toc_clicked`, `source_clicked`, `internal_link_clicked`, `share_clicked`, `comment_started`, `comment_submitted`, `comment_replied`, `growth_os_cta_clicked`, `newsletter_cta_clicked`. Denúncias preservam o evento anterior `article_comment_reported`.

Marcos são eventos de profundidade de scroll, não prova de compreensão ou tempo engajado. Dependem de consentimento. Não são visitantes únicos, conversões comerciais ou benchmarks. A consolidação histórica e a identidade pertencem ao milestone de analytics unificado.

Baseline de preservação: 14 artigos; hash `md5(string_agg(id::text||body,'' order by id)) = f64fca57184d93037e4dd15c0a45d911`; 0 comentários, 1 usuário de Auth, 0 inscritos.

## Verificação

- `npm run build`: TypeScript, Vite, 45 rotas pré-renderizadas e servidor Node.
- `npm test`: integridade do conteúdo aprovado, SEO/runtime, PostgreSQL/RLS, moderação, ferramentas, newsletter e startup.
- `npx playwright test`: fluxos do CMS, conta, comentários, compartilhamento, consentimento, responsividade e acessibilidade.
- `node scripts/qa/visual.mjs after`: 44 amostras locais de layout/LCP/CLS. Valores de laboratório, não Core Web Vitals de campo.
- `node scripts/qa/editorial-batch.mjs https://legendadigital.com.br before`: 10 amostras reais anteriores, sem writes.
- `node scripts/qa/editorial-batch.mjs https://legendadigital.com.br after`: cinco artigos em nove viewports solicitados, 45 amostras reais, sem opt-in de analytics nem writes privados.
- CI deve validar build, testes, QA, audit, Python, shell e PHP antes do merge. Hostinger publica via sua integração existente com GitHub/main; o workflow SSH com gate desligado não comprova deploy.

Evidência visual anterior: `artifacts/editorial-stabilization/before/`. Não contém dados privados. A comparação final e seus resultados serão registrados após o smoke test.

Validação local anterior ao PR: build verde, 67 testes Node/PostgreSQL e 10 Python verdes; os 53 casos de navegador foram cobertos, com reexecução dos dois casos de ferramentas que perderam assets durante a troca local do build. A reexecução passou sem mudança nas ferramentas. As verificações finais de artigo/axe também passaram sobre o build final. A CI deve repetir a suíte completa de forma sequencial antes do merge. QA local do artigo: 11 viewports, sem erros JS, overflow ou imagens com falha, CLS 0; LCP máximo 428 ms em laboratório sem throttling. Evidência local final em `artifacts/editorial-stabilization/local-after/`. Audit sem severidade alta/crítica (um aviso baixo preexistente em dependência de desenvolvimento).

## Gates e riscos

**Milestone 1: PARCIAL.** Estabilização visual, URLs, SEO e funcionalidades existentes podem ser publicadas. O ciclo real de cadastro/confirmação de uma nova conta e contribuição de leitor não está validado em produção: `/auth/v1/settings` retorna `disable_signup=true`, email ativo e confirmação obrigatória. Os testes de comentários usam usuários e dados locais isolados; não equivalem a comprovar entrega real do email de Auth. O conector de banco não configura Auth hosted/SMTP.

**Milestone 2: BLOQUEADO na ativação de envio.** O endpoint público do LD Brief confirma envio e webhook desativados. Manter desativado até DNS verificado, segredos privados provisionados, webhook validado e teste real de confirmação/envio/cancelamento. Detalhes em `LD_BRIEF_V1.md`. Não declarar newsletter operacional com apenas a presença do plugin Resend.

Os avisos de segurança preexistentes são mantidos sob revisão: RPC editorial público `SECURITY DEFINER` intencionalmente limitado; proteção de senhas vazadas desativada no Auth hosted. As tabelas privadas de tokens/rate limit da newsletter têm RLS sem políticas para negar acesso público. Não ampliar acesso para eliminar avisos. Analytics possui deduplicação no navegador, não identificação resistente a abuso; aprimoramento pertence ao milestone de analytics.

Avisos de build preexistentes: bundle Admin acima de 500 kB (lazy; não carregado como módulo público inicial) e dependência de desenvolvimento com aviso baixo em audit. Monitoramento INP de campo ainda não implementado.

Não iniciar analytics/intelligence/community/expansão enquanto os gates anteriores não estiverem encerrados, conforme ordem consolidada. Próximo passo recomendado: liberar e validar operacionalmente Auth do Portal e LD Brief usando configuração segura disponível; nenhuma etapa posterior está declarada concluída.

## Rollback

Reverter o PR e publicar novamente via CI/GitHub → Hostinger. A migração é compatível com o cliente anterior: continuar aceitando e normalizando os nomes antigos; manter allowlist ampliada evita apagar ou invalidar eventos já recebidos. Não restaurar constraint anterior sobre registros novos, não apagar analytics, conteúdo ou contas. Sem rollback de dados e sem alteração no Growth OS.
