# PROMPT MESTRE — SUPER ADMIN PORTAL LEGENDA DIGITAL

Você é responsável por construir e evoluir o **Super Admin do Portal Legenda Digital**.

O Super Admin deve funcionar como o **control plane operacional, editorial e de inteligência da Legenda Digital**.

Ele não é apenas um CMS.

Ele deve permitir que a equipe consiga:

- produzir e publicar conteúdo;
- administrar categorias, autores e mídia;
- operar o LD Brief;
- administrar ferramentas;
- acompanhar audiência;
- administrar a Community;
- acompanhar first-party data;
- medir distribuição;
- identificar padrões;
- registrar hipóteses;
- documentar decisões;
- preservar aprendizados;
- acompanhar experimentos;
- manter a memória estratégica do Portal.

---

# 1. CONTEXTO

A Legenda Digital é uma plataforma de mídia, inteligência e utilidade para negócios na era da IA.

Posicionamento:

> **Inteligência prática para negócios na era da IA.**

Tagline:

> **Conhecimento que gera crescimento real.**

O Portal deve operar como:

**Conteúdo  
→ Utilidade  
→ Audiência própria  
→ Recorrência  
→ Comunidade  
→ Dados consentidos  
→ Inteligência  
→ Distribuição**

O Super Admin deve permitir administrar esse sistema.

---

# 2. FRONTEIRA DO PRODUTO

Este Super Admin pertence exclusivamente ao:

**Legenda Digital Portal**

Não pertence ao:

- Growth OS;
- Lunior;
- Form.miga;
- Ronildo Palmeira.

Não compartilhar:

Auth administrativo;

banco;

permissões;

analytics operacional;

roadmap;

dados privados.

Growth OS pode aparecer como produto divulgado pelo Portal.

Não deve fazer parte da arquitetura operacional do Admin.

---

# 3. PRINCÍPIO CENTRAL

O Super Admin deve responder:

> O que estamos publicando?

> O que as pessoas estão consumindo?

> O que estão usando?

> Onde estão voltando?

> Quais temas despertam interesse?

> Quais ferramentas geram utilidade?

> O que converte para newsletter?

> O que gera participação na comunidade?

> O que estamos aprendendo?

> Qual evidência deveria mudar nossas próximas decisões?

---

# 4. ROTA

Usar:

/admin

A área deve ser completamente separada do frontend público.

Nunca incluir Admin na navegação ou footer público.

---

# 5. RBAC

Implementar papéis:

platform_owner  
super_admin  
editorial_admin  
editor  
researcher  
newsletter_admin  
community_admin  
tools_admin  
intelligence_admin  
moderator  
analyst  
viewer.

Permissões granulares:

articles.read  
articles.write  
articles.publish  
categories.manage  
authors.manage  
comments.manage  
newsletter.manage  
community.manage  
tools.manage  
intelligence.read  
intelligence.manage  
users.read  
media.manage  
settings.manage  
project_memory.manage.

Não depender apenas de:

is_admin = true.

---

# 6. AUDIT LOG

Toda ação administrativa sensível deve gerar registro.

Exemplos:

artigo publicado;

conteúdo removido;

usuário moderado;

comentário ocultado;

newsletter enviada;

tool modificada;

configuração alterada;

permissão administrativa concedida.

Campos:

actor  
action  
entity  
entity_id  
before  
after  
timestamp  
metadata.

---

# 7. ESTRUTURA PRINCIPAL DO ADMIN

Menu recomendado:

## OVERVIEW

Dashboard

## EDITORIAL

Articles  
Categories  
Tags  
Authors  
Research  
Comments  
Media

## AUDIENCE

Newsletter  
Community  
Users

## UTILITY

Tools

## INTELLIGENCE

Analytics  
Intelligence  
Experiments

## PROJECT MEMORY

Timeline  
Hypotheses  
Decisions  
Learnings  
Assets  
Do Not Repeat

## SYSTEM

Settings  
Audit Logs.

---

# 8. DASHBOARD

A tela inicial deve mostrar somente métricas reais.

Blocos:

## Editorial

published articles  
drafts  
scheduled  
articles updated.

## Audience

