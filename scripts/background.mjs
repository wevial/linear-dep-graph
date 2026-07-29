import { closeSync, openSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { loadConfig } from "../src/config.mjs";

const config = await loadConfig({
  envPath: process.env.ENV_FILE || undefined,
});
const pidPath = resolve(config.rootDirectory, ".linear-dep-graph.pid");
const logPath = resolve(config.rootDirectory, "linear-dep-graph.log");
const serverPath = resolve(config.rootDirectory, "src/server.mjs");
const healthUrl = `http://${config.host}:${config.port}/health`;

async function savedPid() {
  try {
    return Number((await readFile(pidPath, "utf8")).trim());
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function processExists(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function isHealthy() {
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function stop() {
  const pid = await savedPid();
  if (!processExists(pid)) {
    await unlink(pidPath).catch(() => {});
    console.log("Linear Dependency Graph is not running.");
    return;
  }

  process.kill(pid, "SIGTERM");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    if (!processExists(pid)) break;
  }
  await unlink(pidPath).catch(() => {});
  console.log(`Stopped Linear Dependency Graph (PID ${pid}).`);
}

async function start() {
  const existingPid = await savedPid();
  if (processExists(existingPid) && (await isHealthy())) {
    console.log(`Linear Dependency Graph is already running at ${healthUrl.replace("/health", "/")}`);
    return;
  }
  await unlink(pidPath).catch(() => {});

  const log = openSync(logPath, "a");
  const child = spawn(process.execPath, [serverPath], {
    cwd: config.rootDirectory,
    detached: true,
    env: process.env,
    stdio: ["ignore", log, log],
  });
  child.unref();
  closeSync(log);
  await writeFile(pidPath, `${child.pid}\n`, { mode: 0o600 });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    if (await isHealthy()) {
      console.log(`Started Linear Dependency Graph (PID ${child.pid}).`);
      console.log(`Open ${healthUrl.replace("/health", "/")}`);
      return;
    }
  }

  throw new Error(`The server did not start. Check ${logPath}`);
}

if (process.argv.includes("--stop")) await stop();
else await start();
