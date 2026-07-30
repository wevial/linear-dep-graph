import { edgePath, graphLayout } from "./graph-geometry.js";
import {
  relatedIssueIds,
  resolveLaneVisibility,
  workflowColumns,
  workflowLaneKey,
} from "./graph-data.js";

const elements = {
  projectSelect: document.querySelector("#project-select"),
  search: document.querySelector("#issue-search"),
  lanePicker: document.querySelector("#lane-picker"),
  lanePickerSummary: document.querySelector("#lane-picker-summary"),
  laneOptions: document.querySelector("#lane-options"),
  laneHiddenNote: document.querySelector("#lane-hidden-note"),
  lanesOccupied: document.querySelector("#lanes-occupied"),
  lanesAll: document.querySelector("#lanes-all"),
  parentToggle: document.querySelector("#parent-toggle"),
  edgeXrayToggle: document.querySelector("#edge-xray-toggle"),
  accessibleColorToggle: document.querySelector("#accessible-color-toggle"),
  refresh: document.querySelector("#refresh-button"),
  message: document.querySelector("#message"),
  detail: document.querySelector("#issue-detail"),
  detailId: document.querySelector("#detail-id"),
  detailStatus: document.querySelector("#detail-status"),
  detailPriority: document.querySelector("#detail-priority"),
  detailTitle: document.querySelector("#detail-title"),
  detailDescription: document.querySelector("#detail-description"),
  detailBlockedBy: document.querySelector("#detail-blocked-by"),
  detailBlocks: document.querySelector("#detail-blocks"),
  detailLink: document.querySelector("#detail-link"),
  clearSelection: document.querySelector("#clear-selection"),
  graphViewport: document.querySelector("#graph-viewport"),
  graph: document.querySelector("#dependency-graph"),
  syncStatus: document.querySelector("#sync-status"),
};

const state = {
  config: null,
  projects: [],
  teams: [],
  graph: null,
  selectedId: null,
  search: "",
  showParents: true,
  accessibleColors: false,
  laneOverrides: {},
  laneScopeValue: null,
  loading: false,
};

const svgNamespace = "http://www.w3.org/2000/svg";

function makeSvg(name, attributes = {}) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

async function getJson(path) {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
  }
  return payload;
}

function setMessage(kind, title, text) {
  elements.message.dataset.kind = kind;
  elements.message.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = title;
  elements.message.append(strong, document.createTextNode(text));
  elements.message.hidden = false;
}

function clearMessage() {
  elements.message.hidden = true;
  elements.message.replaceChildren();
  delete elements.message.dataset.kind;
}

function projectLabel(project) {
  const teams = project.teams.map((team) => team.key).join(", ");
  return teams ? `${project.name} · ${teams}` : project.name;
}

function scopeValue(type, id) {
  return `${type}:${id}`;
}

function parseScopeValue(value) {
  const separator = value.indexOf(":");
  if (separator === -1) return null;
  return {
    type: value.slice(0, separator),
    id: value.slice(separator + 1),
  };
}

function availableScopeValues() {
  return new Set([
    ...state.projects.map((project) => scopeValue("project", project.id)),
    ...state.teams.map((team) => scopeValue("team", team.id)),
  ]);
}

function chooseScope() {
  const legacyProjectId = localStorage.getItem("linear-dep-graph.project");
  const candidateValues = [
    localStorage.getItem("linear-dep-graph.scope"),
    legacyProjectId ? scopeValue("project", legacyProjectId) : null,
    state.config.defaultProjectId
      ? scopeValue("project", state.config.defaultProjectId)
      : null,
    state.projects[0]
      ? scopeValue("project", state.projects[0].id)
      : null,
    state.teams[0] ? scopeValue("team", state.teams[0].id) : null,
  ].filter(Boolean);
  const available = availableScopeValues();
  return candidateValues.find((value) => available.has(value));
}

