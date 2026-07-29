import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function parseEnv(source) {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }

  return values;
}

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export async function loadConfig(options = {}) {
  const envPath = options.envPath ?? resolve(rootDirectory, ".env");
  let fileValues = {};

  try {
    fileValues = parseEnv(await readFile(envPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const values = { ...fileValues, ...process.env, ...options.overrides };

  return {
    rootDirectory,
    envPath,
    apiKey: values.LINEAR_API_KEY?.trim() ?? "",
    apiUrl: values.LINEAR_API_URL?.trim() || "https://api.linear.app/graphql",
    host: values.HOST?.trim() || "127.0.0.1",
    port: positiveInteger(values.PORT, 43117, "PORT"),
    defaultProjectId: values.DEFAULT_PROJECT_ID?.trim() || null,
    refreshIntervalMs: positiveInteger(
      values.REFRESH_INTERVAL_MS,
      300_000,
      "REFRESH_INTERVAL_MS",
    ),
  };
}
