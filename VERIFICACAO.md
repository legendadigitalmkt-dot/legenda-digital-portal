# Estado da entrega — Legenda Digital

Prompt usado: versão mais recente `Texto colado(10).txt`, com Growth OS apenas como vitrine comercial.

## Concluído

- 31 rotas pré-renderizadas em React/TypeScript/Vite.
- Home extensa com identidade clara, imagem, cards e seções do ecossistema.
- Conteúdo, artigos, guias, notícias, cases, newsletter, comunidade, ferramentas, Building, Growth OS, Sobre, Contato, Busca e páginas legais.
- Nove textos iniciais próprios; notícias e cases começam sem registros fictícios.
- Quatro ferramentas funcionais: CLARO, checklist, calculadora de conversão e planner com exportação CSV.
- CMS administrativo com roles editor/admin/super_admin, publicação/revisão/arquivo, mídia, formulários, CSV e analytics reais.
- Supabase exclusivo do portal: `Legenda Digital Portal`, ref `yltnjgngkomelfltdyky`, saudável em São Paulo. Foundation aplicada, 12 tabelas com RLS e cinco buckets criados. Conta própria do titular confirmada e vinculada a `site_staff` como `super_admin`.
- Dados migrados com igualdade de todas as linhas e colunas: 9 conteúdos, 1 autor, 8 categorias, 16 tags, 1 configuração e 20 eventos. A origem foi preservada e permaneceu igual na conferência após a troca.
- Repositório privado `legendadigitalmkt-dot/legenda-digital-portal` criado, integração de leitura/escrita salva, 53 arquivos enviados e hashes conferidos. CI do GitHub aprovado.
- Formulários testados com dados sintéticos: newsletter, comunidade e contato persistiram uma linha cada. Anon não viu as linhas, conforme teste de RLS. Os três registros foram removidos.
- TypeScript e build de 31 rotas concluídos; nove testes de aplicação e migração passaram. O verificador de separação passou com o banco e o repositório exclusivos.
- Verificação anônima: nove posts públicos; zero dados privados de newsletter, comunidade, contato ou equipe visíveis; escrita editorial e criação de admin bloqueadas.
- Permissões do CMS verificadas em contexto SQL autenticado: titular pode ler conteúdo e analytics privados e editar configuração/conteúdo; identidade sem vínculo de equipe continua bloqueada. As edições de teste foram revertidas por rollback e o cliente anônimo foi conferido novamente. Nenhuma senha foi solicitada ou manipulada pelo agente.
- Sem vulnerabilidades altas/críticas nos pacotes finais da aplicação.
- Imagens hero e colaboração em WebP, aproximadamente 210 KB no total; fonte Inter hospedada localmente.
- SEO por rota, canonical, OpenGraph, Twitter Card, Article, Organization e breadcrumbs; sitemap dinâmico no PHP.
- Publicação na Hostinger atualizada em 08/10/2026: https://legendadigital.com.br/. Bundle e configuração PHP usam o novo projeto; cache do domínio limpo. Uma leitura de artigo no domínio real registrou dois eventos somente no banco do portal, confirmando a conexão publicada.
- Página inicial e artigo verificados no domínio público, sem imagens quebradas observadas na home. A calculadora retornou 12% para 12 ações em 100 visitas. O CMS exibiu a tela de acesso restrito à equipe.
- Página padrão e pacote de instalação preservados fora de public_html.

## Pendências reais

- O titular deve entrar em https://legendadigital.com.br/admin com a senha que definiu. A conta confirmada e as permissões já foram verificadas no banco; o login interativo no navegador do titular ainda não foi observado. O navegador na nuvem não abriu para o titular, que realizou a criação de conta em seu próprio navegador.
- O advisor de segurança passou a registrar proteção contra senhas vazadas desativada após a criação da conta. Esse recurso adicional aparece no painel como disponível no plano Pro; o projeto permanece Free. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- A home foi conferida visualmente no navegador em produção. A verificação das cinco larguras solicitadas (360, 390, 768, 1024 e 1440 px) continua pendente; não foi feita emulação de viewport nesta publicação.
- O envio de edições do LD Brief depende da configuração de um serviço de e-mail; nesta entrega, coleta e administração dos inscritos são reais.
- A comunidade inicia pela lista de interesse. Eventos serão apresentados quando registros reais forem publicados.
- Growth OS permanece em desenvolvimento. Não há preço ou checkout ativo.

## Conteúdo do pacote

- `site-hostinger.zip`: somente os arquivos de produção para public_html.
- Código-fonte: repositório privado `legendadigitalmkt-dot/legenda-digital-portal`, sem env ou credenciais privadas.
- `README.md`: arquitetura, instalação, ambiente, CMS e publicação.
- `VERIFICACAO.md`: este registro de validação.

Não extraia codigo-fonte.zip dentro do public_html. Publique somente site-hostinger.zip, preservando um backup do site anterior e sem alterar app.legendadigital.com.br.
