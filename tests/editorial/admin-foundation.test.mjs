import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const roles=JSON.parse(await readFile('src/config/admin-roles.json','utf8'));
const ids=Object.fromEntries([...Object.keys(roles),'reader'].map((r,i)=>[r,'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')]));
async function as(db,role){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[role]||'']);await db.exec('set role '+(role==='anon'?'anon':'authenticated'));}
async function system(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}
async function init(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz not null default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 alter default privileges in schema public grant all on tables to anon,authenticated;alter default privileges in schema public grant all on sequences to anon,authenticated;`);
 for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
  let sql=await readFile('supabase/migrations/'+f,'utf8');
  if(f.includes('editorial_scheduler'))sql=sql.replace(/create extension if not exists pg_cron;[\s\S]*?commit;/,'commit;');
  await db.exec(sql);
 }
 await db.exec('grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated');
 for(const [name,id] of Object.entries(ids)){
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,name+'@example.test']);
  if(name!=='reader')await db.query('insert into public.site_staff(user_id,role) values($1,$2)',[id,name]);
 }
 return db;
}
test('Super Admin Foundation: real migration chain, granular access, immutable audit and minimal directory',async t=>{
 const db=await init();t.after(()=>db.close());
 await t.test('all twelve roles and legacy aliases match the frontend matrix; unknown permission denies',async()=>{
  const permissions=[...new Set(Object.values(roles).flat()),'unknown.permission'];
  for(const [role,list] of Object.entries(roles)){await as(db,role);for(const permission of permissions)assert.equal((await db.query('select private.can($1) ok',[permission])).rows[0].ok,list.includes(permission),role+':'+permission);}
 });
 await t.test('anonymous and nonstaff cannot invoke privileged RPCs or self-grant, even with forged metadata',async()=>{
  for(const role of ['anon','reader']){await as(db,role);await assert.rejects(db.query('select public.portal_admin_users()'));await assert.rejects(db.query('select public.portal_admin_dashboard()'));await assert.rejects(db.query("insert into public.site_staff(user_id,role) values($1,'platform_owner')",[ids.reader]));await assert.rejects(db.exec('truncate public.site_staff'));}
  await as(db,'reader');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({user_metadata:{role:'platform_owner'},app_metadata:{role:'platform_owner'}})]);assert.equal((await db.query("select private.can('users.read') ok")).rows[0].ok,false);
 });
 await t.test('viewer, analyst and moderator cannot read audit/user directory or mutate staff',async()=>{
  for(const role of ['viewer','analyst','moderator']){await as(db,role);assert.equal((await db.query('select * from public.portal_admin_audit')).rows.length,0);await assert.rejects(db.query('select public.portal_admin_users()'));await assert.rejects(db.query("update public.site_staff set role='platform_owner' where user_id=$1",[ids[role]]));}
 });
 let articleId;
 await t.test('administrative changes create sanitized transactional before/after and no-op does not duplicate',async()=>{
  await as(db,'platform_owner');
  articleId=(await db.query("insert into public.content_posts(title,slug,excerpt,body,featured_image,hero_image_alt,published_at) values('Foundation test','foundation-test','Resumo','<p>private-body-marker</p>','/images/hero.webp','Diagrama',now()) returning id")).rows[0].id;
  await db.query("update public.content_posts set body='<p>updated-private-marker</p>' where id=$1",[articleId]);
  const rows=(await db.query("select * from public.portal_admin_audit where entity='content_posts' and entity_id=$1 order by created_at",[articleId])).rows;
  assert.equal(rows.length,2);assert.equal(rows[0].actor_id,ids.platform_owner);assert.ok(rows.some(r=>r.before&&r.after));
  assert.ok(!JSON.stringify(rows).includes('private-marker'));assert.ok(!JSON.stringify(rows).includes('private-body-marker'));
  for(const r of rows){assert.ok(!Object.hasOwn(r.after,'body'));assert.ok(!Object.hasOwn(r.after,'email'));assert.ok(!Object.hasOwn(r.after,'config'));}
  await db.query('update public.content_posts set body=body where id=$1',[articleId]);assert.equal((await db.query("select * from public.portal_admin_audit where entity='content_posts' and entity_id=$1",[articleId])).rows.length,2);
  await db.exec('begin');await db.query("update public.content_posts set title='Rolled back' where id=$1",[articleId]);await db.exec('rollback');
  assert.equal((await db.query("select * from public.portal_admin_audit where entity='content_posts' and entity_id=$1",[articleId])).rows.length,2);
 });
 await t.test('even platform_owner cannot forge, edit, delete or truncate audit rows',async()=>{
  await as(db,'platform_owner');await assert.rejects(db.query("insert into public.portal_admin_audit(action,entity) values('fake','fake')"));await assert.rejects(db.query("update public.portal_admin_audit set action='fake'"));await assert.rejects(db.query('delete from public.portal_admin_audit'));await assert.rejects(db.exec('truncate public.portal_admin_audit'));
 });
 await t.test('directory returns only approved fields, caps pagination, logs consultation, revocation applies immediately',async()=>{
  await as(db,'platform_owner');const rows=(await db.query('select * from public.portal_admin_users(5,0)')).rows;assert.equal(rows.length,5);assert.deepEqual(Object.keys(rows[0]).sort(),['confirmed','created_at','id','staff_role']);await assert.rejects(db.query('select * from public.portal_admin_users(10000,0)'));await assert.rejects(db.query('select * from public.portal_admin_users(25,-1)'));
  assert.ok((await db.query("select * from public.portal_admin_audit where entity='portal_users'")).rows.length);
  await system(db);await db.query("update public.site_staff set role='viewer' where user_id=$1",[ids.platform_owner]);await as(db,'platform_owner');await assert.rejects(db.query('select * from public.portal_admin_users()'));
  await system(db);await db.query("update public.site_staff set role='platform_owner' where user_id=$1",[ids.platform_owner]);
 });
 await t.test('dashboard distinguishes permission absence from measured zero and never exposes private answers',async()=>{
  await as(db,'platform_owner');const all=(await db.query('select public.portal_admin_dashboard() data')).rows[0].data;assert.equal(all.find(x=>x.id==='users').value,Object.keys(ids).length);assert.equal(all.find(x=>x.id==='starts').value,0);assert.equal(all.find(x=>x.id==='starts').available,true);assert.ok(!all.find(x=>x.id==='returning'));
  await as(db,'viewer');const limited=(await db.query('select public.portal_admin_dashboard() data')).rows[0].data;assert.equal(limited.find(x=>x.id==='users').available,false);assert.equal(limited.find(x=>x.id==='users').value,null);
  await as(db,'reader');await db.query("select public.save_tool_run_v2(gen_random_uuid(),'claro',2,'Private result','{}','{}',now(),gen_random_uuid(),'{}',null)");await as(db,'platform_owner');assert.equal((await db.query('select * from public.tool_runs')).rows.length,0);
 });
 await t.test('specialist scopes work at the database: tools admin edits tools, newsletter admin prepares issues, viewer cannot',async()=>{
  await as(db,'tools_admin');await db.query("update public.tools set description='Revisado' where id='claro'");assert.equal((await db.query("select description from public.tools where id='claro'")).rows[0].description,'Revisado');
  await as(db,'viewer');assert.equal((await db.query("update public.tools set description='Forbidden' where id='claro' returning id")).rows.length,0);
  await as(db,'newsletter_admin');const issue=(await db.query("insert into public.newsletter_issues(slug,subject,content,status,created_by) values('foundation-issue','Edição de teste','Conteúdo editorial de teste para revisão local.','review',$1) returning id",[ids.newsletter_admin])).rows[0].id;assert.ok(issue);await assert.rejects(db.query('select public.newsletter_claim_issue($1,$2)',[issue,ids.newsletter_admin]));
 });
 await t.test('directory rate limiting and storage audit remain enforced for privileged users',async()=>{
  await as(db,'newsletter_admin');await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('private-admin','private.pdf')"));
  await db.query("insert into storage.objects(bucket_id,name) values('authors','fixture.png')");
  await as(db,'platform_owner');assert.ok((await db.query("select * from public.portal_admin_audit where entity='objects' and metadata->>'source_schema'='storage'")).rows.length);
  let n=Number((await db.query("select count(*) n from public.portal_admin_audit where entity='portal_users' and actor_id=$1",[ids.platform_owner])).rows[0].n);
  for(;n<20;n++)await db.query('select * from public.portal_admin_users(1,0)');
  await assert.rejects(db.query('select * from public.portal_admin_users(1,0)'),/rate limit/);
 });

});

