begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter table public.site_staff drop constraint site_staff_role_check;
alter table public.site_staff add constraint site_staff_role_check check(role in ('author','editor','moderator','admin','super_admin'));
create function private.can(permission text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.site_staff s where s.user_id=(select auth.uid()) and (
 s.role in ('admin','super_admin') or
 s.role='editor' and permission in ('articles.read','articles.create','articles.edit','articles.approve','categories.manage','authors.manage','media.manage') or
 s.role='author' and permission in ('articles.read','articles.create','articles.edit') or
 s.role='moderator' and permission in ('comments.read','comments.moderate')))
$$;
revoke all on function private.can(text) from public,anon;
grant execute on function private.can(text) to authenticated;
alter table public.authors add column slug text, add column links jsonb not null default '[]';
alter table public.content_categories add column description text not null default '', add column active boolean not null default true;
alter table public.content_tags add column description text not null default '';
alter table public.content_posts drop constraint content_posts_status_check;
alter table public.content_posts add constraint content_posts_status_check check(status in ('draft','review','approved','scheduled','published','archived'));
alter table public.content_posts
 add column subtitle text not null default '',
 add column hero_image_alt text not null default '',
 add column hero_image_caption text not null default '',
 add column hero_image_credit text not null default '',
 add column hero_image_mobile text,
 add column hero_image_fallback text,
 add column reviewer_id uuid references public.authors(id),
 add column reviewer_name text,
 add column topics text[] not null default '{}',
 add column featured boolean not null default false,
 add column canonical_url text,
 add column og_title text,
 add column og_description text,
 add column og_image text,
 add column allow_index boolean not null default true,
 add column "references" jsonb not null default '[]' check(jsonb_typeof("references")='array'),
 add column related_articles text[] not null default '{}',
 add column content_blocks jsonb,
 add column show_comments boolean not null default true,
 add column show_share boolean not null default true,
 add column approved_at timestamptz,
 add column scheduled_at timestamptz,
 add column created_by uuid references auth.users(id) on delete set null,
 add column version integer not null default 1 check(version>0);
create index content_posts_author_owner_idx on public.content_posts(created_by);
create index content_posts_category_idx on public.content_posts(category_id);
create index content_posts_author_idx on public.content_posts(author_id);
create index content_posts_reviewer_idx on public.content_posts(reviewer_id);
create index content_posts_schedule_idx on public.content_posts(scheduled_at) where status='scheduled';
create table public.editorial_notes(post_id uuid primary key references public.content_posts(id) on delete cascade,notes text not null default '',updated_at timestamptz not null default now());
create table public.article_versions(id bigint generated always as identity primary key,post_id uuid not null references public.content_posts(id) on delete cascade,version integer not null,snapshot jsonb not null,changed_by uuid,created_at timestamptz not null default now(),unique(post_id,version));
create index article_versions_post_idx on public.article_versions(post_id,created_at desc);
alter table public.editorial_notes enable row level security;
alter table public.article_versions enable row level security;
revoke all on public.editorial_notes,public.article_versions from public,anon,authenticated;
revoke all on sequence public.article_versions_id_seq from public,anon,authenticated;
grant select,insert,update on public.editorial_notes to authenticated;
grant select on public.article_versions to authenticated;
create policy notes_staff on public.editorial_notes for all to authenticated using(exists(select 1 from public.content_posts p where p.id=post_id and (private.can('articles.approve') or private.can('articles.publish') or (private.can('articles.read') and p.created_by=(select auth.uid()))))) with check(exists(select 1 from public.content_posts p where p.id=post_id and (private.can('articles.approve') or private.can('articles.publish') or (private.can('articles.read') and p.created_by=(select auth.uid())))));
create policy versions_staff on public.article_versions for select to authenticated using(exists(select 1 from public.content_posts p where p.id=post_id and (private.can('articles.approve') or private.can('articles.publish') or (private.can('articles.read') and p.created_by=(select auth.uid())))));
drop policy editorial_manage on public.content_posts;
create policy posts_staff_read on public.content_posts for select to authenticated using(private.can('articles.approve') or private.can('articles.publish') or (private.can('articles.read') and created_by=(select auth.uid())));
create policy posts_staff_insert on public.content_posts for insert to authenticated with check(private.can('articles.create') and created_by=(select auth.uid()) and status in ('draft','review'));
create policy posts_staff_update on public.content_posts for update to authenticated using(private.can('articles.approve') or private.can('articles.publish') or (private.can('articles.edit') and created_by=(select auth.uid()) and status in ('draft','review'))) with check(private.can('articles.approve') or private.can('articles.publish') or (private.can('articles.edit') and created_by=(select auth.uid()) and status in ('draft','review')));
-- Existing published posts remain untouched; only future writes enforce the new workflow.
create function private.article_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare trusted boolean := coalesce(current_setting('role',true),'none') not in ('anon','authenticated');
 publisher boolean := false; reviewer boolean := false;
