begin;
-- Portal only. Answer/result/saved-run equivalents are co-located in tool_runs,
-- atomically owned by one authenticated user. Anonymous inputs stay in the browser.
create table public.tools (
 id text primary key check(id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 slug text not null unique check(slug=id), name text not null check(length(name) between 3 and 100),
 description text not null check(length(description)<=500), category text not null,
 version integer not null default 1 check(version>0), status text not null default 'published' check(status in ('published','paused')),
 requires_auth boolean not null default false, allows_anonymous boolean not null default true,
 capture_strategy text not null default 'optional-save' check(capture_strategy='optional-save'),
 related_content jsonb not null default '[]', related_tools jsonb not null default '[]',
 primary_cta text not null default 'Salvar resultado', secondary_cta text not null default 'Copiar resultado',
 seo_title text not null, seo_description text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tool_versions (
 tool_id text not null references public.tools(id), version integer not null check(version>0),
 input_schema jsonb not null check(jsonb_typeof(input_schema)='array'),
 calculation_schema jsonb not null check(jsonb_typeof(calculation_schema)='object'),
 result_schema jsonb not null check(jsonb_typeof(result_schema)='object'),
 methodology text not null, limitations text not null, created_at timestamptz not null default now(),
 primary key(tool_id,version)
);
create table public.tool_runs (
 id uuid primary key default gen_random_uuid(), tool_id text not null,
 tool_version integer not null, user_id uuid not null references auth.users(id) on delete cascade,
 anonymous_id uuid check(anonymous_id is null), session_id uuid not null,
 name text not null check(length(name) between 1 and 120), favorite boolean not null default false,
 started_at timestamptz not null, completed_at timestamptz not null default now(),
 answers jsonb not null check(jsonb_typeof(answers)='object' and octet_length(answers::text)<=32768),
 result_summary jsonb not null check(jsonb_typeof(result_summary)='object' and octet_length(result_summary::text)<=32768),
 attribution jsonb not null default '{}' check(jsonb_typeof(attribution)='object' and octet_length(attribution::text)<=2048),
 landing_page text not null check(landing_page='/ferramentas/'||tool_id),
 consent_state jsonb not null check(consent_state = '{"history":true,"intelligence":false,"privacy_version":"tools-v1-2026-10-12"}'::jsonb),
 foreign key(tool_id,tool_version) references public.tool_versions(tool_id,version),
 check(started_at<=completed_at and started_at>=completed_at-interval '7 days')
);
create index tool_runs_owner_date_idx on public.tool_runs(user_id,completed_at desc);
create index tool_runs_version_idx on public.tool_runs(tool_id,tool_version);
create table public.tool_consents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 purpose text not null check(purpose='private_history'), privacy_version text not null check(privacy_version='tools-v1-2026-10-12'),
 granted boolean not null check(granted), created_at timestamptz not null default now()
);
create index tool_consents_owner_idx on public.tool_consents(user_id,created_at desc);
create table public.tool_exports (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.tool_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 format text not null check(format in ('csv','txt')), created_at timestamptz not null default now()
);
create index tool_exports_owner_idx on public.tool_exports(user_id,created_at desc);
create index tool_exports_run_idx on public.tool_exports(run_id);
-- Minimal consented operational counters: no answers, result scores, identity,
-- email, anonymous/session identifiers, referrer or arbitrary metadata.
create table public.tool_events (
 id uuid primary key default gen_random_uuid(), tool_id text not null references public.tools(id),
 event_name text not null check(event_name in ('tool_viewed','tool_started','tool_step_completed','tool_completed','tool_saved','tool_exported','tool_shared')),
 step_key text check(step_key ~ '^[a-z0-9_]{1,60}$'),
 consent boolean not null check(consent), privacy_version text not null default 'tools-v1-2026-10-12' check(privacy_version='tools-v1-2026-10-12'),
 created_at timestamptz not null default now()
);
create index tool_events_date_idx on public.tool_events(created_at);
create index tool_events_tool_date_idx on public.tool_events(tool_id,created_at desc);
create table public.tool_admin_audit (
 id uuid primary key default gen_random_uuid(), tool_id text not null references public.tools(id),
 actor_id uuid references auth.users(id) on delete set null, action text not null,
 created_at timestamptz not null default now()
);
create index tool_admin_audit_tool_idx on public.tool_admin_audit(tool_id,created_at desc);
create index tool_admin_audit_actor_idx on public.tool_admin_audit(actor_id);

do $$ declare t text; begin
 foreach t in array array['tools','tool_versions','tool_runs','tool_consents','tool_exports','tool_events','tool_admin_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
grant select on public.tools,public.tool_versions to anon,authenticated;
grant update(name,description,status) on public.tools to authenticated;
create policy tools_public on public.tools for select to anon,authenticated using(true);
create policy versions_public on public.tool_versions for select to anon,authenticated using(true);
create policy tools_admin_update on public.tools for update to authenticated
 using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')))
 with check(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));
grant select,insert,delete on public.tool_runs to authenticated;
grant update(name,favorite) on public.tool_runs to authenticated;
create policy runs_owner_read on public.tool_runs for select to authenticated using(user_id=(select auth.uid()));
create policy runs_owner_insert on public.tool_runs for insert to authenticated with check(user_id=(select auth.uid()) and completed_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy runs_owner_update on public.tool_runs for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy runs_owner_delete on public.tool_runs for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,delete on public.tool_consents to authenticated;
create policy consents_owner on public.tool_consents for select to authenticated using(user_id=(select auth.uid()));
create policy consents_insert on public.tool_consents for insert to authenticated with check(user_id=(select auth.uid()) and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy consents_delete on public.tool_consents for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert on public.tool_exports to authenticated;
create policy exports_owner on public.tool_exports for select to authenticated using(user_id=(select auth.uid()));
create policy exports_insert on public.tool_exports for insert to authenticated with check(user_id=(select auth.uid()) and created_at between now()-interval '1 minute' and now()+interval '1 minute' and exists(select 1 from public.tool_runs r where r.id=run_id and r.user_id=(select auth.uid())));
grant insert on public.tool_events to anon,authenticated;
grant select on public.tool_events,public.tool_admin_audit to authenticated;
create policy events_insert on public.tool_events for insert to anon,authenticated with check(consent and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy events_admin on public.tool_events for select to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));
create policy audit_admin on public.tool_admin_audit for select to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));

