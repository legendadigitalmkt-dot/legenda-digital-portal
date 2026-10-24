# Patch de segurança do Portal — 24/10/2026

Ciclo Learning Ledger: LD-PORTAL-LL-005, desdobramento independente da Foundation para não acoplar uma correção de dependências ao acesso ao banco.
Pré-registro: o plano e o critério de sucesso foram registrados localmente antes da atualização; cópia versionada preservada em https://github.com/legendadigitalmkt-dot/legenda-digital-portal/commit/47fdb4d834a77592615c7777194523396fc9b035 .

Problema: o audit do lockfile existente identificou DOMPurify crítico, Zod alto, sanitize-html moderado e esbuild transitivo baixo. Isso prova versões afetadas, não demonstra ataque ou exploração da configuração atual do Portal.
Público: leitores e operadores do Portal.
Hipótese: versões corrigidas preservam edição, sanitização e validação enquanto removem alertas high/critical.
Evidência inicial: forte para os avisos de dependência; sem evidência de exploração observada.
Métrica: audit high/critical e regressões funcionais.
Critério anterior ao resultado: npm audit no limiar high passa; build e regressões existentes continuam aprovados.

Mudanças:
- dompurify 3.4.16 → 3.4.17;
- sanitize-html 2.18.0 → 2.18.1;
- zod 4.3.6 → 4.6.7;
- versões exatas e lockfile preservados;
- remove o link Admin do rodapé público, conforme novo prompt; a rota protegida continua disponível por URL direta;
- release de diagnóstico portal-security-dependencies-v1, a confirmar somente por smoke de produção.

Sem migration, concessão de papel, alteração de dados ou recursos em outros projetos. O patch não contém a Foundation nem depende de nova conexão Supabase.
Resultado local/CI/produção deve ser consultado no PR, com identificação do commit. Não chamar merge de prova de deploy.

Interpretação: o software versionado pode reduzir exposição às falhas anunciadas; resultado de negócio não é inferido.
Decisão: CONTINUAR TESTANDO até CI e prova de publicação. Confidence score: 4 para o resultado técnico do audit no lockfile; sem inferência sobre ataques ou adoção.
Ativos: dependências corrigidas, validação de compatibilidade e processo de desacoplamento de patch de segurança.
Reutilização: avaliar dependências por projeto; não copiar lockfile, código, banco ou credenciais para outro produto.
NÃO REPETIR: congelar um patch de segurança sem dependência de schema atrás de um bloqueio de outro marco.
Cross-project learning: candidato ao HQ sobre separar correções operacionais independentes de entregas maiores, sem comprovação de eficácia econômica ou adoção.
Próximo teste: CI deste patch e smoke da release em produção.

Fontes primárias:
- https://github.com/advisories/GHSA-cg2g-xh64-v4q7
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/advisories/GHSA-c9rx-x947-fp3h

Rollback: reverter o PR não altera dados/banco, mas restaura as versões afetadas. Preferir correção adiante; se um rollback de runtime for necessário, registrar explicitamente o risco e o plano de republicação corrigida. Nenhum restore de banco é necessário.

