import {createClient} from '@supabase/supabase-js';
const url=import.meta.env?.VITE_SUPABASE_URL;
const key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
// Keep portal sessions scoped to their backend when the project is moved.
const storageKey=url?'ld-portal-auth-'+new URL(url).host.replace(/[^a-z0-9.-]/gi,'-'):'ld-portal-auth';
export const db=url&&key?createClient(url,key,{auth:{storageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function track(event:string,path=location.pathname){if(!db||localStorage.getItem('ld-analytics-consent')!=='yes')return;await db.from('analytics_events').insert({event_name:event,path:path.split('?')[0].slice(0,200)});}

export async function trackEditorial(event:string,articleId?:string){if(!db||!articleId||typeof window==='undefined'||localStorage.getItem('ld-analytics-consent')!=='yes')return;try{await db.rpc('track_editorial',{p_event:event,p_article_id:articleId});}catch{/* Analytics must never interrupt reading or comments. */}}
