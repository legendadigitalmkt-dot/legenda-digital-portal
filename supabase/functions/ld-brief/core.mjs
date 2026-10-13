// Shared by the Edge runtime and Node tests. No provider credentials in clients.
export const PORTAL = 'https://legendadigital.com.br';
export const BACKEND = 'https://yltnjgngkomelfltdyky.supabase.co';
export const COPY_VERSION = 'ld-brief-v1-2026-10-13';
const encoder = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
export const hex = bytes => [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function hash(value) { return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value))); }
export async function sign(value, secret, raw=false) {
  const key=await crypto.subtle.importKey('raw',raw?secret:encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}
export function equal(a,b) { if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0; }
export async function capability(id,purpose,secret) { return (await sign(`ld-brief-v1:${purpose}:${id}`,secret)).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
export async function challenge(secret, clock=Date.now()) { const payload=`${clock}.${crypto.randomUUID()}`;return payload+'.'+await capability(payload,'challenge',secret); }
export async function verifyChallenge(token,secret,clock=Date.now()) {const parts=String(token).split('.');if(parts.length!==3)return false;const age=clock-Number(parts[0]);return age>=800&&age<=600000&&equal(parts[2],await capability(parts.slice(0,2).join('.'),'challenge',secret));}
export function validateSignup(body) {
  if(body?.consent!==true||body?.copy_version!==COPY_VERSION)throw new Error('Consentimento necessário.');
  const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),source=String(body.source||'site');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length>100||!/^[a-z0-9_-]{1,80}$/.test(source))throw new Error('Revise os campos informados.');
  return {email,name:name||null,source};
}
export const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function emailTemplate({title,preheader='',content,actionUrl,actionLabel='Confirmar inscrição',manageUrl}) {
  const html=`<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7faff;color:#07152b;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:32px 24px;background:white"><p style="color:#163efa;font-weight:bold">Legenda Digital · LD Brief</p><p style="color:#52647c">${escape(preheader)}</p><h1 style="font-size:28px;line-height:1.2">${escape(title)}</h1>${content.split(/\n\n+/).map(p=>'<p style="line-height:1.7;white-space:pre-wrap">'+escape(p)+'</p>').join('')}${actionUrl?`<p><a style="color:#163efa" href="${escape(actionUrl)}">${escape(actionLabel)}</a></p>`:''}<hr><p style="font-size:13px;line-height:1.6">Inteligência prática para negócios. <a href="${PORTAL}/privacidade#newsletter">Privacidade</a>${manageUrl?` · <a href="${escape(manageUrl)}">Preferências e descadastro</a>`:''}</p></div></body></html>`;
  return {html,text:`Legenda Digital · LD Brief\n\n${title}\n${preheader}\n\n${content}\n\n${actionUrl||''}\n\nPreferências e descadastro: ${manageUrl||PORTAL+'/newsletter'}\nPrivacidade: ${PORTAL}/privacidade#newsletter`};
}
export function createProvider(env,fetchImpl=fetch) {
  const ready=env.LD_BRIEF_SENDING_ENABLED==='true'&&/^re_[A-Za-z0-9_-]+$/.test(env.RESEND_API_KEY||'')&&/^[^\r\n<>]+<[^\s<>@]+@(?:[a-z0-9-]+\.)*legendadigital\.com\.br>$/.test(env.LD_BRIEF_FROM||'');
  return {name:'resend',ready,async send(message,key) {
    if(!ready)throw new Error('provider_not_ready');
    const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:env.LD_BRIEF_FROM,...message}),signal:AbortSignal.timeout(12000)});
    const data=await response.json();if(!response.ok||typeof data.id!=='string')throw new Error('provider_rejected');return data.id;
  }};
}
export async function verifyWebhook(raw,headers,secret,clock=Date.now()) {
  const id=headers.get('svix-id'),stamp=headers.get('svix-timestamp'),signature=headers.get('svix-signature');
  if(!id||id.length>150||!stamp||Math.abs(clock/1000-Number(stamp))>300||!/^\d+$/.test(stamp)||!signature||!secret?.startsWith('whsec_'))return false;
  try {const bytes=Uint8Array.from(atob(secret.slice(6)),c=>c.charCodeAt(0));const expected=await sign(`${id}.${stamp}.${raw}`,bytes,true);return signature.split(' ').some(s=>s.startsWith('v1,')&&equal(s.slice(3),expected));}catch{return false;}
}
