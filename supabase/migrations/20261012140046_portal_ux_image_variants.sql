begin;
-- Presentation-only fields. Existing RLS, workflow, Auth, bodies and timestamps are preserved.
alter table public.content_posts
 add column image_variant text not null default 'editorial'
   check(image_variant in ('editorial','photography','illustration')),
 add column hero_position text not null default 'center'
   check(hero_position in ('center','top','bottom') or hero_position ~ '^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$'),
 add column card_image text not null default '',
 add column card_image_mobile text not null default '',
 add column card_image_large text not null default '';
comment on column public.content_posts.image_variant is 'Editorial and illustration frames preserve all information; only photography may crop.';
comment on column public.content_posts.hero_position is 'Validated photographic object-position; never used to repair text art.';
commit;