function laneStorageKey(selectedScope) {
  return `linear-dep-graph.lanes.${selectedScope}`;
}

function loadLaneOverrides(selectedScope) {
  try {
    let stored = localStorage.getItem(laneStorageKey(selectedScope));
    const scope = parseScopeValue(selectedScope);
    if (stored === null && scope?.type === "project") {
      stored = localStorage.getItem(
        `linear-dep-graph.lanes.${scope.id}`,
      );
    }
    const value = JSON.parse(stored);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

function saveLaneOverrides() {
  if (!state.laneScopeValue) return;
  localStorage.setItem(
    laneStorageKey(state.laneScopeValue),
    JSON.stringify(state.laneOverrides),
  );
}

function setAccessibleColors(enabled, { persist = true } = {}) {
  state.accessibleColors = enabled;
  elements.accessibleColorToggle.checked = enabled;
  document.documentElement.classList.toggle("is-colorblind", enabled);
  if (persist) {
    localStorage.setItem(
      "linear-dep-graph.accessible-colors",
      enabled ? "1" : "0",
    );
  }
}

function allLaneColumns() {
  if (!state.graph) return [];
  return workflowColumns(state.graph.nodes, state.graph.workflowStates);
}

function currentLaneVisibility() {
  return resolveLaneVisibility(allLaneColumns(), state.laneOverrides);
}

function selectedIssueIsVisible(visibleKeys) {
  if (!state.selectedId) return true;
  const selected = state.graph.nodes.find(
    (node) => node.id === state.selectedId,
  );
  return (
    !selected ||
    visibleKeys.has(
      workflowLaneKey({
        type: selected.statusType,
        name: selected.status,
      }),
    )
  );
}

function applyLaneVisibility() {
  const { visibleKeys } = currentLaneVisibility();
  if (!selectedIssueIsVisible(visibleKeys)) state.selectedId = null;
  saveLaneOverrides();
  renderLanePicker();
  renderGraph();
  renderDetail();
}

function renderLanePicker() {
  const columns = allLaneColumns();
  const { visibleKeys, visibleCount, hiddenIssueCount } =
    currentLaneVisibility();
  elements.laneOptions.replaceChildren();

  for (const column of columns) {
    const label = document.createElement("label");
    label.className = "lane-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = visibleKeys.has(column.key);
    input.setAttribute("aria-label", `Show ${column.name} lane`);
    const name = document.createElement("span");
    name.textContent = column.name;
    const count = document.createElement("small");
    count.textContent = `${column.nodes.length} ${
      column.nodes.length === 1 ? "issue" : "issues"
    }`;

    input.addEventListener("change", () => {
      state.laneOverrides[column.key] = input.checked;
      applyLaneVisibility();
    });
    label.append(input, name, count);
    elements.laneOptions.append(label);
  }

  elements.lanePickerSummary.textContent = hiddenIssueCount
    ? `${visibleCount}/${columns.length} · ${hiddenIssueCount} hidden`
    : `${visibleCount}/${columns.length}`;
  elements.laneHiddenNote.textContent = hiddenIssueCount
    ? `${hiddenIssueCount} ${
        hiddenIssueCount === 1 ? "issue" : "issues"
      } hidden`
    : "No issues hidden";
  elements.lanePicker.classList.toggle(
    "has-hidden-issues",
    hiddenIssueCount > 0,
  );
}

async function loadScopes() {
  const [{ projects }, { teams }] = await Promise.all([
    getJson("/api/projects"),
    getJson("/api/teams"),
  ]);
  state.projects = projects;
  state.teams = teams;
  elements.projectSelect.replaceChildren();

  if (!projects.length && !teams.length) {
    const option = document.createElement("option");
    option.textContent = "No accessible projects or teams";
    elements.projectSelect.append(option);
    elements.projectSelect.disabled = true;
    setMessage(
      "info",
      "No Linear scopes found",
      "The configured API key does not have access to any active projects or teams.",
    );
    return;
  }

  if (projects.length) {
    const projectGroup = document.createElement("optgroup");
    projectGroup.label = "Projects";
    for (const project of projects) {
      const option = document.createElement("option");
      option.value = scopeValue("project", project.id);
      option.textContent = projectLabel(project);
      projectGroup.append(option);
    }
    elements.projectSelect.append(projectGroup);
  }

  if (teams.length) {
    const teamGroup = document.createElement("optgroup");
    teamGroup.label = "Teams";
    for (const team of teams) {
      const option = document.createElement("option");
      option.value = scopeValue("team", team.id);
      option.textContent = `${team.name} · ${team.key}`;
      teamGroup.append(option);
    }
    elements.projectSelect.append(teamGroup);
  }

  const selectedScope = chooseScope();
  elements.projectSelect.value = selectedScope;
  elements.projectSelect.disabled = false;
  await loadGraph(selectedScope);
}

async function loadGraph(selectedScope, { force = false, quiet = false } = {}) {
  const scope = parseScopeValue(selectedScope);
  if (!scope || state.loading) return;

  state.loading = true;
  elements.refresh.disabled = true;
  if (!quiet) elements.syncStatus.textContent = "Reading Linear…";

  try {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeId: scope.id,
    });
    if (force) params.set("refresh", "1");
    state.graph = await getJson(`/api/graph?${params}`);
    state.laneScopeValue = selectedScope;
    state.laneOverrides = loadLaneOverrides(selectedScope);

    if (
      state.selectedId &&
      !state.graph.nodes.some((node) => node.id === state.selectedId)
    ) {
      state.selectedId = null;
    }

    const fetchedAt = new Date(state.graph.fetchedAt);
    elements.syncStatus.textContent = `${state.graph.nodes.length} issues · ${
      state.graph.edges.filter((edge) => edge.type === "blocks").length
    } dependencies · updated ${fetchedAt.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
    clearMessage();
    renderLanePicker();
    renderGraph();
    renderDetail();
  } catch (error) {
    setMessage("error", "Could not load the scope", error.message);
    elements.syncStatus.textContent = "Refresh failed";
  } finally {
    state.loading = false;
    elements.refresh.disabled = false;
  }
}

function visibleNodes() {
  if (!state.graph) return [];
  const { visibleKeys } = currentLaneVisibility();
  const query = state.search.trim().toLocaleLowerCase();
  return state.graph.nodes.filter((node) => {
    const laneIsVisible = visibleKeys.has(
      workflowLaneKey({ type: node.statusType, name: node.status }),
    );
    if (!laneIsVisible) return false;
    if (!query) return true;
    return [node.id, node.title, node.status, node.priority]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
}

function wrapTitle(title, maxCharacters = 28) {
  const words = title.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  if (lines.length > 4) {
    lines.splice(4);
    lines[3] = `${lines[3].replace(/[.…]$/, "")}…`;
  }
  return lines;
}

function renderGraph() {
  const svg = elements.graph;
  const nodes = visibleNodes();
  const { visibleKeys } = currentLaneVisibility();
  const workflowStates = (state.graph?.workflowStates ?? []).filter(
    (workflowState) =>
      visibleKeys.has(workflowLaneKey(workflowState)),
  );
  const columns = workflowColumns(nodes, workflowStates);
  svg.replaceChildren();

  const title = makeSvg("title", { id: "graph-title" });
  title.textContent = "Linear issue dependency graph";
  const description = makeSvg("desc", { id: "graph-description" });
  description.textContent = `${nodes.length} issues arranged across ${columns.length} workflow status columns.`;
  svg.append(title, description);

  if (!columns.length) {
    const width = Math.max(720, elements.graphViewport.clientWidth - 4);
    svg.setAttribute("viewBox", `0 0 ${width} 500`);
    svg.style.width = `${width}px`;
    svg.style.height = "500px";
    const empty = makeSvg("text", {
      class: "empty-graph",
      x: width / 2,
      y: 250,
      "text-anchor": "middle",
    });
    empty.textContent = state.graph
      ? "Choose at least one status lane."
      : "Choose a project to begin.";
    svg.append(empty);
    return;
  }

  const viewportWidth = Math.max(320, elements.graphViewport.clientWidth - 4);
  const {
    canvasPadding,
    columnStride,
    columnWidth,
    nodeWidth,
    width,
  } = graphLayout({
    viewportWidth,
    columnCount: columns.length,
  });
  const nodeHeight = 96;
  const rowGap = 24;
  const headerHeight = 72;

  for (const column of columns) {
    column.nodes.sort((left, right) =>
      left.id.localeCompare(right.id, undefined, { numeric: true }),
    );
  }

  const maxRows = Math.max(...columns.map((column) => column.nodes.length));
  const height = headerHeight + maxRows * (nodeHeight + rowGap) + 18;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;

  const defs = makeSvg("defs");
  const makeArrowMarker = (id, className) => {
    const marker = makeSvg("marker", {
      id,
      viewBox: "0 -5 10 10",
      refX: "10",
      refY: "0",
      markerWidth: "10",
      markerHeight: "10",
      markerUnits: "userSpaceOnUse",
      orient: "auto",
    });
    marker.append(
      makeSvg("path", {
        class: className,
        d: "M0,-5L10,0L0,5Z",
      }),
    );
    return marker;
  };
  defs.append(
    makeArrowMarker("dependency-arrow", "arrowhead"),
    makeArrowMarker("dependency-arrow-incoming", "arrowhead incoming"),
    makeArrowMarker("dependency-arrow-outgoing", "arrowhead outgoing"),
  );
  svg.append(defs);

  const laneLayer = makeSvg("g");
  const edgeHaloLayer = makeSvg("g");
  const edgeLayer = makeSvg("g");
  const nodeLayer = makeSvg("g");
  svg.append(laneLayer, edgeHaloLayer, edgeLayer, nodeLayer);

  const byId = new Map(nodes.map((node) => [node.id, node]));

  columns.forEach((column, columnIndex) => {
    const x = canvasPadding + columnIndex * columnStride;
    laneLayer.append(
      makeSvg("rect", {
        class: "lane",
        x: x + 4,
        y: 4,
        width: columnWidth - 8,
        height: height - 8,
      }),
    );

    const index = makeSvg("text", {
      class: "lane-index",
      x: x + 14,
      y: 21,
    });
    index.textContent = String(columnIndex + 1).padStart(2, "0");
    const heading = makeSvg("text", {
      class: "lane-title",
      x: x + 14,
      y: 42,
    });
    heading.textContent = column.name;
    const count = makeSvg("text", {
      class: "lane-count",
      x: x + 14,
      y: 59,
    });
    count.textContent = `${column.nodes.length} ${
      column.nodes.length === 1 ? "issue" : "issues"
    }`;
    laneLayer.append(index, heading, count);

    column.nodes.forEach((node, rowIndex) => {
      node.column = columnIndex;
      node.x = x + 10;
      node.y = headerHeight + rowIndex * (nodeHeight + rowGap);
      node.width = nodeWidth;
      node.height = nodeHeight;
    });
  });

  const renderedEdges = state.graph.edges.filter(
    (edge) =>
      byId.has(edge.source) &&
      byId.has(edge.target) &&
      (edge.type !== "parent" || state.showParents),
  );

  const { blockedBy, blocks, parents, children } = state.selectedId
    ? relatedIssueIds(state.graph.edges, state.selectedId)
    : { blockedBy: [], blocks: [], parents: [], children: [] };
  const neighborhood = new Set([
    state.selectedId,
    ...blockedBy,
    ...blocks,
    ...parents,
    ...children,
  ]);

  for (const edge of renderedEdges) {
    const pathData = edgePath(byId.get(edge.source), byId.get(edge.target));
    const incoming = edge.target === state.selectedId;
    const outgoing = edge.source === state.selectedId;
    const related = incoming || outgoing;

    if (edge.type === "blocks") {
      const halo = makeSvg("path", {
        class: "edge-halo",
        d: pathData,
      });
      if (state.selectedId) {
        halo.classList.toggle("is-related", related);
        halo.classList.toggle("is-dimmed", !related);
      }
      edgeHaloLayer.append(halo);
    }

    const path = makeSvg("path", {
      class: `edge ${edge.type}`,
      d: pathData,
    });
    if (edge.type === "blocks") {
      const markerId = incoming
        ? "dependency-arrow-incoming"
        : outgoing
          ? "dependency-arrow-outgoing"
          : "dependency-arrow";
      path.setAttribute("marker-end", `url(#${markerId})`);
    }
    if (state.selectedId) {
      path.classList.toggle("is-related", related);
      path.classList.toggle("is-incoming", incoming);
      path.classList.toggle("is-outgoing", outgoing);
      path.classList.toggle(
        "is-parent-edge",
        edge.type === "parent" && incoming,
      );
      path.classList.toggle(
        "is-child-edge",
        edge.type === "parent" && outgoing,
      );
      path.classList.toggle("is-dimmed", !related);
    }
    edgeLayer.append(path);
  }

  for (const node of nodes) {
    const group = makeSvg("g", {
      class: "issue-node",
      "data-issue-id": node.id,
      "data-status-type": node.statusType,
      role: "button",
      tabindex: "0",
      "aria-label": `${node.id}: ${node.title}. ${node.status}. ${node.priority}.`,
    });
    group.classList.toggle("is-selected", node.id === state.selectedId);
    group.classList.toggle("is-blocker", blockedBy.includes(node.id));
    group.classList.toggle("is-blocked", blocks.includes(node.id));
    group.classList.toggle("is-parent", parents.includes(node.id));
    group.classList.toggle("is-child", children.includes(node.id));
    group.classList.toggle(
      "is-dimmed",
      Boolean(state.selectedId) && !neighborhood.has(node.id),
    );

    group.append(
      makeSvg("rect", {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }),
    );

    const identifier = makeSvg("text", {
      class: "node-id",
      x: node.x + 10,
      y: node.y + 19,
    });
    identifier.textContent = node.id;
    group.append(identifier);

    const titleText = makeSvg("text", {
      class: "node-title",
      x: node.x + 10,
      y: node.y + 39,
    });
    wrapTitle(node.title, Math.max(16, Math.floor(node.width / 7.2))).forEach(
      (line, index) => {
        const span = makeSvg("tspan", {
          x: node.x + 10,
          dy: index === 0 ? 0 : 14,
        });
        span.textContent = line;
        titleText.append(span);
      },
    );
    group.append(titleText);

    const priority = makeSvg("text", {
      class: "node-priority",
      x: node.x + node.width - 9,
      y: node.y + node.height - 9,
      "text-anchor": "end",
    });
    priority.textContent = node.priority;
    group.append(priority);
    nodeLayer.append(group);
  }
}

