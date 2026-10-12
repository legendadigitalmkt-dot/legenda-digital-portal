"""Read-only production checks; no forms or authenticated operations."""
import hashlib
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

ORIGIN = 'https://legendadigital.com.br'

def fetch(path, release):
    url = ORIGIN + path + '?ld_deploy=' + release
    with urlopen(Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'LD-Portal-Deployment-Check'}), timeout=30) as response:
        if urlsplit(response.url).netloc not in ('legendadigital.com.br', 'www.legendadigital.com.br'):
            raise ValueError('Unexpected redirect origin')
        if response.status != 200:
            raise ValueError('Unexpected HTTP status')
        return response.read()

def smoke(expected, release):
    for path in ('/', '/contato', '/admin', '/conteudos/como-aplicar-ia-no-negocio'):
        html = fetch(path, release)
        if b'/favicon.ico?v=20261011' not in html or b'/images/legenda-digital-logo.png' not in html:
            raise ValueError('Brand markup not present: ' + path)
        if path == '/admin' and b'noindex' not in html:
            raise ValueError('Admin indexing guard missing')
    for name, digest in json.loads(Path(expected).read_text()).items():
        if hashlib.sha256(fetch('/' + name, release)).hexdigest() != digest:
            raise ValueError('Published asset differs: ' + name)
    if b'<urlset' not in fetch('/sitemap.xml', release):
        raise ValueError('Sitemap unavailable')
    print('Read-only portal smoke passed; logo/favicon bytes match release')

if __name__ == '__main__':
    smoke(sys.argv[1], sys.argv[2])
