// Usage: node scripts/make-clip-manifest.mjs
// Scans public/clips for .mp4/.webm files and writes public/clips/manifest.json.
// A poster is picked up if a same-named .jpg/.webp exists in public/clips or public/posters.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const root = join(process.cwd(), "public");
const clipsDir = join(root, "clips");
const files = readdirSync(clipsDir)
  .filter((f) => /\.(mp4|webm)$/i.test(f))
  .sort();
const posterFor = (name) => {
  for (const dir of ["clips", "posters"])
    for (const ext of [".jpg", ".jpeg", ".webp", ".png"])
      if (existsSync(join(root, dir, name + ext))) return `/${dir}/${name}${ext}`;
  return undefined;
};
const clips = files.map((f) => {
  const name = basename(f, extname(f));
  return { src: `/clips/${f}`, poster: posterFor(name) };
});
writeFileSync(join(clipsDir, "manifest.json"), JSON.stringify({ clips }, null, 2) + "\n");
console.log(
  `manifest.json: ${clips.length} clips (${clips.filter((c) => c.poster).length} with posters)`,
);
