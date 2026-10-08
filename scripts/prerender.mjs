import {execFileSync} from 'node:child_process';import {writeFileSync,copyFileSync} from 'node:fs';import {loadEnv} from 'vite';
execFileSync(process.execPath,['--import','tsx','scripts/render.tsx'],{stdio:'inherit'});
const env=loadEnv('production',process.cwd(),'VITE_');const phpString=v=>"'"+String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
writeFileSync('dist/site-runtime.php',`<?php\nreturn ['url'=>${phpString(env.VITE_SUPABASE_URL)},'key'=>${phpString(env.VITE_SUPABASE_PUBLISHABLE_KEY)}];\n`);
for(const f of ['index.php','sitemap.php','.htaccess'])copyFileSync('scripts/hostinger/'+f,'dist/'+f);
