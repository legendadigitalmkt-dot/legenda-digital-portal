# Limites dos produtos

Decisão vigente: ordem LD HQ de 14/10/2026. Prioridade: finalizar Portal. Growth OS sem expansão; apenas incidentes P0 de segurança, integridade, indisponibilidade, WhatsApp de produção ou Auth autorizam correção operacional. Esta ordem substitui prioridades anteriores que misturem os produtos.

## Identidade e responsabilidade

| Recurso | Legenda Digital Portal | Growth OS |
|---|---|---|
| Propósito | Mídia, conteúdo, Growth Intelligence, ferramentas, newsletter, comunidade, Building, audiência | Software comercial: CRM, pipeline, WhatsApp, tarefas, follow-up, resultados |
| Fonte oficial | `legendadigitalmkt-dot/legenda-digital-portal` | `legendadigitalmkt-dot/ld` |
| Produção Git | `main` | `main` |
| Domínio atual | `legendadigital.com.br`, alias `www.legendadigital.com.br` | `app.legendadigital.com.br` |
| Supabase | `yltnjgngkomelfltdyky` — Legenda Digital Portal | `cknlzuinwcdupdxilzcf` — LD Growth OS Dev |
| Região / engine | São Paulo / PostgreSQL 17 | São Paulo / PostgreSQL 17 |
| Admin | `/admin`, equipe `site_staff` | `/control-center`, permissões/MFA control plane |
| Auth | Identidades próprias Portal | Identidades próprias SaaS |
| Dados privados | Resultados tools, conta, inscritos, moderação, equipe | Workspaces, contatos, oportunidades, mensagens, tarefas, permissões |
| Analytics | Conteúdo, tools, newsletter, comunidade, aquisição, referral | Ativação, uso operacional, retenção, receita do software |
| Runtime | Vite/React + servidor Node dedicado | Next.js/React + servidor próprio |

O nome hosted **LD Growth OS Dev** não cria um staging: esse projeto atende a aplicação atual. Não existe segundo staging confirmado. Não renomear, recriar ou mover bancos para satisfazer convenção de nomenclatura.

## Relação comercial

Growth OS é produto recomendado no Portal; “por Legenda Digital” é permitido no software. `/produtos/growth-os` é apresentação comercial. CTA: **Conhecer o Growth OS** → `https://app.legendadigital.com.br/`. Links sem tokens, PII, identidade sincronizada ou componentes internos compartilhados. Screenshots são assets locais de apresentação; não iframes/fetch do app para renderizar Portal.

Sem SSO ou sincronização automática de usuários. Uma pessoa pode ter duas contas. Sessão Portal não concede acesso SaaS nem o inverso. Integração futura exige contrato explícito de API/evento/webhook ou identidade federada.

## Dados, Auth, Storage e secrets

Cada app consulta somente seu Supabase. Mesmo nome de tabela/bucket em bancos diferentes não é recurso compartilhado. Tabelas editoriais antigas no banco SaaS são legado preservado, não fonte do Portal. Não remover neste ciclo sem plano próprio, retenção/backup e verificação de clientes antigos.

Portal armazena sessão `ld-portal-auth-<host-do-backend>` em sua origem. SaaS usa SSR Supabase por cookies e `growth-os-workspace`; não há cookie `Domain=.legendadigital.com.br` nos fontes auditados. Não criar cookie de domínio pai. Sessões privadas em produção não foram exercitadas nesta auditoria pública.

Autorização permanece no produto: RLS, grants explícitos, equipe/workspace/control plane próprios. `user_metadata` não concede papel administrativo. Nenhuma service role, chave Meta ou email deve cruzar fronteiras. Não registrar secrets/cookies em logs, docs, PR ou frontend.

Valores de secrets hosted não são legíveis no escopo atual. Ausência no Git não comprova diferença desses valores: verificar provisionamento privado antes do aceite integral. Não rotacionar sem evidência de exposição.

## Ambientes e configuração

| Ambiente | Portal | SaaS |
|---|---|---|
| Desenvolvimento | Vite; backend local/fixture explícita; produção não serve para teste de escrita | Next; Supabase local separado |
| CI / preview | Build descartável/chave fictícia, API fixtures e PGlite; nenhum staging hosted confirmado | Build descartável/fictício; Supabase local pgTAP/RLS |
| Produção | Hostinger Node + Supabase Portal | Hospedagem app + Supabase SaaS existente |

Portal: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`, somente públicos. Runtime aceita `https://yltnjgngkomelfltdyky.supabase.co`. LD Brief é Edge Function desse projeto, com secrets próprios e consentimento independente.

SaaS: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`; `SUPABASE_SERVICE_ROLE_KEY`, `META_*` e eventual OpenAI são server-only. Não copiar `.env` entre produtos. Referências e nomes de variável são documentáveis; valores privados não.

## Deploy independente

Portal: `legenda-digital-portal/main` → integração nativa GitHub Hostinger → `npm run build` → `dist/server.js`. CI `Site checks`: fronteiras, build, Node/PostgreSQL, Playwright, QA responsivo, dependências e testes de deploy. SSH legado não é deploy ativo; sucesso sem publicação não é evidência. Health prova release do runtime, não revisão de documentação ou entrega de email.

SaaS: `ld/main`, build `npm run build`, início `npm start` (contrato package). CI `Production Foundation CI` e `Database Security Tests`, independente do Portal. Aplicação pública disponível; vínculo exato do deploy hosted, variáveis e secrets Hostinger não revalidados: painel restrito na sessão. Não inventar workflow de deploy inexistente no Git. Não alterar hospedagem SaaS nesta entrega.

Rollback próprio: PR de revert, CI e redeploy do produto. Nunca restaurar banco com snapshot do outro. DDL exige plano específico de reversão/preservação; Fase 0 não tem migration.

## Domínio futuro Growth OS

Nenhum domínio novo escolhido. Não migrar DNS/Auth/webhooks agora. `getAppUrl()` já concentra callbacks/recuperação via `NEXT_PUBLIC_APP_URL`. Restam hardcodes de apresentação em `app/layout.tsx`, `lib/marketing.ts`, `app/opengraph-image.tsx` e identificação em settings. Centralizar restantes em mudança preparatória própria após resolver precedência com o congelamento operacional; não expandir runtime SaaS nesta auditoria.

Checklist para migração futura aprovada: canonical/OG/sitemap; Site URL/allowlist Supabase; OAuth/PKCE; CORS; cookies host-only; Meta callback/assinatura/verify token; emails; hospedagem/TLS; CTAs Portal; redirect/alias temporário antigo; smoke/rollback. Não implementar migração nesta fase.

## Verificação

`npm run check:boundaries` inspeciona fontes ativos/build público Portal: backend SaaS, imports remotos/entre produtos, dependências workspace/file/link e padrões explícitos de chave privada no browser. Não é scanner geral de secrets nem prova hosted. Docs/fixtures/migrations históricas fora do scan preservam proveniência.

`scripts/qa/product-independence.mjs` bloqueia origens do outro produto em visitas públicas. Não autentica, envia formulários, cria conta ou consente analytics. Prova limitada às páginas públicas; CRM autenticado, login real e configuração privada continuam gates separados.
