# Editorial existente — verificação pública e continuidade

Atualização: 15/10/2026; verificações iniciadas em 14/10. Escopo exclusivo Portal, sem novos módulos e sem declarar os gates anteriores encerrados.

## Status e acesso

O titular confirmou login no próprio navegador em 14/10. Essa confirmação é registrada como **informação do usuário**; não significa que a sessão do agente foi autenticada, nem que houve teste independente de permissões privadas. A tentativa segura anterior não produziu uma sessão observável pelo agente. Não solicitar repetição de senha pelo chat, copiar tokens ou presumir que o login em outro navegador transfere a sessão.

Verificação adicional de separação: ambas as chaves **publishable** são distintas; GET de Auth/settings com a chave do próprio projeto retornou 200, e com a chave do outro projeto retornou 401 nas duas direções. Não houve uso de service role, credenciais de usuário, criação de conta ou alteração de dados. Essa prova se limita a chaves públicas: não certifica ausência de secrets compartilhados no painel privado da hospedagem.

O aceite integral da separação permanece parcial pelas verificações privadas já documentadas. A atividade atual amplia a inspeção de **funcionalidades editoriais existentes**, sem iniciar Intelligence, Community, Account ou consolidação de Admin.

## O que existia / o que mudou

Existiam 14 conteúdos publicados e uma auditoria de cinco artigos aprovados, com 45 amostras públicas. A cobertura anterior não verificava os nove conteúdos antigos como conjunto completo.

Esta entrega adiciona `scripts/qa/editorial-readiness.mjs` e regras/testes próprios para consultar o catálogo público inteiro e verificar cada conteúdo em nove viewports. Não muda HTML/CSS de produto, runtime, formulário, Auth, artigos, categorias, capas, referências ou datas de publicação. Acrescenta também um teste de navegador que confirma que o avanço da leitura preserva o mesmo nó do corpo e mantém diagramas expandidos. A suspeita de reset pelo estado de progresso não se reproduziu; nenhum patch de componente foi aplicado.

O verificador faz somente GET/HEAD e OPTIONS de preflight CORS, nega consentimento de analytics e intercepta/bloqueia qualquer tentativa de escrita. Não envia mensagens, comentários, newsletter, cadastros ou formulários. Usa somente a chave publishable Portal; recusa outro backend. Exige que a contagem retornada pela API corresponda ao total publicado para evitar amostragem incompleta apresentada como cobertura integral.

## Critérios técnicos

HTTP/canonical/OG; título único; descrição e subtítulo renderizados; autor e data; breadcrumb/categoria; corpo; 18 px; largura/centralização/overflow; headings únicos e alvos do sumário; imagem hero/alt; imagens visíveis do corpo; relacionados sem autorreferência; controles de share e seção de comentários quando habilitados; links seguros; schema Article/Breadcrumb; sidebar desktop. Preserva os hashes SHA256 dos corpos públicos como evidência de origem, sem copiar textos aprovados para modificá-los.

Uma imagem dentro de `<details>` fechado não é obrigada a carregar antecipadamente. A inspeção percorre imagens visíveis antes de avaliá-las, respeitando lazy loading. As duas tentativas iniciais do novo harness aguardaram indevidamente imagens ocultas e foram interrompidas por timeout; isso foi corrigido **no verificador**, sem alteração no site. Também foi corrigida a leitura prematura dos relacionados: o SSR contém inicialmente o artigo atual e os cards chegam após o carregamento do catálogo público. A avaliação agora aguarda essa atualização. Os casos isolados de AI Search e Como aplicar IA passaram após essa correção. A execução posterior atingiu 93 amostras e revelou uma substituição do DOM durante o scroll, além de relacionados ainda ausentes no primeiro conteúdo de cada contexto. O verificador passou a aguardar os relacionados antes de percorrer imagens, com limite explícito e tempo observado no relatório; resultados anteriores não foram tratados como aprovação. Na rechecagem isolada de Agentes de IA em 1440, os quatro relacionados apareceram e todos os critérios técnicos passaram; a espera observada foi de 36.414 ms no ambiente de teste. Isso é tempo do harness/proxy nessa execução, não Core Web Vitals de leitores nem benchmark de produção. A auditoria não representa teste das imagens ocultas após expansão, envio real de comentários ou validação de acessibilidade completa de todos os componentes.

Reprodução (Node com acesso de rede/proxy normal e Chromium de teste):

```bash
PORTAL_TEST_CHROMIUM_PATH=/caminho/do/chromium node --use-env-proxy scripts/qa/editorial-readiness.mjs
node --test tests/editorial/readiness-rules.test.mjs
# Rechecagem isolada, explicitamente parcial:
PORTAL_TEST_CHROMIUM_PATH=/caminho/do/chromium node --use-env-proxy scripts/qa/editorial-readiness.mjs --slug=como-aplicar-ia-no-negocio --width=390
```

