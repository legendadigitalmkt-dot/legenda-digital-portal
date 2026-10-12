"""Build a checked public-only release; never package hosting configuration."""
import hashlib
import json
from pathlib import Path
import re
import tarfile

PORTAL_URL = 'https://yltnjgngkomelfltdyky.supabase.co'
EXCLUDED = {'site-runtime.php', '.htaccess'}

def prepare(dist, output):
    dist, output = Path(dist), Path(output)
    files = []
    for path in sorted(dist.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlinks are not permitted in a release')
        if not path.is_file():
            continue
        name = path.relative_to(dist).as_posix()
        if name in EXCLUDED:
            continue
        if not re.fullmatch(r'[A-Za-z0-9_./-]+', name) or any(p in ('.', '..') for p in name.split('/')):
            raise ValueError('Invalid release path')
        if name.startswith(('.env', 'src/', 'node_modules/')):
            raise ValueError('Source or credential file in release')
        files.append((name, path.read_bytes()))
    data = dict(files)
    for name in ('index.html', 'index.php', 'sitemap.php', 'favicon.ico', 'images/legenda-digital-logo.png'):
        if name not in data:
            raise ValueError('Missing public release file: ' + name)
    if PORTAL_URL not in (dist / 'site-runtime.php').read_text():
        raise ValueError('Build is not configured for the portal database')
    if not any(PORTAL_URL.encode() in value for name, value in files if name.startswith('assets/') and name.endswith('.js')):
        raise ValueError('Browser build is missing the portal backend configuration')
    if b'/favicon.ico?v=20261011' not in data['index.html'] or b'/images/legenda-digital-logo.png' not in data['index.html']:
        raise ValueError('Brand assets are missing from HTML')
    output.mkdir(parents=True, exist_ok=True)
    sums = ''.join(hashlib.sha256(value).hexdigest() + '  ' + name + '\n' for name, value in files)
    manifest = output / 'release-files.sha256'
    manifest.write_text(sums)
    with tarfile.open(output / 'portal.tar.gz', 'w:gz') as archive:
        for name, _ in files:
            archive.add(dist / name, arcname=name, recursive=False)
        archive.add(manifest, arcname='release-files.sha256', recursive=False)
    expected = {name: hashlib.sha256(data[name]).hexdigest() for name in ('favicon.ico', 'images/legenda-digital-logo.png')}
    (output / 'expected-assets.json').write_text(json.dumps(expected))
    print('Prepared public release:', len(files), 'files; hosting configuration excluded')

if __name__ == '__main__':
    import sys
    prepare(sys.argv[1], sys.argv[2])
