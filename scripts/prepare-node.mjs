import {build} from 'esbuild';
import {loadEnv} from 'vite';
import {writeFile,readFile,readdir,unlink} from 'node:fs/promises';
import {join,relative} from 'node:path';
const env = loadEnv('production',process.cwd(),'VITE_');
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (url !== 'https://yltnjgngkomelfltdyky.supabase.co' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key || '')) throw new Error('Node build requires the portal URL and its publishable key.');
const routes = [];
async function scan(dir) {
  for (const item of await readdir(dir,{withFileTypes:true})) {
    const path = join(dir,item.name);
    if (item.isSymbolicLink()) throw new Error('Symlinks are not accepted in production output');
    if (item.isDirectory()) await scan(path);
    else if (item.name === 'index.html') routes.push('/' + relative('dist',dir).replaceAll('\\','/'));
  }
}
await scan('dist');
await build({entryPoints:['server/index.mjs'],outfile:'dist/portal-runtime.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',define:{'import.meta.env':'{}','process.env.NODE_ENV':'"production"'},logLevel:'warning'});
await writeFile('dist/server.js',await readFile('server/entry.cjs','utf8'));
await writeFile('dist/package.json',JSON.stringify({name:'legenda-digital-portal-runtime',private:true,type:'commonjs',scripts:{start:'node server.js'},engines:{node:'>=22.12.0 <25'}}));
await writeFile('dist/portal-runtime.json',JSON.stringify({url,key,routes}));
for (const file of ['index.php','sitemap.php','site-runtime.php','.htaccess']) await unlink('dist/' + file);
console.log('Standalone Node server prepared with ' + routes.length + ' page routes; PHP artifacts removed.');