function renderRelationList(container, ids) {
  container.replaceChildren();
  if (!ids.length) {
    const none = document.createElement("span");
    none.className = "none";
    none.textContent = "None";
    container.append(none);
    return;
  }

  for (const id of ids) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.issueId = id;
    button.textContent = id;
    container.append(button);
  }
}

function renderDetail() {
  const selected = state.graph?.nodes.find(
    (node) => node.id === state.selectedId,
  );
  if (!selected) {
    elements.detail.classList.remove("is-open");
    elements.detail.setAttribute("aria-hidden", "true");
    elements.detail.inert = true;
    return;
  }

  elements.detailId.textContent = selected.id;
  elements.detailStatus.textContent = selected.status;
  elements.detailPriority.textContent = selected.priority;
  elements.detailTitle.textContent = selected.title;
  const description = (selected.description ?? "").trim();
  elements.detailDescription.textContent =
    description || "No description provided.";
  elements.detailDescription.classList.toggle("is-empty", !description);
  elements.detailLink.href = selected.url;
  const { blockedBy, blocks } = relatedIssueIds(
    state.graph.edges,
    selected.id,
  );
  renderRelationList(elements.detailBlockedBy, blockedBy);
  renderRelationList(elements.detailBlocks, blocks);
  elements.detail.inert = false;
  elements.detail.setAttribute("aria-hidden", "false");
  elements.detail.classList.add("is-open");
}

