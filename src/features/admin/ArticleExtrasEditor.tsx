import type {ArticleExtras,ArticleBanner} from '../../lib/article-extras.mjs';
import MediaUpload from './MediaUpload';
const emptyBanner=():ArticleBanner=>({title:'',description:'',image:'',alt:'',url:'',label:'Saiba mais',placement:'sidebar',newTab:false});
export default function ArticleExtrasEditor({value={},onChange}:{value?:ArticleExtras;onChange:(v:ArticleExtras)=>void}) {
  const banners=value.banners||[],links=value.links||[];
  const updateBanner=(index:number,patch:Partial<ArticleBanner>)=>onChange({...value,banners:banners.map((b,i)=>i===index?{...b,...patch}:b)});
  return <section className="article-extras-editor"><h2>Banners e links manuais</h2>
    <p>Configurados somente para este artigo. Confira na prévia antes de publicar.</p>
    <label className="checkbox"><input type="checkbox" checked={value.hideGrowthPromo===true} onChange={e=>onChange({...value,hideGrowthPromo:e.target.checked})}/>Ocultar promoção padrão do Growth OS</label>
    {banners.map((b,i)=><fieldset key={i}><legend>Banner {i+1}</legend>
      <label>Posição do banner<select value={b.placement} onChange={e=>updateBanner(i,{placement:e.target.value as ArticleBanner['placement']})}><option value="sidebar">Lateral; após o texto no celular</option><option value="after">Após o texto, em todas as telas</option></select></label>
      <MediaUpload label="Adicionar imagem do banner do computador" onUploaded={files=>updateBanner(i,{image:files[0].url})}/>
      {(['title','description','image','alt','label','url'] as const).map((key,j)=><label key={key}>{['Título do banner','Descrição do banner','URL da imagem do banner','Alt do banner','Texto do botão do banner','Link do banner'][j]}<input maxLength={key==='description'?400:undefined} value={b[key]} onChange={e=>updateBanner(i,{[key]:e.target.value})}/></label>)}
      <label className="checkbox"><input type="checkbox" checked={b.newTab} onChange={e=>updateBanner(i,{newTab:e.target.checked})}/>Abrir banner em nova aba</label>
      {b.image&&<img src={b.image} alt={b.alt||'Prévia do banner'}/>}
      <button type="button" onClick={()=>onChange({...value,banners:banners.filter((_,n)=>n!==i)})}>Remover banner {i+1}</button>
    </fieldset>)}
    <button type="button" className="btn btn-secondary" disabled={banners.length>=4} onClick={()=>onChange({...value,banners:[...banners,emptyBanner()]})}>Adicionar banner</button>
    {links.map((l,i)=><fieldset key={i}><legend>Link manual {i+1}</legend>
      <label>Nome do link manual<input value={l.label} maxLength={120} onChange={e=>onChange({...value,links:links.map((item,n)=>n===i?{...item,label:e.target.value}:item)})}/></label>
      <label>URL do link manual<input value={l.url} onChange={e=>onChange({...value,links:links.map((item,n)=>n===i?{...item,url:e.target.value}:item)})}/></label>
      <label className="checkbox"><input type="checkbox" checked={l.newTab} onChange={e=>onChange({...value,links:links.map((item,n)=>n===i?{...item,newTab:e.target.checked}:item)})}/>Abrir link em nova aba</label>
      <button type="button" onClick={()=>onChange({...value,links:links.filter((_,n)=>n!==i)})}>Remover link {i+1}</button>
    </fieldset>)}
    <button type="button" className="btn btn-secondary" disabled={links.length>=10} onClick={()=>onChange({...value,links:[...links,{label:'',url:'',newTab:false}]})}>Adicionar link manual</button>
    <p>Até 4 banners e 10 links. Use https:// ou um caminho interno iniciado por /. Imagens precisam de alt; botões precisam de texto.</p>
  </section>;
}
