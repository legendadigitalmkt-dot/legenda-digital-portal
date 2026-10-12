import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  await readFile("content/editorial/batch1-manifest.json", "utf8"),
);
const output = {};
for (const article of manifest.articles) {
  const stem = `public/images/editorial/batch1/${article.post.slug}-hero`;
  const svg = await readFile(stem + ".svg");
  for (const [suffix, width, height] of [
    ["-large", 1200, 750],
    ["-card", 720, 540],
    ["-card-mobile", 480, 360],
  ]) {
    // Render the unchanged source vector into a reserved frame; never crop its text.
    const buffer = await sharp(svg, { density: 120 })
      .resize({ width, height, fit: "contain", background: "#ffffff" })
      .webp({ quality: 88 })
      .toBuffer();
    const path = stem + suffix + ".webp";
    await writeFile(path, buffer);
    output[path] = {
      sha256: createHash("sha256").update(buffer).digest("hex"),
      width,
      height,
      bytes: buffer.length,
    };
  }
}
await writeFile(
  "content/editorial/card-assets.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  `${Object.keys(output).length} card variants rendered from unchanged SVGs`,
);
