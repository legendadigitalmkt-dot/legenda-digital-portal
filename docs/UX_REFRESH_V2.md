# Portal UX/UI + Growth OS Product Page v2

Ordem HQ: 12/10/2026. Somente portal `legendadigital.com.br`, repo `legenda-digital-portal`, Supabase `yltnjgngkomelfltdyky`. Base `19ee295b403a63105bbc517ae24f0ed507854193`. App Growth OS consultado somente para auditoria de capacidades, sem alterações.

## Auditoria anterior à implementação

| Área | Estado | Evidência e ação |
|---|---|---|
| Identidade, logo e favicon | EXISTENTE | Marca, assinatura e logo transparente preservadas. |
| Home / hero | PARCIAL | Conceito correto; labels 8–12px, cards flutuantes pequenos e ritmos diferentes. Normalizar escala e espaçamento. |
| Home / sobre | PARCIAL | Quatro cards muito estreitos e texto 12px. Grid com mais espaço e copy legível. |
| Cards / imagens | PRECISA REFAZER | `cover` e zoom indiscriminados, destaque com imagem atrás do texto, compacto com 100px de altura. Separar fotografia, ilustração e capa editorial; gerar variantes sem cortar informação. |
| Hub / categoria | PARCIAL | Pesquisa funcional, taxonomia real e formatos misturados. Separar temas, editorias, formatos e tags; filtros móveis acessíveis. |
| Artigo / leitura | PARCIAL | Corpo bom no desktop, reduzido a 16px no mobile; índice lateral à esquerda, ausência de banner, comentários fora da largura da leitura. Unificar grid 760px + sidebar e manter comentários na coluna. |
| CMS / comentários / SEO | EXISTENTE | Editor visual, workflow, RLS, moderação e SSR implementados. Preservar e cobrir por regressão. |
| Header / footer | PARCIAL | Navegação correta; letras pequenas e menu móvel sem foco modal. Melhorar escala e drawer nativo. |
| Tokens / CSS / breakpoints | PARCIAL | Valores pequenos repetidos e overrides por componente. Escala global e regras únicas para componentes revisados. |
| Growth OS página e bloco Home | PRECISA REFAZER | Copy e mockup estratégia/conteúdo/biblioteca desatualizados. Nova tese comercial aprovada pelo HQ. |
| Motion / performance | PARCIAL | Float e reveal existentes com reduced motion. Manter CSS leve, dimensões reservadas e medir amostras de laboratório antes/depois. |

## Capacidades confirmadas no código do app

Repo `ld`, main `f2952e0c966a65e5d736e97e51cca7ada0f75ac1`: contatos/oportunidades, Hoje, pipeline, tarefas e resultados registrados (ganhos, conversão de fechamentos, etapas e tarefas atrasadas). WhatsApp possui Inbox, templates e Cloud API, mas disponibilidade exige conexão/validação da Meta. Growth AI depende de configuração e validação de provedor; exibir “em validação”. Sem alegar venda autônoma, forecast, ROI, receita garantida ou disponibilidade comercial aprovada.

As etapas atuais são Novo lead, Em contato, Qualificado, Proposta, Negociação, Ganho e Perdido. A ordem sugere Diagnóstico; apresentá-lo no contexto da oportunidade, preservando as etapas reais na prévia do pipeline. Não alterar o software para ajustar um mockup do portal.

Prévias são componentes HTML/CSS leves com dados fictícios identificados, baseadas nas capacidades auditadas. Não representam sessões de clientes, screenshots de produção nem nova funcionalidade implantada no app.

## Documentação do sistema visual

Tokens: body 18/17px, leitura 19/18px, apoio 16px, metadata mínimo 13px, H1 fluido, espaços de seção 112/72px, container 1280px, leitura 760px, sidebar 280px, gap 48px. Branco base, navy contraste, energia da marca em detalhes.

Componentes: Button (alvo 44px/foco), Badge (metadado legível), Card/ArticleCard (imagem sem sobreposição de texto), ArticleHero/ArticleCover (variantes e foco fotográfico), CategoryChip (estado e teclado), ProductPreview (seis vistas demonstrativas), SidebarPromo (um CTA visível por layout), Comment (três recuos visuais, coluna da leitura), AuthorCard, ReferenceList, CTA e SectionHeader. Regras e implementação nas pastas `src/components` e `src/styles`.

## QA, publicação e rollback