begin
 if not trusted then
  publisher := private.can('articles.publish'); reviewer := private.can('articles.approve');
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if tg_op='INSERT' then new.created_by:=auth.uid();
  elsif new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then raise exception 'Immutable ownership'; end if;
  if new.status in ('published','scheduled') and not publisher then raise exception 'Publish permission required'; end if;
  if new.status='approved' and not reviewer then raise exception 'Review permission required'; end if;
  if tg_op='UPDATE' and old.status in ('published','scheduled') and not publisher then raise exception 'Published content requires publisher'; end if;
 end if;
 if tg_op='UPDATE' and not trusted and old.status in ('approved','scheduled') and
    (to_jsonb(new)-array['status','published_at','scheduled_at','approved_at','version','updated_at']) is distinct from
    (to_jsonb(old)-array['status','published_at','scheduled_at','approved_at','version','updated_at']) then
  if new.status in ('published','scheduled') then raise exception 'Approved version changed; return to review';end if;
  if new.status='approved' then new.status:='review';end if;
 end if;
 if new.status in ('published','scheduled') then
  if tg_op='INSERT' or old.status not in ('approved','scheduled','published') then raise exception 'Approve before publishing'; end if;
  if new.approved_at is null or btrim(new.body)='' or new.featured_image='' or new.hero_image_alt='' then raise exception 'Approval, body, cover and alt required'; end if;
  if new.status='scheduled' and (new.scheduled_at is null or new.scheduled_at<=now()) then raise exception 'Future schedule required'; end if;
  if new.status='published' and (new.published_at is null or new.published_at>now()) then raise exception 'Valid publication time required'; end if;
 end if;
 if new.status='approved' and (tg_op='INSERT' or old.status<>'approved') then new.approved_at:=now();
 elsif new.status in ('draft','review') then new.approved_at:=null;new.scheduled_at:=null; end if;
 if new.canonical_url is not null and new.canonical_url !~ '^https://legendadigital\.com\.br/(conteudos|artigos)/[a-z0-9-]+$' then raise exception 'Portal canonical required'; end if;
 if length(new.body)>500000 or length(new.subtitle)>500 or jsonb_typeof(new."references")<>'array' then raise exception 'Content limits exceeded'; end if;
 if new.body ~* '<(script|iframe|object|embed)([[:space:]>])|<[a-z][^>]*[[:space:]]on[a-z]+[[:space:]]*=|(href|src)[[:space:]]*=[[:space:]]*["'']?[[:space:]]*javascript[[:space:]]*:' then raise exception 'Unsafe markup'; end if;
 if tg_op='UPDATE' then
  if (to_jsonb(new)-'updated_at'-'version')=(to_jsonb(old)-'updated_at'-'version') then return old; end if;
  new.version:=old.version+1;
 else new.version:=1; end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.article_guard() from public,anon,authenticated;
create trigger article_guard before insert or update on public.content_posts for each row execute function private.article_guard();
create function private.article_history() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='UPDATE' and new.version=old.version then return new;end if;
 insert into public.article_versions(post_id,version,snapshot,changed_by) values(new.id,new.version,to_jsonb(new),auth.uid());return new;