newsletter subscribers  
returning users  
registered users.

## Tools

tool starts  
tool completions  
saved runs.

## Community

members  
posts  
replies  
unanswered discussions.

## Distribution

organic  
direct  
newsletter  
social  
referral.

## Intelligence

open hypotheses  
active experiments  
recent learnings.

---

# 9. NÃO INVENTAR MÉTRICAS

Quando uma métrica ainda não estiver sendo coletada:

mostrar:

> sem dados

ou:

> medição ainda não disponível

Não usar zero quando isso puder sugerir uma medição inexistente.

---

# 10. EDITORIAL

Criar:

/admin/articles

Workflow:

Draft  
→ Review  
→ Approved  
→ Scheduled  
→ Published  
→ Updated  
→ Archived.

---

# 11. ARTICLE MODEL

Campos:

title  
slug  
subtitle  
excerpt  
body  
hero image  
author  
reviewer  
category  
tags  
topics  
content type  
status  
featured  
published_at  
updated_at  
reading_time.

SEO:

meta title  
meta description  
canonical  
OG image  
schema.

Editorial:

central question  
thesis  
references  
related articles  
related tools  
related newsletter issue.

---

# 12. CONTENT TYPES

Suportar:

Article  
Guide  
Analysis  
Research  
Building Note  
Opinion  
Case Study  
Tool Guide.

Manter classificação editorial consistente.

---

# 13. BLOCK EDITOR

Suportar:

paragraph  
heading  
image  
gallery  
quote  
callout  
table  
list  
code  
divider  
video  
embed  
diagram  
chart  
CTA  
FAQ  
source  
reference  
related content.

Não usar HTML bruto como interface primária.

---

# 14. PREVIEW

Permitir:

desktop  
tablet  
mobile  
SEO  
social preview.

Utilizar o mesmo renderer do frontend público.

---

# 15. RESEARCH

Criar:

/admin/research

Campos:

topic  
question  
sources  
claims  
notes  
status.

Status:

collecting  
reviewing  
ready  
used  
archived.

---

# 16. SOURCES

Criar biblioteca de fontes.

Campos:

title  
author  
organization  
URL  
publication date  
access date  
quality  
type  
topic  
used_in.

Tipos:

primary  
secondary  
analysis  
opinion.

---

# 17. CLAIMS

Permitir registrar afirmações relevantes.

Tipos:

Verified Fact  
Analysis  
Hypothesis  
Opinion.

Cada claim:

statement  
source  
evidence  
confidence  
used_in.

Isso deve ajudar a preservar rigor editorial.

---

# 18. CATEGORIES

Administrar categorias sem depender de código.

Categorias iniciais podem incluir:

Futuro  
Aplicação  
Construção  
Growth & Negócios  
Pesquisa.

---

# 19. COMMENTS

Criar:

/admin/comments

Statuses:

pending  
published  
hidden  
spam  
deleted.

Permitir:

review  
publish  
hide  
spam  
delete  
restore.

Nested replies lógicas.

Máximo de 3 níveis visuais no frontend.

---

# 20. MEDIA LIBRARY

Criar:

/admin/media

Tipos:

article covers  
OG images  
screenshots  
charts  
diagrams  
documents  
community assets.

Campos:

filename  
type  
dimensions  
alt  
caption  
credit  
used_in  
created_at.

---

# 21. NEWSLETTER — LD BRIEF

Criar:

/admin/newsletter

Gerenciar:

subscribers  
preferences  
consents  
issues  
deliveries  
events.

---

# 22. SUBSCRIBERS

Campos:

email  
name opcional  
status  
source  
consent_type  
consented_at  
privacy_version  
signup_page  
created_at.

Status:

pending  
subscribed  
unsubscribed  
bounced  
complained.

---

# 23. NEWSLETTER ISSUES

Workflow:

Draft  
→ Review  
→ Scheduled  
→ Sent.

Campos:

subject  
preheader  
body  
author  
date  
segment  
status.

---

# 24. NEWSLETTER ANALYTICS

Acompanhar:

subscriber growth  
sources  
clicks quando confiáveis  
responses  
unsubscribes  
deliveries.

Não tratar open rate como métrica absoluta de qualidade.

