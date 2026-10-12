"""Deterministic extraction of the supplied, approved Batch 1. No editorial rewriting."""
from pathlib import Path
from bs4 import BeautifulSoup
import base64,hashlib,json,re,argparse
parser=argparse.ArgumentParser();parser.add_argument('--source',default='content/editorial/batch1-source/approved.html');args=parser.parse_args()
source=Path(args.source);raw=source.read_bytes();soup=BeautifulSoup(raw,'html.parser')
assert 'Batch 1 aprovado' in soup.get_text(), 'Use the approved source'
slugs=['o-novo-funil-de-vendas-na-era-da-ia','marketing-de-campanha-para-sistema','ai-search-como-chatgpt-google-assistentes-mudam-descoberta','seo-aeo-geo-busca-por-ia','agentes-de-ia-chatbots-sistemas-de-trabalho']
categories=['Growth & Negócios','Growth & Negócios','Futuro','Aplicação','Futuro']
tagsets=[['IA','Funil de vendas','CRM'],['Marketing','Sistemas de crescimento','Growth Intelligence'],['AI Search','Descoberta','Growth Intelligence'],['SEO','AEO','GEO'],['Agentes de IA','Workflows','Governança']]
corrections=[]
operational_replacements=[('publicação e revisão final de HQ pendentes.','revisão editorial aprovada pelo LD HQ.'),('A inscrição depende de um destino operacional confirmado; o preview editorial não envia dados.','Cadastre seu interesse no LD Brief pelo formulário do portal.'),('revisar documentação e links na aprovação final.','revisar documentação e links nas próximas atualizações editoriais.')]
out=Path('content/editorial');assets=Path('public/images/editorial/batch1');assets.mkdir(parents=True,exist_ok=True);items=[]
for n,article in enumerate(soup.select('article'),1):
    slug=slugs[n-1];body=article.select_one('.body');hero=article.select_one('figure.hero');assert hero and body
    original_text=body.get_text(' ',strip=True);asset_meta=[]; seen_assets={}
    for index,img in enumerate([hero.img,*body.select('img')]):
        m=re.fullmatch(r'data:image/svg\+xml;base64,(.*)',img['src'],re.S);assert m,'Unexpected asset encoding'
        svg=base64.b64decode(m[1]);assert not re.search(rb'<script|<foreignObject|(?:href|src)=["\'](?:https?:|file:)',svg,re.I),'Unsafe SVG'
        digest=hashlib.sha256(svg).hexdigest();name=seen_assets.get(digest) or slug+('-hero' if index==0 else '-diagram-'+str(index));seen_assets[digest]=name;(assets/(name+'.svg')).write_bytes(svg)
        img['src']='/images/editorial/batch1/'+name+'.webp';img['decoding']='async';img['loading']='eager' if index==0 else 'lazy'
        width=int(img.get('width','1200'));height=int(img.get('height','630'));img['width']=str(width);img['height']=str(height)
        if index:img['srcset']=img['src']+' 1200w, '+img['src'].replace('.webp','-mobile.webp')+' 720w';img['sizes']='(max-width: 700px) calc(100vw - 40px), 780px'
        if not any(x['name']==name for x in asset_meta):asset_meta.append({'name':name,'svg_sha256':hashlib.sha256(svg).hexdigest(),'alt':img.get('alt',''),'width':width,'height':height})
    for link in body.select('a[href]'):
        if link['href'].startswith('/artigos/'):link['href']=link['href'].replace('/artigos/','/conteudos/',1)
    assert body.get_text(' ',strip=True)==original_text,'Unapproved text change'
    expected_text=original_text
    for before,after in operational_replacements:
        for node in list(body.find_all(string=True)):
            if before in str(node):node.replace_with(str(node).replace(before,after));corrections.append({'article':slug,'before':before,'after':after,'reason':'Anotação operacional atualizada para a publicação autorizada; nenhum claim, dado ou referência alterado.'})
        expected_text=expected_text.replace(before,after)
    assert body.get_text(' ',strip=True)==expected_text,'Unexpected editorial change'
    body_html=body.decode_contents();
    refs=[]
    for h in body.select('h2'):
        if re.search(r'fontes|refer[eê]ncias|registro de checagem',h.get_text(),re.I):
            nxt=h.find_next_sibling()
            while nxt and nxt.name!='h2':
                for li in nxt.select('li'):
                    for a in li.select('a[href^="http"]'):
                        refs.append({'title':li.strong.get_text(' ',strip=True) if li.strong else li.get_text(' ',strip=True)[:160],'url':a['href'],'note':li.get_text(' ',strip=True)})
                nxt=nxt.find_next_sibling()
    excerpt=article.select_one('.deck').get_text(' ',strip=True);readtime=re.search(r'(\d+) min',article.select_one('.meta').get_text()).group(1)
    item={'title':article.h1.get_text(' ',strip=True),'slug':slug,'subtitle':excerpt,'excerpt':excerpt,'body':body_html,'featured_image':hero.img['src'],'hero_image_mobile':hero.img['src'].replace('.webp','-mobile.webp'),'hero_image_alt':hero.img.get('alt',''),'hero_image_caption':hero.figcaption.get_text(' ',strip=True) if hero.figcaption else 'Ilustração editorial conceitual.','hero_image_credit':'Redação Legenda Digital · visual conceitual original','author':'Redação Legenda Digital','reviewer_name':'LD HQ','category':categories[n-1],'tags':tagsets[n-1],'topics':['Growth Intelligence'],'kind':'guide' if n==4 else 'article','status':'review','reading_time':int(readtime),'seo_title':article.h1.get_text(' ',strip=True),'seo_description':excerpt[:300],'canonical_url':'https://legendadigital.com.br/conteudos/'+slug,'og_title':article.h1.get_text(' ',strip=True),'og_description':excerpt[:300],'hero_image_fallback':hero.img['src'].replace('.webp','.png'),'og_image':hero.img['src'].replace('.webp','.png'),'allow_index':True,'references':refs,'related_articles':list(dict.fromkeys(a['href'].split('/')[-1] for a in body.select('a[href^="/conteudos/"]'))),'show_comments':True,'show_share':True,'featured':n==1}
    items.append({'post':item,'integrity':{'paragraphs':len(body.select('p')),'headings':len(body.select('h2,h3')),'tables':len(body.select('table')),'reference_links':len(refs),'source_plain_text_sha256':hashlib.sha256(original_text.encode()).hexdigest(),'plain_text_sha256':hashlib.sha256(expected_text.encode()).hexdigest(),'body_sha256':hashlib.sha256(body_html.encode()).hexdigest(),'assets':asset_meta}})
    (out/(slug+'.html')).write_text(body_html)
manifest={'format_version':1,'project_ref':'yltnjgngkomelfltdyky','source_file':str(source),'source_sha256':hashlib.sha256(raw).hexdigest(),'operational_corrections':corrections,'approval_source':'Preview Batch 1 aprovado · Revisão editorial LD HQ','technical_adjustments':['Mapeamento de categorias conforme ordem HQ; artigo 02 passa de Aplicação para Growth & Negócios.','Links internos /artigos redirecionados para arquitetura existente /conteudos.','Imagens incorporadas extraídas para assets versionados com formatos e tamanhos responsivos.'],'articles':items}
(out/'batch1-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'articles':len(items),'integrity':[{x['post']['slug']:x['integrity']['paragraphs']} for x in items]},ensure_ascii=False))

(out/'operational-corrections.json').write_text(json.dumps(corrections,ensure_ascii=False,indent=2)+'\n')
