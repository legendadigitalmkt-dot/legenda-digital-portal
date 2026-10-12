begin;
-- Additive CMS configuration. No UPDATE of existing content or Auth records.
alter table public.content_posts add column article_extras jsonb not null default '{}';
alter table public.content_posts add constraint content_posts_article_extras_check check (
  jsonb_typeof(article_extras) = 'object' and octet_length(article_extras::text) <= 20000
  and case when article_extras ? 'banners' then
    case when jsonb_typeof(article_extras->'banners') = 'array' then jsonb_array_length(article_extras->'banners') <= 4 else false end else true end
  and case when article_extras ? 'links' then
    case when jsonb_typeof(article_extras->'links') = 'array' then jsonb_array_length(article_extras->'links') <= 10 else false end else true end
  and case when article_extras ? 'hideGrowthPromo' then jsonb_typeof(article_extras->'hideGrowthPromo') = 'boolean' else true end
);
comment on column public.content_posts.article_extras is 'Per-article public banners and manual links. URLs/types are normalized by the public DTO and renderer. Covered by existing post RLS and version snapshots.';

-- Public editorial resources, consistent with the existing blog image bucket.
-- Never use this bucket for private documents. Uploaded resources are public before publication.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('editorial-files','editorial-files',true,20971520,array[
  'application/pdf','text/plain','text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip','audio/mpeg','audio/mp4','audio/wav','video/mp4','video/webm'
]) on conflict(id) do nothing;
create policy ld_editorial_files_read on storage.objects for select to anon,authenticated
using(bucket_id='editorial-files');
create policy ld_editorial_files_insert on storage.objects for insert to authenticated
with check (
  bucket_id='editorial-files'
  and split_part(name,'/',1)=(select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|txt|csv|docx|xlsx|pptx|zip|mp3|m4a|wav|mp4|webm)$'
  and exists(select 1 from public.site_staff where user_id=(select auth.uid()) and role in ('author','editor','admin','super_admin'))
);
-- No client overwrite/delete policy: UUID paths and upsert:false keep files immutable.
commit;
