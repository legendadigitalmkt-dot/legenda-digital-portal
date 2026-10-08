begin;
create table public.site_staff(user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('editor','admin','super_admin')),created_at timestamptz not null default now());
alter table public.site_staff enable row level security;
grant select on public.site_staff to authenticated;
create policy staff_own on public.site_staff for select to authenticated using(user_id=(select auth.uid()));
create table public.authors(id uuid primary key default gen_random_uuid(),name text not null,bio text not null default '',avatar_url text,created_at timestamptz default now());
create table public.content_categories(id uuid primary key default gen_random_uuid(),name text not null unique,slug text not null unique);
create table public.content_tags(id uuid primary key default gen_random_uuid(),name text not null unique,slug text not null unique);
create table public.content_posts(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 3 and 200),slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),excerpt text not null check(length(excerpt)<=500),body text not null default '',featured_image text not null default '',author_id uuid references public.authors(id),category_id uuid references public.content_categories(id),author text not null default 'Equipe Legenda Digital',category text not null default 'IA',tags text[] not null default '{}',kind text not null default 'article' check(kind in ('article','guide','news','building','case')),status text not null default 'draft' check(status in ('draft','review','published','archived')),published_at timestamptz,reading_time integer not null default 4 check(reading_time between 1 and 120),seo_title text,seo_description text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index content_posts_published_idx on public.content_posts(status,published_at desc);
create table public.site_settings(id text primary key default 'site' check(id='site'),config jsonb not null,updated_at timestamptz not null default now());
create table public.newsletter_subscribers(id uuid primary key default gen_random_uuid(),email text not null unique check(email=lower(email) and length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),name text check(length(name)<=100),status text not null default 'pending' check(status in ('pending','confirmed','unsubscribed')),source text not null default 'site' check(length(source)<=100),interests text[] not null default '{}',consent boolean not null check(consent),created_at timestamptz not null default now(),confirmed_at timestamptz);
create table public.community_interests(id uuid primary key default gen_random_uuid(),email text not null unique check(email=lower(email) and length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),name text check(length(name)<=100),status text not null default 'pending' check(status in ('pending','invited','active','archived')),source text not null default 'community' check(length(source)<=100),consent boolean not null check(consent),created_at timestamptz not null default now());
create table public.contact_messages(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),company text check(length(company)<=100),subject text not null check(length(subject) between 3 and 150),message text not null check(length(message) between 10 and 5000),consent boolean not null check(consent),status text not null default 'new' check(status in ('new','read','answered','archived')),created_at timestamptz not null default now());
create table public.community_events(id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',event_at timestamptz,location text not null default 'Online',image text,status text not null default 'draft' check(status in ('draft','published','archived')),created_at timestamptz default now());
create table public.site_tools(id uuid primary key default gen_random_uuid(),title text not null,slug text not null unique,description text not null default '',kind text not null default 'resource',url text not null,image text,status text not null default 'draft' check(status in ('draft','published','archived')),created_at timestamptz default now());
create table public.analytics_events(id bigint generated always as identity primary key,event_name text not null check(event_name in ('page_view','article_view','newsletter_subscribed','community_interest','tool_viewed','building_viewed','growth_os_viewed','growth_os_cta_clicked','contact_submitted')),path text not null check(length(path) between 1 and 200 and path ~ '^/' and path !~ '[?#]'),created_at timestamptz not null default now());
create index analytics_events_name_date_idx on public.analytics_events(event_name,created_at desc);
do $$ declare t text; begin
foreach t in array array['authors','content_categories','content_tags','content_posts','site_settings','community_events','site_tools'] loop
execute format('alter table public.%I enable row level security',t);
execute format('grant select on public.%I to anon, authenticated',t);
execute format('grant insert, update on public.%I to authenticated',t);
execute format('create policy editorial_manage on public.%I for all to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in (''editor'',''admin'',''super_admin''))) with check(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in (''editor'',''admin'',''super_admin'')))',t);
end loop;
end $$;
create policy public_posts on public.content_posts for select to anon,authenticated using(status='published' and published_at<=now());
create policy public_authors on public.authors for select to anon,authenticated using(true);
create policy public_categories on public.content_categories for select to anon,authenticated using(true);
create policy public_tags on public.content_tags for select to anon,authenticated using(true);
create policy public_settings on public.site_settings for select to anon,authenticated using(true);
create policy public_events on public.community_events for select to anon,authenticated using(status='published');
create policy public_tools on public.site_tools for select to anon,authenticated using(status='published');
-- Configuration changes require an administrator, not an editor.
drop policy editorial_manage on public.site_settings;
create policy admin_settings on public.site_settings for all to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin'))) with check(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));
do $$ declare t text; begin
foreach t in array array['newsletter_subscribers','community_interests','contact_messages','analytics_events'] loop
execute format('alter table public.%I enable row level security',t);
execute format('grant insert on public.%I to anon, authenticated',t);
execute format('grant select,update on public.%I to authenticated',t);
execute format('create policy admin_private on public.%I for all to authenticated using(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in (''admin'',''super_admin''))) with check(exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in (''admin'',''super_admin'')))',t);
end loop; end $$;
create policy signup_newsletter on public.newsletter_subscribers for insert to anon,authenticated with check(status='pending' and confirmed_at is null and consent and interests='{}' and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy signup_community on public.community_interests for insert to anon,authenticated with check(status='pending' and consent and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy submit_contact on public.contact_messages for insert to anon,authenticated with check(status='new' and consent and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create policy submit_analytics on public.analytics_events for insert to anon,authenticated with check(created_at between now()-interval '1 minute' and now()+interval '1 minute');
grant usage, select on sequence public.analytics_events_id_seq to anon,authenticated;
insert into public.site_staff(user_id,role) select id,'super_admin' from auth.users where email='legendadigitalmkt@gmail.com' and email_confirmed_at is not null;
insert into public.authors(name,bio) values('Equipe Legenda Digital','Conteúdo editorial da Legenda Digital para conectar informação e aplicação.');
insert into public.content_categories(name,slug) values('IA','ia'),('Marketing','marketing'),('Vendas','vendas'),('Tecnologia','tecnologia'),('Growth','growth'),('Negócios','negocios'),('Conteúdo','conteudo'),('Creators','creators');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('content-images','content-images',true,8388608,array['image/jpeg','image/png','image/webp']),('authors','authors',true,8388608,array['image/jpeg','image/png','image/webp']),('community','community',true,8388608,array['image/jpeg','image/png','image/webp']),('site-assets','site-assets',true,8388608,array['image/jpeg','image/png','image/webp']),('private-admin','private-admin',false,8388608,array['application/pdf','image/jpeg','image/png','image/webp']);
create policy ld_media_read on storage.objects for select to anon,authenticated using(bucket_id in ('content-images','authors','community','site-assets'));
create policy ld_media_write on storage.objects for insert to authenticated with check(bucket_id in ('content-images','authors','community','site-assets','private-admin') and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('editor','admin','super_admin')));
create policy ld_private_media_read on storage.objects for select to authenticated using(bucket_id='private-admin' and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('admin','super_admin')));
commit;
