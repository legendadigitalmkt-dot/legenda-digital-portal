import {loadEnv} from 'vite';
import {execFileSync} from 'node:child_process';
import {SOFTWARE_PROJECT} from './prepare-migration.mjs';

const env = loadEnv('production',process.cwd(),'VITE_');
const failures = [];
let project = '';
try {
  const url = new URL(env.VITE_SUPABASE_URL);
  project = url.hostname.split('.')[0];
  if(url.protocol!=='https:'||url.origin!==`https://${project}.supabase.co`||!/^[a-z]{20}$/.test(project)) failures.push('URL de produção do Supabase inválida.');
  if(project===SOFTWARE_PROJECT) failures.push('O portal ainda utiliza o Supabase do Growth OS.');
} catch { failures.push('URL do novo Supabase ausente.'); }
if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY||'')) failures.push('Configure a chave publishable do novo projeto.');
if(env.VITE_SITE_URL!=='https://legendadigital.com.br') failures.push('Domínio canônico do portal incorreto.');
try {
  const remote = execFileSync('git',['remote','get-url','origin'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  if(!/^https:\/\/github\.com\/legendadigitalmkt-dot\/legenda-digital-portal(?:\.git)?$/.test(remote)&&!/^git@github\.com:legendadigitalmkt-dot\/legenda-digital-portal(?:\.git)?$/.test(remote)) failures.push('origin deve apontar para o repositório exclusivo legenda-digital-portal.');
} catch { failures.push('O novo repositório GitHub ainda não foi conectado.'); }
if(failures.length) { console.error(failures.join('\n')); process.exitCode=1; }
else console.log('Configuração local separada: portal + repositório + Supabase '+project+'. Confirmar também o pacote publicado na Hostinger.');
