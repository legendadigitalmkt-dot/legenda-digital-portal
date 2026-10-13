import {BACKEND,PORTAL,hash,capability,challenge,verifyChallenge,validateSignup,emailTemplate,createProvider,verifyWebhook} from './core.mjs';
const allowedOrigins=new Set([PORTAL,'https://www.legendadigital.com.br']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const events=new Set(['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.opened','email.clicked']);
export function createHandler(env,{fetchImpl=fetch,clock=Date.now}={}) {
 const secret=env.NEWSLETTER_TOKEN_SECRET||env.SUPABASE_SERVICE_ROLE_KEY,provider=createProvider(env,fetchImpl);
 async function api(path,body,method='POST') {
  if(env.SUPABASE_URL!==BACKEND||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('backend_unavailable');
  const response=await fetchImpl(BACKEND+'/rest/v1/'+path,{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('operation_unavailable');return response.status===204?null:response.json();
 }
 const rpc=(name,body)=>api('rpc/newsletter_'+name,body);
 async function user(req) {
  const auth=req.headers.get('authorization');if(!auth?.startsWith('Bearer '))throw new Error('unauthorized');
  const res=await fetchImpl(BACKEND+'/auth/v1/user',{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:auth},signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw new Error('unauthorized');const u=await res.json();if(!UUID.test(u.id)||!u.email_confirmed_at||!u.email)throw new Error('unauthorized');return u;
 }
 return async req=>{
  const url=new URL(req.url),origin=req.headers.get('origin');
  const cors=origin&&allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{};
  const headers={...cors,'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowedOrigins.has(origin))return json({error:'Origem não permitida.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method==='GET') {
   if(url.searchParams.get('action')==='challenge'&&secret)return json({challenge:await challenge(secret,clock())});
   if(url.searchParams.get('action')==='unsubscribe')return new Response('Abra o link de preferências no e-mail para confirmar o descadastro.',{headers:{...headers,'Content-Type':'text/plain'}});
   return json({service:'ld-brief',release:'ld-brief-v1',provider:'resend',sending_ready:provider.ready,webhook_ready:!!env.RESEND_WEBHOOK_SECRET});
  }
  if(req.method!=='POST')return json({error:'Método não permitido.'},405);
  try {
   if(Number(req.headers.get('content-length')||0)>65536)return json({error:'Conteúdo muito grande.'},413);
   const reader=req.body?.getReader();let size=0;const parts=[];if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return json({error:'Conteúdo muito grande.'},413);}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}const raw=new TextDecoder().decode(bytes);
   if(url.searchParams.get('action')==='webhook') {
    if(!await verifyWebhook(raw,req.headers,env.RESEND_WEBHOOK_SECRET,clock()))return json({error:'Assinatura inválida.'},401);
    const data=JSON.parse(raw);if(!events.has(data.type))return json({ok:true});
    if(typeof data.data?.email_id!=='string'||data.data.email_id.length>150||!Number.isFinite(Date.parse(data.created_at)))return json({error:'Evento inválido.'},400);
    await rpc('provider_event',{p_event_id:req.headers.get('svix-id'),p_provider_id:data.data.email_id,p_type:data.type,p_occurred_at:data.created_at});return json({ok:true});
   }
   if(url.searchParams.get('action')==='unsubscribe') {
    const token=url.searchParams.get('token');if(!TOKEN.test(token||'')||raw!=='List-Unsubscribe=One-Click')return json({error:'Pedido inválido.'},400);
    await rpc('unsubscribe',{p_hash:await hash(token)});return new Response(null,{status:200,headers});
   }
   const b=JSON.parse(raw);
   if(b.action==='signup') {
    const v=validateSignup(b);
    if(b.website)return json({state:'pending',message:'Se houver uma inscrição pendente, a confirmação será enviada quando disponível.'});
    if(!secret||!await verifyChallenge(b.challenge,secret,clock()))return json({error:'Atualize a página e tente novamente.'},400);
    const confirmToken=await capability(crypto.randomUUID(),'confirm',secret),manageToken=await capability(v.email,'manage',secret);
    const rate=await hash(await capability(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown','rate',secret));
    const begun=await rpc('begin_signup',{p_id:crypto.randomUUID(),p_email:v.email,p_name:v.name,p_source:v.source,p_confirm_hash:await hash(confirmToken),p_manage_hash:await hash(manageToken),p_rate_hash:rate,p_unsubscribe_hash:await hash(await capability(v.email,'unsubscribe',secret))});
    const pendingMessage='Interesse registrado. O envio de confirmação ainda não está disponível. Você ainda não recebe edições; volte para confirmar quando o envio for ativado.';
    const readyMessage='Se houver uma inscrição pendente, verifique a confirmação no seu e-mail, inclusive na pasta de spam. O link vale por 48 horas. Aguarde 15 minutos antes de pedir novamente.';
    if(begun.send) {
     if(!provider.ready)await rpc('delivery_result',{p_id:begun.delivery_id,p_status:'failed'});
     else try {
      const manageUrl=PORTAL+'/newsletter/preferencias#token='+manageToken;
      const template=emailTemplate({title:'Confirme sua inscrição no LD Brief',content:'Você pediu para receber o LD Brief. Confirme para receber as edições. Se não fez esse pedido, ignore esta mensagem. O link vale por 48 horas.',actionUrl:PORTAL+'/newsletter/confirmar#token='+confirmToken,manageUrl});
      const id=await provider.send({to:[v.email],subject:'Confirme sua inscrição no LD Brief',...template},'ld-brief-confirm-'+begun.delivery_id);
      await rpc('delivery_result',{p_id:begun.delivery_id,p_status:'accepted',p_provider_id:id});
     }catch{await rpc('delivery_result',{p_id:begun.delivery_id,p_status:'failed'});return json({state:'pending',message:'Interesse registrado. O envio de confirmação está pendente. Tente novamente após 15 minutos.'});}
    }
    return json({state:'pending',message:provider.ready?readyMessage:pendingMessage});
   }
   if(['confirm','preferences','unsubscribe','read'].includes(b.action)) {
    if(!TOKEN.test(b.token||''))return json({error:'Link inválido ou expirado. Solicite uma nova confirmação na newsletter.'},400);
    if(b.action==='preferences'&&typeof b.ld_brief!=='boolean')return json({error:'Preferência inválida.'},400);
    return json(b.action==='confirm'?await rpc('confirm',{p_hash:await hash(b.token)}):await rpc('manage',{p_hash:await hash(b.token),p_action:b.action,p_ld_brief:typeof b.ld_brief==='boolean'?b.ld_brief:null}));
   }
   if(['account','account_preferences'].includes(b.action)) {
    const u=await user(req),token=await capability(u.email.trim().toLowerCase(),'manage',secret);
    const rows=await api('newsletter_subscribers?select=id&email=eq.'+encodeURIComponent(u.email.trim().toLowerCase())+'&limit=1',null,'GET');if(!rows.length)return json({status:'not_registered'});
    return json(await rpc('manage',{p_hash:await hash(token),p_action:b.action==='account'?'read':'preferences',p_ld_brief:typeof b.ld_brief==='boolean'?b.ld_brief:null}));
   }
   if(b.action==='dispatch') {
    const u=await user(req);if(!UUID.test(b.issue_id||''))return json({error:'Edição inválida.'},400);
    const staff=await api('site_staff?select=role&user_id=eq.'+u.id+'&limit=1',null,'GET');if(!['admin','super_admin'].includes(staff[0]?.role))return json({error:'Sem permissão.'},403);
    if(!provider.ready)return json({error:'Envio bloqueado: configure e valide o Resend antes de enviar.'},503);
    if(b.confirm_send!==true)return json({error:'Confirme o envio desta edição.'},400);
    const queued=await rpc('claim_issue',{p_id:b.issue_id,p_actor:u.id});if(queued.empty)return json({empty:true,accepted:0,failed:0});let accepted=0,failed=0;
    for(const d of queued.batch) {
     try {
      const s=await api('newsletter_subscribers?select=status&id=eq.'+d.subscriber_id,null,'GET'),prefs=await api('newsletter_preferences?select=ld_brief&subscriber_id=eq.'+d.subscriber_id,null,'GET');
      if(s[0]?.status!=='subscribed'||!prefs[0]?.ld_brief){await rpc('delivery_result',{p_id:d.id,p_status:'suppressed'});continue;}
      const token=await capability(d.email,'manage',secret),manageUrl=PORTAL+'/newsletter/preferencias#token='+token,unsub=BACKEND+'/functions/v1/ld-brief?action=unsubscribe&token='+await capability(d.email,'unsubscribe',secret),i=queued.issue;
      const id=await provider.send({to:[d.email],subject:i.subject,...emailTemplate({title:i.subject,preheader:i.preheader,content:i.content,manageUrl}),headers:{'List-Unsubscribe':'<'+unsub+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}},'ld-brief-issue-'+d.id);
      await rpc('delivery_result',{p_id:d.id,p_status:'accepted',p_provider_id:id});accepted++;
     }catch{await rpc('delivery_result',{p_id:d.id,p_status:'failed'});failed++;}
     await new Promise(resolve=>setTimeout(resolve,550));
    }
    return json({accepted,failed,complete:await rpc('finish_issue',{p_id:b.issue_id})});
   }
   return json({error:'Ação inválida.'},400);
  }catch(e){return json({error:e.message==='unauthorized'?'Entre com sua conta confirmada.':'Não foi possível concluir. Verifique o link ou tente novamente mais tarde.'},e.message==='unauthorized'?401:400);}
 };
}
