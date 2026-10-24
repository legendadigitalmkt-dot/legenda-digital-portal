export type Reference = {
  title: string;
  url: string;
  note?: string;
  consulted_at?: string;
};
export type {AdminRole as PortalRole} from '../features/admin/access';
export {hasPermission as can} from '../features/admin/access';
export const editorialCategories = [
  ["Futuro", "futuro"],
  ["Aplicação", "aplicacao"],
  ["Construção", "construcao"],
  ["Growth & Negócios", "growth-negocios"],
  ["Pesquisa", "pesquisa"],
] as const;
export const articleUrl = (slug: string) =>
  "https://legendadigital.com.br/conteudos/" + slug;
export function categorySlug(name: string) {
  return (
    editorialCategories.find((c) => c[0] === name)?.[1] ||
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export const publicRelations =
  ",author_profile:authors!content_posts_author_id_fkey(name,bio,avatar_url,links),category_profile:content_categories!content_posts_category_id_fkey(name,slug,active)";
