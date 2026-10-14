# Auditoria de separação Portal / Growth OS

Data: 14/10/2026. Ordem LD HQ: separação formal, Portal P0, congelamento da expansão SaaS. **Status: auditoria técnica entregue; aceite integral da Fase 0 PARCIAL.** Não há autorização arquitetural para unir bancos, repos ou Auth. Não avançar fase com pendências abaixo tratadas como concluídas.

## O que existia / o que mudou

Já existiam repos, Supabase e runtime próprios. A migração inicial preservou cópias editoriais na origem SaaS. README Portal ainda dizia provider indefinido, sem envio no projeto, marca/deploy antigos; README SaaS indicava branch antiga de foundation. Esses registros não representavam mais o estado implementado.

Esta entrega corrige documentação de ambos os repos, adiciona limites/ambientes/rollback, ordem completa dos gates e uma barreira estática na CI do Portal. Inclui auditoria read-only de catálogos dos dois bancos e smoke público com o outro produto bloqueado. Sem alteração visual, funcional, conteúdo, conta, secret, DNS, Meta, callback ou hospedagem. Nenhum agente novo; nenhum envio de email.

## Arquitetura e evidências

| Item | Portal | Growth OS | Classificação / ação |
|---|---|---|---|
| GitHub | `legendadigitalmkt-dot/legenda-digital-portal` | `legendadigitalmkt-dot/ld` | INDEPENDENTE; sem monorepo/movimentação |
| Base auditada | `c13a0af44707e61b47acf8b12aff6f39c6032c04` | `f2952e0c966a65e5d736e97e51cca7ada0f75ac1` | Main remoto conferido com os clones |
| Banco | `yltnjgngkomelfltdyky` | `cknlzuinwcdupdxilzcf` | INDEPENDENTE; ambos ACTIVE_HEALTHY, São Paulo, PG17 |
| Public tables | 32, todas RLS | 28, todas RLS; control plane também próprio | INDEPENDENTE; dados operacionais não compartilhados |
| Foreign servers/tables | 0 / 0 | 0 / 0 | INDEPENDENTE; sem FDW; sem dblink/http/pg_net instalados |
| Refs entre projetos em funções public/private | Nenhuma | Nenhuma | INDEPENDENTE no escopo do catálogo consultado; não cobre código dinâmico ofuscado |
| Conteúdo | 14 posts | 9 posts legados | MIGRAR FUTURAMENTE: sanear cópia antiga com plano de retenção e verificação de clientes, sem apagar agora |
| Buckets | authors/community/content-images/editorial-files/site-assets públicos; private-admin privado | Cinco buckets editoriais legados; private-admin privado | INDEPENDENTE por projeto; ambos sem objetos. Legado SaaS documentado para saneamento |
| Auth | 1 identidade; Portal session storage próprio; redirects /admin,/conta,/conteudos/* configurados em 13/10 | 2 identidades; SSR cookies; workspace cookie próprio | INDEPENDENTE no código/projetos; sessão privada cruzada não exercitada |
| Admin | /admin, site_staff/RLS | /control-center, control plane/MFA | INDEPENDENTE; requisições privadas públicas do SaaS redirecionam ao login |
| Env público | VITE_SUPABASE_URL/PUBLISHABLE_KEY/SITE_URL | NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY/APP_URL | INDEPENDENTE no contrato; valores hosted privados ainda não auditáveis |
| APIs | Supabase Portal, Edge ld-brief, provider Resend no servidor | Supabase SaaS, Meta e eventual provider AI no servidor | INDEPENDENTE no fonte; nenhuma consulta direta ao outro produto encontrada |
| Componentes | UI/engine/assets locais Portal | UI SaaS própria | INDEPENDENTE; nenhum import entre repos |
| Cross-links | CTAs/bridge para SaaS | Conteúdos/Building/marca/legal no Portal | ACEITÁVEL como links; nenhum requisito de fetch para renderização pública |
| Analytics | analytics_events/tool_events/newsletter_events Portal | Dados operacionais próprios; analytics_events antigo com 20 eventos editoriais | INDEPENDENTE em execução; legado não é dataset SaaS novo; não consolidar ambos |
| Webhooks | ld-brief no projeto Portal; provider webhook ainda desativado | /api/webhooks/meta/whatsapp no app; sem Edge Functions SaaS | INDEPENDENTE no fonte; configuração Meta hosted não alterada/revalidada |
| Domínios | apex/www Portal | app atual; futuro ainda indefinido | INDEPENDENTE; não mudar DNS |
| Deploy | GitHub/main → Hostinger Node, dist/server.js | Next build/start próprios; CI próprio | INDEPENDENTE no código; vínculo/secrets hosted SaaS não revalidados |
| Secrets | Runtime Edge dedicado Portal; build aceita publishable | Service role/Meta/AI server-only | CRÍTICA como gate de verificação privada; nenhuma exposição/igualdade constatada; não confundir falta de prova com vazamento |

Não foram encontradas dependências ativas classificadas REMOVER. Resíduos editoriais no SaaS são cópias históricas, não tabelas fisicamente compartilhadas. Não removê-los sob a justificativa de “limpeza” neste PR. `supabase` org, titular GitHub ou marca em comum não equivalem a banco/credencial compartilhados.

## Preservação de dados

Snapshot agregado, sem emails/IDs de usuário: Portal 14 posts, 1 staff, 1 Auth, 0 inscritos, 383 eventos; SaaS 9 posts legados, 1 staff legado, 2 Auth, 0 inscritos, 20 eventos legados. Eventos são contagens pontuais, não audiência única. Checksum dos corpos por ID ordenado: Portal `f64fca57184d93037e4dd15c0a45d911`; origem SaaS `0ab8422e972167357b2d4318e0446b5a`. Conteúdo do Portal permanece igual ao checkpoint de 13/10.

Catálogos e baseline em `artifacts/product-boundaries/catalog-audit.json`. Auditoria fez somente SELECT. Nenhuma migration, INSERT/UPDATE/DELETE, import ou seed. Migrations aplicadas existentes: Portal 9, SaaS 10; não reaplicar devido a timestamps locais/hosted diferentes.

## RLS, Auth e segurança

Sem alterações de roles/grants/RLS/Auth. Advisor Portal: WARNs preexistentes de track_editorial SECURITY DEFINER (anon/authenticated, interface limitada já revisada) e proteção de senhas vazadas desativada; dois INFO de RLS sem policy em tokens/rate limit privados, acesso público intencionalmente negado. SaaS: WARN preexistente de senhas vazadas; dez INFO de tabelas control_plane sem policy, protegidas via schema/RPC. Não abrir policies para silenciar avisos.

Scan delimitado dos arquivos Git correntes: 278 Portal / 195 SaaS, sem correspondências de formatos longos sb_secret/re_/gh* com limite de palavra. A busca inicial sem limite de palavra marcou nomes de fixtures/funções de teste; refinada para não confundir identificadores com credenciais. Não é análise de histórico, JWTs arbitrários ou credenciais hosted. Valores não foram impressos. Nenhum secret novo criado/rotacionado.

O conector GitHub não disponibilizou inventário de secrets/variables via os endpoints consultados; painel Hostinger tem restrição de sign-in conhecida nesta sessão e não foi repetido nem contornado. Portanto **não é possível certificar ausência de service keys compartilhadas na hospedagem** nesta execução. Fonte/build revisados não têm dependência cruzada; auditoria privada restante continua explícita.

## Domínio / contratos

`docs/PRODUCT_BOUNDARIES.md` documenta escopo, dados/Auth/Admin/analytics, env/deploy e rollback. SaaS `getAppUrl()` centraliza callbacks/recuperação. Hardcodes remanescentes: metadataBase em app/layout.tsx, marketing.url, rótulo OG e settings. Classificação MIGRAR FUTURAMENTE: reduzir em mudança preparatória sem domínio novo, observando congelamento. Não escolher endereço por engenharia. Cookies de domínio pai e SSO não implementados.

Referral atual é somente navegação Portal → SaaS. Nome atual `growth_os_cta_clicked`; a nova ordem solicita `growth_os_referral_clicked` + metadata de origem/campanha. Isso pertence à taxonomia Fase 4; não renomear agora sem compatibilidade/histórico. Nenhum dado pessoal enviado ao app pelo clique.

## Testes, build e smoke

- Nova checagem CI `npm run check:boundaries`: 68 arquivos ativos + env/dependências, aprovação local. Três testes verificam backend errado, chave privada/variável pública, imports indevidos e referral permitido; diagnóstico não contém valores.
- Build TypeScript/Vite/Node verde; 45 rotas; 73 testes Node/PostgreSQL, 54 Playwright e 10 Python verdes (137 total). CI completa e 44 amostras de QA responsivo registradas no PR após execução.
- SaaS: alteração documental somente; 79 unit tests locais verdes. Build/typecheck/lint e pgTAP/RLS exigidos pela CI própria antes de merge.
- Smoke **real read-only**: 30 amostras (Portal 10 rotas × 2 viewports; SaaS 5 × 2). 390×844 e 1440×900; HTTP200, sem overflow/erros JS. Origem e Supabase do outro produto bloqueados pelo navegador: nenhuma requisição a eles nas páginas exercitadas. `/app` e `/control-center` redirecionam ao `/login`; Portal `/admin` mostra entrada própria. Não houve login, criação de conta, formulário enviado nem opt-in de analytics.
- Amostras/evidências: `artifacts/product-boundaries/public-smoke.json`, `portal-1440.jpg`, `growth-os-1440.jpg`. Screenshots da produção existente, sem redesign. Esse smoke não comprova CRM/workspace autenticado, MFA ou entrega de email.
- Readiness pública em 14/10: quatro DNS email NXDOMAIN; signup desativado/confirm obrigatório; newsletter sem envio pronto. Mantida desativada. Não fechar Fases 1/2 com envio fictício.

## Deploy, PR e commits

Branches próprias `chore/product-boundaries` em cada repo, PRs independentes; links, heads, CI e merges no relatório final e no corpo de cada PR. CI verde antes do merge. Fonte de runtime Portal/SaaS inalterada; esta entrega não exige troca de release e mantém health `portal-auth-confirmation-v1`. GitHub/main Portal pode acionar seu rebuild nativo normal; job SSH gated não comprova publicação. SaaS recebe apenas documentação, não mudança operacional.

## Aceite e pendências

| Critério HQ | Estado |
|---|---|
| Portal sem SaaS / SaaS sem Portal | Páginas públicas comprovadas; operações autenticadas pendentes |
| Bancos próprios / sem tabela compartilhada | Comprovado; cópia editorial histórica SaaS inventariada |
| Auth/Admin independentes | Comprovado no fonte/projeto e entrada pública; validar sessões reais separadas |
| Deploy independente | Contratos/repos/CI separados; reconfirmar vínculo/credenciais hosted SaaS |
| Analytics separado | Confirmado no fonte/catálogos; legado SaaS identificado; nova taxonomia ainda Fase 4 |
| Domínios documentados | Concluído; sem migração |
| Service keys não compartilhadas | Não certificável sem inspeção privada hosted; nenhum indício ativo encontrado |
| Sem ciclo de dependência | Nenhum no fonte/fluxos públicos auditados; não afirmar todos os fluxos privados |

**Próxima ação para encerrar Fase 0:** validar provisionamento hosted e fluxos autenticados mantendo credenciais privadas; decidir saneamento futuro do legado sem exclusão automática. Não pedir ao usuário para contornar bloqueio Hostinger. Fases 1–7 mantidas na ordem em `docs/PORTAL_V1_EXECUTION.md`; esta auditoria não autoriza pular gates.

## Rollback / riscos

Reverter PR documental/CI do produto correspondente, executar CI e redeploy se o provedor disparar rebuild. Sem rollback de banco. Preservar tabelas, Auth, arquivos, DNS e configuração de email. Novos scans são limitados, não scanner completo: não alegar ausência universal de secrets ou segurança total. Aviso de bundle Admin >500kB/lazy e advisory baixo de dependência dev já existiam; performance de campo não foi medida aqui.
