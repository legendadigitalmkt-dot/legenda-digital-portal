# Separação do portal e do Growth OS

> Registro histórico de 08/10. Estado vigente: [PRODUCT_BOUNDARIES.md](docs/PRODUCT_BOUNDARIES.md) e [auditoria de 14/10](PORTAL_GROWTHOS_SEPARATION_AUDIT.md). Não reaplicar importador nem interpretar publicação PHP histórica como pipeline atual.

Status em 08/10/2026: o portal está publicado na Hostinger usando o Supabase exclusivo `yltnjgngkomelfltdyky`, chamado `Legenda Digital Portal`. A foundation e a importação foram aplicadas e conferidas. O repositório privado `legendadigitalmkt-dot/legenda-digital-portal` contém os 53 arquivos de fonte, com integridade conferida e CI aprovado. A inclusão dele no ChatGPT Codex Connector foi autorizada pelo titular, salva e validada. O software mantém `legendadigitalmkt-dot/ld` e `cknlzuinwcdupdxilzcf`. O titular criou e confirmou sua conta própria do CMS, que foi vinculada a `site_staff` como `super_admin`. As permissões foram verificadas no banco; o login interativo no navegador do titular ainda não foi observado.

| Recurso | Portal | Software |
| --- | --- | --- |
| Domínio | `legendadigital.com.br` | `app.legendadigital.com.br` |
| Código | Fonte do portal, lockfile, assets, testes e migrations neste repositório exclusivo | `legendadigitalmkt-dot/ld` |
| Novo repositório | `legendadigitalmkt-dot/legenda-digital-portal` — privado, integração autorizada | Manter o repositório atual |
| Supabase | `Legenda Digital Portal`, ref `yltnjgngkomelfltdyky` — saudável, região São Paulo | `LD Growth OS Dev`, ref `cknlzuinwcdupdxilzcf` |
| Organização do novo banco | `legendadigitalmkt-dot's Org`, id `ypjngyqoqptxkkwqehvt` — escolha confirmada | Manter a organização atual |
| Publicação | `public_html` do domínio principal | Manter a publicação do subdomínio |

## Preparação já implementada

- Código do portal em um Git local próprio, sem arquivos do Growth OS.
- Migrations de tabelas, RLS e buckets do portal.
- Configuração local independente do Supabase, sem cadastro público de administradores.
- Sessão do CMS usa a URL do projeto no nome de armazenamento; tokens antigos não serão reutilizados quando o backend mudar.
- `prepare-migration.mjs` valida o export e prepara SQL transacional para um destino novo. O script não se conecta nem altera bancos.
- `verify-separation.mjs` acusa o banco compartilhado ou um remoto Git incorreto.

O snapshot operacional fica em `.migration-data/`, ignorado pelo Git. Nunca enviar esse diretório, `.env`, senhas, tokens, JWTs de sessão ou arquivos de runtime para o repositório. O pacote de código desta etapa não contém o snapshot.

## Recursos exclusivos criados

1. O repositório privado `legenda-digital-portal` foi criado na conta `legendadigitalmkt-dot` e conectado como `origin` do projeto local. A inclusão dele na instalação ChatGPT Codex Connector foi salva após autorização do titular, mantendo a lista limitada a `ld` e `legenda-digital-portal`. O acesso de leitura e escrita ao repositório novo foi confirmado. A branch de produção do portal é `main`.
2. O titular criou `Legenda Digital Portal` na organização confirmada, plano Free, região São Paulo (`sa-east-1`). Sua senha de banco foi definida pelo titular. Nenhuma credencial do software foi reutilizada.
3. O projeto `yltnjgngkomelfltdyky` foi confirmado como `ACTIVE_HEALTHY`. O portal usa a URL e a chave publishable próprias dele. A configuração PHP publicada e o bundle da home foram conferidos. O teste de navegação no domínio real produziu dois eventos somente no banco novo.

## Procedimento de migração aplicado

A importação única descrita abaixo já foi executada no destino. Não reaplicar o importador sobre o banco em produção: ele recusa tabelas já ocupadas. Estes comandos ficam registrados para auditoria e para um destino novo de recuperação.

Aplicar a migration `public_site_foundation` no novo projeto. Para importar os dados reais, **não executar `supabase/seed.sql` primeiro**: ele é destinado à demonstração/local. O importador recusa sobrescrever um banco com conteúdo existente.

Exportar novamente as onze tabelas do portal na origem imediatamente antes da troca, mantendo os IDs e timestamps: `authors`, `content_categories`, `content_tags`, `content_posts`, `site_settings`, `newsletter_subscribers`, `community_interests`, `contact_messages`, `community_events`, `site_tools` e `analytics_events`.

O formato do export é `{format_version: 1, source_project_ref, table_counts, tables}`. Cada tabela deve conter todas as colunas reais de suas linhas. O importador verifica contagens, identificadores, duplicatas e referências de autor/categoria.

```
node scripts/prepare-migration.mjs --check
node scripts/prepare-migration.mjs --target-project-ref REF_REAL_DO_PORTAL --output .migration-data/import.sql
```

Executar o SQL gerado como `postgres` exclusivamente no novo projeto. Ele exige que só existam tabelas do portal no esquema `public`, bloqueia tabelas ocupadas, preserva IDs/FKs e ajusta a sequência dos eventos. As categorias e o autor iniciais recebem os IDs do export. A validação de contagens ocorre antes do commit. O arquivo é uma operação única para um destino novo; não serve para sincronização recorrente.

