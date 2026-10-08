import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

export const SOFTWARE_PROJECT = 'cknlzuinwcdupdxilzcf';
export const TABLES = {
  authors: ['id','name','bio','avatar_url','created_at'],
  content_categories: ['id','name','slug'],
  content_tags: ['id','name','slug'],
  content_posts: ['id','title','slug','excerpt','body','featured_image','author_id','category_id','author','category','tags','kind','status','published_at','reading_time','seo_title','seo_description','created_at','updated_at'],
  site_settings: ['id','config','updated_at'],
  newsletter_subscribers: ['id','email','name','status','source','interests','consent','created_at','confirmed_at'],
  community_interests: ['id','email','name','status','source','consent','created_at'],
  contact_messages: ['id','name','email','company','subject','message','consent','status','created_at'],
  community_events: ['id','title','description','event_at','location','image','status','created_at'],
  site_tools: ['id','title','slug','description','kind','url','image','status','created_at'],
  analytics_events: ['id','event_name','path','created_at'],
};
const seedSlugs = ['ia','marketing','vendas','tecnologia','growth','negocios','conteudo','creators'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ref = /^[a-z]{20}$/;

export function validateSnapshot(snapshot) {
  if(snapshot?.format_version !== 1 || !ref.test(snapshot.source_project_ref)) throw Error('Formato ou projeto de origem inválido.');
  const tables = snapshot.tables;
  if(!tables || Object.keys(tables).length !== Object.keys(TABLES).length || Object.keys(tables).some(t=>!Object.hasOwn(TABLES,t))) throw Error('O snapshot deve conter somente as onze tabelas de dados do portal.');
  for(const [table, columns] of Object.entries(TABLES)) {
    const rows = tables[table];
    if(!Array.isArray(rows) || snapshot.table_counts?.[table] !== rows.length) throw Error('Contagem inconsistente: '+table);
    const seen = new Set();
    const uniqueFields = ['id', ...(['content_categories','content_tags'].includes(table)?['name','slug']:[]), ...(['content_posts','site_tools'].includes(table)?['slug']:[]), ...(['newsletter_subscribers','community_interests'].includes(table)?['email']:[]), ...(table==='authors'?['name']:[])];
    for(const row of rows) {
      if(!row || typeof row !== 'object' || Object.keys(row).length !== columns.length || columns.some(c=>!Object.hasOwn(row,c))) throw Error('Colunas inesperadas ou ausentes: '+table);
      if(table==='analytics_events' ? !Number.isSafeInteger(row.id)||row.id<1 : table==='site_settings' ? row.id!=='site' : !uuid.test(row.id)) throw Error('Identificador inválido: '+table);
      for(const field of uniqueFields) {
        if(row[field]===null || row[field]===undefined) throw Error('Campo único ausente: '+table+'.'+field);
        const value = field+'\0'+row[field];
        if(seen.has(value)) throw Error('Valor duplicado: '+table+'.'+field);
        seen.add(value);
      }
    }
  }
  const authorIds = new Set(tables.authors.map(r=>r.id));
  const categoryIds = new Set(tables.content_categories.map(r=>r.id));
  for(const post of tables.content_posts) {
    if(post.author_id!==null&&!authorIds.has(post.author_id)) throw Error('Autor referenciado não foi exportado.');
    if(post.category_id!==null&&!categoryIds.has(post.category_id)) throw Error('Categoria referenciada não foi exportada.');
  }
  if(!tables.authors.some(a=>a.name==='Equipe Legenda Digital') || seedSlugs.some(slug=>!tables.content_categories.some(c=>c.slug===slug))) throw Error('Autores/categorias iniciais precisam de revisão manual antes da importação.');
  if(JSON.stringify(tables).includes('https://'+snapshot.source_project_ref+'.supabase.co/storage/v1/')) throw Error('Há referências de Storage que exigem migração dos arquivos antes do banco.');
  return snapshot;
}

export function createImportSQL(snapshot, targetRef) {
  validateSnapshot(snapshot);
  if(!ref.test(targetRef)||targetRef===SOFTWARE_PROJECT||targetRef===snapshot.source_project_ref) throw Error('Destino deve ser um projeto novo, separado do Growth OS e da origem.');
  const json = JSON.stringify(snapshot.tables);
  let delimiter = 'ld_snapshot_'+createHash('sha256').update(json).digest('hex').slice(0,16);
  while(json.includes('$'+delimiter+'$')) delimiter += '_x';
  const names = Object.keys(TABLES);
  const array = names.concat('site_staff').map(t=>"'"+t+"'").join(',');
  const emptyTables = names.filter(t=>!['authors','content_categories'].includes(t));
  let sql = `-- Importação única do portal para ${targetRef}. Origem: ${snapshot.source_project_ref}.
-- Executar como postgres SOMENTE no novo projeto indicado acima, após a foundation e sem seed.sql.
-- Contém dados operacionais: manter fora do Git e de public_html.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $ld_guard$
declare t text; expected text[] := array[${array}];
begin
  if exists(select 1 from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and not(table_name=any(expected))) then
    raise exception 'Destino contém tabelas externas ao portal; importação cancelada';
  end if;
  foreach t in array expected loop
    if to_regclass('public.'||t) is null then raise exception 'Foundation ausente: %',t; end if;
  end loop;
end $ld_guard$;
lock table ${names.concat('site_staff').map(t=>'public.'+t).join(', ')} in share row exclusive mode;
do $ld_empty$
declare t text; occupied boolean;
begin
  foreach t in array array[${emptyTables.map(t=>"'"+t+"'").join(',')}] loop
    execute format('select exists(select 1 from public.%I)',t) into occupied;
    if occupied then raise exception 'Destino já possui dados em %; não sobrescrever',t; end if;
  end loop;
  if (select count(*) from public.authors)>1 or exists(select 1 from public.authors where name<>'Equipe Legenda Digital' or bio<>'Conteúdo editorial da Legenda Digital para conectar informação e aplicação.' or avatar_url is not null) then
    raise exception 'Autores do destino foram alterados; revisão manual necessária';
  end if;
  if exists(select 1 from public.content_categories where slug not in (${seedSlugs.map(s=>"'"+s+"'").join(',')})) then
    raise exception 'Categorias do destino foram alteradas; revisão manual necessária';
  end if;
end $ld_empty$;
create temporary table ld_portal_import(payload jsonb not null) on commit drop;
insert into ld_portal_import values ($${delimiter}$${json}$${delimiter}$::jsonb);
`;
  for(const table of ['authors','content_categories']) {
    const columns = TABLES[table];
    const match = table==='authors'?'name':'slug';
    sql += `update public.${table} as dst set ${columns.map(c=>c+'=src.'+c).join(', ')}
from jsonb_populate_recordset(null::public.${table}, (select payload->'${table}' from ld_portal_import)) as src
where dst.${match}=src.${match};
insert into public.${table} (${columns.join(',')})
select ${columns.map(c=>'src.'+c).join(',')} from jsonb_populate_recordset(null::public.${table}, (select payload->'${table}' from ld_portal_import)) as src
where not exists(select 1 from public.${table} dst where dst.id=src.id);
`;
  }
  for(const table of emptyTables) {
    const cols = TABLES[table].join(',');
    sql += `insert into public.${table} (${cols})${table==='analytics_events'?' overriding system value':''}
select ${cols} from jsonb_populate_recordset(null::public.${table}, (select payload->'${table}' from ld_portal_import));
`;
  }
  sql += `do $ld_verify$
declare t text; actual bigint; expected bigint;
begin
  foreach t in array array[${names.map(t=>"'"+t+"'").join(',')}] loop
    execute format('select count(*) from public.%I',t) into actual;
    select jsonb_array_length(payload->t) into expected from ld_portal_import;
    if actual<>expected then raise exception 'Contagem divergente em %: % / %',t,actual,expected; end if;
  end loop;
end $ld_verify$;
select setval(pg_get_serial_sequence('public.analytics_events','id'),greatest(coalesce(max(id),1),1),count(*)>0) from public.analytics_events;
commit;
`;
  return sql;
}

function main() {
  const args = process.argv.slice(2);
  const value = flag=>args[args.indexOf(flag)+1];
  const file = args.includes('--snapshot')?value('--snapshot'):'.migration-data/portal-snapshot.json';
  const snapshot = validateSnapshot(JSON.parse(readFileSync(file,'utf8')));
  if(args.includes('--check')) { console.log(JSON.stringify({source_project_ref:snapshot.source_project_ref,table_counts:snapshot.table_counts},null,2)); return; }
  if(!args.includes('--target-project-ref')||!args.includes('--output')) throw Error('Use --check ou informe --target-project-ref e --output .migration-data/import.sql.');
  const output = resolve(value('--output'));
  if(!output.startsWith(resolve('.migration-data')+sep)) throw Error('Grave o SQL somente na pasta ignorada .migration-data.');
  const sql = createImportSQL(snapshot,value('--target-project-ref'));
  mkdirSync(dirname(output),{recursive:true,mode:0o700});
  writeFileSync(output,sql,{encoding:'utf8',mode:0o600,flag:'wx'});
  console.log('Importação preparada: '+output+' (nenhuma conexão ou alteração de banco executada).');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch(error) { console.error(error.message); process.exitCode=1; }
}
