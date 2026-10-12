# Portal Editorial Experience + CMS Admin v1

Escopo: `legendadigital.com.br`, repositório `legenda-digital-portal`, Supabase `yltnjgngkomelfltdyky`. Growth OS e seu banco não são alterados.

## Uso

- Artigos: `https://legendadigital.com.br/admin/articles`.
- Moderação: `https://legendadigital.com.br/admin/comments`.
- A equipe usa a autenticação existente do portal. Não há cadastro público de equipe.
- Novo artigo → título, slug, resumo → editor visual → capa e alt → salvar rascunho → enviar para revisão → aprovar → publicar ou agendar.
- A prévia usa o mesmo componente da página pública, com desktop/celular, foco confinado ao diálogo e Escape para fechar.
- Rascunhos/revisão salvam automaticamente após 2,5 segundos de inatividade quando título e slug são válidos. Alterações em artigo publicado exigem salvar explicitamente. Concorrência usa `version`; uma versão divergente não é sobrescrita silenciosamente.
- Últimas 20 versões disponíveis na interface. Restaurar cria um rascunho, preservando o histórico. Notas privadas ficam separadas do artigo público.
- Categorias, tags e autores têm telas próprias. Categoria e autoria publicamente exibidas usam suas relações atuais; novas categorias têm rotas públicas sem edição de código. Desativar categoria remove sua rota do índice.

## Modelo e permissões

Tabelas reutilizadas: `content_posts`, `content_categories`, `content_tags`, `authors`, `site_staff`, `analytics_events`. Novas: `editorial_notes`, `article_versions`, `comment_profiles`, `article_comments`, `comment_reports`, `comment_bans`, `comment_moderation_log`. Todas com RLS.

| Role | Artigos | Taxonomia/autores/mídia | Moderação | Publicação/dados privados |
|---|---|---|---|---|
| author | Criar e editar seus rascunhos/revisões; ler seu histórico | Upload em content-images dentro da própria pasta | Comentar como membro | Sem publicar |
| editor | Gerir produção e aprovação | Gerir | Comentar como membro | Sem publicar nem editar a versão publicada |
| moderator | Ler artigos públicos | Sem gerir | Gerir comentários, denúncias e suspensão | Sem publicar |
| admin / super_admin | Gerir | Gerir | Gerir | Publicar e acessar administração privada |

As regras são verificadas no banco, independentemente da interface. Papel vem de `site_staff`, não de metadados editáveis do usuário. Revogação retira acesso a notas e versões privadas. Nenhuma chave privilegiada no frontend; somente configuração publicável do portal.

## Editor

Tiptap 3.31.4/ProseMirror, carregado exclusivamente no bundle administrativo. Parágrafos, H2/H3, imagens, galeria com URLs/alts por linha, citações, destaques, tabelas, listas, código, divisores, recursos externos, diagramas/gráficos como imagens com alt/legenda, CTA, FAQ, fontes e relacionados. Blocos móveis por botões; desfazer/refazer disponíveis. Vídeos/embeds abrem externamente por escolha do leitor: não carregar iframe arbitrário ou pixel de terceiro. Os diagramas recebidos preservam a ampliação via details/summary e alternativa textual.

## Comentários

Conta confirmada do portal, nome público e texto simples; e-mail nunca aparece na conversa. Novos comentários e edições ficam pendentes. Até 3.000 caracteres, três links, 30 segundos entre envios, dez por hora; até cinco denúncias por hora. Edits por 24 horas; alterações marcadas. Pai/artigo/root/depth são calculados ou imutáveis no banco. Profundidade máxima técnica 30; indentação visual limitada a três níveis. Remoção é lógica e preserva filhos; restauração usa registro privado de moderação. Moderador pode aprovar, ocultar, marcar spam, remover/restaurar, fixar, destacar, encerrar respostas e suspender contas.

A fila mostra até 500 comentários e 200 denúncias abertas. A conversa carrega 100 registros por página, com carregar mais. E-mails de resposta, reações e notificações não fazem parte desta entrega. A entrega de confirmação de novos usuários pelo provedor de e-mail deve ser verificada com uma conta real pelo responsável; testes não disparam e-mails externos nem alteram credenciais existentes.

## Publicação programada

`private.publish_due_articles()` executada pelo pg_cron a cada minuto, job `ld-portal-publish-approved`. Somente artigos aprovados e com agenda vencida são publicados. Usuários anônimos/autenticados não podem executar a função diretamente. Verificar `cron.job` e `cron.job_run_details` para o estado real do agendador. O teste local executa a função de publicação em PostgreSQL/PGlite; a extensão pg_cron é validada no Supabase hospedado.

## Importação reproduzível