-- Trigger-only privilege boundary: anon cannot read counters, so global write
-- bounds live in private. Not callable through the Data API. Advisory locks
-- serialize concurrent writes; a cap is abuse protection, not bot-proof analytics.
create function private.guard_tool_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('ld-tool-events-'||new.tool_id));
 if not exists(select 1 from public.tools where id=new.tool_id and status='published') then raise exception 'Tool unavailable'; end if;
 if new.step_key is not null and not exists(select 1 from public.tool_versions v,jsonb_array_elements(v.input_schema) f where v.tool_id=new.tool_id and f->>'id'=new.step_key) then raise exception 'Invalid tool step'; end if;
 if (select count(*) from public.tool_events where tool_id=new.tool_id and created_at>now()-interval '1 minute')>=300 then raise exception 'Tool event limit'; end if;
 return new;
end $$;
revoke all on function private.guard_tool_event() from public,anon,authenticated;
create trigger tool_event_guard before insert on public.tool_events for each row execute function private.guard_tool_event();
create function private.guard_tool_run() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is distinct from auth.uid() then raise exception 'Own account required'; end if;
 perform pg_advisory_xact_lock(hashtext('ld-tool-runs-'||new.user_id::text));
 if not exists(select 1 from public.tools where id=new.tool_id and status='published' and version=new.tool_version) then raise exception 'Tool version unavailable'; end if;
 if (select count(*) from public.tool_runs where user_id=new.user_id)>=1000 or (select count(*) from public.tool_runs where user_id=new.user_id and completed_at>now()-interval '1 minute')>=30 then raise exception 'Private history limit'; end if;
 return new;
end $$;
revoke all on function private.guard_tool_run() from public,anon,authenticated;
create trigger tool_run_guard before insert on public.tool_runs for each row execute function private.guard_tool_run();
create function private.audit_tool_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.site_staff where user_id=auth.uid() and role in ('admin','super_admin')) then raise exception 'Admin required'; end if;
 new.updated_at=now();
 insert into public.tool_admin_audit(tool_id,actor_id,action) values(new.id,auth.uid(),'configuration_updated');
 return new;
end $$;
revoke all on function private.audit_tool_change() from public,anon,authenticated;
create trigger tool_admin_audit_trigger before update on public.tools for each row execute function private.audit_tool_change();

create function public.save_tool_run(p_id uuid,p_tool_id text,p_version integer,p_name text,p_answers jsonb,p_result jsonb,p_started_at timestamptz,p_session_id uuid,p_attribution jsonb default '{}') returns uuid language plpgsql security invoker set search_path='' as $$
declare own_id uuid=auth.uid(); saved uuid;
begin
 if own_id is null then raise exception 'Sign in required'; end if;
 select id into saved from public.tool_runs where id=p_id and user_id=own_id;
 if saved is not null then return saved; end if;
 insert into public.tool_consents(user_id,purpose,privacy_version,granted) values(own_id,'private_history','tools-v1-2026-10-12',true);
 insert into public.tool_runs(id,tool_id,tool_version,user_id,session_id,name,answers,result_summary,started_at,landing_page,attribution,consent_state)
 values(p_id,p_tool_id,p_version,own_id,p_session_id,p_name,p_answers,p_result,p_started_at,'/ferramentas/'||p_tool_id,p_attribution,'{"history":true,"intelligence":false,"privacy_version":"tools-v1-2026-10-12"}') returning id into saved;
 return saved;
