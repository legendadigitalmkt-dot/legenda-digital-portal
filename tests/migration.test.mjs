import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLES, SOFTWARE_PROJECT, validateSnapshot, createImportSQL} from '../scripts/prepare-migration.mjs';

function snapshot() {
  const tables = Object.fromEntries(Object.keys(TABLES).map(t=>[t,[]]));
  tables.authors = [{id:'11111111-1111-4111-8111-111111111111',name:'Equipe Legenda Digital',bio:'Editorial',avatar_url:null,created_at:'2026-10-08T00:00:00Z'}];
  tables.content_categories = ['ia','marketing','vendas','tecnologia','growth','negocios','conteudo','creators'].map((slug,i)=>({id:`22222222-2222-4222-8222-${String(i+1).padStart(12,'0')}`,name:slug,slug}));
  return {format_version:1,source_project_ref:SOFTWARE_PROJECT,table_counts:Object.fromEntries(Object.entries(tables).map(([t,rows])=>[t,rows.length])),tables};
}
const refresh = s=>(s.table_counts=Object.fromEntries(Object.entries(s.tables).map(([t,r])=>[t,r.length])),s);

test('Migration refuses the software project, extra tables, inconsistent counts and broken references',()=>{
  const s=snapshot();
  assert.throws(()=>createImportSQL(s,SOFTWARE_PROJECT),/separado/);
  assert.throws(()=>createImportSQL(s,'not-a-ref'),/projeto novo/);
  assert.throws(()=>validateSnapshot({...s,tables:{...s.tables,auth_users:[]}}),/somente/);
  assert.throws(()=>validateSnapshot({...s,table_counts:{...s.table_counts,authors:2}}),/Contagem/);
  const post=Object.fromEntries(TABLES.content_posts.map(c=>[c,null]));
  Object.assign(post,{id:'33333333-3333-4333-8333-333333333333',author_id:'44444444-4444-4444-8444-444444444444',category_id:null});
  s.tables.content_posts.push(post);refresh(s);
  assert.throws(()=>validateSnapshot(s),/Campo único ausente/);
  post.slug='test';
  assert.throws(()=>validateSnapshot(s),/Autor referenciado/);
});

test('Migration refuses duplicate rows and media still pointing to source Storage',()=>{
  const s=snapshot();
  s.tables.authors.push({...s.tables.authors[0]});refresh(s);
  assert.throws(()=>validateSnapshot(s),/duplicado/);
  s.tables.authors.pop();refresh(s);
  s.tables.authors[0].avatar_url=`https://${SOFTWARE_PROJECT}.supabase.co/storage/v1/object/public/authors/photo.webp`;
  assert.throws(()=>validateSnapshot(s),/Storage/);
});

test('Migration encodes SQL-like content as JSON data and preserves identity sequence handling',()=>{
  const s=snapshot();
  s.tables.authors[0].bio="Texto '); drop table public.content_posts; -- $ld_guard$";
  s.tables.analytics_events.push({id:7,event_name:'page_view',path:'/',created_at:'2026-10-08T01:00:00Z'});refresh(s);
  const sql=createImportSQL(s,'abcdefghijklmnopqrst');
  const match=sql.match(/values \((\$ld_snapshot_[a-f0-9_]+\$)([\s\S]*?)\1::jsonb/);
  assert.ok(match,'JSON must be a single safely delimited SQL literal');
  assert.deepEqual(JSON.parse(match[2]),s.tables);
  assert.match(sql,/Destino contém tabelas externas/);
  assert.match(sql,/Destino já possui dados/);
  assert.match(sql,/overriding system value/);
  assert.match(sql,/pg_get_serial_sequence/);
  assert.ok(sql.indexOf('Contagem divergente')<sql.lastIndexOf('commit;'));
  assert.doesNotMatch(sql,/insert into (?:public\.site_staff|auth\.users)/);
});
