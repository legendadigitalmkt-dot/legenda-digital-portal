import {db} from './supabase';
export const BRIEF_COPY='ld-brief-v1-2026-10-13';
const endpoint='https://yltnjgngkomelfltdyky.supabase.co/functions/v1/ld-brief';
export type BriefPreferences={status:string;preferences?:{ld_brief:boolean;growth_intelligence:boolean;product:boolean;community:boolean}};
export async function briefRequest(body:Record<string,unknown>,authenticated=false) {
 const session=authenticated&&db?await db.auth.getSession():null;
 const token=session&&session.data.session?.access_token;
 const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 const data=await res.json();if(!res.ok)throw new Error(data.error||'Não foi possível concluir agora.');return data;
}
export async function briefChallenge(){const res=await fetch(endpoint+'?action=challenge',{signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Inscrição temporariamente indisponível.');const data=await res.json();return String(data.challenge||'');}
export async function briefStatus(){const res=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Não foi possível verificar o envio.');return res.json();}

export async function publicBriefIssues(slug?:string,{offset=0,search=''}={}){
 const key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;if(!key)return [];
 const url=new URL('https://yltnjgngkomelfltdyky.supabase.co/rest/v1/newsletter_issues');
 const params={select:'id,slug,subject,preheader,content,author,issue_date,sent_at,status,is_public',status:'eq.sent',is_public:'eq.true',sent_at:'lte.'+new Date().toISOString(),order:'sent_at.desc',limit:slug?'1':'20',offset:String(offset),...(search.trim()?{subject:'ilike.*'+search.slice(0,80).replace(/[,*%()]/g,' ')+'*'}:{}),...(slug?{slug:'eq.'+slug}:{})};for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 // Explicit public key only: signed-in readers never expose staff-only columns.
 const res=await fetch(url,{headers:{apikey:key},signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Arquivo temporariamente indisponível.');return res.json();
}