Antes/depois: `artifacts/ux-refresh/`. Capturas de Home, Hub, Artigo e Growth OS. Dados públicos fictícios idênticos nas duas versões; sem escrever em produção. QA em 1366×768, 1440×900, 1920×1080, 360×800, 375×812, 390×844, 430×932, 768×1024 e 820×1180.

Métricas LCP/CLS dessas capturas são laboratório local e não representam CrUX/INP de usuários. Interatividade, teclado, foco, redução de movimento e ausência de overflow devem ser testados separadamente. Nenhuma promessa de performance de campo sem dados reais.

Rollback: reverter a interface para o commit base, preservar novas colunas de imagem, RLS, conteúdo, leads, Auth e histórico. Repor somente os campos Growth OS do JSON site_settings se necessário; preservar demais configurações. Variantes permanecem recuperáveis no Git. Nunca reexecutar a fundação ou apagar tabelas para voltar o design.

Resultados reais de CI/deploy/smoke e pendências serão registrados no PR após verificação.

## Resultado local verificado

39 testes Node/PostgreSQL + 14 E2E de navegador + 10 testes de deploy passaram. Oito auditorias axe WCAG A/AA em Home, Hub, Artigo e Growth OS, a 1440/390px, sem violações detectadas. Isso complementa a conferência visual e teclado; não constitui certificação universal de acessibilidade. Editor/autosave/aprovação/publicação, preservação dos cinco textos, comentários, denúncias e consentimento mantêm seus testes de regressão.

36 combinações (quatro páginas × nove tamanhos): nenhuma imagem falhou, nenhum erro JS/overflow e CLS 0 no laboratório após preload da fonte. Artigo e comentários: 760px no desktop, mesma largura disponível no mobile/tablet.

| Página / viewport | LCP antes (ms) | LCP depois (ms) |
|---|---:|---:|
| Home 1440 | 376 | 248 |
| Hub 1440 | 268 | 268 |
| Artigo 1440 | 252 | 256 |
| Growth OS 1440 | 200 | 188 |
| Home 390 | 240 | 204 |
| Hub 390 | 152 | 160 |
| Artigo 390 | 232 | 188 |
| Growth OS 390 | 172 | 200 |

Amostras locais, sem throttling, com os mesmos dados fictícios. Diferenças de poucos ms não são ganho/regressão comprovada. Não medido: INP de campo ou CrUX real. CI aplica limite de laboratório LCP <2500ms / CLS ≤0,1 e verifica 36 layouts; artefatos são retidos por 14 dias.

15 variantes WebP de card (large 1200×750, standard 720×540, mobile 480×360): 186.194 bytes no total. Fonte SVG preservada; hero/OG 1200×630 permanecem. Campos CMS: image_variant, hero_position, card_image, card_image_mobile e card_image_large. Foco fotográfico validado no banco/client; capa editorial e ilustração permanecem inteiras. O lote existente deriva variantes versionadas automaticamente quando o campo de card está vazio; futuros uploads podem informar seus URLs.

JS público principal: 149,56kB gzip (aprox. +5kB sobre o baseline). CSS 19,85kB gzip. Não foi adicionado carrossel, biblioteca de motion ou iframe de terceiros; Tiptap permanece no bundle administrativo. Axe é dependência exclusivamente de teste. Auditoria não apresenta vulnerabilidade high/critical; um advisory LOW preexistente de tsx/esbuild em dev server Windows continua sem uso em produção.

Demo: formulário de contato existente, assunto predefinido “Demonstração Growth OS”, consentimento e mensagem de confirmação. E2E valida envio com dados fictícios interceptados; não cria leads reais nem envia e-mails. Captação não equivale a agendamento ou liberação de conta. Confirmação de e-mail Auth permanece uma verificação operacional do responsável.

Texto público de produto centralizado em `src/lib/growth-product.ts` conforme direção aprovada HQ. A página v2 não herda descrições comerciais antigas do JSON para evitar reapresentar módulos/preços não aprovados. Configurações de newsletter e redes continuam funcionando. Duas capturas adicionais do antes (leitura e cards da Home) são da produção pública real, sem sessão ou mutações; as demais e o depois usam o fixture idêntico. Alterações futuras de capacidade/claim devem ser revisadas no Git.

Liberação: PR/CI → migration aditiva → verificar RLS/API → merge GitHub → health portal-ux-v2 na Hostinger → smoke de páginas/variantes/SEO/Admin/dados preservados. Commit, versões remotas, CI e evidências reais de deploy são registrados na descrição do PR ao concluir.
