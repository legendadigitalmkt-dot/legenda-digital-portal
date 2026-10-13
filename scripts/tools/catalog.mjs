import {toolRegistry} from '../../src/lib/tools-engine.mjs';import {writeFileSync} from 'node:fs';
const keys=['id','slug','name','category','type','description','image','version','status','methodology','limits','next_action','related_content','related_tools','sources'];
writeFileSync('src/lib/tool-catalog.json',JSON.stringify(toolRegistry.map(t=>Object.fromEntries(keys.filter(k=>t[k]!==undefined).map(k=>[k,t[k]]))),null,2)+'\n');
