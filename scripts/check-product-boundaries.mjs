import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite';

const PORTAL_BACKEND = 'https://yltnjgngkomelfltdyky.supabase.co';
const GROWTH_BACKEND_REF = 'cknlzuinwcdupdxilzcf';
const privatePublicName = /^(?:VITE_|NEXT_PUBLIC_).*(?:SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|RESEND_API_KEY|OPENAI_API_KEY)/i;

// Returns diagnostic codes, never source lines or environment values.
export function checkBoundaryFile(path, source) {
  const failures = [];
  if (source.includes(GROWTH_BACKEND_REF)) failures.push('growth_backend_reference');
  if (/(?:from\s*|import\s*\(|require\s*\()\s*['"](?:https?:\/\/|[^'"]*(?:growth-os-audit|\/ld\/))/.test(source)) failures.push('cross_product_import');
  if (path.startsWith('src/')) {
    if (/\b(?:VITE_|NEXT_PUBLIC_)\w*(?:SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|RESEND_API_KEY|OPENAI_API_KEY)\w*\b/i.test(source)) failures.push('private_browser_environment');
    if (/\bsb_secret_[A-Za-z0-9_-]+|\bre_[A-Za-z0-9_-]{24,}/.test(source)) failures.push('private_browser_key');
  }
  return failures;
}

export function checkBoundaryEnvironment(env) {
  const failures = [];
  if (env.VITE_SUPABASE_URL !== PORTAL_BACKEND) failures.push('portal_backend_required');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY || '')) failures.push('publishable_key_required');
  if (env.VITE_SITE_URL && env.VITE_SITE_URL !== 'https://legendadigital.com.br') failures.push('portal_canonical_required');
  for (const name of Object.keys(env)) if (privatePublicName.test(name) && env[name]) failures.push('private_public_environment');
  return [...new Set(failures)];
}

export async function checkProductBoundaries(root = process.cwd()) {
  const failures = checkBoundaryEnvironment(loadEnv('production', root, ['VITE_', 'NEXT_PUBLIC_'])).map(code => ({scope: 'build_environment', code}));
  let files = 0;
  async function scan(directory) {
    for (const entry of await readdir(resolve(root, directory), {withFileTypes: true})) {
      const path = directory + '/' + entry.name;
      if (entry.isSymbolicLink()) {failures.push({scope: path, code: 'runtime_symlink'}); continue;}
      if (entry.isDirectory()) await scan(path);
      else if (/\.(?:[cm]?js|[cm]?ts|tsx|jsx|json|php)$/.test(entry.name)) {
        files++;
        for (const code of checkBoundaryFile(path, await readFile(resolve(root, path), 'utf8'))) failures.push({scope: path, code});
      }
    }
  }
  for (const directory of ['src', 'server', 'supabase/functions', 'scripts/hostinger']) await scan(directory);
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  for (const [name, value] of Object.entries({...pkg.dependencies, ...pkg.devDependencies})) {
    if (/^(?:file:|link:|workspace:)|legendadigitalmkt-dot\/ld(?:[.#/]|$)/.test(value)) failures.push({scope: 'package.json', code: 'cross_repository_dependency'});
  }
  return {product: 'legenda-digital-portal', files_checked: files, passed: failures.length === 0, failures};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await checkProductBoundaries();
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
