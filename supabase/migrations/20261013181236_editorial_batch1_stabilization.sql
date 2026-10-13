-- Portal only. Add the approved event taxonomy without rewriting historical data.
-- Preserve every existing event allowed by tools/newsletter/foundation migrations.
begin;
do $migration$
declare definition text;
begin
  select pg_get_constraintdef(oid) into definition
  from pg_constraint where conrelid='public.analytics_events'::regclass
    and conname='analytics_events_event_name_check';
  if definition is null or position('ARRAY[' in definition)=0 then
    raise exception 'Expected analytics event constraint missing';
  end if;
  alter table public.analytics_events drop constraint analytics_events_event_name_check;
  execute 'alter table public.analytics_events add constraint analytics_events_event_name_check '
    ||replace(definition,'ARRAY[','ARRAY[''article_25_percent''::text, ''article_50_percent''::text, ''article_75_percent''::text, ''article_completed''::text, ''toc_clicked''::text, ''source_clicked''::text, ''internal_link_clicked''::text, ''share_clicked''::text, ''comment_started''::text, ''comment_submitted''::text, ''comment_replied''::text, ''newsletter_cta_clicked''::text, ');
end $migration$;

-- Retains the existing anonymous bounded write API. It accepts only a fixed
-- event and a currently public article, and builds metadata from public fields.
-- No user/IP/email identifiers or arbitrary caller-supplied metadata are stored.
create or replace function public.track_editorial(p_event text,p_article_id uuid)
returns void language plpgsql security definer set search_path='' as $function$
declare article public.content_posts; event_name text;
begin
  event_name := case p_event
    when 'article_scroll_25' then 'article_25_percent'
    when 'article_scroll_50' then 'article_50_percent'
    when 'article_scroll_75' then 'article_75_percent'
    when 'article_read_completed' then 'article_completed'
    when 'article_toc_clicked' then 'toc_clicked'
    when 'article_source_clicked' then 'source_clicked'
    when 'article_internal_link_clicked' then 'internal_link_clicked'
    when 'article_shared' then 'share_clicked'
    when 'article_comment_started' then 'comment_started'
    when 'article_comment_submitted' then 'comment_submitted'
    when 'article_reply_submitted' then 'comment_replied'
    when 'article_newsletter_clicked' then 'newsletter_cta_clicked'
    when 'article_growth_cta_clicked' then 'growth_os_cta_clicked'
    else p_event end;
  if event_name is null or event_name not in ('article_viewed', 'article_25_percent', 'article_50_percent', 'article_75_percent', 'article_completed', 'toc_clicked', 'source_clicked', 'internal_link_clicked', 'share_clicked', 'comment_started', 'comment_submitted', 'comment_replied', 'newsletter_cta_clicked', 'growth_os_cta_clicked', 'article_comment_reported') then
    raise exception 'Invalid editorial event';
  end if;
  select * into article from public.content_posts
    where id=p_article_id and status='published' and published_at<=now();
  if article.id is null then raise exception 'Published article required'; end if;
  insert into public.analytics_events(event_name,path,article_id,metadata)
    values(event_name,'/conteudos/'||article.slug,article.id,
      jsonb_build_object('article_id',article.id,'slug',article.slug,
        'category',article.category,'author',article.author));
end $function$;
revoke all on function public.track_editorial(text,uuid) from public;
grant execute on function public.track_editorial(text,uuid) to anon,authenticated;
commit;