end $$;
revoke all on function public.save_tool_run(uuid,text,integer,text,jsonb,jsonb,timestamptz,uuid,jsonb) from public,anon;
grant execute on function public.save_tool_run(uuid,text,integer,text,jsonb,jsonb,timestamptz,uuid,jsonb) to authenticated;

create view public.tool_usage_summary with(security_invoker=true) as
 select t.id as tool_id,t.name,t.status,
 count(e.id) filter(where e.event_name='tool_viewed') as views,
 count(e.id) filter(where e.event_name='tool_started') as starts,
 count(e.id) filter(where e.event_name='tool_completed') as completions,
 count(e.id) filter(where e.event_name='tool_saved') as saves,
 count(e.id) filter(where e.event_name='tool_exported') as exports
 from public.tools t left join public.tool_events e on e.tool_id=t.id and e.created_at>=now()-interval '30 days'
 group by t.id,t.name,t.status;
revoke all on public.tool_usage_summary from public,anon;
grant select on public.tool_usage_summary to authenticated;
-- Results never participate in this usage view. Scores/segments/intelligence
-- require a separate consented, thresholded editorial pipeline (milestone 6).
insert into public.tools(id,slug,name,description,category,version,status,requires_auth,allows_anonymous,capture_strategy,related_content,related_tools,primary_cta,secondary_cta,seo_title,seo_description) values('claro','claro','Estruturador CLARO','Transforme contexto, limites e objetivos em uma instrução organizada.','IA',1,'published',false,true,'optional-save','["como-aplicar-ia-no-negocio"]','["checklist-conteudo"]','Salvar resultado','Copiar resultado','Estruturador CLARO','Transforme contexto, limites e objetivos em uma instrução organizada.');
insert into public.tool_versions(tool_id,version,input_schema,calculation_schema,result_schema,methodology,limitations) values('claro',1,'[{"id":"context","label":"Contexto","type":"textarea","placeholder":"Quem é a marca? Qual é a situação?"},{"id":"limits","label":"Limite","type":"textarea","placeholder":"Restrições, prazo e o que evitar."},{"id":"action","label":"Ação","type":"textarea","placeholder":"Qual tarefa precisa ser feita?"},{"id":"result","label":"Resultado","type":"textarea","placeholder":"Formato e critérios de qualidade."},{"id":"notes","label":"Observação","type":"textarea","placeholder":"Informações adicionais e pontos de atenção."}]','{"method":"claro","version":1}','{"format":"text-lines-v1"}','Organiza os campos preenchidos na sequência Contexto, Limite, Ação, Resultado e Observação. Não faz chamadas a modelos de IA.','A qualidade depende das informações fornecidas. Revise fatos e evite informações pessoais ou confidenciais.');
insert into public.tools(id,slug,name,description,category,version,status,requires_auth,allows_anonymous,capture_strategy,related_content,related_tools,primary_cta,secondary_cta,seo_title,seo_description) values('checklist-conteudo','checklist-conteudo','Checklist de conteúdo','Revise clareza, fontes, utilidade e distribuição antes de publicar.','Conteúdo',1,'published',false,true,'optional-save','["conteudo-e-audiencia-com-proposito"]','["planner-editorial"]','Salvar resultado','Copiar resultado','Checklist de conteúdo','Revise clareza, fontes, utilidade e distribuição antes de publicar.');
insert into public.tool_versions(tool_id,version,input_schema,calculation_schema,result_schema,methodology,limitations) values('checklist-conteudo',1,'[{"id":"criterion_1","label":"O público e a pergunta principal estão claros.","type":"checkbox"},{"id":"criterion_2","label":"O título descreve o que o leitor vai encontrar.","type":"checkbox"},{"id":"criterion_3","label":"As afirmações têm fonte ou estão identificadas como opinião.","type":"checkbox"},{"id":"criterion_4","label":"Datas, nomes e números foram revisados.","type":"checkbox"},{"id":"criterion_5","label":"A peça tem uma aplicação ou próximo passo útil.","type":"checkbox"},{"id":"criterion_6","label":"As imagens têm permissão de uso e texto alternativo.","type":"checkbox"},{"id":"criterion_7","label":"Links e chamadas para ação foram testados.","type":"checkbox"},{"id":"criterion_8","label":"O texto está legível no celular.","type":"checkbox"},{"id":"criterion_9","label":"O conteúdo respeita a voz da marca.","type":"checkbox"},{"id":"criterion_10","label":"O canal e a data de distribuição foram definidos.","type":"checkbox"}]','{"method":"checklist-conteudo","version":1}','{"format":"text-lines-v1"}','Cada critério marcado conta como uma revisão concluída. O total representa progresso de revisão, não uma nota de qualidade.','Não substitui avaliação editorial ou checagem de fatos.');
insert into public.tools(id,slug,name,description,category,version,status,requires_auth,allows_anonymous,capture_strategy,related_content,related_tools,primary_cta,secondary_cta,seo_title,seo_description) values('calculadora-conversao','calculadora-conversao','Calculadora de conversão','Calcule a taxa entre visitas e ações com os seus próprios dados.','Growth',1,'published',false,true,'optional-save','["metricas-alem-do-alcance"]','["checklist-conteudo"]','Salvar resultado','Copiar resultado','Calculadora de conversão','Calcule a taxa entre visitas e ações com os seus próprios dados.');
insert into public.tool_versions(tool_id,version,input_schema,calculation_schema,result_schema,methodology,limitations) values('calculadora-conversao',1,'[{"id":"visits","label":"Visitas ou oportunidades","type":"number","min":1},{"id":"actions","label":"Ações concluídas","type":"number","min":0}]','{"method":"calculadora-conversao","version":1}','{"format":"text-lines-v1"}','Taxa de conversão = ações ÷ visitas × 100. Use inteiros do mesmo período e funil; ações não podem superar visitas.','Não há taxa ideal universal. A ferramenta não prevê vendas nem atribui causalidade.');
insert into public.tools(id,slug,name,description,category,version,status,requires_auth,allows_anonymous,capture_strategy,related_content,related_tools,primary_cta,secondary_cta,seo_title,seo_description) values('planner-editorial','planner-editorial','Planner editorial','Organize tema, formato, canal e data. Exporte seu planejamento.','Conteúdo',1,'published',false,true,'optional-save','["creators-rotina-de-publicacao"]','["checklist-conteudo","claro"]','Salvar resultado','Copiar resultado','Planner editorial','Organize tema, formato, canal e data. Exporte seu planejamento.');
insert into public.tool_versions(tool_id,version,input_schema,calculation_schema,result_schema,methodology,limitations) values('planner-editorial',1,'[{"id":"rows","label":"Pautas","type":"rows"}]','{"method":"planner-editorial","version":1}','{"format":"text-lines-v1"}','Organiza até 50 pautas, com tema, formato, canal e data. O resultado reproduz o planejamento informado.','Não sugere audiência, receita ou desempenho. A data é uma intenção de publicação.');