end $$;
revoke all on function private.article_history() from public,anon,authenticated;
create trigger article_history after insert or update on public.content_posts for each row execute function private.article_history();
do $$ declare t text; permission text; begin
 foreach t in array array['authors','content_categories','content_tags'] loop
  permission:=case when t='authors' then 'authors.manage' else 'categories.manage' end;
  execute format('drop policy editorial_manage on public.%I',t);
  execute format('create policy editorial_manage on public.%I for all to authenticated using(private.can(%L)) with check(private.can(%L))',t,permission,permission);
 end loop;end $$;
insert into public.content_categories(name,slug) values ('Futuro','futuro'),('Aplicação','aplicacao'),('Construção','construcao'),('Growth & Negócios','growth-negocios'),('Pesquisa','pesquisa') on conflict(slug) do nothing;
insert into public.authors(name,bio,slug) select 'Redação Legenda Digital','Inteligência prática sobre IA, marketing, tecnologia e crescimento.','redacao-legenda-digital' where not exists(select 1 from public.authors where name='Redação Legenda Digital');
create table public.comment_profiles(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(length(btrim(display_name)) between 2 and 60),created_at timestamptz not null default now());
create table public.comment_bans(user_id uuid primary key references auth.users(id) on delete cascade,reason text not null check(length(reason) between 3 and 500),until_at timestamptz,created_at timestamptz not null default now());
create table public.article_comments(id uuid primary key default gen_random_uuid(),article_id uuid not null references public.content_posts(id),user_id uuid not null references auth.users(id),parent_id uuid references public.article_comments(id),root_id uuid references public.article_comments(id),depth integer not null default 0 check(depth between 0 and 30),body text not null check(length(body)<=3000),status text not null default 'pending' check(status in ('pending','published','hidden','spam','deleted')),pinned boolean not null default false,featured boolean not null default false,locked boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),edited_at timestamptz);
create index article_comments_article_status_idx on public.article_comments(article_id,status,created_at);
create index article_comments_user_date_idx on public.article_comments(user_id,created_at desc);
create index article_comments_parent_idx on public.article_comments(parent_id);
create index article_comments_root_idx on public.article_comments(root_id);
create table public.comment_reports(id uuid primary key default gen_random_uuid(),comment_id uuid not null references public.article_comments(id),user_id uuid not null references auth.users(id),reason text not null check(reason in ('spam','abuse','off_topic','privacy','other')),detail text not null default '' check(length(detail)<=500),status text not null default 'open' check(status in ('open','resolved','dismissed')),created_at timestamptz not null default now(),unique(comment_id,user_id));
create index comment_reports_comment_idx on public.comment_reports(comment_id);
create index comment_reports_user_date_idx on public.comment_reports(user_id,created_at desc);
create table public.comment_moderation_log(id bigint generated always as identity primary key,comment_id uuid not null references public.article_comments(id),actor_id uuid,action text not null,previous_body text,created_at timestamptz not null default now());
create index comment_moderation_log_comment_idx on public.comment_moderation_log(comment_id,created_at desc);
do $$ declare t text;begin
 foreach t in array array['comment_profiles','comment_bans','article_comments','comment_reports','comment_moderation_log'] loop execute format('alter table public.%I enable row level security',t);end loop;
