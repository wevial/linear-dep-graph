import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRootDirectory = resolve(scriptDirectory, "..");
const assetNames = [
  "app.js",
  "demo-data.js",
  "graph-data.js",
  "graph-geometry.js",
  "mark.svg",
  "styles.css",
];

export async function buildDemo({
  rootDirectory = defaultRootDirectory,
  outputDirectory = resolve(rootDirectory, "dist"),
} = {}) {
  const publicDirectory = resolve(rootDirectory, "public");
  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  await Promise.all(
    assetNames.map((assetName) =>
      copyFile(
        resolve(publicDirectory, assetName),
        resolve(outputDirectory, assetName),
      ),
    ),
  );

  const sourceHtml = await readFile(
    resolve(publicDirectory, "index.html"),
    "utf8",
  );
  const demoHtml = sourceHtml
    .replace('href="/mark.svg"', 'href="./mark.svg"')
    .replace('href="/styles.css"', 'href="./styles.css"')
    .replace(
      '<script src="/app.js" type="module"></script>',
      '<script src="./demo-data.js"></script>\n    <script src="./app.js" type="module"></script>',
    );

  if (
    demoHtml === sourceHtml ||
    !demoHtml.includes('src="./demo-data.js"')
  ) {
    throw new Error("Could not inject the static demo adapter");
  }

  await Promise.all([
    writeFile(resolve(outputDirectory, "index.html"), demoHtml),
    writeFile(resolve(outputDirectory, ".nojekyll"), ""),
  ]);

  return outputDirectory;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const outputDirectory = await buildDemo();
  console.log(`Built static demo in ${outputDirectory}`);
}