`auth.users`, senhas, identidades, sessões e `site_staff` não fazem parte do export. Provisionar a conta administrativa própria do portal, confirmá-la e vincular seu novo UUID à função apropriada em `site_staff`. Não conceder funções pelo frontend nem pelo `user_metadata`. O usuário deverá fazer login novamente no CMS.

Os cinco buckets são recriados pela foundation. Na conferência anterior, os buckets do portal não tinham objetos; as imagens do site estão no pacote da Hostinger. Verificar novamente antes da troca. Se surgirem arquivos, copiá-los pela API de Storage e atualizar as referências antes da publicação. O importador recusa referências de Storage do projeto antigo.

## Validar e publicar

Configurar no novo Supabase hospedado o Site URL `https://legendadigital.com.br` e os redirects estritamente necessários para `/admin`. Desativar cadastro público e login anônimo. As configurações locais não substituem essa etapa no painel.

Atualizar a `.env` local com URL e chave **publishable do novo projeto**, mantendo o domínio canônico. Validar:

```
node scripts/verify-separation.mjs
npm run build
npm test
node scripts/verify-backend.mjs
```

Conferir também o acesso do administrador, as permissões editor/admin, os buckets e os advisors de segurança do novo banco. O teste de backend usa a chave pública para verificar leitura editorial e recusa de acessos/escritas privados.

Fazer backup recuperável da publicação atual. Enviar somente `dist/` ao `public_html` de `legendadigital.com.br`, preservando `.htaccess` e os controladores PHP. Limpar o cache da Hostinger e conferir home, artigo, ferramenta, formulários, admin e sitemap no domínio real.

Confirmar que os bundles e o runtime PHP publicados usam o novo ref. Conferir também que `app.legendadigital.com.br` continua usando sua infraestrutura atual. Manter as tabelas de origem durante a validação e revisar entradas recebidas no banco antigo durante a janela da troca; importar registros faltantes com reconciliação de IDs/e-mails e sem sobrescrever os registros novos. Eventos precisam de reconciliação porque as duas sequências podem ter avançado durante essa janela.

Se houver falha, restaurar o pacote anterior da Hostinger e a configuração pública anterior. A origem permanece disponível para reversão. Nenhuma exclusão do projeto, do Auth ou de dados do Growth OS faz parte desta mudança.

## Estado de validação da separação

Export conferido e importado: 9 conteúdos, 1 autor, 8 categorias, 16 tags, 1 configuração e 20 eventos de analytics. Inscritos, interesses, mensagens, eventos de comunidade e recursos estavam vazios. A igualdade de todas as linhas e colunas foi verificada após a importação, incluindo IDs e datas. SHA256 do export operacional: `a01606292aec74a340f24aced141e0ec65e6f3be99d4552367101a34567b763c`. A origem continuou idêntica na conferência após a troca; nenhuma reconciliação adicional foi necessária nessa janela. Clientes com páginas antigas em cache ainda devem ser considerados em futuras conferências da origem.

O novo banco possui 12 tabelas públicas com RLS e cinco buckets, sendo `private-admin` privado. O advisor de segurança não apresentou lints. O advisor de desempenho apontou duas FKs sem índice, índices ainda não usados e políticas permissivas sobrepostas; são observações registradas, sem alteração das regras de acesso nesta migração. Leituras privadas e escritas editoriais/admin anônimas foram recusadas. Newsletter, comunidade e contato persistiram os testes sintéticos; somente os três registros de teste foram removidos.

TypeScript e build de 31 rotas concluídos; 9 testes aprovados, incluindo validação do export, recusa do banco do software, referências quebradas, duplicatas e isolamento de conteúdo que contém sintaxe SQL. TOML válido. O verificador de separação passou com o novo ref e o remoto próprio. A Hostinger recebeu somente o pacote de produção em `public_html` do domínio principal; o cache foi limpo. Home, artigo e entrada protegida do CMS foram conferidos. A entrada do software respondeu em `/login`. Os arquivos, o repositório, o Auth e as tabelas do software não foram alterados pelo trabalho de separação.

O Auth hospedado usa Site URL `https://legendadigital.com.br` e redirect permitido `https://legendadigital.com.br/admin`. Cadastro público, login anônimo e vinculação manual estão desativados; confirmação de e-mail está ativa. O mínimo de senha foi configurado em 12 caracteres, com troca de senha protegida e exigência da senha atual. O titular criou a conta `legendadigitalmkt@gmail.com` em seu próprio navegador. A identidade foi conferida como confirmada e não anônima, e seu UUID próprio foi vinculado a `site_staff` como `super_admin`. Senhas e identidades do software não foram copiadas.

A verificação em contexto SQL `authenticated` com o UUID do titular confirmou leitura de sua função, dos nove conteúdos e dos analytics privados, além da permissão de edição de configurações e conteúdo. As edições de teste foram revertidas por rollback. Uma identidade sem vínculo de equipe não pôde ler equipe/analytics nem editar configurações/conteúdo. A verificação pelo cliente anônimo continuou sem acesso a dados privados, escrita editorial ou criação de administradores. Esses testes validam as políticas do banco, não substituem um login real com senha no navegador do titular.

Depois da criação da conta, o advisor registrou o aviso de proteção contra senhas vazadas desativada. O painel disponibiliza essa proteção adicional no plano Pro; o projeto permanece Free, sem alteração de plano. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
