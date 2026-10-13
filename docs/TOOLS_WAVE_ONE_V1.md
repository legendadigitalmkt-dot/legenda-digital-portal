# LD Tools — onda 1

Escopo: portal `legendadigital.com.br`, GitHub `legenda-digital-portal`, Supabase
`yltnjgngkomelfltdyky`. Nenhuma conexão, banco, repositório ou Auth do Growth OS
é usado para os resultados desta entrega.

## Status/matriz e rotas

| Ferramenta / rota em `/ferramentas/` | Versão | Entrega |
| --- | --- | --- |
| claro | 2 | CLARO Workspace: audiência/objetivo, templates editáveis, prompt/brief/plano/checklist, sugestões, histórico e revisão |
| checklist-conteudo | 2 | Auditoria: 12 dimensões, 24 critérios, score por dimensão, cobertura, pontos fortes e ações |
| calculadora-conversao | 2 | Conversão simples + 7 etapas do funil, cenários atual/meta/alternativo, conversões, perdas e gráficos |
| planner-editorial | 2 | 13 campos, lista/calendário/Kanban, duplicação, status, URL publicada, CSV e histórico |
| maturidade-growth | 1 | 6 dimensões / 18 perguntas, perfil de notas e prioridades |
| cac-ltv-payback | 1 | CAC, contribuição mensal, LTV estimado, LTV:CAC e payback simples para assinaturas |
| follow-up | 1 | Condições independentes da carteira, sem responsável/próximo passo, atrasadas, espera e parada |
| seo-aeo-geo | 1 | 8 dimensões / 16 perguntas de autoavaliação; não rastreia páginas nem promete citação em IA |

Todas funcionam sem conta. Copiar/TXT/CSV continuam abertos. Impressão/PDF usa
“Salvar como PDF” no diálogo nativo do navegador; não é uma geração remota
nem um arquivo gravado automaticamente no Supabase. Status de pauta não
publica conteúdo no CMS. Performance de publicações será uma entrega própria,
sem estimar métricas nesta onda.

## Metodologias e limites

As escalas de auditoria/maturidade são próprias e autodeclaradas, não benchmarks
brasileiros, pesquisas proprietárias ou diagnósticos auditados. Cada pergunta
recebe 0–4 com rótulos visíveis. Dimensão = média respondida / 4 × 100; geral
= média das dimensões respondidas com pesos iguais. Desconhecido não equivale
a zero. Cobertura e resultados parciais aparecem junto às notas. Prioridades
começam por preencher lacunas e revisar dimensões mais baixas; a ferramenta
não verifica evidência nem escolhe estratégias automaticamente.

Funil usa contagens cumulativas da mesma coorte/período. Conversão da passagem
= próxima etapa / anterior; perda absoluta = anterior − próxima. Total = vendas
/ visitas. Base zero é indisponível, sem Infinity/NaN. Cenários devem ser
completos e não crescentes. A maior perda proporcional é uma investigação,
não uma prioridade econômica comprovada. Meta e alternativo não são previsão.

Modelo de assinatura: CAC = gasto / novos clientes; contribuição mensal =
receita média × margem bruta; LTV de contribuição estimado = contribuição ×
retenção informada em meses; LTV:CAC = LTV / CAC; payback = CAC / contribuição.
CAC zero torna o ratio indisponível; contribuição zero não recupera o custo
no modelo. Não é lucro líquido nem DCF, e não incorpora mudanças de preço,
churn, expansão, sazonalidade ou impostos. Custo/receita/margem/retenção precisam
ser revisados por coorte. Não há benchmark universal ou recomendação financeira
personalizada embutida.

Referências primárias consultadas em 12/10/2026 (São Paulo):

- https://stripe.com/resources/more/what-is-the-cac-payback-period
- https://stripe.com/guides/atlas/business-of-saas
- https://developers.google.com/search/docs/appearance/ai-features
- https://supabase.com/docs/guides/database/postgres/row-level-security

Follow-up aceita condições sobrepostas, calcula cada quantidade / carteira e
não soma oportunidades afetadas. Aguardar cliente pode ser normal; parada usa
prazo definido pelo usuário. Não calcula dinheiro perdido ou importa contatos.

## Compatibilidade, schema e migration

`tools-v1.mjs` preserva os quatro métodos anteriores sem modificações de lógica.
Exportar um run antigo usa sua versão exata, e o resultado original continua
privado. Duplicar/revisar abre a versão atual com vínculo de origem. Checkbox
antigo não vira nota 0–4: a revisão anterior é preservada como referência textual
e os novos critérios exigem resposta explícita. Novos drafts são separados por
versão; o armazenamento anterior não é apagado nem transferido automaticamente.

Migration CLI: `20261013000606_portal_tools_wave_one.sql`. Catálogo passa a 8
ferramentas e 12 versões, preservando as 4 antigas. Disponibilidade e nomes/
descrições personalizados pela equipe são preservados; nomes/descrições de
seed são atualizados para o novo escopo. Nenhum artigo, formulário, conta ou
resultado real é reescrito.