function selectIssue(issueId) {
  state.selectedId = issueId;
  renderGraph();
  renderDetail();
}

function clearSelection() {
  state.selectedId = null;
  renderGraph();
  renderDetail();
}

elements.projectSelect.addEventListener("change", async () => {
  const selectedScope = elements.projectSelect.value;
  localStorage.setItem("linear-dep-graph.scope", selectedScope);
  state.selectedId = null;
  await loadGraph(selectedScope);
});

elements.search.addEventListener("input", () => {
  state.search = elements.search.value;
  renderGraph();
});

elements.parentToggle.addEventListener("change", () => {
  state.showParents = elements.parentToggle.checked;
  renderGraph();
});

elements.edgeXrayToggle.addEventListener("change", () => {
  elements.graph.classList.toggle(
    "is-xray",
    elements.edgeXrayToggle.checked,
  );
});

elements.accessibleColorToggle.addEventListener("change", () => {
  setAccessibleColors(elements.accessibleColorToggle.checked);
});

elements.lanesOccupied.addEventListener("click", () => {
  state.laneOverrides = {};
  applyLaneVisibility();
});

elements.lanesAll.addEventListener("click", () => {
  state.laneOverrides = Object.fromEntries(
    allLaneColumns().map((column) => [column.key, true]),
  );
  applyLaneVisibility();
});

