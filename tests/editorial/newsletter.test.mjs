import test from 'node:test';import assert from 'node:assert/strict';
import {capability,challenge,verifyChallenge,verifyWebhook,sign,validateSignup,COPY_VERSION,emailTemplate,createProvider} from '../../supabase/functions/ld-brief/core.mjs';
import {createHandler} from '../../supabase/functions/ld-brief/handler.mjs';
test('Brief validation, consent, capabilities and anti-replay signing',async()=>{
 assert.deepEqual(validateSignup({email:' ALICE@example.test ',name:'Alice',source:'tool-claro',consent:true,copy_version:COPY_VERSION}),{email:'alice@example.test',name:'Alice',source:'tool-claro'});
 for(const body of [{email:'x',consent:true,copy_version:COPY_VERSION},{email:'alice@example.test',consent:false,copy_version:COPY_VERSION},{email:'alice@example.test',consent:true,copy_version:'old'}])assert.throws(()=>validateSignup(body));
 assert.notEqual(await capability('alice','manage','secret'),await capability('alice','confirm','secret'));
 const c=await challenge('secret',1000);assert.equal(await verifyChallenge(c,'secret',1200),false);assert.equal(await verifyChallenge(c,'secret',2000),true);assert.equal(await verifyChallenge(c,'wrong',2000),false);assert.equal(await verifyChallenge(c,'secret',700000),false);
 const raw='{"type":"email.delivered"}',secret='whsec_'+btoa('a-strong-signing-secret'),headers=new Headers({'svix-id':'event1','svix-timestamp':'1000'});headers.set('svix-signature','v1,'+await sign('event1.1000.'+raw,new TextEncoder().encode('a-strong-signing-secret'),true));assert.equal(await verifyWebhook(raw,headers,secret,1000000),true);assert.equal(await verifyWebhook(raw+' ',headers,secret,1000000),false);assert.equal(await verifyWebhook(raw,headers,secret,1400000),false);
});
test('Brief email escapes untrusted HTML and Resend is gated/idempotent',async()=>{
 const template=emailTemplate({title:'<script>alert(1)</script>',content:'<img src=x onerror=alert(1)>',manageUrl:'https://legendadigital.com.br/newsletter/preferencias#token=abc'});assert.ok(!template.html.includes('<script>'));assert.ok(template.html.includes('&lt;img'));
 await assert.rejects(createProvider({}).send({},'x'),/not_ready/);let request;
 const provider=createProvider({RESEND_API_KEY:'re_test',LD_BRIEF_FROM:'LD Brief <brief@news.legendadigital.com.br>',LD_BRIEF_SENDING_ENABLED:'true'},async(url,opts)=>{request={url,...opts};return Response.json({id:'email1'});});assert.equal(await provider.send({to:['test@example.test'],subject:'test',...template},'stable-key'),'email1');assert.equal(request.headers['Idempotency-Key'],'stable-key');assert.equal(JSON.parse(request.body).from,'LD Brief <brief@news.legendadigital.com.br>');
});
test('Brief handler blocks forged origin, admin/JWT and webhook; no arbitrary send or GET mutation',async()=>{
 let calls=0;const handler=createHandler({SUPABASE_URL:'https://yltnjgngkomelfltdyky.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-private-secret'}, {fetchImpl:async()=>{calls++;return Response.json({error:'not allowed'},{status:401});}});
 const req=(body,origin)=>new Request('https://example.test/functions/v1/ld-brief',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
 assert.equal((await handler(req({action:'signup'},'https://attacker.test'))).status,403);
 assert.equal((await handler(req({action:'send',to:'victim@example.test'}))).status,400);
 assert.equal((await handler(req({action:'dispatch',issue_id:'x'}))).status,401);
 assert.equal((await handler(new Request('https://example.test/?action=webhook',{method:'POST',body:'{}'}))).status,401);
 const r=await handler(new Request('https://example.test/?action=unsubscribe&token=abc'));assert.equal(r.status,200);assert.equal(calls,0);
});
