# LD-PORTAL-LL-005 — Super Admin Foundation

Projeto: Portal Legenda Digital. Data: 24/10/2026 (America/Sao_Paulo).
Status: IMPLEMENTADO EM BRANCH / EM VALIDAÇÃO. Aplicação hosted bloqueada; marco não concluído. Pré-registro preservado.
Origem: prompt mestre anexado Texto colado(20261024-163116).txt, seções 1–74.
Aprendizados consultados: LL-001–004; NR-01, NR-04, NR-08, NR-09, NR-12.
Ativos consultados: CMS/renderer, site_staff/private.can, RLS, uploads, ferramentas, LD Brief e testes existentes.

## Hipótese
Uma foundation com rotas explícitas, permissões granulares e auditoria confiável permitirá operar os módulos existentes com menor risco de acesso indevido e maior rastreabilidade.

## Evidência inicial
Moderada para a lacuna técnica: main 3ee8581 usa cinco papéis, navegação parcialmente baseada em estado local e auditorias específicas. Forte como requisito declarado no novo prompt; sem evidência de melhoria de produtividade dos operadores.

## Problema / público / prioridade
Equipe editorial e operacional precisa de um controle exclusivo do Portal, com ações e permissões verificáveis. O titular aprovou a Foundation como primeiro dos oito marcos. Não administrar CRM/usuários Growth OS nem reutilizar a conexão Lunior.

## Experimento
Construir Foundation em branch própria, com schema/migrations versionados e testes isolados. Reutilizar módulos existentes. Manter fluxos públicos e dados reais intactos.

## Métrica e critério de sucesso — antes do resultado
- Matriz dos doze papéis solicitados + aliases legados consistente entre frontend e banco; permissão desconhecida negada.
- Testes comprovam negação de acesso a usuários/auditoria por anônimos, leitores e papéis sem autorização; sem autoelevação nem escrita direta no log.
- Ações administrativas cobertas geram log transacional com campos permitidos, sem conteúdo privado/credenciais.
- Navegação direta/voltar/avançar e restrição de rotas funcionam; sem link Admin na navegação pública.
- Métrica não coletada aparece indisponível; zero somente após consulta real bem-sucedida.
- Build e suíte de regressão passam. Só considerar aplicação/publicação concluída após migration no Portal e smoke correspondente.
- Produtividade e valor de negócio não serão inferidos dos testes funcionais.

## Dependência observada antes da implementação
Em 24/10, list_projects retornou somente Lunior e a consulta read-only ao projeto Portal yltnjgngkomelfltdyky foi recusada por permissão. Nenhuma operação foi executada no banco Lunior. Não aplicar migration nem fazer merge/deploy dependente dela enquanto o banco correto não estiver acessível.

## Escopo deste ciclo
Foundation: shell/navegação, matriz de permissões, auditoria, dashboard de métricas reais/disponibilidade, consulta mínima de usuários e mídia existente. Os outros sete marcos permanecem pendentes. Sem envio de email, criação de conta, concessão automática de papéis ou dados artificiais de audiência.