elements.refresh.addEventListener("click", () =>
  loadGraph(elements.projectSelect.value, { force: true }),
);

elements.clearSelection.addEventListener("click", clearSelection);

for (const container of [
  elements.detailBlockedBy,
  elements.detailBlocks,
]) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-issue-id]");
    if (button) selectIssue(button.dataset.issueId);
  });
}

elements.graph.addEventListener("click", (event) => {
  const node = event.target.closest(".issue-node");
  if (node) selectIssue(node.dataset.issueId);
});

elements.graph.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const node = event.target.closest(".issue-node");
  if (!node) return;
  event.preventDefault();
  selectIssue(node.dataset.issueId);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.lanePicker.open) {
    elements.lanePicker.open = false;
    return;
  }
  if (state.selectedId) clearSelection();
});

document.addEventListener("click", (event) => {
  if (
    elements.lanePicker.open &&
    !elements.lanePicker.contains(event.target)
  ) {
    elements.lanePicker.open = false;
  }
});

let resizeFrame;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(renderGraph);
}).observe(elements.graphViewport);

async function initialize() {
  try {
    setAccessibleColors(
      localStorage.getItem("linear-dep-graph.accessible-colors") === "1",
      { persist: false },
    );
    state.config = await getJson("/api/config");
    if (!state.config.configured) {
      elements.projectSelect.replaceChildren();
      const option = document.createElement("option");
      option.textContent = "API key required";
      elements.projectSelect.append(option);
      setMessage(
        "info",
        "One local setup step",
        "Copy .env.example to .env, add LINEAR_API_KEY, then restart the server. The key is read only by the local Node process and is never sent to this page.",
      );
      return;
    }

    await loadScopes();
    window.setInterval(() => {
      if (!document.hidden && elements.projectSelect.value) {
        loadGraph(elements.projectSelect.value, { quiet: true });
      }
    }, state.config.refreshIntervalMs);
  } catch (error) {
    setMessage("error", "Could not start the graph", error.message);
  }
}

initialize();
