import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  buildImportSQL,
  PORTAL_PROJECT,
} from "../../scripts/editorial/import.mjs";
const hash = (data) => createHash("sha256").update(data).digest("hex");
const manifest = JSON.parse(
  await readFile("content/editorial/batch1-manifest.json", "utf8"),
);
test("Approved Batch 1 fragments, source and responsive assets retain their recorded hashes", async () => {
  assert.equal(
    hash(await readFile(manifest.source_file)),
    manifest.source_sha256,
  );
  assert.equal(manifest.articles.length, 5);
  for (const item of manifest.articles) {
    const body = await readFile(
      "content/editorial/" + item.post.slug + ".html",
      "utf8",
    );
    assert.equal(body, item.post.body);
    assert.equal(hash(body), item.integrity.body_sha256);
    assert.equal(
      (body.match(/<p(?:\s|>)/g) || []).length,
      item.integrity.paragraphs,
    );
    assert.equal(
      (body.match(/<table(?:\s|>)/g) || []).length,
      item.integrity.tables,
    );
    assert.ok(!body.includes("data:image"));
    for (const image of item.integrity.assets)
      assert.equal(
        hash(
          await readFile(
            "public/images/editorial/batch1/" + image.name + ".svg",
          ),
        ),
        image.svg_sha256,
      );
    for (const r of item.post.references) assert.match(r.url, /^https?:\/\//);
    for (const related of item.post.related_articles)
      assert.ok(manifest.articles.some((a) => a.post.slug === related));
  }
  const assets = JSON.parse(
    await readFile("content/editorial/batch1-assets.json"),
  );
  for (const [path, info] of Object.entries(assets)) {
    const bytes = await readFile(path);
    assert.equal(hash(bytes), info.sha256);
    assert.ok(info.bytes < 100000);
    assert.ok([720, 1200].includes(info.width));
  }
});
test("Importer refuses the Growth OS project, changed text and unapproved manifests; defaults to review", () => {
  assert.throws(
    () => buildImportSQL(manifest, "cknlzuinwcdupdxilzcf"),
    /dedicated portal/,
  );
  assert.throws(
    () =>
      buildImportSQL(
        { ...manifest, approval_source: "pending" },
        PORTAL_PROJECT,
      ),
    /Approved/,
  );
  const modified = structuredClone(manifest);
  modified.articles[0].post.body += "<p>New claim</p>";
  assert.throws(() => buildImportSQL(modified, PORTAL_PROJECT), /integrity/);
  const sql = buildImportSQL(manifest, PORTAL_PROJECT);
  assert.ok(sql.includes("'review'"));
  assert.ok(!sql.includes("set status='published'"));
  assert.ok(sql.includes("Existing article differs"));
  assert.ok(!sql.includes("insert into auth.users"));
  assert.match(
    buildImportSQL(manifest, PORTAL_PROJECT, { stage: "published" }),
    /set status='approved'[\s\S]*set status='published'/,
  );
});
