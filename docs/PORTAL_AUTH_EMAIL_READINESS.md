# Auth e email — configuração de confirmação do Portal

Escopo exclusivo: `legenda-digital-portal`, Supabase `yltnjgngkomelfltdyky`, `legendadigital.com.br`. Nenhum ajuste no Growth OS, nenhuma conta alterada/criada e nenhum email enviado.

## Auditoria de 13/10/2026

O acesso ao painel Supabase foi retomado pelo GitHub e confirmado no projeto **Legenda Digital Portal**. Site URL já era `https://legendadigital.com.br`, mas a allowlist continha somente `/admin`: o signup dos comentários pedia retorno a `/conteudos/[slug]` sem que a rota fosse permitida. O formulário de conta não especificava retorno, então usava a home.

Configuração salva no painel, verificada depois de reload:

- `https://legendadigital.com.br/admin` preservado;
- `https://legendadigital.com.br/conta` adicionado;
- `https://legendadigital.com.br/conteudos/*` adicionado: wildcard limitado a um segmento de artigo no domínio exato do Portal; sem subdomínios, app ou localhost.

O código passa a enviar `emailRedirectTo=https://legendadigital.com.br/conta` no signup da conta. Exige disponibilidade de cadastro e aceite de termos/privacidade, além de evitar submissões concorrentes. O signup dos comentários mantém seu retorno específico ao artigo, agora autorizado. Contas existentes continuam entrando normalmente.

O painel confirmou: signup público desativado; confirmação de email ativa; sign-ins anônimos e linking manual desativados; SMTP próprio desativado. Nada disso foi enfraquecido para simular ativação. O SMTP padrão do Supabase não é destinado à operação pública e restringe destinatários à equipe: [documentação oficial](https://supabase.com/docs/guides/auth/auth-smtp).

## LD Brief

Foram provisionados apenas os parâmetros **não confidenciais**:

| Nome | Valor |
|---|---|
| LD_BRIEF_SENDING_ENABLED | false |
| LD_BRIEF_FROM | Legenda Digital — LD Brief &lt;brief@news.legendadigital.com.br&gt; |

Os nomes foram confirmados no painel. Não foram criadas/copidas chaves API, segredos HMAC, credenciais SMTP ou tokens. Permanecem pendentes `RESEND_API_KEY`, `NEWSLETTER_TOKEN_SECRET` e `RESEND_WEBHOOK_SECRET`. Manter envio e webhook desativados até configuração e teste real.

Resend: domínio `news.legendadigital.com.br`, ID `6ac903af-d00c-4b07-95c0-c603e9d4b91d`, estado `not_started`, open/click tracking desativados. Nova consulta ao provider confirmou os valores DNS; registros públicos estão versionados em `ops/email/ld-brief-dns.json`. Não há secrets nesse arquivo: o DKIM contém uma chave **pública**.

Consulta pública Google DNS, em 13/10: TXT DKIM, MX/SPF, TXT/SPF e CNAME de envio retornaram NXDOMAIN (status 3), sem registros. DMARC de `news` também ausente. Nameservers do apex: apollo.dns-parking.com e athena.dns-parking.com. Nenhuma alteração de DNS, nameservers, MX do apex ou infraestrutura do software foi feita.

A integração disponível para Hostinger é **Hostinger Mail**, que não gerencia DNS. O sign-in da Hostinger no navegador na nuvem tem restrição já observada; não foi repetido nem contornado. Isso continua bloqueando a publicação dos registros pela sessão atual. A análise dos registros esperados continua disponível, sem tratar login como autorização ausente.

## Verificação reproduzível

`node --use-env-proxy scripts/email/readiness.mjs`

Faz apenas GETs públicos a DNS, status do LD Brief e settings de Auth com a chave publishable local. Não envia emails, cria usuários, confirma inscritos ou insere analytics. Não imprime keys, tokens, metadata privada ou respostas brutas dos providers. Com `--require-ready`, retorna exit 1 enquanto DNS, signup, confirmação obrigatória e status do runtime não estiverem prontos. É um relatório de configuração: mesmo `gates_green=true` mantém `delivery_verified=false` até o teste operacional.

Testes verificam: TXT dividido em múltiplas strings, nome DNS exato, prioridade MX, falha NXDOMAIN, flags parciais, confirmação desativada e não exposição de keys no relatório. Playwright usa signup fictício **local** para verificar consentimento, retorno `/conta` e aviso de confirmação sem declarar email entregue.

Antes do PR: build verde; 70 testes Node/PostgreSQL verdes; dois testes de navegador direcionados (cadastro consentido com retorno correto e login/salvamento de histórico existente) verdes. A CI executa novamente toda a suíte, incluindo 54 casos no navegador e 44 amostras de QA. Não criar contas nem enviar mensagens reais para fazer a contagem de testes passar.

Evidências: `artifacts/auth-readiness/supabase-redirects.jpg`, `supabase-email-config.jpg`, `readiness.json`. Os screenshots mostram a configuração do projeto e parâmetros não confidenciais, sem valores de credenciais. Não representam prova de recebimento de email. Cópia declarativa das configurações em `ops/auth/portal-auth-config.json`; aplicação hosted foi feita pelo painel, não por migration SQL.

## Gate e resultado

**PARCIAL.** Retornos de Auth configurados e implementação correspondente pronta. Liberação de novas contas, templates SMTP próprios, confirmação real de leitor e envio real do LD Brief continuam pendentes de DNS/provisionamento privado/teste autorizado. Não iniciar analytics unificado, intelligence, community ou expansão por causa deste preparo.

Antes de habilitar signup/envio: domínio verificado no provider; SMTP privado e remetente verificado; segredos da Edge Function provisionados; webhook assinado validado; limites de envio revisados; teste com email controlado/autorizado de cadastro → confirmação → login → comentário → newsletter → recebimento → descadastro → bloqueio de reenvio. O envio não fica pronto apenas por instalar o plugin ou ativar uma flag.

Referência SMTP do Resend: host `smtp.resend.com`, porta 465, usuário `resend`, senha é uma API key privada; configurar só depois de domínio verificado. Fonte: https://resend.com/docs/send-with-supabase-smtp. Não existe credencial nessa referência.

## Deploy, migrations e rollback

Branch `fix/portal-auth-confirmation`, PR com CI antes do merge, publicação via GitHub/main → Hostinger; release `portal-auth-confirmation-v1`. Sem migrations, novas tabelas, alterações de RLS ou dependências.

Rollback de código: revert/CI/redeploy. Configuração hosted: a allowlist continua segura e compatível com clientes anteriores; se necessário removê-la, remover somente `/conta` e `/conteudos/*`, preservando `/admin` e Site URL. Manter `LD_BRIEF_SENDING_ENABLED=false` e confirmação obrigatória. Não remover registros, dados, usuários ou proteção de acesso para contornar DNS/SMTP.
