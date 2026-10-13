import test from 'node:test';
import assert from 'node:assert/strict';
import {recordMatches,readinessSummary,verifyReadiness} from '../../scripts/email/readiness.mjs';
test('DNS matching handles split TXT, MX priority and exact owner names without accepting failed resolution',()=>{
 const record={name:'send.news.example.test',type:'TXT',value:'v=spf1 include:amazonses.com ~all'};
 const answer={name:record.name+'.',type:16,data:'"v=spf1 " "include:amazonses.com ~all"'};
 assert.equal(recordMatches(record,{Status:0,Answer:[answer]}),true);
 assert.equal(recordMatches(record,{Status:3,Answer:[answer]}),false);
 assert.equal(recordMatches(record,{Status:0,Answer:[{...answer,name:'unrelated.example.test'}]}),false);
 const mx={name:record.name,type:'MX',priority:10,value:'feedback-smtp.sa-east-1.amazonses.com'};
 assert.equal(recordMatches(mx,{Status:0,Answer:[{name:mx.name,type:15,data:'20 '+mx.value+'.'}]}),false);
 assert.equal(recordMatches(mx,{Status:0,Answer:[{name:mx.name,type:15,data:'10 '+mx.value+'.'}]}),true);
});
test('Readiness never mistakes missing state, disabled confirmation or flags for verified email delivery',()=>{
 const checks=Array.from({length:4},()=>({matches:true}));
 const auth={disable_signup:false,external:{email:true},mailer_autoconfirm:false},brief={service:'ld-brief',sending_ready:true,webhook_ready:true};
 assert.equal(readinessSummary(checks,auth,brief).gates_green,true);
 assert.equal(readinessSummary(checks,auth,brief).delivery_verified,false);
 for(const input of [{...auth,mailer_autoconfirm:true},{...auth,disable_signup:true},null])assert.equal(readinessSummary(checks,input,brief).gates_green,false);
 assert.equal(readinessSummary(checks,auth,{...brief,webhook_ready:false}).gates_green,false);
 assert.equal(readinessSummary([],auth,brief).gates_green,false);
});
test('Readiness failures remain blocked and its report never returns provider secrets or publishable keys',async()=>{
 const calls=[];
 const report=await verifyReadiness({publicKey:'sb_publishable_fixture',fetchImpl:async(url,options)=>{calls.push([String(url),options]);if(String(url).includes('dns.google'))return Response.json({Status:3});if(String(url).includes('/settings'))return Response.json({disable_signup:true,external:{email:true},mailer_autoconfirm:false,unused_secret:'do-not-return'});return Response.json({service:'ld-brief',sending_ready:false,webhook_ready:false,unused_secret:'do-not-return'});}});
 assert.equal(calls.length,6);assert.equal(report.gates_green,false);assert.equal(report.read_only,true);
 assert.equal(JSON.stringify(report).includes('do-not-return'),false);assert.equal(JSON.stringify(report).includes('sb_publishable_fixture'),false);
});