-- Bound exports per private account as well as run creation.
create function private.guard_tool_export() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is distinct from auth.uid() then raise exception 'Own account required'; end if;
 perform pg_advisory_xact_lock(hashtext('ld-tool-exports-'||new.user_id::text));
 if (select count(*) from public.tool_exports where user_id=new.user_id and created_at>now()-interval '1 minute')>=30 then raise exception 'Export limit'; end if;
 return new;
end $$;
revoke all on function private.guard_tool_export() from public,anon,authenticated;
create trigger tool_export_guard before insert on public.tool_exports for each row execute function private.guard_tool_export();
-- Maintenance is not available to the Data API; bounded batches run every five
-- minutes when the existing hosted pg_cron extension is available.
create function private.prune_tool_data() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.tool_events where id in (select id from public.tool_events where created_at<now()-interval '90 days' order by created_at limit 10000);
 delete from public.tool_runs where id in (select id from public.tool_runs where completed_at<now()-interval '365 days' order by completed_at limit 10000);
 delete from public.tool_consents where id in (select id from public.tool_consents where created_at<now()-interval '365 days' order by created_at limit 10000);
 delete from public.tool_admin_audit where id in (select id from public.tool_admin_audit where created_at<now()-interval '365 days' order by created_at limit 10000);
end $$;
revoke all on function private.prune_tool_data() from public,anon,authenticated;
create index tool_runs_retention_idx on public.tool_runs(completed_at);
create index tool_consents_retention_idx on public.tool_consents(created_at);
create index tool_audit_retention_idx on public.tool_admin_audit(created_at);
do $$ begin
 if to_regclass('cron.job') is not null then
  execute $cmd$select cron.schedule('ld-portal-tools-retention','*/5 * * * *','select private.prune_tool_data();')$cmd$;
 end if;
end $$;

commit;