---

# 25. TOOLS

Criar:

/admin/tools

Administrar inicialmente:

CLARO Workspace  
Auditoria de qualidade de conteúdo  
Calculadora de conversão e funil  
Planner editorial  
Diagnóstico de maturidade de crescimento  
CAC/LTV/Payback  
Auditoria de follow-up  
Auditoria SEO/AEO/GEO.

---

# 26. TOOL MODEL

Campos:

name  
slug  
description  
category  
version  
status  
input schema  
result schema  
calculation schema  
requires auth  
allows anonymous  
SEO fields.

---

# 27. TOOL PERFORMANCE

Por ferramenta mostrar:

views  
starts  
completion  
drop-off  
saves  
exports  
repeat usage  
newsletter conversions.

Não criar benchmark sem base metodológica.

---

# 28. TOOL RUNS

Permitir análise agregada de:

tool  
version  
anonymous/user  
started_at  
completed_at  
result summary  
source  
UTMs  
referrer  
consent.

Proteger dados privados.

---

# 29. COMMUNITY

Criar:

/admin/community

Áreas:

Topics  
Posts  
Replies  
Members  
Reports  
Moderation.

---

# 30. COMMUNITY TOPICS

Inicialmente:

IA  
Marketing  
Vendas  
Growth  
Tecnologia  
Conteúdo  
Negócios  
Building Legenda Digital.

---

# 31. COMMUNITY MODERATION

Statuses:

published  
pending  
hidden  
spam  
deleted.

Ações:

approve  
hide  
restore  
spam  
delete  
suspend user.

Tudo com audit log.

---

# 32. USERS

Criar:

/admin/users

Mostrar:

profile  
account date  
activity  
saved content  
tool history  
community participation  
newsletter preference.

Não mostrar senha.

Não expor dados além do necessário.

---

# 33. ACCOUNT SIGNALS

Acompanhar:

account_created  
article_saved  
tool_saved  
tool_reused  
community_post_created  
newsletter_subscribed.

O objetivo é entender recorrência.

---

# 34. ANALYTICS

Criar:

/admin/analytics

Separar:

Content  
Tools  
Newsletter  
Community  
Acquisition  
Retention.

---

# 35. CONTENT ANALYTICS

Métricas:

views  
engaged time  
25%  
50%  
75%  
completion  
shares  
comments  
newsletter clicks  
tool clicks.

---

# 36. ACQUISITION

Mostrar:

Organic  
Direct  
Newsletter  
LinkedIn  
Instagram  
YouTube  
Referral  
Paid quando houver.

Persistir:

first touch  
last non-direct.

---

# 37. FIRST-PARTY INTELLIGENCE

Criar:

/admin/intelligence

Objetivo:

transformar comportamento agregado em sinais internos.

Exemplos:

temas mais consumidos;

tools mais usadas;

pontos de drop-off;

conteúdos que geram assinatura;

temas associados a retorno;

origens com maior recorrência;

assuntos mais discutidos na Community.

---

# 38. REGRA DE INTELLIGENCE

Separar explicitamente:

Data

Observation

Interpretation

Hypothesis.

Nunca apresentar interpretação como dado.

---

# 39. INSIGHT CANDIDATES

Criar fluxo:

Data  
→ Pattern  
→ Insight Candidate  
→ Editorial Review  
→ Publish / Reject.

Nenhum insight deve virar conteúdo automaticamente.

---

# 40. GROWTH INTELLIGENCE

Growth Intelligence deve poder consumir:

conteúdo;

dados agregados das tools;

newsletter;

community;

analytics.

Mas não deve publicar dados privados ou PII.

---

# 41. EXPERIMENTS

Criar:

/admin/experiments

Campos:

hypothesis  
problem  
audience  
experiment  
metric  
success criteria  
start  
end  
result  
decision.

Status:

planned  
running  
completed  
invalidated  
inconclusive.

---

# 42. PROJECT MEMORY

Criar:

/admin/project-memory

Esse módulo deve funcionar como memória estratégica do Portal.

Subáreas:

Timeline  
Hypotheses  
Experiments  
Decisions  
Learnings  
Assets  
Do Not Repeat.

