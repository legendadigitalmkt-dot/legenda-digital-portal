import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  await readFile("content/editorial/batch1-manifest.json", "utf8"),
);
const hashes = {};
for (const article of manifest.articles)
  for (const image of article.integrity.assets) {
    const path = "public/images/editorial/batch1/" + image.name;
    const raw = await readFile(path + ".svg");
    if (createHash("sha256").update(raw).digest("hex") !== image.svg_sha256)
      throw new Error("Asset integrity failed");
    if (image.name.endsWith("-hero"))
      await sharp(raw)
        .resize({ width: 1200 })
        .png()
        .toFile(path + ".png");
    for (const [suffix, width] of [
      ["", 1200],
      ["-mobile", 720],
    ]) {
      const result = await sharp(raw, { density: 120 })
        .resize({ width })
        .webp({ quality: 88 })
        .toBuffer();
      await writeFile(path + suffix + ".webp", result);
      hashes[path + suffix + ".webp"] = {
        sha256: createHash("sha256").update(result).digest("hex"),
        bytes: result.length,
        ...(await sharp(result)
          .metadata()
          .then((m) => ({ width: m.width, height: m.height }))),
      };
    }
  }
await writeFile(
  "content/editorial/batch1-assets.json",
  JSON.stringify(hashes, null, 2) + "\n",
);
console.log(Object.keys(hashes).length + " image variants generated");
