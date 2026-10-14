import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBoundaryEnvironment, checkBoundaryFile} from '../scripts/check-product-boundaries.mjs';

const portal = {VITE_SUPABASE_URL:'https://yltnjgngkomelfltdyky.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};

test('Product boundary rejects a valid but wrong backend and private public configuration', () => {
  assert.deepEqual(checkBoundaryEnvironment(portal), []);
  assert.ok(checkBoundaryEnvironment({...portal, VITE_SUPABASE_URL:'https://cknlzuinwcdupdxilzcf.supabase.co'}).includes('portal_backend_required'));
  assert.ok(checkBoundaryEnvironment({...portal, VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic'}).includes('publishable_key_required'));
  assert.ok(checkBoundaryEnvironment({...portal, VITE_SITE_URL:'https://app.legendadigital.com.br'}).includes('portal_canonical_required'));
  const result = checkBoundaryEnvironment({...portal, VITE_RESEND_API_KEY:'synthetic-private-value'});
  assert.ok(result.includes('private_public_environment'));
  assert.ok(!JSON.stringify(result).includes('synthetic-private-value'));
});

test('Referral links are allowed but cross-product backends and runtime imports fail', () => {
  assert.deepEqual(checkBoundaryFile('src/component.tsx', '<a href="https://app.legendadigital.com.br/">Conhecer</a>'), []);
  assert.ok(checkBoundaryFile('server/portal.mjs', "fetch('https://cknlzuinwcdupdxilzcf.supabase.co/rest/v1/contacts')").includes('growth_backend_reference'));
  assert.ok(checkBoundaryFile('src/page.tsx', "import {CRM} from '../../growth-os-audit/components/crm'").includes('cross_product_import'));
  assert.ok(checkBoundaryFile('src/page.tsx', "import('https://app.legendadigital.com.br/component.js')").includes('cross_product_import'));
});

test('Private browser configuration is blocked without forbidding dedicated server credentials', () => {
  assert.ok(checkBoundaryFile('src/client.ts', 'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY').includes('private_browser_environment'));
  assert.ok(checkBoundaryFile('src/client.ts', "const key='sb_secret_synthetic'").includes('private_browser_key'));
  assert.deepEqual(checkBoundaryFile('supabase/functions/ld-brief/index.ts', 'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'), []);
});
