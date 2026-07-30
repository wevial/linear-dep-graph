import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildDemo } from "../scripts/build-demo.mjs";

test("buildDemo creates a subpath-safe static GitHub Pages artifact", async () => {
  const outputDirectory = await mkdtemp(
    resolve(tmpdir(), "linear-dep-graph-demo-"),
  );

  try {
    await buildDemo({
      rootDirectory: resolve(
        dirname(fileURLToPath(import.meta.url)),
        "..",
      ),
      outputDirectory,
    });
    const html = await readFile(
      resolve(outputDirectory, "index.html"),
      "utf8",
    );
    const demoData = await readFile(
      resolve(outputDirectory, "demo-data.js"),
      "utf8",
    );

    assert.match(html, /src="\.\/demo-data\.js"/);
    assert.match(html, /src="\.\/app\.js"/);
    assert.match(html, /href="\.\/styles\.css"/);
    assert.doesNotMatch(html, /src="\/app\.js"/);
    assert.doesNotMatch(demoData, /LINEAR_API_KEY/);
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});
