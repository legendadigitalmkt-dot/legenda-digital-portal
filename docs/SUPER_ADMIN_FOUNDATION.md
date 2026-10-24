# Super Admin — Foundation (24/10/2026)

## Resultado pretendido / escopo
Primeiro dos oito marcos do prompt mestre. Reutiliza CMS, mídia, comentários, newsletter e ferramentas existentes; não declara esses módulos completos nos novos requisitos. Foundation adiciona shell por rotas, matriz granular, dashboard de disponibilidade, diretório mínimo de contas e auditoria central sanitizada.

Fronteira: apenas Portal, repo legenda-digital-portal, banco yltnjgngkomelfltdyky. Nenhum recurso do banco Lunior, Growth OS ou outro projeto foi alterado. Growth OS permanece apenas referência comercial em /admin/product-referrals; não há CRM, pipeline ou usuários do software neste Admin.

## Estado de aplicação
Preparado em branch/PR. NÃO aplicado no banco, NÃO mergeado, NÃO publicado. A conexão Supabase retornou somente Lunior e recusou a consulta ao Portal em 24/10. Isso impede inspecionar drift/advisors, aplicar e verificar migration ou publicar a Edge atualizada com segurança. Não usar outro projeto como substituto.

Fonte de versão anterior: main 3ee8581. O novo runtime identificará portal-super-admin-foundation-v1 somente quando efetivamente construído/publicado. Os nomes de release no código não comprovam deploy.

## Permissões e compatibilidade
src/config/admin-roles.json define os doze papéis solicitados; admin/author são aliases legados preservados sem concessão automática. DB private.portal_role_permissions/private.can é a barreira real; a interface usa matriz equivalente, verificada por teste. Permissão desconhecida é negada inclusive ao owner. Funções não confiam em user_metadata/JWT role para autorização; consultam site_staff ao executar.

RLS existente de artigos preserva autoria, revisão, publicação e versões. Mapeamentos de configurações, comunidade, ferramentas, newsletter, analytics, mídia e contatos foram atualizados nos pontos que tinham listas legadas. contacts.manage, dashboard.read e audit.read são permissões técnicas adicionais. Salvos/respostas privadas de ferramentas continuam só do próprio usuário, inclusive para owner.

Nenhuma UI de concessão/revogação de papéis foi adicionada. A migration amplia o enum/check mas não muda contas/papéis reais. Preservar acesso de emergência super_admin existente; somente conceder novos papéis após validar banco/aplicação. Usuários/listagem ficam somente com users.read; não revelam senhas, emails nem respostas privadas. Paginação 1–50, offset até 10000, até 20 consultas/minuto por ator, com lock transacional.

## Rotas / experiência
/admin é dashboard. Rotas diretas para articles, categories, tags, authors, comments, media, newsletter, community, users, contacts, tools, analytics, building, settings, product-referrals e audit-logs. Histórico voltar/avançar funciona. Área desconhecida mostra estado próprio; área sem permissão não instancia o componente nem solicita seus dados. Menu móvel por botão, Escape e foco; auditoria móvel em registros legíveis. Admin removido do rodapé público.

Admin e CSS Foundation são lazy-loaded fora do bundle inicial público. O editor pesado já existente permanece no chunk Admin; divisão adicional por submódulo é melhoria posterior, não anunciada como concluída.

## Métricas
Somente contagens reais que o RPC retorna com available=true viram número. Ausência de coleta, permissão, contrato ou erro não vira zero. Dashboard pode contar publicados, rascunhos, agendados, atualizados, inscrições subscribed, contas, eventos consentidos de tool_started/completed em 30 dias e total agregado de salvos. Rascunhos/agendados ficam restritos à autoria quando não há permissão editorial abrangente. Não lê respostas/resultados para agregação.

Aquisição, retorno, community posts/membros e memória estratégica ainda sem fonte implementada permanecem indisponíveis. Não usar community_interests como número de membros. Eventos não equivalem a pessoas únicas. As capturas deste PR são fixtures, não estatísticas do portal real.

## Auditoria
Nova tabela portal_admin_audit com RLS e só SELECT autorizado; clientes não podem inserir, atualizar, excluir ou truncar. Funções de escrita são privadas, SECURITY DEFINER justificado e EXECUTE revogado; wrappers públicos de leitura são SECURITY INVOKER. Funções privilegiadas de diretório/dashboard têm checagem explícita de auth.uid e permissões atuais.

Triggers transacionais cobrem site_staff, conteúdo/taxonomia/autores, settings, recursos/tools, eventos da comunidade, comentários/bans, contatos/interesses, edições/auditoria newsletter e storage.objects. Mudanças não administrativas não viram ação administrativa. Dispatcher via serviço usa actor do log newsletter já validado; ações de infraestrutura em site_staff identificam ator ausente como infraestrutura, sem inventar pessoa.

