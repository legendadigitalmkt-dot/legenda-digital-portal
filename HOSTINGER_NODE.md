# Portal — GitHub → Hostinger Web app Node.js

Decisão do titular em 11/10/2026: usar a opção **Web app Node.js** em vez da conexão SSH preparada anteriormente. Fonte: `legendadigitalmkt-dot/legenda-digital-portal`, branch `main`. O software permanece em repositório, banco e domínio próprios.

## Configuração compatível

| Campo | Valor |
| --- | --- |
| Repositório | `legendadigitalmkt-dot/legenda-digital-portal` (privado) |
| Branch | `main` |
| Framework/runtime | **Other / Outro — aplicação com backend Node** |
| Node.js | `24.x` |
| Comando de build | `npm run build` |
| Pasta de saída | `dist` |
| Arquivo de entrada na saída | `server.js` |
| Comando de início, quando solicitado | `npm start` |
| `VITE_SUPABASE_URL` no build | `https://yltnjgngkomelfltdyky.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` no build | Chave **publishable** existente do banco do portal, prefixo `sb_publishable_`. |

Esta tabela registra os valores de configuração da aplicação; ela não comprova criação da app ou conexão da Hostinger. A Hostinger detecta React/Vite no projeto, mas o portal agora requer executar o backend Node; um deploy puramente estático não substitui os artigos/sitemap dinâmicos. A entrada `server.js` é relativa à saída `dist`; se uma tela pedir caminho relativo ao projeto inteiro, corresponde a `dist/server.js`. `npm start` funciona tanto na raiz da fonte quanto dentro da saída, com package.json próprio.

A integração precisa ter acesso apenas ao repositório do portal. Não tornar o repositório público para contornar autenticação. Não usar o repositório `ld` nem a chave do Supabase do software. Não usar chaves privilegiadas: o build recusa outros backends, chaves ausentes ou formatos não publishable.

## Adaptação do runtime

`npm run build` gera o frontend e as 31 rotas com SEO, empacota servidor + renderizador React + sanitizador em um `dist/server.js` independente de node_modules no runtime, escreve a configuração pública e remove todos os controladores/configurações PHP da saída Node. `npm start` atende em `0.0.0.0`, usando `PORT` fornecida pela plataforma ou 3000. Não fixar outra porta arbitrária.

Artigos são consultados em tempo real na Data API pública, com filtros de publicação/status/slug e chave publishable, sem encaminhar cookies ou Authorization do visitante. SSR produz a página React inteira e metadados atualizados. O HTML do CMS passa por allowlist de sanitização antes de renderizar. Rascunhos, arquivados e datas futuras retornam 404 mesmo se o upstream trouxer dados inadequados. Falha do upstream retorna 503 sem revelar snapshots estáticos de artigos removidos.

`/sitemap.xml` consulta posts publicados e pagina em lotes de 1000, limitado a 20 páginas e prazo total de 6 segundos. Não usa artigos seed desatualizados no sitemap; exclui admin, busca e 404. Falhas retornam 503. HTML tem no-cache; admin tem private/no-store + noindex; assets com hash têm cache imutável. Cookies e Auth do CMS continuam exclusivamente no cliente Supabase/RLS existente. O servidor não aceita operações de escrita.

Arquivos de configuração, código do servidor, fontes, PHP e caminhos fora do diretório público são bloqueados. URLs de artigo com `/index.html` não escapam da checagem de publicação. `/api/health` identifica a release `portal-node-v1`; é prova de liveness do runtime, não de leitura do banco.

## CI e verificação

O CI usa uma publishable key sintética **somente no build descartável de teste**. Nenhum deploy leva esse valor; a Hostinger exige a chave real de build. Há testes HTTP locais com API simulada para SSR, SEO, sanitização, status de publicação, sitemap paginado, isolamento de backend, bloqueio de arquivos/symlinks, HEAD e 405. Os testes anteriores de formulário/admin/backend continuam.

Antes de trocar a publicação do domínio, o aceite exige uma URL real da app Node com health correto, leitura de artigo e sitemap do CMS, logo/favicon, formulários e login administrativo. Não remover o site PHP atual, não mexer em DNS e não alterar o banco para produzir uma prova. A integração/URL de preview ainda não foi observada nesta execução; o acesso ao painel Hostinger pelo navegador na nuvem permanece restrito. Logo e favicon não devem ser declarados publicados apenas por CI/merge.

## Rollback e compatibilidade

Manter a publicação PHP existente recuperável até validar a app Node. Rollback da fonte por PR de revert e rebuild; rollback de hospedagem deve restaurar a publicação anterior sem apagar CMS, Auth, uploads ou dados do software. O código PHP anterior continua versionado. `npm run build:php` e `npm run test:php` geram/validam o pacote anterior; o workflow SSH usa esses comandos e permanece desativado pela variável `PORTAL_DEPLOY_ENABLED`. Não ativá-lo para a aplicação Node gerenciada: alterações de arquivos por SSH nessa app não são uma publicação durável.

Dependências novas: `sanitize-html@2.18.0` para HTML do CMS e `esbuild@0.28.2` no build do servidor, fixadas no lockfile. Sem migrations, alterações de roles/RLS/Auth, novos providers ou dados de demonstração em produção.

Referências oficiais: [Web app Node.js na Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [chaves e RLS no Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [sanitização HTML](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html).
