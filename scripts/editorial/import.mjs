import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export const PORTAL_PROJECT = "yltnjgngkomelfltdyky";
export function buildImportSQL(manifest, project, { stage = "review" } = {}) {
  if (project !== PORTAL_PROJECT || manifest.project_ref !== PORTAL_PROJECT)
    throw new Error("Import only into the dedicated portal project");
  if (
    manifest.format_version !== 1 ||
    manifest.articles?.length !== 5 ||
    !manifest.approval_source?.includes("aprovado")
  )
    throw new Error("Approved five-article manifest required");
  if (!["review", "approved", "published"].includes(stage))
    throw new Error("Invalid import stage");
  const slugs = new Set();
  for (const item of manifest.articles) {
    const p = item.post;
    if (
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) ||
      slugs.has(p.slug) ||
      p.author !== "Redação Legenda Digital" ||
      p.body.length > 500000 ||
      p.excerpt.length > 500 ||
      !p.hero_image_alt ||
      !p.featured_image.startsWith("/images/editorial/batch1/")
    )
      throw new Error("Invalid editorial record");
    slugs.add(p.slug);
    if (
      createHash("sha256").update(p.body).digest("hex") !==
      item.integrity.body_sha256
    )
      throw new Error("Body integrity failed");
    if (p.references.some((r) => !/^https?:\/\//.test(r.url)))
      throw new Error("Invalid reference");
  }
  const json = JSON.stringify(manifest.articles.map((x) => x.post));
  const digest = createHash("sha256").update(json).digest("hex").slice(0, 24);
  const dataTag = "$ld_batch_" + digest + "$";
  if (json.includes(dataTag)) throw new Error("Unsafe SQL delimiter");
  const keys = Object.keys(manifest.articles[0].post).filter(
    (k) => k !== "status",
  );
  if (keys.some((k) => !/^\w+$/.test(k))) throw new Error("Invalid field");
  const columns = keys.map((k) => '"' + k + '"').join(",");
  const values = keys.map((k) => '(parsed)."' + k + '"').join(",");
  return `-- Portal Batch 1: ${stage}. Source SHA256 ${manifest.source_sha256}\nbegin;\ndo $ld_import_${digest}$\ndeclare batch jsonb := ${dataTag}${json}${dataTag}::jsonb; item jsonb; parsed public.content_posts; existing public.content_posts; aid uuid; cid uuid; pid uuid;\nbegin\nfor item in select value from jsonb_array_elements(batch) loop\n select * into existing from public.content_posts where slug=item->>'slug';\n if existing.id is not null and (existing.body<>item->>'body' or existing.title<>item->>'title') then raise exception 'Existing article differs: %',item->>'slug';end if;\n if existing.id is null then\n  select id into aid from public.authors where name=item->>'author' order by created_at limit 1;\n  select id into cid from public.content_categories where name=item->>'category';\n  if aid is null or cid is null then raise exception 'Author/category not configured';end if;\n  parsed:=jsonb_populate_record(null::public.content_posts,item);\n  insert into public.content_posts(${columns},author_id,category_id,status) values(${values},aid,cid,'review') returning id into pid;\n  insert into public.editorial_notes(post_id,notes) values(pid,'Imported from approved Batch 1. Source SHA256: ${manifest.source_sha256}. Claims and references preserved.');\n else pid:=existing.id;end if;\n insert into public.content_tags(name,slug) select tag,lower(regexp_replace(translate(tag,'ÁÉÍÓÚáéíóúãõâêôç','AEIOUaeiouaoaeoc'),'[^a-zA-Z0-9]+','-','g')) from jsonb_array_elements_text(item->'tags') tag on conflict do nothing;\n ${stage !== "review" ? "update public.content_posts set status='approved' where id=pid and status in ('draft','review');" : ""}\n ${stage === "published" ? "update public.content_posts set status='published',published_at=now() where id=pid and status='approved';" : ""}\nend loop;end $ld_import_${digest}$;\ncommit;\n`;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
  const project = arg("--project-ref");
  const stage = process.argv.includes("--stage") ? arg("--stage") : "review";
  const output = arg("--output");
  if (
    !process.argv.includes("--project-ref") ||
    !process.argv.includes("--output")
  )
    throw new Error(
      "Use --project-ref PORTAL --output FILE [--stage review|approved|published]",
    );
  const manifest = JSON.parse(
    await readFile("content/editorial/batch1-manifest.json", "utf8"),
  );
  const sql = buildImportSQL(manifest, project, { stage });
  await writeFile(output, sql);
  console.log(
    JSON.stringify({
      project,
      stage,
      articles: 5,
      bytes: Buffer.byteLength(sql),
      output,
    }),
  );
}
