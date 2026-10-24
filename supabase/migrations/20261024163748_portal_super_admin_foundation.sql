begin;
-- Portal only. Apply after all preceding migrations; no staff/user row is changed.
alter table public.site_staff drop constraint site_staff_role_check;
alter table public.site_staff add constraint site_staff_role_check check(role in ('platform_owner','super_admin','editorial_admin','editor','researcher','newsletter_admin','community_admin','tools_admin','intelligence_admin','moderator','analyst','viewer','admin','author'));
create or replace function private.portal_role_permissions(p_role text) returns text[]
language sql immutable security invoker set search_path='' as $$
 select case p_role
 when 'platform_owner' then array['dashboard.read','articles.read','articles.write','articles.create','articles.edit','articles.approve','articles.publish','categories.manage','authors.manage','comments.manage','comments.read','comments.moderate','newsletter.manage','community.manage','tools.manage','intelligence.read','intelligence.manage','users.read','media.manage','settings.manage','project_memory.manage','audit.read','contacts.manage']::text[]
 when 'super_admin' then array['dashboard.read','articles.read','articles.write','articles.create','articles.edit','articles.approve','articles.publish','categories.manage','authors.manage','comments.manage','comments.read','comments.moderate','newsletter.manage','community.manage','tools.manage','intelligence.read','intelligence.manage','users.read','media.manage','settings.manage','project_memory.manage','audit.read','contacts.manage']::text[]
 when 'editorial_admin' then array['dashboard.read','articles.read','articles.write','articles.create','articles.edit','articles.approve','articles.publish','categories.manage','authors.manage','comments.read','comments.manage','comments.moderate','media.manage']::text[]
 when 'editor' then array['dashboard.read','articles.read','articles.write','articles.create','articles.edit','articles.approve','categories.manage','authors.manage','media.manage']::text[]
 when 'researcher' then array['dashboard.read','articles.read','project_memory.manage']::text[]
 when 'newsletter_admin' then array['dashboard.read','newsletter.manage','media.manage']::text[]
 when 'community_admin' then array['dashboard.read','community.manage','comments.read','comments.manage','comments.moderate','media.manage']::text[]
 when 'tools_admin' then array['dashboard.read','tools.manage','media.manage']::text[]
 when 'intelligence_admin' then array['dashboard.read','intelligence.read','intelligence.manage','project_memory.manage']::text[]
 when 'moderator' then array['dashboard.read','comments.read','comments.manage','comments.moderate']::text[]
 when 'analyst' then array['dashboard.read','intelligence.read']::text[]
 when 'viewer' then array['dashboard.read','articles.read']::text[]
 when 'admin' then array['dashboard.read','articles.read','articles.write','articles.create','articles.edit','articles.approve','articles.publish','categories.manage','authors.manage','comments.manage','comments.read','comments.moderate','newsletter.manage','community.manage','tools.manage','intelligence.read','intelligence.manage','users.read','media.manage','settings.manage','project_memory.manage','audit.read','contacts.manage']::text[]
 when 'author' then array['dashboard.read','articles.read','articles.write','articles.create','articles.edit']::text[]
 else array[]::text[] end
$$;
revoke all on function private.portal_role_permissions(text) from public,anon;
grant execute on function private.portal_role_permissions(text) to authenticated;
create or replace function private.can(permission text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.site_staff s where s.user_id=(select auth.uid())
 and permission=any(private.portal_role_permissions(s.role)))
$$;
revoke all on function private.can(text) from public,anon;
grant execute on function private.can(text) to authenticated;

revoke all on public.site_staff from public,anon,authenticated;
grant select on public.site_staff to authenticated;

-- Existing editorial RLS and guards call private.can. Preserve ownership and workflow.
drop policy admin_settings on public.site_settings;
create policy admin_settings on public.site_settings for all to authenticated
 using(private.can('settings.manage')) with check(private.can('settings.manage'));
drop policy editorial_manage on public.community_events;
create policy editorial_manage on public.community_events for all to authenticated
 using(private.can('community.manage')) with check(private.can('community.manage'));
drop policy editorial_manage on public.site_tools;
create policy editorial_manage on public.site_tools for all to authenticated
 using(private.can('tools.manage')) with check(private.can('tools.manage'));
drop policy admin_private on public.community_interests;
create policy admin_private on public.community_interests for all to authenticated
 using(private.can('community.manage')) with check(private.can('community.manage'));
