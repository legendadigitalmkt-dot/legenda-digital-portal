begin;
create function private.publish_due_articles() returns integer language plpgsql security definer set search_path='' as $$
declare amount integer;begin
 update public.content_posts set status='published',published_at=now() where status='scheduled' and scheduled_at<=now() and approved_at is not null;
 get diagnostics amount=row_count;return amount;
end $$;
revoke all on function private.publish_due_articles() from public,anon,authenticated;
create extension if not exists pg_cron;
select cron.schedule('ld-portal-publish-approved','* * * * *','select private.publish_due_articles()');
commit;