Nova coluna `tool_runs.parent_run_id`: FK com SET NULL ao excluir o original,
sem apagar revisões; não pode apontar para si mesmo. Trigger exige proprietário
e ferramenta iguais para a origem. Sem permissão de UPDATE de parentesco,
respostas, resultados ou proprietário. RPC `save_tool_run_v2` é SECURITY INVOKER,
atômica/idempotente e grava o mesmo consentimento privado existente. RPC v1
continua disponível para clientes em cache/rollback, com versão registrada e
limites idênticos. Não há novo SECURITY DEFINER público.

O trigger de auditoria de admin é desabilitado apenas para os updates de
catálogo dentro da transação da migration, sob lock de ALTER TABLE, e reativado
antes do commit. Não se impersona um usuário de produção. Alterações normais
pela UI continuam auditadas. Histórico de migrations MCP tem timestamps
hosted diferentes dos locais, conforme runbook da fundação; não usar `db push`
indiscriminadamente. Registrar versão hosted na entrega/PR.

## Admin, analytics, consentimento e segurança

`/admin/tools` lista os oito recursos e as contagens consentidas existentes.
Nenhuma resposta, score, segmento ou identificador de usuário entra nos eventos.
Não se cria “most used” com números inventados. Views/retention/RLS da fundação
continuam: proprietário somente, mesmo para staff; consentimento para histórico,
intelligence=false; 365 dias para runs/consents, 90 dias para eventos, job privado.
Nada vira insight público, newsletter, post de comunidade ou lead do software.

Validação inclui finitos/inteiros/limites, denominadores, coortes monotônicas,
URLs http(s) sem credenciais, datas reais, status, IDs de pauta e proteção contra
fórmulas em CSV. Inputs não executam HTML. Sem chaves privilegiadas, AI calls,
webhooks ou scraping. Limites existentes de payload e frequência permanecem.
Contexto privado não entra no HTML SSR, sitemap ou eventos. Conta/duplicação
continuam no-store/noindex.

Cadastros novos hosted continuam desativados. Esta onda é independente dessa
configuração: uso básico/export aberto; histórico para contas existentes.
Signup/SMTP/confirmação real ainda precisam de configuração e teste próprios,
sem alterar senhas ou alegar entrega de e-mail não verificada.

## UX, mobile, performance e acessibilidade

Formulários usam seções para avaliações longas, labels explícitos e campos de
16 px; controls/touch targets a partir de 44 px. Estado se preserva entre
seções. Kanban tem alternativa por select para teclado/celular. Calendar tem
visão por dia e mês; no celular, dias com pautas viram lista. Tabelas de resultado
viram cards identificados por coluna, sem scroll horizontal obrigatório.

Gráficos usam barras CSS e contagens textuais acessíveis, sem biblioteca pesada.
Resultados têm foco/animação curta, respeitando reduced motion. Cálculos e
schemas completos carregam com workspace/histórico; páginas comuns recebem
somente o catálogo de metadados. Gerador: `node scripts/tools/catalog.mjs`.
Teste exige metadados e versões em sincronia.

## Validação, deploy e smoke

Checks cobrem métodos históricos, todos os novos cálculos, parcial/desconhecido,
zero/negativos, cenários incompletos, CSV injection, URLs/datas, preservação de
v1, parentesco entre versões, isolamento Alice/Bob/anônimo, idempotência e
compatibilidade do RPC anterior. Playwright cobre os oito recursos em 390 e
1440 px com axe, flows existentes, planner, PDF nativo e saves/revisões privados.
QA das 44 amostras de home/hub/artigo/Growth continua obrigatório.

Validação local: build/TypeScript; 61 checks Node/PostgreSQL, 42 casos
Playwright (28 análises axe) e 10 checks Python de deploy aprovados.
Workspace ~18,7 KiB + módulos lazy compartilhados; bundle principal ~478 KiB
(151,6 KiB gzip), mantendo cálculos fora das páginas comuns. O aviso preexistente
do chunk Admin acima de 500 KiB permanece; npm audit sem high/critical, com o
aviso LOW anterior de tsx/esbuild no dev server Windows.

Resultados de testes/CI, PR/commits, migration hosted, advisors, deploy e smoke
serão registrados no PR. Produção é verificada por cálculo local/read-only,
sem usuário fictício, segredo real ou dados de contato enviados em smoke.

## Rollback e próxima entrega

Reverter este PR por nova branch/PR, CI e deploy automático Hostinger; conferir
health/rotas da fundação. Manter migration aditiva, versões e dados privados.
RPC v1 continua aceitando versões registradas, permitindo rollback do cliente.
Não DROP tables ou reescrever answers/results para voltar à interface anterior.
Metadados de catálogo podem ser restaurados por migration revisada, se necessário.

Após QA da onda 1, observar uso consentido real antes das ondas 2–4. Próximo
milestone aprovado: LD Brief, com auditoria/escolha de provedor, double opt-in,
unsubscribe, preferences, issues/Admin/archive e consent ledger em PR próprio.
Comunidade e Intelligence Center continuam em milestones independentes.
