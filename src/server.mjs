import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { loadConfig } from "./config.mjs";
import { createLinearClient, LinearApiError } from "./linear.mjs";

const config = await loadConfig({
  envPath: process.env.ENV_FILE || undefined,
});
const publicDirectory = resolve(config.rootDirectory, "public");
const client = createLinearClient({
  apiKey: config.apiKey,
  apiUrl: config.apiUrl,
});
const projectCache = { value: null, expiresAt: 0 };
const teamCache = { value: null, expiresAt: 0 };
const graphCache = new Map();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function securityHeaders(contentType) {
  return {
    "content-type": contentType,
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function send(response, status, contentType, body) {
  response.writeHead(status, securityHeaders(contentType));
  response.end(body);
}

function sendJson(response, status, value) {
  send(
    response,
    status,
    "application/json; charset=utf-8",
    JSON.stringify(value),
  );
}

async function cachedProjects(force = false) {
  if (
    !force &&
    projectCache.value &&
    projectCache.expiresAt > Date.now()
  ) {
    return projectCache.value;
  }
  projectCache.value = await client.listProjects();
  projectCache.expiresAt = Date.now() + config.refreshIntervalMs;
  return projectCache.value;
}

async function cachedTeams(force = false) {
  if (!force && teamCache.value && teamCache.expiresAt > Date.now()) {
    return teamCache.value;
  }
  teamCache.value = await client.listTeams();
  teamCache.expiresAt = Date.now() + config.refreshIntervalMs;
  return teamCache.value;
}

async function cachedGraph(scopeType, scopeId, force = false) {
  if (!["project", "team"].includes(scopeType)) {
    throw new LinearApiError("scopeType must be project or team", {
      status: 400,
    });
  }
  if (!scopeId) {
    throw new LinearApiError("A scopeId query parameter is required", {
      status: 400,
    });
  }

  const cacheKey = `${scopeType}:${scopeId}`;
  const cached = graphCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

  const value =
    scopeType === "team"
      ? await client.getTeamGraph(scopeId)
      : await client.getProjectGraph(scopeId);
  graphCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + config.refreshIntervalMs,
  });
  return value;
}

async function serveStatic(pathname, response) {
  const fileName =
    pathname === "/"
      ? "index.html"
      : new Map([
          ["/app.js", "app.js"],
          ["/graph-data.js", "graph-data.js"],
          ["/graph-geometry.js", "graph-geometry.js"],
          ["/styles.css", "styles.css"],
          ["/mark.svg", "mark.svg"],
        ]).get(pathname);

  if (!fileName) {
    send(response, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }

  const filePath = resolve(publicDirectory, fileName);
  const body = await readFile(filePath);
  send(
    response,
    200,
    mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
    body,
  );
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url,
      `http://${request.headers.host ?? `${config.host}:${config.port}`}`,
    );

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        configured: Boolean(config.apiKey),
      });
      return;
    }

    if (url.pathname === "/api/config") {
      sendJson(response, 200, {
        configured: Boolean(config.apiKey),
        defaultProjectId: config.defaultProjectId,
        refreshIntervalMs: config.refreshIntervalMs,
      });
      return;
    }

    if (url.pathname === "/api/projects") {
      const projects = await cachedProjects(
        url.searchParams.get("refresh") === "1",
      );
      sendJson(response, 200, { projects });
      return;
    }

    if (url.pathname === "/api/teams") {
      const teams = await cachedTeams(
        url.searchParams.get("refresh") === "1",
      );
      sendJson(response, 200, { teams });
      return;
    }

    if (url.pathname === "/api/graph") {
      const projectId = url.searchParams.get("projectId");
      const scopeType =
        url.searchParams.get("scopeType") ?? (projectId ? "project" : null);
      const scopeId = url.searchParams.get("scopeId") ?? projectId;
      const graph = await cachedGraph(
        scopeType,
        scopeId,
        url.searchParams.get("refresh") === "1",
      );
      sendJson(response, 200, graph);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    const status =
      error instanceof LinearApiError ? error.status : error.code === "ENOENT" ? 404 : 500;
    const message =
      status === 500 ? "The local graph server encountered an error" : error.message;
    if (status >= 500) console.error(error);
    sendJson(response, status, { error: message });
  }
});

server.listen(config.port, config.host, () => {
  const url = `http://${config.host}:${config.port}/`;
  console.log(`Linear Dependency Graph is running at ${url}`);
  if (!config.apiKey) {
    console.warn(
      `No API key found. Copy .env.example to .env, add LINEAR_API_KEY, and restart.`,
    );
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
