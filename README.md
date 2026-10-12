# Legenda Digital — site oficial

Portal editorial da LD Serviços e Soluções Digitais Ltda. Domínio de produção: https://legendadigital.com.br.

## Escopo e arquitetura

O site apresenta a marca, conteúdos, guias, notícias, comunidade, newsletter, ferramentas gratuitas, Building e a página comercial do Growth OS. O aplicativo Growth OS é um projeto separado. Não há CRM, checkout, cobrança ou envio de newsletter dentro deste projeto.

React + TypeScript + Vite, Tailwind CSS, componentes UI no padrão shadcn, Lucide, React Hook Form e Zod. O CMS e os formulários usam Supabase PostgreSQL, Auth e Storage. A Hostinger serve os arquivos estáticos e um pequeno controlador PHP que mantém artigos e sitemap atualizados a partir do CMS. A interface administrativa tem um bundle separado.

## Desenvolvimento

Requer Node.js 22.13+ e npm. Copie `.env.example` para `.env`, preencha as variáveis públicas do seu projeto Supabase e execute:

```
npm ci
npm run dev
```

A chave deve ser **publishable**. Nunca use `service_role`, `sb_secret_`, senhas ou tokens privados no frontend. `.env` e `dist/` são ignorados no Git.

## Build e validação

```
npm run build
npm test
node scripts/verify-backend.mjs
npm audit --audit-level=high
```

O build produz `dist/` e pré-renderiza 31 rotas para entregar conteúdo e SEO sem depender da execução de JavaScript. Artigos publicados pelo CMS recebem HTML, metadados e schema atualizados pelo controlador PHP. `/sitemap.xml` consulta o CMS em produção. Páginas sem conteúdo têm estados vazios úteis. O admin é `noindex` e usa cache privado.

## Supabase

A migration em `supabase/migrations/` cria apenas tabelas do site: `site_staff`, `authors`, `content_categories`, `content_tags`, `content_posts`, `site_settings`, `newsletter_subscribers`, `community_interests`, `community_events`, `site_tools`, `contact_messages` e `analytics_events`. Não modifica as tabelas do Growth OS.

Todos os dados expostos têm RLS. Conteúdo publicado é público; rascunhos e alterações exigem equipe. A migration concede `super_admin` ao usuário confirmado da marca somente se ele já existir no Auth do projeto de destino. Em um projeto novo, o acesso administrativo precisa ser provisionado separadamente após a criação da conta confirmada. Roles disponíveis: `editor`, `admin` e `super_admin`; novos membros só podem ser cadastrados pela infraestrutura. Editors trabalham no conteúdo e na mídia; dados de contatos e inscritos exigem admin.

Inscrições começam como `pending`; o formulário não afirma que houve confirmação por e-mail. Newsletter: coleta de interesse e exportação CSV, com consentimento. O serviço de envio ainda precisa ser definido. Não há credenciais de Hotmart nem checkout ativo. O Growth OS está indicado como em desenvolvimento.

Buckets: `content-images`, `authors`, `community`, `site-assets` públicos para imagens; `private-admin` privado. Uploads administrativos: PNG, JPEG e WebP até 8 MB; PDF apenas no bucket privado.

Os formulários têm validação Zod e restrições no banco. A newsletter limita duplicatas por e-mail. Há honeypot no formulário; para campanhas com grande volume recomenda-se adicionar proteção antiabuso com credenciais próprias. Analytics só coleta evento + caminho, após consentimento; não registra IP, user-agent ou identificador pessoal nas tabelas internas.

O teste `verify-backend.mjs` confirma leitura pública de posts e bloqueio de dados privados, escrita editorial anônima, criação de admin, e-mails inválidos e contato sem consentimento. Os dados de teste válidos foram removidos após a verificação.

## CMS

O plano e os comandos para separar GitHub, Supabase e publicação estão em [SEPARACAO.md](SEPARACAO.md). A configuração `supabase/config.toml` define o ambiente local do portal; ela não altera automaticamente as configurações do Supabase hospedado.

