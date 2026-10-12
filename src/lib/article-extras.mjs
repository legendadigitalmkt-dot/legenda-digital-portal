// Shared by the browser and the SSR public DTO. Never render arbitrary HTML/CSS here.
export function editorialUrl(value) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!/^(https?:\/\/|\/(?!\/))/.test(s) || /[\x00-\x20\\]/.test(s)) return '';
  try {const url=new URL(s,'https://legendadigital.com.br');return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?s:'';} catch {return '';}
}
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
export function normalizeExtras(value) {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    hideGrowthPromo: v.hideGrowthPromo === true,
    banners: (Array.isArray(v.banners) ? v.banners : []).slice(0, 4).filter(b => b && typeof b === 'object').map(b => ({
      title: str(b.title, 120), description: str(b.description, 400), image: editorialUrl(b.image),
      alt: str(b.alt, 200), url: editorialUrl(b.url), label: str(b.label, 80),
      placement: b.placement === 'after' ? 'after' : 'sidebar', newTab: b.newTab === true,
    })).filter(b => b.title || (b.image && b.alt)),
    links: (Array.isArray(v.links) ? v.links : []).slice(0, 10).filter(l => l && typeof l === 'object').map(l => ({
      label: str(l.label, 120), url: editorialUrl(l.url), newTab: l.newTab === true,
    })).filter(l => l.label && l.url),
  };
}
