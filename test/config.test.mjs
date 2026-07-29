import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv } from "../src/config.mjs";

test("parseEnv reads plain and quoted values", () => {
  assert.deepEqual(
    parseEnv(`
      # Local configuration
      LINEAR_API_KEY=test-key
      HOST = "127.0.0.1"
      DEFAULT_PROJECT_ID='project-id'
    `),
    {
      LINEAR_API_KEY: "test-key",
      HOST: "127.0.0.1",
      DEFAULT_PROJECT_ID: "project-id",
    },
  );
});

test("parseEnv ignores malformed and empty lines", () => {
  assert.deepEqual(parseEnv("\nnot a value\n# comment\nPORT=43117\n"), {
    PORT: "43117",
  });
});
