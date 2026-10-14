# Legenda Digital Portal

Portal editorial, ferramentas, LD Brief, Building e audiência da Legenda Digital. Fonte oficial: `legendadigitalmkt-dot/legenda-digital-portal`; produção: `main`; domínio canônico: https://legendadigital.com.br (www atende o Portal).

**Este repositório não contém a aplicação Growth OS.** CRM comercial, workspaces, WhatsApp, cobrança e Control Center pertencem ao repositório `legendadigitalmkt-dot/ld`. A página `/produtos/growth-os` é uma apresentação comercial; destino atual: https://app.legendadigital.com.br/. Nenhum login, resultado privado ou inscrito é transferido automaticamente.

## Arquitetura e execução

- Vite, React 19 e TypeScript; preservar a implementação existente.
- Backend exclusivo: Supabase `yltnjgngkomelfltdyky`, **Legenda Digital Portal**, PostgreSQL 17, São Paulo.
- Node independente na Hostinger; artigos, coleções e sitemap consultam somente a API pública do Portal.
- Auth próprio; equipe autorizada por `site_staff` e RLS; `/admin` separado do Control Center SaaS.
- Edge Function `ld-brief` pertence somente ao projeto Portal; segredos de envio permanecem no servidor.

Node `>=22.12 <25` (CI e produção configurada: 24.x):

```bash
npm ci --ignore-scripts
# Preencher .env.production.local com os valores públicos próprios do Portal.
npm run check:boundaries
npm run build
npm test
npx playwright test
npm start
```

Referência não confidencial: `.env.example`. Nunca versionar `.env`, service role, tokens Meta, chaves de email ou sessões. `VITE_*` entra no frontend. O build Node exige o backend Portal e chave publishable; a checagem CI também recusa backend SaaS, importações entre produtos e variáveis privadas públicas. É uma proteção estática delimitada, não prova das configurações externas.

## Estado e gates

14 conteúdos reais publicados; CMS com uploads, blocos em destaque, banners e links manuais; comentários com moderação, denúncias e RLS; oito ferramentas com engine comum; conta/histórico e consentimento de analytics. Não criar dados sintéticos em produção para comprovar funcionamento.

LD Brief tem double opt-in, preferências, descadastro, Admin, edições, arquivo e provider implementado. **Envio real e cadastro público ainda desativados**: DNS de email, SMTP, provisionamento privado e teste de recebimento/cancelamento pendentes. Agendamento atual é planejamento de data com disparo manual; não há scheduler automático. Community está em formação. Portal V1 não está concluído.

`node --use-env-proxy scripts/email/readiness.mjs` consulta configuração pública sem enviar email nem criar usuários. Flags verdes não comprovam entrega.

## Deploy e segurança

Fluxo ativo: **GitHub/main → integração nativa Hostinger Node.js**; build `npm run build`, entrada `dist/server.js`, saída `dist`. CI antes do merge; smoke do domínio depois. Workflow SSH legado condicionado/desativado: sucesso não comprova publicação. Configuração em [HOSTINGER_NODE.md](HOSTINGER_NODE.md), estado atual em [PRODUCT_BOUNDARIES.md](docs/PRODUCT_BOUNDARIES.md).

Migrations versionadas em `supabase/migrations/`; não reaplicar imports/seed sobre produção. Todas as tabelas públicas Portal têm RLS. Nenhuma credencial privilegiada no frontend. Não usar migração histórica como sincronização com SaaS.

Rollback por PR de revert, CI e redeploy anterior; preservar banco, Auth, uploads e dados existentes. Não ativar deploy SSH para reverter a app Node.

## Documentação

- [Limites dos produtos e ambientes](docs/PRODUCT_BOUNDARIES.md)
- [Auditoria de separação — Fase 0](PORTAL_GROWTHOS_SEPARATION_AUDIT.md)
- [Fases e gates do Portal V1](docs/PORTAL_V1_EXECUTION.md)
- [Editorial e operação](docs/PORTAL_OPERATIONS_AUDIT_2026-10-13.md)
- [LD Brief](docs/LD_BRIEF_V1.md)
- [Auth e email](docs/PORTAL_AUTH_EMAIL_READINESS.md)

`SEPARACAO.md`, `VERIFICACAO.md`, `DEPLOYMENT.md` e seções antigas de implantação são históricos. Seus números e status não substituem a auditoria atual nem a CI do PR em revisão.
