# LD Audience & Intelligence Platform v1 — milestone 1

## Status e escopo

Fundação implementada no portal `legendadigital.com.br`, repositório
`legendadigitalmkt-dot/legenda-digital-portal`, Supabase `yltnjgngkomelfltdyky`.
O Growth OS (`app.legendadigital.com.br`, repositório `ld`, projeto
`cknlzuinwcdupdxilzcf`) não é uma dependência e não recebe dados deste módulo.

Este PR entrega a fundação e adapta as quatro ferramentas atuais ao mesmo
motor determinístico v1. Não entrega a onda 1 completa, as 27 novas ferramentas,
LD Brief, comunidade ou a inteligência editorial. Essas entregas seguem em PRs
separados conforme a ordem de produção de 12/10/2026.

## Auditoria inicial

| Área | Classificação antes deste PR | Evidência e dependência |
| --- | --- | --- |
| Estruturador CLARO | EXISTENTE / PRODUÇÃO básica / PARCIAL | Organizador local de cinco campos, copiar e TXT. Sem chamadas de IA, histórico, versões ou templates. |
| Checklist de conteúdo | EXISTENTE / PRODUÇÃO básica / PARCIAL | Dez critérios e progresso local; não é auditoria multidimensional. |
| Calculadora de conversão | EXISTENTE / PRODUÇÃO básica / PARCIAL | Duas entradas, fórmula correta e validação; não é funil de várias etapas. |
| Planner editorial | EXISTENTE / PRODUÇÃO básica / PARCIAL | Tema, formato, canal, data e CSV/localStorage; sem calendário, Kanban ou performance. |
| Auth | EXISTENTE / PARCIAL | Supabase Auth compartilhada por admin/comentários. API `/auth/v1/settings` confirma email ativo, confirmação obrigatória e `disable_signup=true`. |
| Admin/CMS | PRODUÇÃO | Artigos, versões, workflow, mídia, comentários e formulários privados com RLS. |
| Storage | PRODUÇÃO | Imagens/anexos editoriais públicos, bucket administrativo privado. Não reutilizados para resultados privados. |
| Analytics | PARCIAL | Eventos editoriais básicos condicionados à escolha do navegador; sem plataforma de ferramentas ou inteligência. |
| Newsletter | PARCIAL | Cadastro de interesse `pending`, sem provedor/envios/double opt-in/unsubscribe operacional. |
| Comunidade | PARCIAL | Lista de interesse e eventos; comentários de artigos já funcionam. Sem tópicos/posts/perfis comunitários. |
| Consentimento | PARCIAL | Escolha de estatísticas e consentimento em formulários. Ainda não havia histórico privado de ferramentas. |

Auditoria de produção: PostgreSQL 17.11, 14 artigos, 1 usuário de Auth/equipe,
0 mensagens e 0 inscrições. Fingerprints de corpos, status e datas dos artigos
foram capturados antes da alteração. Não se alteram esses dados neste PR.

## Arquitetura e decisões

- React/Vite + Node standalone existentes preservados; não há migração para Next.js.
- `src/lib/tools-engine.mjs` define IDs estáveis, schemas e cálculos versionados.
- Perguntas e cálculos são revisados no GitHub. Administradores podem ajustar
  nome/descrição/disponibilidade; não podem editar fórmulas ou versões via API.
- `ToolHeader`, `ToolForm`, `ToolResultPanel`, fluxo de salvar, `Account`/histórico
  e `RelatedTools` compartilham apresentação, limites e interpretação.
- Workspace e conta são chunks lazy. Admin/editor não entram no chunk do workspace.
- Resultado básico, TXT/CSV e copiar continuam disponíveis sem conta.
- PDF, compartilhamento público, gráficos, schemas de diagnósticos complexos e
  os demais componentes especializados pertencem às ondas seguintes.

## Schema, migration e RLS

Migration local criada com Supabase CLI 2.120.0:
`20261012214913_portal_tools_platform_foundation.sql`.

| Objeto | Conteúdo | Acesso |
| --- | --- | --- |
| tools | Cadastro, categoria, versão, status e CTAs | Leitura pública; UPDATE de nome/descrição/status somente admin/super_admin |
| tool_versions | Inputs/cálculos/resultado/metodologia/limites imutáveis | Leitura pública; escrita somente migrations |
| tool_runs | Run, respostas, resultado, nome, favorito, versão, datas e origem | Somente proprietário autenticado; equipe não tem exceção |
| tool_consents | Registro do aceite de histórico, finalidade e versão | Somente proprietário; nenhum aceite de inteligência implícito |
| tool_exports | Formato/data do download associado ao run | Proprietário; FK com cascade ao excluir run |
| tool_events | Ferramenta, evento, passo, consentimento, versão e data | INSERT consentido e limitado; leitura somente admin |
| tool_admin_audit | Alterações de configuração, ator e data | Gravado por trigger; leitura somente admin |
| tool_usage_summary | Contagens de uso em 30 dias | View `security_invoker=true`, herda RLS dos eventos |