end $$;
revoke all on public.comment_profiles,public.comment_bans,public.article_comments,public.comment_reports,public.comment_moderation_log from public,anon,authenticated;
revoke all on sequence public.comment_moderation_log_id_seq from public,anon,authenticated;
grant select on public.comment_profiles,public.article_comments to anon,authenticated;
grant insert,update on public.comment_profiles,public.article_comments,public.comment_reports to authenticated;
grant select on public.comment_reports,public.comment_bans,public.comment_moderation_log to authenticated;
grant insert,update on public.comment_bans to authenticated;
create policy profiles_public on public.comment_profiles for select to anon,authenticated using(exists(select 1 from public.article_comments c where c.user_id=comment_profiles.user_id and c.status='published') or user_id=(select auth.uid()));
create policy profiles_owner on public.comment_profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy profiles_moderator on public.comment_profiles for select to authenticated using(private.can('comments.read'));
create policy comments_public on public.article_comments for select to anon,authenticated using(status in ('published','deleted') and exists(select 1 from public.content_posts p where p.id=article_id and p.status='published' and p.published_at<=now() and p.show_comments));
create policy comments_owner_read on public.article_comments for select to authenticated using(user_id=(select auth.uid()));
create policy comments_owner_insert on public.article_comments for insert to authenticated with check(user_id=(select auth.uid()) and status='pending');
create policy comments_owner_update on public.article_comments for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy comments_moderator on public.article_comments for select to authenticated using(private.can('comments.read'));
create policy comments_moderate on public.article_comments for update to authenticated using(private.can('comments.moderate')) with check(private.can('comments.moderate'));
create policy reports_owner_read on public.comment_reports for select to authenticated using(user_id=(select auth.uid()));
create policy reports_owner_insert on public.comment_reports for insert to authenticated with check(user_id=(select auth.uid()) and status='open');
create policy reports_moderate on public.comment_reports for all to authenticated using(private.can('comments.moderate')) with check(private.can('comments.moderate'));
create policy bans_moderate on public.comment_bans for all to authenticated using(private.can('comments.moderate')) with check(private.can('comments.moderate'));
create policy log_moderate on public.comment_moderation_log for select to authenticated using(private.can('comments.moderate'));
create function private.comment_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare parent public.article_comments; moderator boolean:=private.can('comments.moderate');begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email is not null and email_confirmed_at is not null) then raise exception 'Confirmed portal account required';end if;
 if tg_op='INSERT' then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if new.user_id<>auth.uid() then raise exception 'Comment ownership required';end if;
  if exists(select 1 from public.comment_bans where user_id=auth.uid() and (until_at is null or until_at>now())) then raise exception 'Commenting suspended';end if;
  if not exists(select 1 from public.comment_profiles where user_id=auth.uid()) then raise exception 'Display name required';end if;
  if not exists(select 1 from public.content_posts where id=new.article_id and status='published' and published_at<=now() and show_comments) then raise exception 'Comments unavailable';end if;
  if (select count(*) from public.article_comments where user_id=auth.uid() and created_at>now()-interval '1 hour')>=10 or exists(select 1 from public.article_comments where user_id=auth.uid() and created_at>now()-interval '30 seconds') then raise exception 'Comment rate limit';end if;
  new.created_at:=now();new.status:='pending';new.pinned:=false;new.featured:=false;new.locked:=false;new.root_id:=null;new.depth:=0;new.edited_at:=null;
  if new.parent_id is not null then
   select * into parent from public.article_comments where id=new.parent_id;
   if parent.id is null or parent.article_id<>new.article_id or parent.status<>'published' or parent.locked or exists(select 1 from public.article_comments where id=parent.root_id and locked) then raise exception 'Invalid reply thread';end if;
   new.root_id:=coalesce(parent.root_id,parent.id);new.depth:=parent.depth+1;
  end if;
 else
  if new.id<>old.id or new.user_id<>old.user_id or new.article_id<>old.article_id or new.parent_id is distinct from old.parent_id or new.root_id is distinct from old.root_id or new.depth<>old.depth or new.created_at<>old.created_at then raise exception 'Immutable comment identity';end if;
  if moderator and new.body<>old.body and new.status<>'deleted' and old.status<>'deleted' then raise exception 'Moderation cannot rewrite a comment';end if;
  if not moderator then
   if old.user_id<>auth.uid() or old.locked or old.status not in ('pending','published') or new.pinned<>old.pinned or new.featured<>old.featured or new.locked<>old.locked or new.status not in ('pending','deleted') then raise exception 'Comment edit denied';end if;
   if new.status<>'deleted' then
    if old.created_at<now()-interval '24 hours' then raise exception 'Edit window closed';end if;
    new.status:='pending';new.edited_at:=now();
   end if;
  end if;
  if new.status<>old.status or new.pinned<>old.pinned or new.featured<>old.featured or new.locked<>old.locked then
   insert into public.comment_moderation_log(comment_id,actor_id,action,previous_body) values(old.id,auth.uid(),new.status,case when new.status='deleted' then old.body else null end);
  end if;
  if moderator and old.status='deleted' and new.status<>'deleted' then
   new.body:=coalesce((select previous_body from public.comment_moderation_log where comment_id=old.id and previous_body is not null order by id desc limit 1),'');
  end if;
 end if;
 if new.status='deleted' then new.body:='';
 elsif length(btrim(new.body))<3 or new.body ~ '[<>]' or (select count(*) from regexp_matches(new.body,'https?://','gi'))>3 then raise exception 'Plain text, 3–3000 characters, max 3 links';end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.comment_guard() from public,anon,authenticated;