Fonte aprovada e hashes: `content/editorial/batch1-source/approved.html`, `batch1-manifest.json`, `batch1-assets.json`. ZIP citado na ordem não foi anexado; o HTML aprovado contém todos os textos e SVGs necessários. Correções exclusivamente operacionais têm antes/depois em `operational-corrections.json`. Claims, dados, tabelas, fontes e ressalvas são preservados.

```sh
python -m pip install -r scripts/editorial/requirements.txt
python scripts/editorial/extract.py
node scripts/editorial/images.mjs
node scripts/editorial/import.mjs --project-ref yltnjgngkomelfltdyky --stage review --output /tmp/editorial-review.sql
```

O comando gera SQL, não o executa. Executar somente no projeto dedicado, após migrações. Estado inicial review. Depois de QA, gerar com `--stage published`: a transação aprova antes de publicar. O importador não sobrescreve artigo diferente com o mesmo slug, não duplica registros e preserva data/version de importações repetidas. Categorias seguem a ordem HQ, inclusive artigo 02 em Growth & Negócios.

Assets originais SVG e variantes WebP 1200/720, com fallback PNG para hero/OG. Heros têm 1200 × 630; imagens no corpo usam srcset/sizes/lazy. Assets deste lote são versionados no repositório e servidos pela Hostinger/CDN; novos uploads pelo CMS usam o bucket existente content-images. Não se registra objeto fictício no Storage.

## SEO e analytics

URLs canônicas preservam `/conteudos/:slug`; `/artigos` e `/artigos/:slug` redirecionam permanentemente. HTML do artigo é SSR com Article/BreadcrumbList, canonical, OG/Twitter, título/descrição configuráveis e datas reais. Rascunhos, agendados futuros e arquivos não saem pela API pública; noindex não entra em sitemap/RSS. `/feed.xml` traz até 100 publicações recentes. Sitemap pagina publicações e inclui categorias ativas. Listagens carregam somente campos de cards; corpo é solicitado apenas para o artigo aberto. Dados iniciais públicos permitem leitura sem flash de 404 após iniciar JS.

Analytics depende de consentimento explícito. Eventos do contrato editorial: visualização, quartis de scroll, conclusão por scroll, índice, links internos/fontes, compartilhamento, início/envio/resposta/denúncia de comentário, CTA Brief e Growth. Metadata deriva do artigo publicado no banco; não contém e-mail, IP, user-agent ou identidade do visitante. Eventos são contagens, não usuários únicos; conclusão por scroll não comprova leitura. Admin mostra dados reais ou “sem dados”; não há números simulados. Consulta de analytics limitada a 5.000 eventos recentes.

## Validação e liberação

1. `npm ci --ignore-scripts`, `npm run build`, `npm test`.
2. `npx playwright install --with-deps chromium --only-shell`, `npx playwright test`.
3. `npm audit --audit-level=high`; testes Python de deploy e sintaxe shell/PHP.
4. CI da branch/PR aprovado; aplicar migrações aditivas e verificar advisors/roles/grants.
5. Importar review; verificar hashes e ausência pública dos cinco artigos.
6. Merge e deploy GitHub/Hostinger; conferir health `portal-editorial-v1`, assets, Admin noindex e nove publicações anteriores.
7. Publicar o lote aprovado, validar as cinco URLs, metadados, sitemap/RSS, categorias e mobile.

Auth/REST são interceptados nos testes de navegador com identidades fictícias; as regras correspondentes são exercitadas em PostgreSQL com roles reais. Isso não representa teste de entrega de e-mail, login real de um cliente ou envio de newsletter. A hospedagem SSH legada permanece bloqueada; deploy real exige evidência HTTP da Hostinger, não apenas workflow verde.

## Rollback

Preservar banco, RLS, históricos e dados. Não remover tabelas, usuários ou comentários para voltar uma interface.

- Interromper o job específico com `select cron.unschedule('ld-portal-publish-approved');` se o problema for programação.
- Despublicar apenas o lote novo, por arquivo lógico, usando slugs do manifest. Não afetar os nove artigos anteriores.
- Reverter o commit do portal pelo GitHub para a versão anterior `15479cdb762a86d0f1cf0ff263094f8f36d56cdb`; o deploy GitHub/Hostinger repõe o runtime anterior. Confirmar health e leitura dos nove artigos.
- O CMS antigo não entende o novo workflow: mantê-lo sem produção editorial até corrigir/reimplantar a nova interface. Não enfraquecer as regras de publicação para fazê-lo funcionar.
- Caso necessário, restaurar o commit editorial corrigido e reaprovar o lote pelo fluxo normal. Os assets e fontes permanecem recuperáveis no Git e o histórico no banco.

A migration inicial remota (`20261008162058`) e o arquivo inicial do repo (`20261008061250`) têm timestamps distintos. Não reexecutar a fundação; registrar as novas versões remotas antes de qualquer futuro db push.
