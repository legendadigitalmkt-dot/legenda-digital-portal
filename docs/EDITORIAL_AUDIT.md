# Portal editorial — auditoria de 12/10/2026

Escopo exclusivo: `legenda-digital-portal`, domínio `legendadigital.com.br`, Supabase `yltnjgngkomelfltdyky`. Nenhuma alteração no Growth OS.

| Área | Estado antes da mudança | Decisão |
|---|---|---|
| CMS e Auth | EXISTENTE: login de equipe, editor/admin/super_admin | Reaproveitar Auth; ampliar permissões |
| Artigos | PARCIAL: nove publicados, edição em HTML | Preservar registros; acrescentar editor visual e workflow |
| Categorias/tags/autores | PARCIAL: tabelas públicas, sem gestão dedicada | Acrescentar gestão e editorias solicitadas |
| Versões/agendamento | AUSENTE | Histórico privado; publicação programada no banco |
| Página de artigo | PARCIAL: SSR, título, corpo e relacionados simples | TOC, progresso, metadados, partilha e relacionados relevantes |
| SEO | PARCIAL: canonical, Article, sitemap | Breadcrumb, OG dedicado, RSS e exclusão de noindex |
| Comentários/moderação | AUSENTE | Contas do portal, fila de revisão, árvore e denúncias |
| Analytics | PARCIAL: 146 eventos consentidos, nove tipos | Eventos editoriais com metadata sem dados pessoais |
| Mídia | EXISTENTE: buckets com RLS e upload de equipe | Reaproveitar content-images; assets aprovados versionados no CDN do site |

## Proveniência editorial

A ordem de trabalho solicita publicação dos cinco artigos aprovados. O arquivo `LD_Editorial20_Batch1_Aprovado_Preview(1).html` identifica o lote como aprovado e o LD HQ como revisão editorial. A entrega HQ e o leitor `(2)` são cópias de revisão: os corpos 01, 02, 03 e 05 e todos os visuais são idênticos ao preview aprovado. No artigo 04, somente a anotação de aprovação final difere. Usa-se o preview aprovado como fonte; não se reescrevem claims nem referências.

O ZIP citado na ordem não foi anexado. A extração reproduzível do HTML aprovado produz fragments, imagens e manifest, com hashes e contagens de integridade. Somente anotações operacionais antigas de preview/revisão são atualizadas, com antes/depois em `content/editorial/operational-corrections.json`. Claims, dados, fontes e ressalvas permanecem iguais. Autoria e aprovação correntes são metadados separados. O LD HQ é revisão organizacional, sem inventar identidade humana.

## Limites e preservação

A migração inicial remota tem versão `20261008162058`; o arquivo inicial do repositório usa `20261008061250`. Não reaplicar a fundação. Todas as mudanças novas são aditivas/versionadas. Não apagar os nove artigos, leads ou analytics existentes. Notas internas e snapshots editoriais não ficam em colunas da tabela publicamente legível de artigos.
