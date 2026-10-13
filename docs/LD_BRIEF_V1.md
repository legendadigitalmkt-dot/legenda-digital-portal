# LD Brief v1 — entrega e ativação

Milestone 3 de LD Audience & Intelligence Platform v1. Somente portal
`legendadigital.com.br`, repositório `legenda-digital-portal` e projeto Supabase
`yltnjgngkomelfltdyky`. Não usa Auth, banco ou repositório do Growth OS.

## Auditoria e decisão

Em 13/10/2026: formulário anterior gravava `pending` diretamente, sem confirmação,
preferências, envio ou descadastro. Zero inscritos, 14 artigos publicados,
uma conta existente, zero resultados privados. Não havia Edge Functions,
credenciais de envio locais ou conexão instalada com Resend.
O usuário escolheu Resend. A abstração `createProvider` mantém a integração
fora do frontend; não é necessária conta Supabase Auth para assinar a newsletter.
Signup/Auth/SMTP de contas continuam uma configuração independente.

## Entrega

| Recurso | Comportamento |
| --- | --- |
| Inscrição | E-mail obrigatório, nome opcional, consentimento explícito/versionado, honeypot, challenge assinado, respostas sem revelar existência do e-mail |
| Confirmação | Token de 256 bits, hash no banco, validade 48 h, botão explícito; abrir GET não altera inscrição |
| Preferências | Link privado no fragmento da URL ou e-mail de conta autenticada e confirmada; somente LD Brief ativo |
| Descadastro | Imediato no banco; idempotente; nova confirmação exigida para reativar; RFC8058 com token exclusivo para cancelar |
| Admin | `/admin/newsletter`: contagens reais, confirmações em 30 dias, origens da página, inscritos paginados, edições e métricas reportadas |
| Edições | Rascunho/revisão/agendada/enviando/enviada; assunto, prévia, texto, autor, data e segmento LD Brief; conteúdo congelado ao iniciar envio |
| Arquivo | Somente edições enviadas e públicas; `/newsletter/[slug]` tem SSR/SEO e sitemap; paginação de 20; busca por assunto |
| Ferramentas | Captura opcional depois do resultado; nunca impede cálculo/exportação |
| Envio | Ação manual e explícita da equipe, lotes de até 5; nenhuma campanha automática/cron de envio |
| Webhook | Assinatura Svix/HMAC sobre bytes originais, tolerância 5 min, deduplicação; eventos sem corpo/PII original |

Agendamento indica a data planejada e impede envio antecipado. Não é um scheduler
automático de campanhas. Edições sem destinatários elegíveis não viram `sent`.
O arquivo começa vazio: não há edição, audiência ou prova social fictícia.

## Banco, consentimento e isolamento

Migration CLI `20261013104724_portal_ld_brief.sql` é aditiva. Mantém estados legados
`confirmed` e dados existentes; somente confirmações da nova versão geram
`subscribed` e entram nos envios. Não inventa consentimento para registros antigos.
Estados adicionais: `bounced`, `complained`; nunca reativados automaticamente.

Tabelas: `newsletter_subscribers`, `newsletter_preferences`,
`newsletter_consents`, `newsletter_issues`, `newsletter_deliveries`,
`newsletter_events`, `newsletter_admin_audit`. Tokens e limites ficam em `private`.
RLS em todas, inclusive private. Anônimo só lê colunas públicas das edições
enviadas. Conta comum não lê inscritos/ledger/envios. Admin lê dados privados,
mas não pode confirmar um inscrito, forjar envio ou editar consentimentos.
Autores de edições (UUID de Auth) e auditoria não são expostos no arquivo.

RPCs SECURITY DEFINER são endpoints **exclusivos de service_role**, com search_path
vazio e EXECUTE revogado de PUBLIC/anon/authenticated. O Edge verifica capability
de confirmação/gestão, assinatura do provedor ou JWT via `/auth/v1/user` e papel
em `site_staff`. `user_metadata` nunca autoriza acesso. O gateway verify_jwt=false
é necessário para intake sem conta e webhooks externos; não há endpoint genérico
para enviar e-mail a destinatários arbitrários. Status/challenge são públicos.

Consent ledger registra e-mail, tipo, data no servidor, origem, versão da cópia
e da política. Preferências reservadas Growth Intelligence/Produto/Comunidade
continuam falsas. Não há exportação de inscritos para Growth OS nem consentimento
para inteligência inferido a partir de inscrição. Analytics público só contém
ação/path, conforme escolha de estatísticas do navegador, sem e-mail/token/score.

Limites de confirmação: 10 pedidos por hash de IP/hora, 2 por e-mail/24 h,
intervalo 15 min e 500 pedidos totais/24 h. Advisory locks e contagem atômica.
IP bruto não é armazenado; HMAC é usado antes do hash. Challenge expira em 10 min
e exige ao menos 800 ms. É uma camada contra automação simples, **não CAPTCHA**.
Não há promessa de impedir todo abuso: monitorar antes de aumentar os limites.
Origin allowlist é camada de navegador; não substitui a autorização de tokens/JWT.

Confirmação é aceite do destinatário, não comprovação de caixa de entrada.
Provider accepted ≠ delivered. Aberturas/cliques são eventos, não pessoas,
e tracking deve permanecer desligado até decisão explícita de privacidade.
Não há pixel nem tracking próprio nesta entrega.

