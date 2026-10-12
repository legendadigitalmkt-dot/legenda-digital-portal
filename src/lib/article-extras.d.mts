export type ArticleBanner = {title:string;description:string;image:string;alt:string;url:string;label:string;placement:'sidebar'|'after';newTab:boolean};
export type ArticleManualLink = {label:string;url:string;newTab:boolean};
export type ArticleExtras = {hideGrowthPromo?:boolean;banners?:ArticleBanner[];links?:ArticleManualLink[]};
export function editorialUrl(value:unknown):string;
export function normalizeExtras(value:unknown):{hideGrowthPromo:boolean;banners:ArticleBanner[];links:ArticleManualLink[]};
