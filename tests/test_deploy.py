import hashlib
import importlib.util
import io
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest
import textwrap
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts' / 'deploy'
spec = importlib.util.spec_from_file_location('release', SCRIPTS / 'prepare_release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
smoke_spec = importlib.util.spec_from_file_location('portal_smoke', SCRIPTS / 'smoke.py')
portal_smoke = importlib.util.module_from_spec(smoke_spec)
smoke_spec.loader.exec_module(portal_smoke)
ID = 'a' * 40 + '-123-1'

class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='ld-deploy-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.dest = self.root / 'domains/legendadigital.com.br/public_html'
        self.dest.mkdir(parents=True)
        (self.dest / 'index.html').write_text('previous publication')
        (self.dest / 'site-runtime.php').write_text(release.PORTAL_URL)
        (self.dest / '.htaccess').write_text('site-runtime [F,L]')
        (self.dest / 'uploads').mkdir()
        (self.dest / 'uploads/preserved.txt').write_text('real existing upload')
        self.software = self.root / 'domains/app.legendadigital.com.br/public_html'
        self.software.mkdir(parents=True)
        (self.software / 'index.html').write_text('software untouched')
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        # Only the PHP CLI is simulated. File copies, archives and restores run for real.
        php = self.bin / 'php'
        php.write_text('#!/bin/bash\nif [[ "$1" == -r ]]; then grep -q "yltnjgngkomelfltdyky.supabase.co" "$3"; else exit 0; fi\n')
        php.chmod(0o755)
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ['PATH'])
        self.stage = self.dest.parent / '.ld-portal-deploy' / ID
        self.backup = self.stage.parent / (ID + '.before.tar.gz')

    def remote(self, name, *args, dest=None):
        script = (SCRIPTS / 'remote_common.sh').read_text() + '\n' + (SCRIPTS / name).read_text()
        return subprocess.run(['bash', '-s', '--', str(dest or self.dest), ID, *args], input=script, text=True, capture_output=True, env=self.env)

    def build_fixture(self):
        dist = self.root / 'dist'
        (dist / 'assets').mkdir(parents=True)
        (dist / 'images').mkdir()
        content = {
            'index.html': '/favicon.ico?v=20261011 /images/legenda-digital-logo.png new publication',
            'index.php': '<?php echo "new";', 'sitemap.php': '<?php echo "map";',
            'favicon.ico': 'icon', 'images/legenda-digital-logo.png': 'logo',
            'assets/new.js': release.PORTAL_URL,
            'site-runtime.php': release.PORTAL_URL, '.htaccess': 'do not overwrite',
        }
        for name, text in content.items():
            (dist / name).write_text(text)
        output = self.root / 'release'
        release.prepare(dist, output)
        return dist, output

    def ready(self):
        _, output = self.build_fixture()
        result = self.remote('remote_prepare.sh')
        self.assertEqual(result.returncode, 0, result.stderr)
        shutil.copy(output / 'portal.tar.gz', self.stage / 'package.tar.gz')
        return hashlib.sha256((self.stage / 'package.tar.gz').read_bytes()).hexdigest()

    def test_other_domain_and_path_injection_rejected_before_changes(self):
        for path in (self.software, Path('/'), self.dest.parent / '../public_html', Path(str(self.dest) + ';touch /tmp/pwn')):
            self.assertNotEqual(self.remote('remote_prepare.sh', dest=path).returncode, 0)
        self.assertEqual((self.software / 'index.html').read_text(), 'software untouched')
        self.assertFalse(self.stage.exists())

    def test_symlink_destination_and_missing_runtime_rejected(self):
        actual = self.dest.with_name('actual')
        self.dest.rename(actual)
        self.dest.symlink_to(actual, target_is_directory=True)
        self.assertNotEqual(self.remote('remote_prepare.sh').returncode, 0)
        self.dest.unlink()
        actual.rename(self.dest)
        (self.dest / 'site-runtime.php').unlink()
        self.assertNotEqual(self.remote('remote_prepare.sh').returncode, 0)

    def test_wrong_backend_and_duplicate_staging_rejected(self):
        (self.dest / 'site-runtime.php').write_text('https://cknlzuinwcdupdxilzcf.supabase.co')
        self.assertNotEqual(self.remote('remote_prepare.sh').returncode, 0)
        (self.dest / 'site-runtime.php').write_text(release.PORTAL_URL)
        self.assertEqual(self.remote('remote_prepare.sh').returncode, 0)
        self.assertNotEqual(self.remote('remote_prepare.sh').returncode, 0)

    def test_release_excludes_configuration_and_refuses_missing_backend_or_links(self):
        dist, output = self.build_fixture()
        with tarfile.open(output / 'portal.tar.gz') as archive:
            self.assertNotIn('.htaccess', archive.getnames())
            self.assertNotIn('site-runtime.php', archive.getnames())
        (dist / 'assets/new.js').write_text('no backend')
        with self.assertRaises(ValueError):
            release.prepare(dist, output)
        (dist / 'assets/new.js').write_text(release.PORTAL_URL)
        (dist / 'escape').symlink_to(self.dest / 'site-runtime.php')
        with self.assertRaises(ValueError):
            release.prepare(dist, output)

    def test_archive_corruption_and_traversal_rejected_before_backup(self):
        digest = self.ready()
        (self.stage / 'package.tar.gz').write_bytes(b'broken')
        self.assertNotEqual(self.remote('remote_publish.sh', digest).returncode, 0)
        with tarfile.open(self.stage / 'package.tar.gz', 'w:gz') as archive:
            info = tarfile.TarInfo('../escape')
            info.size = 1
            archive.addfile(info, io.BytesIO(b'x'))
        digest = hashlib.sha256((self.stage / 'package.tar.gz').read_bytes()).hexdigest()
        self.assertNotEqual(self.remote('remote_publish.sh', digest).returncode, 0)
        self.assertFalse(self.backup.exists())
        self.assertEqual((self.dest / 'index.html').read_text(), 'previous publication')

    def test_publish_preserves_configuration_uploads_software_and_restores_backup(self):
        digest = self.ready()
        result = self.remote('remote_publish.sh', digest)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('new publication', (self.dest / 'index.html').read_text())
        self.assertTrue(self.backup.exists())
        self.assertEqual(self.backup.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.dest / '.htaccess').read_text(), 'site-runtime [F,L]')
        self.assertEqual((self.dest / 'site-runtime.php').read_text(), release.PORTAL_URL)
        self.assertEqual((self.dest / 'uploads/preserved.txt').read_text(), 'real existing upload')
        self.assertEqual((self.software / 'index.html').read_text(), 'software untouched')
        self.assertEqual(self.remote('remote_rollback.sh').returncode, 0)
        self.assertEqual((self.dest / 'index.html').read_text(), 'previous publication')

    def test_copy_failure_restores_previous_publication(self):
        digest = self.ready()
        real_rsync = shutil.which('rsync')
        wrapper = self.bin / 'rsync'
        wrapper.write_text('#!/bin/bash\nif [[ "$*" == *"--exclude=assets/"* ]]; then echo partial > "$LD_TEST_DEST/index.html"; exit 42; fi\nexec "' + real_rsync + '" "$@"\n')
        wrapper.chmod(0o755)
        self.env['LD_TEST_DEST'] = str(self.dest)
        result = self.remote('remote_publish.sh', digest)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('restoring', result.stderr)
        self.assertEqual((self.dest / 'index.html').read_text(), 'previous publication')

    def test_workflow_configuration_gate_blocks_disabled_or_missing_connection(self):
        workflow = (SCRIPTS.parents[1] / '.github/workflows/deploy-portal.yml').read_text()
        script = textwrap.dedent(workflow.split('        run: |\n', 1)[1].split('      - uses:', 1)[0])
        names = ['HOSTINGER_SSH_HOST', 'HOSTINGER_SSH_PORT', 'HOSTINGER_SSH_USER', 'HOSTINGER_REMOTE_DIR', 'HOSTINGER_SSH_PRIVATE_KEY', 'HOSTINGER_SSH_KNOWN_HOSTS', 'VITE_SUPABASE_PUBLISHABLE_KEY']
        for enabled, configured, expected_status, ready in [('false', False, 0, False), ('true', False, 1, False), ('true', True, 0, True)]:
            output, summary = self.root / 'output', self.root / 'summary'
            output.write_text('')
            summary.write_text('')
            env = {k: v for k, v in self.env.items() if k not in names}
            env.update(ENABLED=enabled, GITHUB_OUTPUT=str(output), GITHUB_STEP_SUMMARY=str(summary))
            if configured:
                env.update({name: 'synthetic-secret-value' for name in names})
                env['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_synthetic'
            result = subprocess.run(['bash', '-c', script], text=True, capture_output=True, env=env)
            self.assertEqual(result.returncode, expected_status)
            self.assertEqual(output.read_text().splitlines()[-1], 'ready=' + str(ready).lower())
            self.assertNotIn('synthetic-secret-value', result.stdout + result.stderr + summary.read_text())

    def test_smoke_rejects_stale_html_and_wrong_asset_bytes(self):
        expected = self.root / 'expected.json'
        expected.write_text('{"favicon.ico":"' + hashlib.sha256(b'icon').hexdigest() + '"}')
        with patch.object(portal_smoke, 'fetch', return_value=b'old logo'):
            with self.assertRaises(ValueError):
                portal_smoke.smoke(expected, ID)
        def fixture(path, _):
            if path == '/favicon.ico': return b'wrong'
            return b'/favicon.ico?v=20261011 /images/legenda-digital-logo.png noindex'
        with patch.object(portal_smoke, 'fetch', side_effect=fixture):
            with self.assertRaises(ValueError):
                portal_smoke.smoke(expected, ID)

    def test_smoke_accepts_checked_public_pages_assets_and_sitemap(self):
        expected = self.root / 'expected.json'
        expected.write_text('{"favicon.ico":"' + hashlib.sha256(b'icon').hexdigest() + '"}')
        def fixture(path, _):
            if path == '/favicon.ico': return b'icon'
            if path == '/sitemap.xml': return b'<urlset />'
            return b'/favicon.ico?v=20261011 /images/legenda-digital-logo.png noindex'
        with patch.object(portal_smoke, 'fetch', side_effect=fixture):
            portal_smoke.smoke(expected, ID)

if __name__ == '__main__':
    unittest.main()