---

# 43. TIMELINE

Registrar:

lançamento de seção;

artigo importante;

tool lançada;

newsletter enviada;

experimento iniciado;

hipótese criada;

decisão;

mudança editorial;

incidente;

milestone;

aprendizado.

---

# 44. HYPOTHESES

Cada hipótese:

ID  
statement  
problem  
audience  
evidence  
confidence  
metric  
success criteria  
status.

Status:

open  
testing  
validated  
invalidated  
inconclusive.

---

# 45. DECISION RECORDS

Campos:

ID  
date  
context  
decision  
reason  
evidence  
alternatives  
impact  
review condition  
status.

Exemplo:

Decisão:

reduzir ferramentas exibidas na Home de 8 para 4.

Motivo:

reduzir densidade e melhorar foco.

---

# 46. LEARNINGS

Tipos:

Audience  
Editorial  
Tools  
Newsletter  
Community  
Distribution  
Product  
Technology  
Business.

Campos:

statement  
source  
evidence  
confidence  
impact  
related experiment.

---

# 47. ASSETS

Classificar:

Technology  
Knowledge  
Process  
Data  
Distribution  
Audience  
Intellectual Property.

Exemplos:

Tools Engine  
Editorial CMS  
newsletter infrastructure  
audience dataset  
SEO authority  
content library  
community knowledge.

---

# 48. DO NOT REPEAT

Registrar explicitamente:

seções sem uso;

conteúdos sem interesse;

canais ruins;

features ignoradas;

experimentos inválidos;

problemas técnicos recorrentes;

mensagens confusas;

decisões revertidas.

---

# 49. CROSS-PROJECT LEARNING

Permitir marcar registros:

cross_project = true.

Projetos possíveis:

Lunior  
Growth OS  
Form.miga  
Ronildo Palmeira.

Exemplo:

A Auditoria de Follow-up mostra padrão recorrente de oportunidades sem próximo passo.

Isso pode gerar:

artigo na Legenda Digital;

tese em Ronildo Palmeira;

insight para Growth OS.

Não compartilhar dados individuais.

---

# 50. DOCUMENTAÇÃO VERSIONADA

Manter no repositório:

/docs/project-memory/

README.md  
DECISIONS.md  
LEARNINGS.md  
EXPERIMENTS.md  
ASSETS.md  
DO-NOT-REPEAT.md.

Opcional:

/records/

LD-2026-001.yaml  
LD-2026-002.yaml.

---

# 51. SYNC PROJECT MEMORY

Criar processo para gerar documentação aprovada.

Outputs possíveis:

PROJECT_HISTORY.md  
EDITORIAL_DECISIONS.md  
PRODUCT_DECISIONS.md  
LEARNINGS.md  
ROADMAP_CONTEXT.md  
ARCHITECTURE_DECISIONS.md.

---

# 52. ROADMAP

Criar:

/admin/roadmap

Visões:

Now  
Next  
Later.

Cada item precisa mostrar:

problem  
evidence  
hypothesis  
priority  
owner  
status.

Não permitir roadmap puramente baseado em feature request.

---

# 53. BUILDING LEGENDA DIGITAL

Administrar:

/admin/building

Ou utilizar content type próprio.

Cada entrada deve registrar:

project area  
problem  
decision  
execution  
result  
learning  
next step.

Building deve mostrar processo real.

---

# 54. HOME MANAGEMENT

Admin deve controlar:

hero  
featured articles  
LD Brief section  
featured tools  
Community section  
Building section  
product referrals.

Evitar page builder genérico excessivamente complexo.

---

# 55. SEARCH

Busca administrativa global:

article  
author  
source  
tool  
user  
community post  
decision  
learning  
experiment.

---

# 56. ALERTS

Alertas possíveis:

article publication failure;

newsletter delivery issue;

tool error spike;

spam increase;

moderation queue;

drop in signup conversion;

system health issue.

Evitar excesso.

---

# 57. SYSTEM HEALTH

Criar:

/admin/system

Mostrar:

database  
API  
storage  
email provider  
analytics events  
background jobs  
errors.

---

# 58. PRIVACY

Administrar:

consent  
data export  
deletion requests  
newsletter preferences.

