import type {ArticleBanner} from '../lib/article-extras.mjs';
export default function ArticleBanners({banners,mobile=false,onLinkClick}:{banners:ArticleBanner[];mobile?:boolean;onLinkClick?:(url:string)=>void}) {
  return <div className={mobile?'article-banners article-banners-mobile':'article-banners'}>{banners.map((b,i)=><aside className="article-banner" key={i} aria-label={b.title||'Banner editorial'}>
    {b.image&&<img src={b.image} alt={b.alt} width="1200" height="630" loading="lazy" decoding="async"/>}
    <div>{b.title&&<h2>{b.title}</h2>}{b.description&&<p>{b.description}</p>}{b.url&&b.label&&<a className="btn btn-primary" href={b.url} onClick={()=>onLinkClick?.(b.url)} target={b.newTab?'_blank':undefined} rel={b.newTab?'noopener noreferrer':undefined}>{b.label}{b.newTab&&<span className="sr-only"> (abre em nova aba)</span>}</a>}</div>
  </aside>)}</div>;
}