Envios usam chave de idempotência estável por delivery. Até 3 tentativas, lease
de 2 min, sem retry automático após 23 h da primeira tentativa (janela do provedor
é 24 h). Falhas antigas precisam de revisão; não gerar outro delivery para
contornar a proteção. Estado/permissão do inscrito é revalidado antes do envio.
Uma requisição ao provedor já em andamento pode terminar após um cancelamento;
os envios seguintes ficam bloqueados. Eventos antes da persistência do provider_id
são conciliados após o aceite. Eventos antigos não revertem reclamações/devoluções.

## Retenção e observabilidade

Job `ld-brief-retention`, diário 04:27 UTC (01:27 São Paulo) se pg_cron estiver
presente: rate hashes 1 dia; eventos 90 dias; envios finalizados 90 dias;
pending 30 dias; descadastrados/devolvidos/reclamações 365 dias. Filas ainda
pendentes/em falha são preservadas para revisão operacional. Consentimentos de
assinantes ativos duram enquanto necessários para a inscrição; saem com exclusão
do inscrito. Não registrar raw payload, token ou segredo em logs de aplicação.
Monitorar métricas reais no admin e logs de status da Edge Function/Resend.

## Ativação Resend (dependência externa)

1. Conectar o Resend no ChatGPT ou acessar https://resend.com/domains.
2. Adicionar preferencialmente `news.legendadigital.com.br` e copiar os registros
   DNS fornecidos pelo Resend para a Hostinger. Não inventar valores DKIM/SPF,
   alterar nameservers ou substituir MX/A do portal/software.
3. Verificar o domínio e manter open/click tracking desativados. Configurar DMARC
   com a política aprovada para o domínio de envio.
4. Criar chave restrita a envio e ao domínio. Não colar credenciais neste chat
   ou configurar variáveis `VITE_`. Inserir nos secrets do projeto do portal:
   https://supabase.com/dashboard/project/yltnjgngkomelfltdyky/functions/secrets.

| Secret server-side | Valor |
| --- | --- |
| RESEND_API_KEY | Chave privada de envio do Resend |
| LD_BRIEF_FROM | `Legenda Digital — LD Brief <brief@news.legendadigital.com.br>` após verificar domínio |
| NEWSLETTER_TOKEN_SECRET | Segredo aleatório de pelo menos 32 bytes, sem reutilizar em outros produtos |
| RESEND_WEBHOOK_SECRET | Segredo assinado do webhook configurado no Resend |
| LD_BRIEF_SENDING_ENABLED | `true` somente depois de verificar domínio/remetente |

SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são fornecidos pelo runtime do Supabase;
não copiar para frontend. Na ausência de NEWSLETTER_TOKEN_SECRET, usa-se a chave
privilegiada do runtime como chave HMAC; configurar a chave dedicada **antes de
coletar inscrições**. Rotação de chave invalida capabilities antigas; planejar
reconfirmação/links novos e não invalidar silently uma lista ativa.

Webhook:
`https://yltnjgngkomelfltdyky.supabase.co/functions/v1/ld-brief?action=webhook`.
Ativar sent/delivered/delivery_delayed/bounced/complained/failed. Opened/clicked
somente se tracking tiver sido aprovado futuramente. Verificação não depende de JWT.

5. Validar status (`GET .../functions/v1/ld-brief`), depois fazer inscrição com um
   e-mail de teste controlado/autorizado, receber confirmação, confirmar, enviar
   uma edição revisada para essa conta e cancelar. Conferir ledger, webhook e
   bloqueio do envio seguinte. Não enviar uma campanha aos contatos reais no smoke.
6. Só então considerar o **envio real validado**. Presença de secrets/flag não
   comprova DNS, assinatura DKIM, entrega ou webhook. A v1 não inventa essa conclusão.

## Validação, deploy e rollback

Testes usam PostgreSQL local/PGlite e provider HTTP fake: consentimento/replay,
tokens expirados, RLS, não confirmação por admin, isolamento do arquivo, JWT,
origin, webhook assinado, XSS, idempotência, suppression e lease. Playwright
valida signup, confirmação explícita, preferências e recuperação em 390/1440 px
com axe. CI mantém QA editorial, build, audit e verificações de deploy.
Smoke de produção é read-only/inputs inválidos, sem usuário fictício ou e-mail
real enviado. PR registra snapshot antes/depois, versão hosted, CI e release.

Ordem: migration → Edge Function (envio inicialmente desativado) → merge/Hostinger
→ health/smoke. Não usar db push cego; timestamps de migrations hosted anteriores
diferem dos locais, conforme os runbooks da plataforma.

Rollback operacional: secret LD_BRIEF_SENDING_ENABLED=false bloqueia novas
confirmações/envios; mantém cancelamento e preferências. Publicar versão anterior
do Edge por seu commit se necessário. Rollback de UI por revert em branch/PR,
CI/redeploy Hostinger; manter migration/ledger/suppression. O formulário anterior
que inseria diretamente é incompatível com as permissões seguras novas: em rollback,
manter componente da inscrição da v1 ou temporariamente indisponibilizar o formulário.
Nunca restaurar confirmação manual/grants públicos para contornar erro de envio.

Próximo milestone independente: Community Core. Não iniciar dezenas de newsletters,
envios automáticos, enriquecimento comercial ou Intelligence Center neste PR.

Referências primárias consultadas em 13/10/2026:

- https://supabase.com/docs/guides/functions/examples/send-emails
- https://supabase.com/docs/guides/functions/secrets
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/webhooks/verify-webhooks-requests
- https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/changelog/idempotency-keys
- https://docs.svix.com/receiving/verifying-payloads/how

Changelog Supabase: remoção de quatro cifras CBC TLS 1.2 em novembro não exige
mudança neste cliente/runtime moderno; demais SDKs não usados neste portal.
