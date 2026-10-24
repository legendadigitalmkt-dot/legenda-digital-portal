# Learnings — Portal

| Registro | Afirmação | Evidência / confiança | Limite |
| --- | --- | --- | --- |
| LL-002 | QA técnico não comprova conversão ou demanda | PR #19 / score 4 técnico | Evidência de 15/10, não auditoria atual |
| LL-003 | Configuração/instalação não prova operação de email | Readiness 15/10 / score 4 naquele recorte | Estado atual requer rechecagem |
| LL-005 | Interface e banco precisam concordar sobre permissão | Ver registro completo e testes deste PR | Testes isolados não provam aplicação hosted |
| LL-005 | Zero mensurado deve ser distinto de métrica indisponível | Contrato de dashboard e testes | Não são dados reais de audiência nesta revisão |

Fato, interpretação e hipótese ficam separados nos registros completos. Sem inferir produtividade, canais eficazes, pricing ou economia sem observação.


LL-005: patch de segurança sem dependência de schema foi separado no PR #20; não confundir correção versionada/CI com comprovação de atualização da produção. Audit atual sem high/critical, com um low transitivo.
