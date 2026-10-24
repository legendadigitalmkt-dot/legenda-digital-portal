# Portal Legenda Digital — instruções de engenharia

Este repositório pertence somente a legendadigital.com.br. Não misturar banco, Auth, usuários, permissões, credenciais, analytics ou roadmap com Growth OS, Lunior, Form.miga ou Ronildo Palmeira. Growth OS aparece apenas como produto divulgado.

Antes de mudanças relevantes: ler docs/project-memory/README.md, DO-NOT-REPEAT.md e registros relacionados; consultar o Learning Ledger atual do projeto quando disponível. Registrar problema, público, hipótese, evidência, métrica e critério de sucesso antes de implementar. Não repetir decisões/erros conhecidos.

Ao encerrar: atualizar o registro de aprendizado com fato, interpretação, hipótese nova, acertos/falhas, decisão motivada, confidence score e ativos/reutilização. Não chamar teste de prova de demanda ou deploy.

GitHub é a fonte de verdade de código/migrations. Mudanças relevantes passam por branch/PR; main deve continuar apta a produção. RLS e autorização no banco são obrigatórios para dados privados. Sem secrets no frontend. Não alterar dados reais ou conceder papéis como efeito colateral de migration.

Requisitos Super Admin: docs/SUPER_ADMIN_MASTER_PROMPT.md. Plano/limites do ciclo Foundation: docs/SUPER_ADMIN_FOUNDATION.md. Sem SSO/Admin compartilhado, publicação editorial automática, BI preditivo complexo ou expansão para 31 ferramentas.

Antes de merge/deploy de mudança dependente de schema: confirmar acesso ao projeto Portal correto, inspecionar drift/advisors, backup e aplicar migration versionada com validação. Conexão disponível a outro produto não autoriza usá-lo como substituto. Um workflow com publish skipped não prova publicação. Documentar rollback sem apagar trilhas de auditoria.