`tool_runs` implementa os equivalentes de answers/results/saved_runs em JSONB
na mesma linha: atomicidade e propriedade única, sem joins com tabelas públicas.
`user_id` é obrigatório no servidor; `anonymous_id` deve ser nulo. Respostas
anônimas não são persistidas no Supabase, mesmo quando estatísticas são aceitas.

`save_tool_run` é SECURITY INVOKER, exige Auth e grava run/consentimento em
uma transação, com ID idempotente para repetição após falha de rede. RLS,
privilégios por coluna e limites de payload impedem mudar proprietário,
respostas, resultado e versão de um run salvo. Uma revisão duplica o registro,
preservando o original. Nome/favorito são editáveis pelo proprietário.

Limites: até 1.000 runs por conta, 30 novos runs/minuto/conta, 32 KiB de
respostas e 32 KiB de resultado; até 30 registros de exportação/minuto/conta;
até 300 eventos/minuto/ferramenta. Locks de transação serializam os limites.
Eventos não têm parâmetros livres, identidade ou payload de respostas. Esses
limites protegem a escrita, mas não tornam métricas resistentes a bots.

Triggers com privilégio para contagem/auditoria ficam em `private`, possuem
`search_path=''`, EXECUTE revogado para os papéis da API e não são endpoints.
RLS está habilitada em todas as novas tabelas expostas. Não se usa
`user_metadata` para autorizar acesso. Nenhuma chave privilegiada entra no cliente.
CSRF não se aplica à API Bearer do Supabase; o Node continua somente GET/HEAD.
Strings são renderizadas como texto React; CSV neutraliza fórmulas. Sem HTML
arbitrário, iframes ou uploads de respostas.

### Histórico de migrations

As cinco migrations anteriores foram aplicadas via MCP com timestamps diferentes
 dos arquivos locais. Não executar `supabase db push` indiscriminadamente:

| Nome | Local | Hosted |
| --- | --- | --- |
| public_site_foundation | 20261008061250 | 20261008162058 |
| editorial_cms_v1 | 20261012044628 | 20261012130710 |
| editorial_scheduler | 20261012044637 | 20261012130717 |
| portal_ux_image_variants | 20261012140046 | 20261012143051 |
| editorial_media_banners | 20261012153255 | 20261012165031 |

Esta migration é testada em PostgreSQL local/PGlite e aplicada uma vez pelo MCP;
o timestamp hosted é registrado no resultado do deploy. Nenhum histórico de
migration existente é reescrito. Reconciliar versões explicitamente antes de
adotar um pipeline CLI `db push`.

## Rotas e experiência

- `/ferramentas`: catálogo por categoria e acesso ao histórico.
- `/ferramentas/claro`, `/checklist-conteudo`, `/calculadora-conversao`,
  `/planner-editorial`: contexto, inputs, validação, interpretação, próxima
  ação, copiar/TXT/CSV e salvar opcional.
- `/conta`, `/conta/ferramentas`: login do portal, paginação de 20 resultados,
  nome, favorito, detalhes, duplicar/ajustar, comparação da mesma ferramenta e
  versão, exportação e exclusão confirmada pelo usuário.
- `/admin/tools`: inventário, disponibilidade, edição de metadados e métricas.
- `/privacidade#ferramentas`: finalidade, retenção, separação de dados e direitos.

Conta e links de duplicação com `?run=` recebem `no-store` e `X-Robots-Tag:
noindex, nofollow`. Conta não entra no sitemap. Tool landing tem SEO,
metodologia, limites e FAQ públicos; resultado privado não aparece no HTML SSR.

Rascunhos nesta aba exigem escolha explícita e usam sessionStorage, encerrado
com a aba. Rascunhos antigos de checklist/planner em localStorage não são
apagados nem importados automaticamente; botão permite recuperar no navegador.
Importar para o histórico exige login e consentimento de salvar, sem duplicação
por retry. Não há cadastro obrigatório no primeiro contato com a ferramenta.

## Consentimento, analytics e retenção

- Escolha de estatísticas no navegador: `ld-analytics-consent`. Pode ser alterada
  em Conta/Privacidade. Registro de eventos só ocorre quando `yes`.
- Histórico: finalidade `private_history`, versão `tools-v1-2026-10-12`, aceite
  explícito por salvamento. `intelligence=false` em todas as linhas.
- Eventos: viewed, started, step_completed, completed, saved e exported;
  shared está reservado no schema, não há compartilhamento público nesta etapa.
- UI de admin apresenta contagens reais de ações, não pessoas únicas. Não há
  benchmark, nota de mercado, segmentos identificáveis ou insight publicado.