drop policy admin_private on public.analytics_events;
create policy admin_analytics_read on public.analytics_events for select to authenticated using(private.can('intelligence.read'));
drop policy admin_private on public.contact_messages;
create policy admin_private on public.contact_messages for all to authenticated using(private.can('contacts.manage')) with check(private.can('contacts.manage'));
-- Raw tool answers/history stay owner-only, including platform_owner.
drop policy tools_admin_update on public.tools;
create policy tools_admin_update on public.tools for update to authenticated
 using(private.can('tools.manage')) with check(private.can('tools.manage'));
drop policy events_admin on public.tool_events;
create policy events_admin on public.tool_events for select to authenticated using(private.can('tools.manage') or private.can('intelligence.read'));
drop policy audit_admin on public.tool_admin_audit;
create policy audit_admin on public.tool_admin_audit for select to authenticated using(private.can('tools.manage') or private.can('audit.read'));
create or replace function private.audit_tool_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can('tools.manage') then raise exception 'Admin required';end if;
 new.updated_at=now();
 insert into public.tool_admin_audit(tool_id,actor_id,action) values(new.id,auth.uid(),'configuration_updated');
 return new;
end $$;
revoke all on function private.audit_tool_change() from public,anon,authenticated;

do $$declare t text;begin
 foreach t in array array['newsletter_subscribers','newsletter_preferences','newsletter_consents','newsletter_issues','newsletter_deliveries','newsletter_events','newsletter_admin_audit'] loop
 execute format('drop policy newsletter_staff_read on public.%I',t);
 execute format('create policy newsletter_staff_read on public.%I for select to authenticated using(private.can(''newsletter.manage''))',t);
 end loop;
end$$;
drop policy newsletter_issue_create on public.newsletter_issues;
create policy newsletter_issue_create on public.newsletter_issues for insert to authenticated
 with check(status in ('draft','review','scheduled') and sent_at is null and created_by=(select auth.uid()) and private.can('newsletter.manage'));
drop policy newsletter_issue_update on public.newsletter_issues;
create policy newsletter_issue_update on public.newsletter_issues for update to authenticated
 using(status in ('draft','review','scheduled') and private.can('newsletter.manage'))
 with check(status in ('draft','review','scheduled') and sent_at is null and private.can('newsletter.manage'));

drop policy ld_media_write on storage.objects;
create policy ld_media_write on storage.objects for insert to authenticated
 with check(bucket_id in ('content-images','authors','community','site-assets','private-admin') and
 (bucket_id<>'private-admin' and private.can('media.manage') or bucket_id='private-admin' and private.can('settings.manage')));
drop policy ld_private_media_read on storage.objects;
create policy ld_private_media_read on storage.objects for select to authenticated
 using(bucket_id='private-admin' and private.can('settings.manage'));
drop policy ld_editorial_files_insert on storage.objects;
create policy ld_editorial_files_insert on storage.objects for insert to authenticated
 with check(bucket_id='editorial-files' and split_part(name,'/',1)=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|txt|csv|docx|xlsx|pptx|zip|mp3|m4a|wav|mp4|webm)$'
 and (private.can('media.manage') or exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role='author')));

create table public.portal_admin_audit(
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,
 action text not null,entity text not null,entity_id text,
 before jsonb,after jsonb,created_at timestamptz not null default now(),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object')
);
create index portal_admin_audit_created_idx on public.portal_admin_audit(created_at desc,id desc);
create index portal_admin_audit_entity_idx on public.portal_admin_audit(entity,entity_id);
create index portal_admin_audit_actor_idx on public.portal_admin_audit(actor_id,created_at desc);
alter table public.portal_admin_audit enable row level security;
revoke all on public.portal_admin_audit from public,anon,authenticated;
grant select on public.portal_admin_audit to authenticated;
create policy portal_admin_audit_read on public.portal_admin_audit for select to authenticated using(private.can('audit.read'));

