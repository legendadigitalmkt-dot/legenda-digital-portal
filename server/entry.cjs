'use strict';

// Hostinger requires the entry from its own loader; it is not require.main.
// Resolve build files from this entry, never from the loader's argv or cwd.
const {start} = require('./portal-runtime.cjs');
start(__dirname).catch(() => {
  console.error('Portal startup failed: check build and public backend configuration.');
  process.exitCode = 1;
});