create trigger comment_guard before insert or update on public.article_comments for each row execute function private.comment_guard();
create function private.report_guard() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='UPDATE' then
  if new.comment_id<>old.comment_id or new.user_id<>old.user_id or new.reason<>old.reason or new.detail<>old.detail or new.created_at<>old.created_at then raise exception 'Immutable report';end if;return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email is not null and email_confirmed_at is not null) or new.user_id<>auth.uid() or not exists(select 1 from public.article_comments where id=new.comment_id and status='published') then raise exception 'Valid report required';end if;
 if (select count(*) from public.comment_reports where user_id=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'Report rate limit';end if;
 new.status:='open';new.created_at:=now();return new;
end $$;
revoke all on function private.report_guard() from public,anon,authenticated;
create trigger report_guard before insert or update on public.comment_reports for each row execute function private.report_guard();
alter table public.analytics_events drop constraint analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check check(event_name in ('page_view','article_view','newsletter_subscribed','community_interest','tool_viewed','building_viewed','growth_os_viewed','growth_os_cta_clicked','contact_submitted','article_viewed','article_scroll_25','article_scroll_50','article_scroll_75','article_read_completed','article_toc_clicked','article_internal_link_clicked','article_source_clicked','article_shared','article_comment_started','article_comment_submitted','article_reply_submitted','article_comment_reported','article_newsletter_clicked','article_growth_cta_clicked'));
alter table public.analytics_events add column article_id uuid references public.content_posts(id) on delete set null,add column metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object');
create index analytics_events_article_idx on public.analytics_events(article_id,created_at desc);
drop policy submit_analytics on public.analytics_events;
create policy submit_analytics on public.analytics_events for insert to anon,authenticated with check(metadata='{}' and article_id is null and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create function public.track_editorial(p_event text,p_article_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.content_posts;begin
 if p_event not in ('article_viewed','article_scroll_25','article_scroll_50','article_scroll_75','article_read_completed','article_toc_clicked','article_internal_link_clicked','article_source_clicked','article_shared','article_comment_started','article_comment_submitted','article_reply_submitted','article_comment_reported','article_newsletter_clicked','article_growth_cta_clicked') then raise exception 'Invalid editorial event';end if;
 select * into p from public.content_posts where id=p_article_id and status='published' and published_at<=now();
 if p.id is null then raise exception 'Published article required';end if;
 insert into public.analytics_events(event_name,path,article_id,metadata) values(p_event,'/conteudos/'||p.slug,p.id,jsonb_build_object('article_id',p.id,'slug',p.slug,'category',p.category,'author',p.author));
end $$;
revoke all on function public.track_editorial(text,uuid) from public;
grant execute on function public.track_editorial(text,uuid) to anon,authenticated;
-- Taxonomy and private media remain restricted. New role author has no access to private-admin.
create policy ld_editorial_media_update on storage.objects for update to authenticated using(bucket_id in ('content-images','authors','community','site-assets') and private.can('media.manage')) with check(bucket_id in ('content-images','authors','community','site-assets') and private.can('media.manage'));
create policy ld_author_media_insert on storage.objects for insert to authenticated with check(bucket_id='content-images' and name like (select auth.uid())::text||'/%' and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role='author'));
commit;
