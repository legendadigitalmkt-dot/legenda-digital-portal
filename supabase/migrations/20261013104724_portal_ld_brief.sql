begin;
-- Keep legacy rows/statuses intact. Direct signup/admin status editing is retired.
alter table public.newsletter_subscribers drop constraint newsletter_subscribers_status_check;
alter table public.newsletter_subscribers add constraint newsletter_subscribers_status_check check(status in ('pending','confirmed','subscribed','unsubscribed','bounced','complained'));
alter table public.newsletter_subscribers add column updated_at timestamptz not null default now();
alter table public.newsletter_subscribers add column unsubscribed_at timestamptz;
drop policy signup_newsletter on public.newsletter_subscribers;
drop policy admin_private on public.newsletter_subscribers;
revoke all on public.newsletter_subscribers from anon,authenticated;
grant select on public.newsletter_subscribers to authenticated;
create policy newsletter_staff_read on public.newsletter_subscribers for select to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));

create table public.newsletter_preferences(subscriber_id uuid primary key references public.newsletter_subscribers on delete cascade,ld_brief boolean not null default true,growth_intelligence boolean not null default false,product boolean not null default false,community boolean not null default false,updated_at timestamptz not null default now());
create table public.newsletter_consents(id uuid primary key default gen_random_uuid(),subscriber_id uuid not null references public.newsletter_subscribers on delete cascade,email text not null,consent_type text not null check(consent_type in ('requested','confirmed','preferences_changed','unsubscribed','bounced','complained')),consented_at timestamptz not null default now(),source text not null check(length(source)<=100),copy_version text not null,privacy_version text not null);
create index newsletter_consents_type_date_idx on public.newsletter_consents(consent_type,consented_at);
create index newsletter_consents_subscriber_idx on public.newsletter_consents(subscriber_id,consented_at desc);
create table public.newsletter_issues(id uuid primary key default gen_random_uuid(),slug text not null unique check(length(slug)<=160 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),subject text not null check(length(subject) between 3 and 160),preheader text not null default '' check(length(preheader)<=250),content text not null check(length(content) between 20 and 50000),author text not null default 'Equipe Legenda Digital' check(length(author) between 1 and 100),issue_date date not null default current_date,segments text[] not null default '{ld_brief}' check(segments='{ld_brief}'),status text not null default 'draft' check(status in ('draft','review','scheduled','sending','sent')),scheduled_at timestamptz,is_public boolean not null default false,sent_at timestamptz,created_by uuid references auth.users on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(status<>'sent' or sent_at is not null),check(status<>'scheduled' or scheduled_at is not null));
create index newsletter_issues_creator_idx on public.newsletter_issues(created_by);
create index newsletter_issues_archive_idx on public.newsletter_issues(sent_at desc) where is_public and status='sent';
create table public.newsletter_deliveries(id uuid primary key default gen_random_uuid(),subscriber_id uuid not null references public.newsletter_subscribers on delete cascade,issue_id uuid references public.newsletter_issues on delete restrict,kind text not null check(kind in ('confirmation','issue')),status text not null check(status in ('pending','sending','accepted','delivered','failed','suppressed','bounced','complained')),provider text not null default 'resend',provider_id text unique,attempts integer not null default 0 check(attempts between 0 and 3),claimed_at timestamptz,first_claimed_at timestamptz,created_at timestamptz not null default now(),accepted_at timestamptz,unique(issue_id,subscriber_id));
create index newsletter_deliveries_subscriber_idx on public.newsletter_deliveries(subscriber_id);
create index newsletter_deliveries_queue_idx on public.newsletter_deliveries(issue_id,status,created_at);
create table public.newsletter_events(id uuid primary key default gen_random_uuid(),provider_event_id text not null unique check(length(provider_event_id)<=150),provider_id text not null check(length(provider_id)<=150),event_type text not null check(event_type in ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.opened','email.clicked')),occurred_at timestamptz not null,applied boolean not null default false,created_at timestamptz not null default now());
create index newsletter_events_provider_idx on public.newsletter_events(provider_id,occurred_at desc);
create table public.newsletter_admin_audit(id uuid primary key default gen_random_uuid(),issue_id uuid not null references public.newsletter_issues on delete restrict,actor_id uuid references auth.users on delete set null,action text not null,created_at timestamptz not null default now());
create index newsletter_admin_audit_actor_idx on public.newsletter_admin_audit(actor_id);
create index newsletter_admin_audit_issue_idx on public.newsletter_admin_audit(issue_id,created_at desc);
create table private.newsletter_tokens(subscriber_id uuid primary key references public.newsletter_subscribers on delete cascade,confirm_hash text not null unique check(confirm_hash ~ '^[a-f0-9]{64}$'),manage_hash text not null unique check(manage_hash ~ '^[a-f0-9]{64}$'),unsubscribe_hash text unique check(unsubscribe_hash ~ '^[a-f0-9]{64}$'),confirm_expires_at timestamptz not null,confirmed_at timestamptz,requested_at timestamptz not null default now());
create table private.newsletter_rate_limits(key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),bucket timestamptz not null,hits integer not null,primary key(key_hash,bucket));
alter table private.newsletter_tokens enable row level security;
alter table private.newsletter_rate_limits enable row level security;
revoke all on private.newsletter_tokens,private.newsletter_rate_limits from public,anon,authenticated;
do $$declare t text;begin
foreach t in array array['newsletter_preferences','newsletter_consents','newsletter_issues','newsletter_deliveries','newsletter_events','newsletter_admin_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy newsletter_staff_read on public.%I for select to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in (''admin'',''super_admin'')))',t);
end loop;
end $$;
grant select(id,slug,subject,preheader,content,author,issue_date,sent_at,status,is_public) on public.newsletter_issues to anon;
create policy newsletter_archive on public.newsletter_issues for select to anon using(is_public and status='sent' and sent_at<=now());
grant insert,update on public.newsletter_issues to authenticated;
create policy newsletter_issue_create on public.newsletter_issues for insert to authenticated with check(status in ('draft','review','scheduled') and sent_at is null and created_by=(select auth.uid()) and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));
create policy newsletter_issue_update on public.newsletter_issues for update to authenticated using(status in ('draft','review','scheduled') and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin'))) with check(status in ('draft','review','scheduled') and sent_at is null and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));
create function private.newsletter_issue_audit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then return new;end if;
 if tg_op='UPDATE' and (old.status in ('sending','sent') or new.created_by is distinct from old.created_by or new.id<>old.id or new.created_at<>old.created_at) then raise exception 'Issue locked';end if;
 insert into public.newsletter_admin_audit(issue_id,actor_id,action) values(new.id,auth.uid(),lower(tg_op));return new;end$$;
revoke all on function private.newsletter_issue_audit() from public,anon,authenticated;
create function private.newsletter_issue_touch() returns trigger language plpgsql security invoker set search_path='' as $$begin new.updated_at=now();return new;end$$;
revoke all on function private.newsletter_issue_touch() from public,anon,authenticated;
create trigger newsletter_issue_touch_trigger before update on public.newsletter_issues for each row execute function private.newsletter_issue_touch();
create trigger newsletter_issue_audit_trigger after insert or update on public.newsletter_issues for each row execute function private.newsletter_issue_audit();

-- Edge only. Every function is revoked from PUBLIC/anon/authenticated below.
create function public.newsletter_begin_signup(p_id uuid,p_email text,p_name text,p_source text,p_confirm_hash text,p_manage_hash text,p_rate_hash text,p_unsubscribe_hash text default null) returns jsonb language plpgsql security definer set search_path='' as $$declare s public.newsletter_subscribers;h integer;d uuid;begin
 if p_email<>lower(p_email) or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_name)>100 or p_source !~ '^[a-z0-9_-]{1,80}$' then raise exception 'Invalid signup';end if;
 insert into private.newsletter_rate_limits values(p_rate_hash,date_trunc('hour',now()),1) on conflict(key_hash,bucket) do update set hits=private.newsletter_rate_limits.hits+1 returning hits into h;
 if h>10 then return jsonb_build_object('send',false,'limited',true);end if;
 perform pg_advisory_xact_lock(hashtext('ld-brief-global-cap'));
 perform pg_advisory_xact_lock(hashtext(p_email));
 select * into s from public.newsletter_subscribers where email=p_email for update;
 if s.id is not null and s.status in ('subscribed','confirmed','bounced','complained') then return jsonb_build_object('send',false);end if;
 if (select count(*) from public.newsletter_consents where email=p_email and consent_type='requested' and consented_at>now()-interval '24 hours')>=2 or exists(select 1 from private.newsletter_tokens where subscriber_id=s.id and requested_at>now()-interval '15 minutes') then return jsonb_build_object('send',false);end if;
 if (select count(*) from public.newsletter_consents where consent_type='requested' and consented_at>now()-interval '24 hours')>=500 then return jsonb_build_object('send',false,'limited',true);end if;
 if s.id is null then insert into public.newsletter_subscribers(id,email,name,source,consent) values(p_id,p_email,p_name,p_source,true) returning * into s;
 else update public.newsletter_subscribers set status='pending',updated_at=now(),name=p_name,source=p_source where id=s.id returning * into s;end if;
 insert into public.newsletter_preferences(subscriber_id) values(s.id) on conflict do nothing;
 insert into private.newsletter_tokens(subscriber_id,confirm_hash,manage_hash,unsubscribe_hash,confirm_expires_at) values(s.id,p_confirm_hash,p_manage_hash,p_unsubscribe_hash,now()+interval '48 hours') on conflict(subscriber_id) do update set confirm_hash=excluded.confirm_hash,manage_hash=excluded.manage_hash,unsubscribe_hash=excluded.unsubscribe_hash,confirm_expires_at=excluded.confirm_expires_at,confirmed_at=null,requested_at=now();
 insert into public.newsletter_consents(subscriber_id,email,consent_type,source,copy_version,privacy_version) values(s.id,s.email,'requested',p_source,'ld-brief-v1-2026-10-13','ld-brief-v1-2026-10-13');
 insert into public.newsletter_deliveries(subscriber_id,kind,status) values(s.id,'confirmation','pending') returning id into d;
 return jsonb_build_object('send',true,'id',s.id,'delivery_id',d);end$$;