Abra `/admin` e use uma conta autorizada em `site_staff`. O CMS permite criar, editar, revisar, publicar e arquivar artigos, guias, notícias, cases e Building; configurar SEO e tags; subir imagens; gerenciar formulários; exportar CSV; publicar eventos e recursos reais; editar a página do Growth OS e as configurações do site. O HTML é sanitizado antes de salvar e ao renderizar.

Não há cadastro público de equipe ou envio automático de e-mails. O código não modifica senhas nem contorna autenticação.

## Deploy Hostinger

1. Faça backup dos arquivos atuais de `public_html` e preserve a possibilidade de restauração.
2. Execute o build com as variáveis públicas corretas.
3. Envie **o conteúdo de `dist/`** para o `public_html` do domínio **legendadigital.com.br**. Não envie a pasta do projeto inteiro.
4. Preserve `.htaccess`, `index.php`, `sitemap.php` e `site-runtime.php`. O `.htaccess` bloqueia acesso web ao arquivo de configuração de runtime. O arquivo só contém URL e chave publishable, não credenciais privilegiadas.
5. PHP precisa de cURL e DOM/XML (padrão do plano Business). Ative HTTPS, limpe o cache da Hostinger e confirme rotas e assets.
6. Verifique home, artigo, ferramenta, contato, admin e sitemap. Não altere os arquivos de app.legendadigital.com.br.

`main` é a branch de produção. Use `feature/*` e `fix/*` para mudanças. Faça build e testes antes de enviar alterações. O repositório próprio no GitHub deve conter somente fonte, lockfile e migrations; nunca `.env`, `node_modules` ou secrets.

## Identidade e imagens

Branco como base; navy, royal, ciano, turquesa, violeta e acentos da marca. Tipografia Inter sob OFL, licença em `public/fonts/OFL.txt`. A logo horizontal oficial enviada pelo titular está em `public/images/legenda-digital-logo.png`; o favicon fornecido está em `public/favicon.ico`. Arquivos preservados sem redesenho. Cabeçalho, rodapé, CMS e artigos usam a logo horizontal; o rodapé oferece base branca para manter o contraste da assinatura navy. Metadados e favicon são incluídos nas 31 rotas pré-renderizadas.

Hero e fotografia de colaboração são imagens ilustrativas geradas para este site. A composição foi preservada, com versões WebP otimizadas para entrega. Fotografia de apoio: Vitaly Gariev / Unsplash (`https://unsplash.com/photos/woman-working-on-a-laptop-in-a-modern-office-WrlIRaC9t-A`). Não são fotos de uma equipe real da empresa nem depoimentos.

Nenhuma métrica, cliente, membro ou depoimento foi inventado. Os nove textos iniciais são conteúdo editorial próprio da Legenda Digital. Notícias e cases começam vazios.

## Limitações de verificação nesta entrega

Publicado na Hostinger em 08/10/2026: https://legendadigital.com.br/. A página inicial, um artigo, a calculadora de conversão e a entrada protegida do CMS foram verificados no domínio público. Build, TypeScript, pré-renderização e RLS passaram pelas verificações registradas em VERIFICACAO.md. A conferência das cinco larguras (360, 390, 768, 1024 e 1440 px) permanece pendente.

## Atualização da marca — 11/10/2026

Logo horizontal e favicon oficiais fornecidos pelo titular, preservados byte a byte. A atualização inclui o layout compartilhado, os artigos servidos por PHP e a logo dos metadados. O favicon contém os tamanhos 16, 32, 48 e 64 px; sua URL versionada evita reutilizar a referência antiga em cache.

Build/TypeScript, pré-renderização de 31 rotas e os 9 testes existentes passaram localmente. Não houve alteração de dependências, formulários, banco ou configuração de acesso. A publicação desta atualização permanece pendente: o login da Hostinger está restrito no navegador na nuvem e a integração encontrada é apenas de e-mail. O resultado de CI e merge é registrado no PR; não considerar a alteração publicada por estar no GitHub.

Rollback: reverter o PR da marca, reconstruir e republicar o pacote anterior. Base anterior: `addef7abffe8798d21f179a315c17df25f5e3b74`. Preservar `site-runtime.php`, `.htaccess`, dados do CMS e arquivos existentes ao publicar. O ícone SVG anterior continua disponível para compatibilidade.

