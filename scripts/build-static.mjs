import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
const staticFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "legal-notices.js",
  "supabase-data.js"
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of staticFiles) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, outputDirectory));
}
