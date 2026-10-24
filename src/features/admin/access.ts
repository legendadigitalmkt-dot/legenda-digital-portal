import roles from '../../config/admin-roles.json';
export type AdminRole = keyof typeof roles;
export function isAdminRole(role:string):role is AdminRole {return Object.hasOwn(roles,role);}
export function hasPermission(role:string, permission:string){return isAdminRole(role)&&(roles[role] as readonly string[]).includes(permission);}
export const roleLabels:Record<AdminRole,string>={platform_owner:'Platform Owner',super_admin:'Super Admin',editorial_admin:'Admin editorial',editor:'Editor',researcher:'Pesquisador',newsletter_admin:'Admin LD Brief',community_admin:'Admin Comunidade',tools_admin:'Admin Ferramentas',intelligence_admin:'Admin Intelligence',moderator:'Moderador',analyst:'Analista',viewer:'Leitor',admin:'Admin (legado)',author:'Autor (legado)'};
export const sections = [
{id:'Overview',path:'/admin',label:'Dashboard',group:'Visão geral',permission:'dashboard.read'},
{id:'Content',path:'/admin/articles',label:'Artigos',group:'Editorial',permission:'articles.read'},
{id:'Categories',path:'/admin/categories',label:'Categorias',group:'Editorial',permission:'categories.manage'},
{id:'Tags',path:'/admin/tags',label:'Tags',group:'Editorial',permission:'categories.manage'},
{id:'Authors',path:'/admin/authors',label:'Autores',group:'Editorial',permission:'authors.manage'},
{id:'Comments',path:'/admin/comments',label:'Comentários',group:'Editorial',permission:'comments.read'},
{id:'Media',path:'/admin/media',label:'Mídia',group:'Editorial',permission:'media.manage'},
{id:'Newsletter',path:'/admin/newsletter',label:'Newsletter',group:'Audiência',permission:'newsletter.manage'},
{id:'Community',path:'/admin/community',label:'Comunidade',group:'Audiência',permission:'community.manage'},
{id:'Users',path:'/admin/users',label:'Usuários',group:'Audiência',permission:'users.read'},
{id:'Contacts',path:'/admin/contacts',label:'Contatos',group:'Audiência',permission:'contacts.manage'},
{id:'Tools',path:'/admin/tools',label:'Ferramentas',group:'Utilidade',permission:'tools.manage'},
{id:'Analytics',path:'/admin/analytics',label:'Resultados',group:'Intelligence',permission:'intelligence.read'},
{id:'Building',path:'/admin/building',label:'Building',group:'Editorial',permission:'articles.read'},
{id:'Settings',path:'/admin/settings',label:'Configurações',group:'Sistema',permission:'settings.manage'},
{id:'Growth OS',path:'/admin/product-referrals',label:'Divulgação de produtos',group:'Sistema',permission:'settings.manage'},
{id:'Audit',path:'/admin/audit-logs',label:'Audit Logs',group:'Sistema',permission:'audit.read'}
] as const;
export type AdminSection = typeof sections[number];
export function resolveSection(path:string){const normalized=path.endsWith('/')?path.slice(0,-1):path;return sections.find(s=>s.path===normalized);}