-- Fixed allowlist: no body, answers, result_summary, config, email, tokens or secrets.
create function private.portal_audit_snapshot(p_row jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(p_row)
 where key=any(array['id','user_id','role','status','version','active','kind','published_at','sent_at','is_public','locked','suspended','bucket_id'])
$$;
revoke all on function private.portal_audit_snapshot(jsonb) from public,anon,authenticated;
create function private.portal_admin_audit_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare b jsonb; a jsonb; actor uuid; record_id text;
begin
 b:=case when tg_op='INSERT' then null else to_jsonb(old) end;
 a:=case when tg_op='DELETE' then null else to_jsonb(new) end;
 if tg_op='UPDATE' and b=a then return new;end if;
 actor:=auth.uid();
 -- Public submissions and ordinary profile activity are not administrative actions.
 if actor is not null and not exists(select 1 from public.site_staff where user_id=actor) then return coalesce(new,old);end if;
 if actor is null and tg_table_name not in ('site_staff','newsletter_admin_audit') then return coalesce(new,old);end if;
 if tg_table_name='newsletter_admin_audit' then actor:=nullif(a->>'actor_id','')::uuid;end if;
 record_id:=coalesce(a->>'id',b->>'id',a->>'user_id',b->>'user_id');
 insert into public.portal_admin_audit(actor_id,action,entity,entity_id,before,after,metadata)
 values(actor,case when tg_table_name='newsletter_admin_audit' then a->>'action' else lower(tg_op) end,
 tg_table_name,record_id,case when b is null then null else private.portal_audit_snapshot(b) end,
 case when a is null then null else private.portal_audit_snapshot(a) end,
 jsonb_build_object('source_schema',tg_table_schema,'origin',case when actor is null then 'infrastructure' else 'authenticated' end,
 'changed_fields',case when tg_op='UPDATE' then (select coalesce(jsonb_agg(k),'[]'::jsonb) from jsonb_object_keys(a) k where a->k is distinct from b->k) else '[]'::jsonb end));
 return coalesce(new,old);
end$$;
revoke all on function private.portal_admin_audit_trigger() from public,anon,authenticated;
do $$declare t text;begin
 foreach t in array array['site_staff','content_posts','content_categories','content_tags','authors','site_settings','site_tools','tools','community_events','article_comments','comment_bans','newsletter_issues','newsletter_admin_audit','contact_messages','community_interests'] loop
 execute format('create trigger portal_foundation_audit after insert or update or delete on public.%I for each row execute function private.portal_admin_audit_trigger()',t);
 end loop;
end$$;

create trigger portal_foundation_storage_audit after insert or update or delete on storage.objects for each row execute function private.portal_admin_audit_trigger();

-- Privileged auth-schema access is isolated in private, gated against the live staff table.
create function private.portal_admin_users(p_limit integer,p_offset integer)
returns table(id uuid,created_at timestamptz,confirmed boolean,staff_role text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can('users.read') then raise exception 'Forbidden' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('portal-admin-directory-'||auth.uid()::text));
 if (select count(*) from public.portal_admin_audit a where a.actor_id=auth.uid() and a.entity='portal_users' and a.created_at>now()-interval '1 minute')>=20 then raise exception 'Directory rate limit';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 50 or p_offset not between 0 and 10000 then raise exception 'Invalid page';end if;
 insert into public.portal_admin_audit(actor_id,action,entity,metadata) values(auth.uid(),'read','portal_users',jsonb_build_object('limit',p_limit,'offset',p_offset));
 return query select u.id,u.created_at,u.email_confirmed_at is not null,s.role from auth.users u left join public.site_staff s on s.user_id=u.id
 order by u.created_at desc,u.id limit p_limit offset p_offset;
end$$;
revoke all on function private.portal_admin_users(integer,integer) from public,anon;
grant execute on function private.portal_admin_users(integer,integer) to authenticated;
create function public.portal_admin_users(p_limit integer default 25,p_offset integer default 0)
returns table(id uuid,created_at timestamptz,confirmed boolean,staff_role text)
language sql security invoker set search_path='' as $$select * from private.portal_admin_users(p_limit,p_offset)$$;
revoke all on function public.portal_admin_users(integer,integer) from public,anon;
grant execute on function public.portal_admin_users(integer,integer) to authenticated;

create function private.portal_admin_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb='[]';n bigint;metric text;allowed boolean;
begin
 if auth.uid() is null or not private.can('dashboard.read') then raise exception 'Forbidden' using errcode='42501';end if;
 foreach metric in array array['published','drafts','scheduled','updated','subscribers','users','starts','completions','saved_runs'] loop
 allowed:=case when metric in ('published','drafts','scheduled','updated') then private.can('articles.read')
 when metric='subscribers' then private.can('newsletter.manage') when metric='users' then private.can('users.read')
 else private.can('tools.manage') end;
 n:=null;
 if allowed then
 case metric
 when 'published' then select count(*) into n from public.content_posts where status='published' and published_at<=now();
 when 'drafts' then select count(*) into n from public.content_posts where status='draft' and (private.can('articles.approve') or private.can('articles.publish') or created_by=auth.uid());
 when 'scheduled' then select count(*) into n from public.content_posts where status='scheduled' and (private.can('articles.publish') or created_by=auth.uid());
 when 'updated' then select count(*) into n from public.content_posts where status='published' and published_at<=now() and updated_at>published_at and updated_at>=now()-interval '30 days';
 when 'subscribers' then select count(*) into n from public.newsletter_subscribers where status='subscribed';
 when 'users' then select count(*) into n from auth.users;
 when 'starts' then select count(*) into n from public.tool_events where event_name='tool_started' and created_at>=now()-interval '30 days';
 when 'completions' then select count(*) into n from public.tool_events where event_name='tool_completed' and created_at>=now()-interval '30 days';
 when 'saved_runs' then select count(*) into n from public.tool_runs;
 end case;
 end if;
 result:=result||jsonb_build_array(jsonb_build_object('id',metric,'available',allowed,'value',n,
 'reason',case when allowed then null else 'permission' end,
 'source',case when metric in ('starts','completions') then 'Eventos consentidos · últimos 30 dias'
 when metric='saved_runs' then 'Total de históricos privados · somente contagem'
 when metric='subscribers' then 'Inscrições com status subscribed'
 when metric='updated' then 'Publicados com atualização posterior · últimos 30 dias'
 when metric in ('drafts','scheduled') and not (private.can('articles.approve') or private.can('articles.publish')) then 'Somente conteúdos da própria conta'
 else 'Contagem atual no banco do Portal' end));
 end loop;
 return result;
end$$;
revoke all on function private.portal_admin_dashboard() from public,anon;
grant execute on function private.portal_admin_dashboard() to authenticated;
create function public.portal_admin_dashboard() returns jsonb language sql security invoker set search_path='' as $$select private.portal_admin_dashboard()$$;
revoke all on function public.portal_admin_dashboard() from public,anon;
grant execute on function public.portal_admin_dashboard() to authenticated;

create or replace function public.newsletter_claim_issue(p_id uuid,p_actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare i public.newsletter_issues;batch jsonb;begin
 if not exists(select 1 from public.site_staff where user_id=p_actor and role in ('platform_owner','super_admin','admin','newsletter_admin')) then raise exception 'Forbidden';end if;
 select * into i from public.newsletter_issues where id=p_id for update;
 if i.id is null or i.status not in ('review','scheduled','sending') or i.status='scheduled' and i.scheduled_at>now() then raise exception 'Issue unavailable';end if;
 if i.status<>'sending' then
 insert into public.newsletter_deliveries(subscriber_id,issue_id,kind,status) select s.id,i.id,'issue','pending' from public.newsletter_subscribers s join public.newsletter_preferences p on p.subscriber_id=s.id where s.status='subscribed' and p.ld_brief and exists(select 1 from public.newsletter_consents c where c.subscriber_id=s.id and c.consent_type='confirmed');
 if not found then return jsonb_build_object('empty',true);end if;
 update public.newsletter_issues set status='sending',updated_at=now() where id=i.id;
 end if;
 insert into public.newsletter_admin_audit(issue_id,actor_id,action) values(i.id,p_actor,'dispatch_batch');
 update public.newsletter_deliveries d set status='suppressed' from public.newsletter_subscribers s,public.newsletter_preferences p where d.issue_id=i.id and d.subscriber_id=s.id and p.subscriber_id=s.id and d.status in ('pending','failed','sending') and (s.status<>'subscribed' or not p.ld_brief);
 with picked as (select d.id from public.newsletter_deliveries d where d.issue_id=i.id and (d.status in ('pending','failed') or d.status='sending' and d.claimed_at<now()-interval '2 minutes') and d.attempts<3 and (d.first_claimed_at is null or d.first_claimed_at>now()-interval '23 hours') order by d.created_at limit 5 for update skip locked),claimed as (update public.newsletter_deliveries d set status='sending',attempts=attempts+1,claimed_at=now(),first_claimed_at=coalesce(first_claimed_at,now()) from picked where d.id=picked.id returning d.id,d.subscriber_id) select jsonb_agg(jsonb_build_object('id',c.id,'subscriber_id',c.subscriber_id,'email',s.email)) into batch from claimed c join public.newsletter_subscribers s on s.id=c.subscriber_id;
 return jsonb_build_object('issue',to_jsonb(i),'batch',coalesce(batch,'[]'::jsonb));end$$;

commit;