## Fechamento técnico — 24/10/2026
O que foi construído: shell/rotas/menu móvel, matriz de doze papéis e dois aliases legados, migration RLS, dashboard de disponibilidade, diretório mínimo privado com paginação/rate limit, auditoria transacional sanitizada, validação de arquivos nos demais buckets, documentação versionada e capturas de fixtures. Project Memory completo e outros sete marcos não foram implementados.
Resultado — FATO: build passou; 90 testes Node/PGlite, 60 Playwright e 10 Python aprovados localmente (160). A suíte de navegador verificou Dashboard/Usuários/Auditoria em 390/1440, acessibilidade e rotas negadas sem consulta privada. Matriz frontend/SQL foi comparada em todos os papéis/permissões; revogação no banco e imutabilidade de log para clientes verificadas. Nenhuma migration ou concessão de papel foi aplicada em produção.
FATO adicional: foram encontrados/corrigidos link Admin no rodapé, contraste insuficiente e foco ausente em região rolável. A conexão Supabase atual continua com escopo Lunior; o Portal recusou acesso. Foram corrigidas dependências afetadas; audit high passou, com um low transitivo restante.
Interpretação: houve mais capacidade e evidência técnica; não há prova de operação hosted, ganho de produtividade, aquisição, conversão ou receita.
Nova hipótese: depois de aplicar no projeto correto, os testes de acesso e rastreabilidade poderão ser reproduzidos no ambiente hosted sem alterar usuários/dados reais desnecessariamente.
O que funcionou: preservar critérios antes da implementação; reutilizar CMS/RLS/testes; comparar permissões no DB e frontend; separar patch de segurança independente da migration.
O que não funcionou: permissão atual do conector não inclui Portal; download padrão do navegador de teste falhou no ambiente; uma alteração excessivamente ampla no script de captura afetou um teste antigo e foi corrigida antes da execução final. Falhas de harness não foram apresentadas como bugs do produto.
Surpresas: o audit atual identificou alertas de dependência que não constavam no aceite histórico; testes de acessibilidade encontraram restrição de foco além de contraste.
Aprendizado sobre usuário: apenas requisito declarado do titular; nenhum teste com equipe/visitantes reais neste ciclo.
Aprendizado sobre produto: autorização deve ser verificada também no banco e nas rotas diretas; métricas indisponíveis precisam ser distintas de zero medido.
Aprendizado sobre distribuição: sem medição de aquisição neste ciclo. Pricing/economia: não medidos.
DECISÃO: CONTINUAR TESTANDO — código preparado e regressões aprovadas; revalidar drift/advisors, aplicar migration/Edge no Portal e executar smoke antes de concluir/publicar Foundation. Patch de segurança sem schema segue PR separado para não esperar esse bloqueio.
CONFIDENCE SCORE: 4 para os resultados técnicos no ambiente isolado; 2 para benefício operacional esperado; sem inferência de demanda ou retorno financeiro.
ATIVOS: tecnologia (permissões/RPCs/auditoria/patch de dependências), processo (critérios/testes/rollback), conhecimento (limites de acesso e medições), dados de QA (fixtures/capturas/resultados). Não são audiência nem PII de visitantes; nenhum framework/IP novo validado.
REUTILIZAÇÃO: candidatos técnicos para projetos aprovados pelo HQ, com adaptação de papéis/arquitetura; código/config/dados/usuários/credenciais do Portal não são compartilhados automaticamente.
NÃO REPETIR: usar banco de outro produto; passar QA local por publicação; travar patch independente atrás de migration inacessível; usar substituição ampla em instrumentação sem verificar escopo.
CROSS-PROJECT LEARNING: candidato — separar correções independentes de segurança de marcos maiores e validar o escopo real da conexão antes de qualquer DDL. Origem Portal LL-005; ativos processo e testes; possíveis beneficiados definidos pelo HQ; risco de reutilização indevida é copiar grants/credenciais ou extrapolar benefício econômico. Nenhum envio a terceiros/decisão transversal ocorreu.
Próximo teste: CI dos PRs, publicação verificável do patch separado e acesso ao Portal para o gate hosted da Foundation.
Resultado do ciclo: mais evidência e capacidade organizacional; menor incerteza técnica. Não demonstra aumento de valor percebido pelo público.
Links de evidência: patch independente https://github.com/legendadigitalmkt-dot/legenda-digital-portal/pull/20 ; resultados/capturas em artifacts/super-admin-foundation/ ; resultados de CI/commit na descrição dos PRs, atualizada após execução.

## Revisão de escopo antes da correção de dependências — 24/10/2026
O npm audit atual apontou DOMPurify 3.4.16 crítico, Zod 4.3.6 alto, sanitize-html 2.18.0 moderado e esbuild transitivo baixo. Não foi observado ataque nem reproduzida exploração no Portal. A correção das versões afetadas é um gate técnico, não validação de benefício de produto.
Hipótese: atualizar as versões corrigidas manterá edição/sanitização/formulários compatíveis e removerá alertas high/critical do lockfile.
Evidência inicial: forte para versões afetadas no audit; não demonstra exploração das configurações atuais do produto.
Critério anterior à atualização: audit no limiar high deve passar; build, testes de sanitização, CMS e formulários devem continuar aprovados; manter dependências diretas com versões exatas e lockfile versionado.
Se o plano precisar mudar novamente, registrar nova revisão antes de agir.
