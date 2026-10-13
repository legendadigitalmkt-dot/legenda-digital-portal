import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {copyFile,mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

async function unusedPort() {
  const server = createServer();
  await new Promise((done,fail) => {server.once('error',fail);server.listen(0,'127.0.0.1',done);});
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(done => {
    const timer = setTimeout(() => child.kill('SIGKILL'),1500);
    child.once('exit',() => {clearTimeout(timer);done();});
    child.kill('SIGTERM');
  });
}

for (const mode of ['direct','hosting-loader']) {
  test('Production entry listens within 3 seconds via ' + mode + ' from unrelated cwd', {timeout:10000}, async t => {
    const temporary = await mkdtemp(join(tmpdir(),'portal-startup-'));
    const app = join(temporary,'app'), cwd = join(temporary,'loader-working-directory');
    await mkdir(join(app,'404'),{recursive:true});
    await mkdir(cwd);
    for (const file of ['server.js','portal-runtime.cjs','package.json','index.html','404/index.html']) {
      await copyFile(resolve('dist',file),join(app,file));
    }
    await writeFile(join(app,'portal-runtime.json'),JSON.stringify({
      url:'https://yltnjgngkomelfltdyky.supabase.co',key:'sb_publishable_startup_fixture',routes:['/','/404','/admin'],
    }));
    const entry = join(app,'server.js'), loader = join(cwd,'hosting-loader.cjs');
    await writeFile(loader,'require(' + JSON.stringify(entry) + ');\n');
    const port = await unusedPort();
    const child = spawn(process.execPath,[mode === 'direct' ? entry : loader],{
      cwd,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe'],
    });
    t.after(async () => {await stop(child);await rm(temporary,{recursive:true,force:true});});
    let diagnostics = '';
    child.stderr.on('data',chunk => {diagnostics = (diagnostics + chunk).slice(-2000);});
    await new Promise((done,fail) => {
      let output = '';
      const timer = setTimeout(() => fail(new Error('Entry did not listen in 3 seconds: ' + diagnostics)),3000);
      child.once('error',error => {clearTimeout(timer);fail(error);});
      child.once('exit',code => {clearTimeout(timer);fail(new Error('Entry exited before readiness: ' + code + ' ' + diagnostics));});
      child.stdout.on('data',chunk => {
        output += chunk;
        if (output.includes('runtime listening on port ' + port)) {clearTimeout(timer);done();}
      });
    });
    const origin = 'http://127.0.0.1:' + port;
    const health = await fetch(origin + '/api/health',{signal:AbortSignal.timeout(1500)});
    assert.equal(health.status,200);
    assert.deepEqual(await health.json(),{status:'ok',release:'editorial-batch1-stable-v1',runtime:'node'});
    assert.equal((await fetch(origin + '/', {signal:AbortSignal.timeout(1500)})).status,200);
    for (const path of ['/server.js','/portal-runtime.cjs','/portal-runtime.json','/package.json']) {
      assert.equal((await fetch(origin + path,{signal:AbortSignal.timeout(1500)})).status,404,path);
    }
  });
}
