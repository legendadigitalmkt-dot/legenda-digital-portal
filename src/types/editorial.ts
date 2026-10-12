export type Reference = {
  title: string;
  url: string;
  note?: string;
  consulted_at?: string;
};
export type PortalRole =
  | "author"
  | "editor"
  | "moderator"
  | "admin"
  | "super_admin";
export function can(role: string, permission: string) {
  return (
    ["admin", "super_admin"].includes(role) ||
    (role === "editor" &&
      [
        "articles.read",
        "articles.create",
        "articles.edit",
        "articles.approve",
        "categories.manage",
        "authors.manage",
        "media.manage",
      ].includes(permission)) ||
    (role === "author" &&
      ["articles.read", "articles.create", "articles.edit"].includes(
        permission,
      )) ||
    (role === "moderator" &&
      ["comments.read", "comments.moderate"].includes(permission))
  );
}
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