before/after usam allowlist: IDs, papel, status, versão, flags, datas e bucket. Sem body, respostas/result_summary, email, tokens ou config. changed_fields registra nomes de campos alterados, sem seus valores. article_versions mantém o histórico editorial próprio. Consulta ao diretório gera registro. Triggers não provam ações anteriores à aplicação nem eventos sem hook; exportações privadas antigas não passam a ser auditadas por mágica. Roles de infraestrutura/DB owner continuam autoridade sobre o banco; isto não é log criptograficamente inviolável contra um administrador de banco.

## Banco / testes / ativação
Migration gerada pelo CLI (2.81.3), 20261024163748_portal_super_admin_foundation.sql, após a cadeia existente. Testes PGlite executam a cadeia completa com Auth/Storage locais, removendo apenas o provisionamento pg_cron não disponível no fixture. Testam matriz inteira, desconhecidos, falsificação de metadata, RLS, diretório mínimo, revogação imediata, logs transacionais/rollback/no-op, grants, rate limit e especialistas. Navegador usa somente backend simulado e usuários fictícios.

Antes de ativar:
1. Obter acesso ao projeto Portal correto; inspecionar migrations, grants, policies e drift; executar advisors de segurança.
2. Confirmar backup recuperável/PITR e procedimento de restore compatível com o plano real do projeto. Nenhum backup hosted foi inspecionado/criado nesta sessão.
3. Aplicar a migration versionada por mecanismo de migrations; verificar RLS, grants, funções e integridade de conteúdos. Não promover usuários como efeito colateral.
4. Publicar o handler LD Brief atualizado no projeto Portal; manter envio/cadastro nas flags seguras enquanto email não for validado.
5. Executar smoke autenticado e negativo; revisar CI; merge/deploy coordenado pelo fluxo GitHub/Hostinger autorizado; confirmar release e comportamento em produção.
6. Atualizar LL-005 com resultado real. Não chamar o marco 1 completo antes dessas provas.

## Rollback
Antes da aplicação hosted: fechar/reverter o PR, sem rollback de banco.
Após aplicação: preferir rollback do código/Edge para revisão anterior compatível com papéis legados; manter a extensão aditiva de schema, os dados e a auditoria. Manter conta super_admin de emergência até novo smoke. Se novos papéis já tiverem sido concedidos, planejar compatibilidade antes do rollback; não rebaixar contas automaticamente. Não dropar logs nem reverter permissões sem revisão e evidência. Recuperação de dados deve usar backup previamente validado, nunca um procedimento de restore presumido.

## Limites adicionais desta primeira entrega Foundation
O diretório de usuários é consulta mínima; perfil/atividade/salvos/privacidade completos dependem dos marcos de conta/comunidade/consolidação. A mídia reutiliza a biblioteca existente e valida arquivos nos demais buckets; catálogo central completo de dimensions/alt/caption/credit/used_in ainda precisa de consolidação editorial. Esta entrega não encerra sozinha todo o marco 1, além do bloqueio de aplicação hosted.

## Dependências verificadas em 24/10
npm audit encontrou alertas crítico em DOMPurify, alto em Zod e moderado em sanitize-html nas versões existentes. Foram atualizados com versões exatas: dompurify 3.4.17, zod 4.6.7 e sanitize-html 2.18.1, com lockfile. Audit no limiar high passou; restou um alerta low transitivo em esbuild/tsx de desenvolvimento. Não houve exploração observada nem execução de npm audit fix --force. A ampliação foi pré-registrada em LL-005 antes das atualizações.
Fontes primárias: https://github.com/advisories/GHSA-cg2g-xh64-v4q7 ; https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 ; https://github.com/advisories/GHSA-c9rx-x947-fp3h .

## Próximos marcos / Definition of Done
2 Editorial: consolidar editor/blocos, Research/Sources/Claims, workflow e SEO.
3 LD Brief: validação operacional real e administração completa.
4 Tools: visibilidade de versões/uso e oito ferramentas.
5 Analytics & Intelligence: aquisição/retorno, consentimento, metodologia e revisão de insights.
6 Community: tópicos/posts/respostas/membros/moderação completos.
7 Project Memory: memória persistida privada e exportação aprovada/versionada.
8 Consolidação: Roadmap, System Health, Settings, busca, alertas e QA final.
Esses marcos não foram implementados nesta Foundation. O prompt completo é o contrato de referência, não uma lista de funcionalidades já prontas.