A exceção TLS no contexto Playwright é restrita ao ambiente de QA público com proxy; não modifica TLS do produto. O GET de catálogo usa validação TLS normal. Nenhum cookie/sessão privada foi importado.

## Resultado público consolidado

Em 15/10, a execução geral completou 117 amostras sem falhas técnicas e parou por timeout de navegação em `infraestrutura-da-legenda-digital`, na faixa 1920 px. Seu resultado permanece `technical_pass=false`, com o erro preservado. A rechecagem somente de 1920 px concluiu todos os 14 artigos com `technical_pass=true` e escopo explicitamente parcial. Os hashes dos 14 corpos coincidem entre as duas execuções.

A união das amostras, usando o resultado mais recente por artigo/tela, cobre **126 combinações únicas (14 × 9)**, sem falha nos critérios técnicos nem escrita interceptada. Isso não foi uma execução única ininterrupta e não fecha o gate editorial. `coverage-summary.json` identifica a origem de cada amostra e SHA256 dos dois relatórios. Capturas de 390/1440 foram inspecionadas visualmente. Testes locais: **79/79 Node/PGlite** e a nova regressão Playwright de rolagem passou. A suíte completa de navegador e demais checks serão comprovados pelo CI do PR.

DNS foi rechecado em 15/10: os quatro registros esperados continuam ausentes; envio runtime e cadastro público permanecem desabilitados. Evidência não secreta em `email-readiness.json`. Não houve novo deploy de funcionalidade nem mudança de dados reais nesta entrega. Smoke público apex/www retornou HTTP 200, status ok e release `portal-auth-confirmation-v1`; o relatório preserva também a falha inicial do fetch Node no ambiente de proxy e a exceção TLS restrita ao QA em navegador.

## Metadados que exigem revisão editorial

Os cinco conteúdos do Batch 1 possuem os campos estruturados examinados. Os nove anteriores não têm subtítulo próprio, alt/crédito/caption próprios, SEO/OG próprios e referências estruturadas. O renderizador usa alternativas existentes, como excerpt, título, imagem principal e alt genérico. **Ausência do campo armazenado não é automaticamente página quebrada**, mas requer revisão para o aceite editorial completo.

| Conteúdo anterior | Tipo |
|---|---|
| como-aplicar-ia-no-negocio | Guia |
| conteudo-e-audiencia-com-proposito | Artigo |
| creators-rotina-de-publicacao | Artigo |
| infraestrutura-da-legenda-digital | Building |
| metricas-alem-do-alcance | Artigo |
| oferta-clara-problema-certo | Guia |
| por-que-comecamos-pela-midia | Building |
| tecnologia-util-no-processo | Artigo |
| vendas-perguntas-antes-da-proposta | Guia |

LD Media deve revisar metadados/créditos e avaliar a necessidade de referências por texto. Não inventar fontes nem atribuir autoria de foto por semelhança visual. O Dev não preenche dados editoriais no banco apenas para eliminar os avisos do relatório. Cinco textos aprovados e nove anteriores preservados.

## Arquitetura, banco e segurança

Sem novas rotas de produto, migrations, DDL, RLS, Auth ou dependências. Sem mudanças SaaS, Meta, DNS ou hospedagem. O script e seus artefatos pertencem ao repositório Portal. Seis testes verificam alternativas editoriais sem mutação, alvos de sumário quebrados/IDs duplicados, imagem ausente, canonical indevido/schema/layout e critérios opcionais de comentários/share; os seletores de rechecagem validam o escopo e não confundem uma amostra isolada com a matriz completa.

O teste de regressão de rolagem passou localmente, aguardando mudança real do indicador de leitura antes de verificar a identidade do DOM e o estado do diagrama. Resultados de execução final, CI, merge e smoke serão registrados no PR desta entrega. Evidências públicas em `artifacts/editorial-readiness/public-editorial.json` e screenshots 390/1440. O JSON distingue aprovação técnica, revisão de metadados e ausência de teste de signup/sessão autenticada pelo agente; não expõe chaves nem cookies.

## Pendências, próxima etapa e rollback

Separação: configuração privada hosted e fluxos autenticados independentes. Editorial: revisão dos nove conteúdos anteriores e ciclo real de cadastro/confirmação/comentário. LD Brief: DNS/SMTP/secrets e envio/recebimento/cancelamento reais; scheduler automático ainda não implementado. Manter flags seguras enquanto não há validação. Não pular etapas declarando-as aprovadas pelo número de testes.

Rollback: reverter o PR de scripts/docs/artefatos, executar CI. Sem rollback de banco, Auth ou dados. O runtime permanece na release existente; merge de QA não representa ativação de funcionalidade nova.
