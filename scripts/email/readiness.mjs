import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const dnsTypes={TXT:16,MX:15,CNAME:5,NS:2};
const canonical=value=>String(value).toLowerCase().replace(/\.$/,'');
const txt=value=>String(value).replace(/"\s+"/g,'').replace(/^"|"$/g,'');
export function recordMatches(record,response){
 if(response?.Status!==0||!Array.isArray(response.Answer))return false;
 return response.Answer.some(answer=>{
  if(answer.type!==dnsTypes[record.type]||canonical(answer.name)!==canonical(record.name))return false;
  if(record.type==='TXT')return txt(answer.data)===record.value;
  if(record.type==='MX'){
   const parsed=String(answer.data).match(/^(\d+)\s+(\S+)$/);
   return !!parsed&&Number(parsed[1])===record.priority&&canonical(parsed[2])===canonical(record.value);
  }
  return canonical(answer.data)===canonical(record.value);
 });
}
export function readinessSummary(checks,auth,brief){
 const dns_ready=checks.length===4&&checks.every(c=>c.matches===true);
 const auth_signup_enabled=auth?.disable_signup===false&&auth?.external?.email===true;
 const auth_confirmation_required=auth?.mailer_autoconfirm===false;
 const newsletter_runtime_ready=brief?.service==='ld-brief'&&brief?.sending_ready===true&&brief?.webhook_ready===true;
 return {dns_ready,auth_signup_enabled,auth_confirmation_required,newsletter_runtime_ready,
  gates_green:dns_ready&&auth_signup_enabled&&auth_confirmation_required&&newsletter_runtime_ready,
  delivery_verified:false,note:'Configuração e DNS não comprovam recebimento de emails. Confirmar entrega, opt-in e cancelamento em teste autorizado.'};
}
export async function verifyReadiness({fetchImpl=fetch,publicKey}={}){
 const manifest=JSON.parse(await readFile(new URL('../../ops/email/ld-brief-dns.json',import.meta.url),'utf8'));
 if(manifest.project_ref!=='yltnjgngkomelfltdyky'||manifest.sending_domain!=='news.legendadigital.com.br'||manifest.records.length!==4)throw Error('Portal manifest required');
 const backend='https://yltnjgngkomelfltdyky.supabase.co';
 const get=async(url,options={})=>{const r=await fetchImpl(url,{...options,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Readiness endpoint unavailable (HTTP '+r.status+')');return r.json();};
 const work=await Promise.allSettled([
  ...manifest.records.map(async record=>{
   const url=new URL('https://dns.google/resolve');url.searchParams.set('name',record.name);url.searchParams.set('type',record.type);
   const response=await get(url);
   return {name:record.name,type:record.type,dns_status:response.Status,matches:recordMatches(record,response)};
  }),
  publicKey?get(backend+'/auth/v1/settings',{headers:{apikey:publicKey}}):Promise.resolve(null),
  get(backend+'/functions/v1/ld-brief?action=status'),
 ]);
 const checks=work.slice(0,4).map((result,i)=>result.status==='fulfilled'?result.value:{name:manifest.records[i].name,type:manifest.records[i].type,matches:false,error:'DNS indisponível'});
 const auth=work[4].status==='fulfilled'?work[4].value:null,brief=work[5].status==='fulfilled'?work[5].value:null;
 return {checked_at:new Date().toISOString(),project_ref:manifest.project_ref,sending_domain:manifest.sending_domain,read_only:true,checks,...readinessSummary(checks,auth,brief)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let publicKey=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!publicKey)try{
  const env=await readFile('.env.production.local','utf8');
  publicKey=env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1].replace(/^"|"$/g,'');
 }catch{}
 if(publicKey&&!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey))throw Error('Only a publishable key is accepted');
 const report=await verifyReadiness({publicKey});console.log(JSON.stringify(report,null,2));
 if(process.argv.includes('--require-ready')&&!report.gates_green)process.exitCode=1;
}