Não expor PII desnecessariamente.

---

# 59. SECURITY

Obrigatório:

RLS  
RBAC  
audit logs  
rate limiting  
input validation  
anti-XSS  
safe uploads  
secret isolation  
backup strategy.

---

# 60. PERFORMANCE

Separar bundles:

Public Portal  
Admin.

Não carregar bibliotecas administrativas no frontend público.

Monitorar:

LCP  
CLS  
INP.

---

# 61. SEO

Admin deve permitir gerenciar:

metadata  
canonical  
OG  
Article schema  
Breadcrumb schema  
sitemap visibility  
robots.

---

# 62. ACCESSIBILITY

Validar no Admin e Portal:

keyboard  
focus  
labels  
contrast  
errors  
headings.

---

# 63. GROWTH OS

No Portal, Growth OS deve ser tratado apenas como:

**produto divulgado pela Legenda Digital.**

Super Admin pode medir:

growth_os_referral_clicked.

Metadata:

source_page  
source_type  
source_id  
campaign.

Não administrar CRM, pipeline ou usuários Growth OS dentro deste Admin.

---

# 64. NÃO CONSTRUIR AGORA

Não construir inicialmente:

complex predictive BI;

autonomous editorial agents;

automatic publishing;

advanced recommendation engine;

31 tools completas;

complex community reputation;

shared admin com Growth OS;

cross-product SSO.

---

# 65. MILESTONE 1 — FOUNDATION

Construir:

Admin shell  
RBAC  
Audit Logs  
Dashboard  
Users  
Media.

---

# 66. MILESTONE 2 — EDITORIAL

Construir/consolidar:

Articles  
Editor  
Categories  
Tags  
Authors  
Research  
Sources  
Comments  
SEO.

---

# 67. MILESTONE 3 — LD BRIEF

Construir:

Subscribers  
Consent  
Issues  
Deliveries  
Analytics  
Unsubscribe.

---

# 68. MILESTONE 4 — TOOLS

Construir:

Tools Admin  
Tools Engine visibility  
Tool Runs  
Usage analytics  
8 tools atuais.

---

# 69. MILESTONE 5 — ANALYTICS & INTELLIGENCE

Construir:

Content analytics  
Acquisition  
Retention  
Tools analytics  
Newsletter analytics  
Intelligence.

---

# 70. MILESTONE 6 — COMMUNITY

Construir:

Topics  
Posts  
Members  
Reports  
Moderation.

---

# 71. MILESTONE 7 — PROJECT MEMORY

Construir:

Timeline  
Hypotheses  
Experiments  
Decisions  
Learnings  
Assets  
Do Not Repeat  
Cross-project learning.

---

# 72. MILESTONE 8 — CONSOLIDATION

Concluir:

Roadmap  
System Health  
Settings  
Search  
Alerts  
Final QA.

---

# 73. DEFINITION OF DONE

O Super Admin V1 estará concluído quando permitir:

✓ publicar e administrar conteúdo;

✓ administrar categorias e autores;

✓ operar comentários;

✓ operar LD Brief;

✓ administrar tools;

✓ acompanhar tool usage;

✓ administrar Community;

✓ consultar usuários;

✓ medir aquisição;

✓ medir recorrência;

✓ identificar padrões;

✓ registrar experimentos;

✓ registrar decisões;

✓ registrar aprendizados;

✓ identificar ativos;

✓ preservar Do Not Repeat;

✓ registrar cross-project learning;

✓ gerar documentação;

✓ acompanhar saúde do Portal.

---

# 74. PRINCÍPIO FINAL

O Super Admin da Legenda Digital não deve ser apenas:

> **um CMS com gráficos.**

Ele deve funcionar como:

> **o sistema operacional de mídia, audiência, utilidade e inteligência da Legenda Digital.**

Conteúdo gera atenção.

Ferramentas geram utilidade.

Newsletter gera recorrência.

Community gera relacionamento.

Dados consentidos geram aprendizado.

Aprendizado melhora conteúdo, ferramentas e distribuição.

O Project Memory preserva esse aprendizado.

E a Legenda Digital se torna progressivamente mais inteligente a cada ciclo.