create function public.newsletter_confirm(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare t private.newsletter_tokens;s public.newsletter_subscribers;begin
 select * into t from private.newsletter_tokens where confirm_hash=p_hash for update;
 if t.subscriber_id is null or t.confirm_expires_at<now() then raise exception 'Invalid or expired link';end if;
 select * into s from public.newsletter_subscribers where id=t.subscriber_id for update;
 if t.confirmed_at is not null and s.status='subscribed' then return jsonb_build_object('status','subscribed');end if;
 if s.status<>'pending' then raise exception 'Subscription unavailable';end if;
 update private.newsletter_tokens set confirmed_at=now() where subscriber_id=s.id;
 update public.newsletter_subscribers set status='subscribed',confirmed_at=now(),unsubscribed_at=null,updated_at=now() where id=s.id;
 update public.newsletter_preferences set ld_brief=true,updated_at=now() where subscriber_id=s.id;
 insert into public.newsletter_consents(subscriber_id,email,consent_type,source,copy_version,privacy_version) values(s.id,s.email,'confirmed',s.source,'ld-brief-v1-2026-10-13','ld-brief-v1-2026-10-13');
 return jsonb_build_object('status','subscribed');end$$;

create function public.newsletter_manage(p_hash text,p_action text,p_ld_brief boolean default null) returns jsonb language plpgsql security definer set search_path='' as $$declare s public.newsletter_subscribers;p public.newsletter_preferences;begin
 select n.* into s from public.newsletter_subscribers n join private.newsletter_tokens t on t.subscriber_id=n.id where t.manage_hash=p_hash for update of n;
 if s.id is null then raise exception 'Invalid link';end if;
 if p_action not in ('read','preferences','unsubscribe') then raise exception 'Invalid action';end if;
 if p_action='unsubscribe' or p_action='preferences' and p_ld_brief=false then
   if s.status not in ('unsubscribed','bounced','complained') then
    update public.newsletter_subscribers set status='unsubscribed',unsubscribed_at=now(),updated_at=now() where id=s.id;
    insert into public.newsletter_consents(subscriber_id,email,consent_type,source,copy_version,privacy_version) values(s.id,s.email,'unsubscribed','preferences','ld-brief-v1-2026-10-13','ld-brief-v1-2026-10-13');end if;
   update public.newsletter_preferences set ld_brief=false,updated_at=now() where subscriber_id=s.id;
 elsif p_action='preferences' then
   if s.status<>'subscribed' then raise exception 'New confirmation required';end if;
   update public.newsletter_preferences set ld_brief=true,updated_at=now() where subscriber_id=s.id;
   insert into public.newsletter_consents(subscriber_id,email,consent_type,source,copy_version,privacy_version) values(s.id,s.email,'preferences_changed','preferences','ld-brief-v1-2026-10-13','ld-brief-v1-2026-10-13');end if;
 select * into p from public.newsletter_preferences where subscriber_id=s.id;
 select * into s from public.newsletter_subscribers where id=s.id;
 return jsonb_build_object('status',s.status,'preferences',to_jsonb(p)-'subscriber_id');end$$;

create function public.newsletter_unsubscribe(p_hash text) returns void language plpgsql security definer set search_path='' as $$declare m text;begin
 select manage_hash into m from private.newsletter_tokens where unsubscribe_hash=p_hash;
 if m is null then raise exception 'Invalid unsubscribe link';end if;
 perform public.newsletter_manage(m,'unsubscribe');end$$;

create function public.newsletter_delivery_result(p_id uuid,p_status text,p_provider_id text default null) returns void language plpgsql security definer set search_path='' as $$declare e public.newsletter_events;begin
 if p_status not in ('accepted','failed','suppressed') then raise exception 'Invalid result';end if;
 update public.newsletter_deliveries set status=case when status in ('delivered','bounced','complained') then status else p_status end,provider_id=coalesce(provider_id,p_provider_id),accepted_at=case when p_status='accepted' then now() else accepted_at end where id=p_id;
 for e in select * from public.newsletter_events where provider_id=p_provider_id and not applied order by occurred_at loop
 perform public.newsletter_provider_event(e.provider_event_id,e.provider_id,e.event_type,e.occurred_at);
 end loop;end$$;

create function public.newsletter_claim_issue(p_id uuid,p_actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare i public.newsletter_issues;batch jsonb;begin
 if not exists(select 1 from public.site_staff where user_id=p_actor and role in ('admin','super_admin')) then raise exception 'Forbidden';end if;
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
create function public.newsletter_finish_issue(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.newsletter_deliveries where issue_id=p_id) and not exists(select 1 from public.newsletter_deliveries where issue_id=p_id and status in ('pending','sending','failed')) then update public.newsletter_issues set status='sent',sent_at=now(),updated_at=now() where id=p_id and status='sending';return found;end if;return false;end$$;

create function public.newsletter_provider_event(p_event_id text,p_provider_id text,p_type text,p_occurred_at timestamptz) returns void language plpgsql security definer set search_path='' as $$declare d public.newsletter_deliveries;s public.newsletter_subscribers;begin
 insert into public.newsletter_events(provider_event_id,provider_id,event_type,occurred_at) values(p_event_id,p_provider_id,p_type,p_occurred_at) on conflict do nothing;
 if not exists(select 1 from public.newsletter_events where provider_event_id=p_event_id and not applied) then return;end if;
 select * into d from public.newsletter_deliveries where provider_id=p_provider_id for update;
 if d.id is null then return;end if;
 update public.newsletter_events set applied=true where provider_event_id=p_event_id and not applied;if not found then return;end if;
 if p_type in ('email.bounced','email.complained') then
 select * into s from public.newsletter_subscribers where id=d.subscriber_id for update;
 update public.newsletter_subscribers set status=case when status='complained' or p_type='email.complained' then 'complained' else 'bounced' end,updated_at=now() where id=s.id;
 update public.newsletter_preferences set ld_brief=false,updated_at=now() where subscriber_id=s.id;
 update public.newsletter_deliveries set status=case when p_type='email.complained' then 'complained' else 'bounced' end where id=d.id;
 insert into public.newsletter_consents(subscriber_id,email,consent_type,source,copy_version,privacy_version) values(s.id,s.email,case when p_type='email.complained' then 'complained' else 'bounced' end,'resend-webhook','ld-brief-v1-2026-10-13','ld-brief-v1-2026-10-13');
 elsif p_type='email.failed' then update public.newsletter_deliveries set status='failed' where id=d.id and status not in ('delivered','bounced','complained','suppressed');
 elsif p_type='email.delivered' then update public.newsletter_deliveries set status='delivered' where id=d.id and status not in ('bounced','complained','suppressed');end if;end$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'newsletter_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end$$;
-- A verified JWT's email is resolved only by the Edge handler; no user-submitted email lookup.
grant all on public.newsletter_subscribers,public.newsletter_preferences,public.newsletter_consents,public.newsletter_issues,public.newsletter_deliveries,public.newsletter_events,public.newsletter_admin_audit to service_role;
grant usage on schema private to service_role;
grant select on private.newsletter_tokens to service_role;

create function private.prune_newsletter() returns void language plpgsql security definer set search_path='' as $$begin
 delete from private.newsletter_rate_limits where bucket<now()-interval '1 day';
 delete from public.newsletter_events where created_at<now()-interval '90 days';
 delete from public.newsletter_deliveries where created_at<now()-interval '90 days' and status not in ('pending','sending','failed');
 delete from public.newsletter_subscribers where (status='pending' and updated_at<now()-interval '30 days') or (status in ('unsubscribed','bounced','complained') and updated_at<now()-interval '365 days');
end$$;
revoke all on function private.prune_newsletter() from public,anon,authenticated;
do $$begin if exists(select 1 from pg_extension where extname='pg_cron') then perform cron.schedule('ld-brief-retention','27 4 * * *','select private.prune_newsletter()');end if;end$$;
-- Public analytics contain paths/actions only, never email, tokens or subscriber IDs.
do $$declare c text;begin
 select pg_get_constraintdef(oid) into c from pg_constraint where conrelid='public.analytics_events'::regclass and conname='analytics_events_event_name_check';
 if c is not null then
 alter table public.analytics_events drop constraint analytics_events_event_name_check;
 execute 'alter table public.analytics_events add constraint analytics_events_event_name_check '||replace(c,'ARRAY[','ARRAY[''newsletter_signup_started''::text, ''newsletter_unsubscribed''::text, ');
 end if;
end$$;

notify pgrst,'reload schema';
commit;