- Origem de run salvo: UTM simples (somente letras/números/hífen/underscore,
  até 80 caracteres), referrer reduzido à origem. Não há query/referrer completo.
  First-touch/last-non-direct multissessão e jornadas newsletter/comunidade serão
  implementados com seus respectivos mecanismos de consentimento, em outro PR.
- Runs/consents/log de admin: janela de 365 dias; eventos: 90 dias. Job privado
  `ld-portal-tools-retention` executa batches limitados a cada cinco minutos
  via pg_cron já existente. Exclusão de run remove seus exports por cascade.
- Solicitação de exclusão de conta/registro de consentimento: formulário de
  contato existente; autoexclusão de Auth exige fluxo próprio e revogação de
  sessões, não foi improvisada com uma credencial privilegiada no frontend.

## Auth: dependência de ativação

Login reutiliza o Supabase do portal e a mesma storageKey. Novo cadastro é
mostrado somente se `/auth/v1/settings` confirmar que email/signup estão
liberados; confirmação por e-mail permanece obrigatória. A configuração local
permite desenvolvimento de signup, mas **não altera automaticamente Auth hosted**.

A API do conector acessa banco/DDL, mas não configura os parâmetros de Auth.
O painel hosted exige login; não foi redefinida senha nem elevada permissão de
nenhuma conta. Para liberar cadastros, é necessário acesso ao painel do projeto,
ativar User Signups, verificar Site URL/redirect e SMTP/limites de e-mail.
Não declarar signup/delivery confirmado antes dessa verificação.

## Validação e QA

- Cálculos: zero, inteiros seguros, denominador, ações > visitas, limite de
  campos/pautas, datas reais, CSV injection, IDs estáveis e UTM minimizado.
- PostgreSQL/RLS: anônimo, Alice, Bob e admin; isolamento de leitura/escrita,
  consentimento, idempotência, pause/auditoria, versões imutáveis, rate limits,
  cascade e job de retenção.
- Playwright com API fixture explícita: cálculo/export sem conta e sem writes
  não autorizados; login preserva inputs; salvar com checkbox obrigatório;
  favoritar/renomear/duplicar/comparar/excluir; draft corrompido; consentimento;
  360/390/768/1440 e axe WCAG A/AA; noindex/no-store/sitemap.
- QA existente de home/hub/artigo/Growth deve continuar passando nos 44
  tamanhos/amostras, preservando os ajustes das releases anteriores.
- Smoke de produção é somente leitura/cálculo local sem estatísticas. Não
  foi usado password de usuário real nem criado usuário falso na produção.

Validação local: build de produção e TypeScript; 53 checks Node/PostgreSQL,
25 casos Playwright (incluindo 12 análises axe), 10 checks Python de deploy
aprovados; auditoria npm sem itens high/critical. A dependência de desenvolvimento
Windows esbuild/tsx conserva um aviso LOW anterior. Node iniciou em aproximadamente
0,4 s em teste direto/hosting loader. O build mantém o aviso existente do chunk
Admin acima de 500 KiB; Account (~7,6 KiB), workspace (~8,9 KiB) e autenticação
(~5,7 KiB) são separados. Valores de bundle são antes de gzip.

Resultados de CI, PR, merge, advisors e smoke serão anexados à entrega.
Testes com fixtures comprovam o código/fluxo; não são prova de envio de e-mail
ou teste autenticado ponta a ponta com credenciais reais.

## Rollback

Reverter o merge deste PR via novo PR; executar CI; aguardar deploy automático
Hostinger; conferir health e rotas anteriores. A migration é aditiva: manter
novas tabelas e dados privados no rollback; não executar DROP/CASCADE de
usuários, artigos ou resultados. Se necessário pausar coleta pela UI/admin ou
reverter cliente; não compartilhar resultados para recuperar disponibilidade.
Manter a retenção privada enquanto existir dado salvo.

## Próximas entregas aprovadas

1. Concluir ativação hosted de cadastro/confirmação quando houver acesso.
2. Onda 1 em PR separado: CLARO Workspace, auditoria multidimensional de
   conteúdo, funil com etapas/cenários e planner completo; maturidade de
   crescimento, CAC:LTV/payback, follow-up e SEO/AEO/GEO. PDF e visuais quando
   úteis, com limites/metodologia/QA por ferramenta.
3. LD Brief: provider auditado, double opt-in, consent ledger, opt-out,
   preferências, issues/admin/archive. Sem disparo inventado.
4. Community Core: tópicos, posts, replies completas, perfis sem email,
   moderação; notificações em PR separado.
5. Ondas 2–4 após QA e análise de uso de cada onda.
6. Intelligence Center: agregados consentidos, amostra/limiares/período/viés,
   candidatos editoriais e revisão antes de publicar.
