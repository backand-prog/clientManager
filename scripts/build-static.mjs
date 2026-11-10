import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
const staticFiles = [
  "index.html",
  "styles.css",
  "legal-notices.js"
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of staticFiles) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, outputDirectory));
}

await cp(new URL("../js/", import.meta.url), new URL("js/", outputDirectory), { recursive: true });

await cp(
  new URL("../BackPlan_felhasznaloi_kezikonyv.pdf", import.meta.url),
  new URL("BackPlan_felhasznaloi_kezikonyv.pdf", outputDirectory)
);
