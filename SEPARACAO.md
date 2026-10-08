# Separação do portal e do Growth OS

Status em 08/10/2026: o portal está publicado na Hostinger. O login pelo GitHub e o acesso ao painel Supabase foram concluídos. O repositório privado `legendadigitalmkt-dot/legenda-digital-portal` é exclusivo do portal. A inclusão dele no ChatGPT Codex Connector foi autorizada pelo titular, salva e validada. O novo Supabase ainda não foi criado. A produção ainda usa as tabelas do portal no projeto `cknlzuinwcdupdxilzcf`.

| Recurso | Portal | Software |
| --- | --- | --- |
| Domínio | `legendadigital.com.br` | `app.legendadigital.com.br` |
| Código | Fonte do portal, lockfile, assets, testes e migrations neste repositório exclusivo | `legendadigitalmkt-dot/ld` |
| Novo repositório | `legendadigitalmkt-dot/legenda-digital-portal` — privado, integração autorizada | Manter o repositório atual |
| Supabase | `Legenda Digital Portal` — a criar | `LD Growth OS Dev`, ref `cknlzuinwcdupdxilzcf` |
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

## Criar os recursos exclusivos

1. O repositório privado `legenda-digital-portal` foi criado na conta `legendadigitalmkt-dot` e conectado como `origin` do projeto local. A inclusão dele na instalação ChatGPT Codex Connector foi salva após autorização do titular, mantendo a lista limitada a `ld` e `legenda-digital-portal`. O acesso de leitura e escrita ao repositório novo foi confirmado. A branch de produção do portal é `main`.
2. Criar `Legenda Digital Portal` na organização confirmada. Conferir custo/plano antes da criação e selecionar São Paulo se disponível. Usar credenciais e chaves próprias do projeto. A senha nova de banco deve ser definida pelo titular em uma interface segura.
3. Confirmar que o novo banco está saudável e registrar seu ref real. Não reutilizar o ref nem as chaves do Growth OS.

## Migrar o banco

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

## Estado de validação desta etapa

Export conferido: 9 conteúdos, 1 autor, 8 categorias, 16 tags e 1 configuração. Inscritos, interesses, mensagens, eventos de comunidade e recursos estavam vazios. Eventos de analytics podem continuar chegando e devem ser exportados novamente na troca.

A importação e os testes do novo Supabase dependem de sua criação. O repositório remoto foi confirmado como privado e sua integração já permite leitura e escrita. A publicação do código usa blobs verificados por hash, commit na branch `main` e confirmação do novo estado remoto. Não há confirmação de banco novo ou troca da produção nesta etapa.

Validação local desta preparação: TypeScript e build de 31 rotas concluídos; 9 testes aprovados, incluindo validação do export, recusa do banco do software, referências quebradas, duplicatas e isolamento de conteúdo que contém sintaxe SQL. TOML válido. O verificador de separação inicialmente apontou banco compartilhado e ausência de remoto Git; o remoto agora aponta para o repositório exclusivo. O SQL gerado ainda precisa ser executado e validado no novo Supabase.

O formulário de criação do Supabase está preparado na organização correta, no plano Free, com nome `Legenda Digital Portal`, região `South America (São Paulo)` e Data API habilitada. A exposição automática de tabelas está desativada e a ativação automática de RLS está habilitada. Nenhuma senha nova do banco foi definida pelo agente. A definição da nova credencial e a criação precisam ser concluídas pelo titular em uma interface segura.
