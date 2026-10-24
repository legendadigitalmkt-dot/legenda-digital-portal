# LD-PORTAL-LL-005 — Super Admin Foundation

Projeto: Portal Legenda Digital. Data: 24/10/2026 (America/Sao_Paulo).
Status: EM EXECUÇÃO. Pré-registro anterior à implementação.
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

## Fechamento
O que foi construído: pendente.
Resultado — fato: pendente.
Interpretação: pendente.
Nova hipótese: pendente.
O que funcionou/não funcionou/surpresas: pendente.
Aprendizado sobre usuário/produto/distribuição: pendente.
Pricing/economia: não medidos.
Decisão: pendente até o fechamento.
Confidence score: 2 para benefício operacional; cobertura técnica será avaliada separadamente.
Ativos gerados/reutilização: pendente.
NÃO REPETIR: passar testes locais como prova de migration/deploy; usar projeto de outro produto para contornar permissão.
CROSS-PROJECT LEARNING: candidato apenas após resultado, sujeito ao HQ.
Próximo teste: implementar e verificar Foundation em ambiente isolado; depois revalidar acesso ao Portal.

