(() => {
  const teams = [
    { id: "demo-team-atlas", key: "ATS", name: "Atlas Studio" },
    { id: "demo-team-lumen", key: "LUM", name: "Lumen Labs" },
  ];

  const projects = [
    {
      id: "demo-project-observatory",
      name: "Launch Observatory",
      slugId: "launch-observatory",
      url: "https://linear.app",
      teams: [teams[0]],
    },
    {
      id: "demo-project-beacon",
      name: "Beacon Mobile",
      slugId: "beacon-mobile",
      url: "https://linear.app",
      teams: [teams[1]],
    },
  ];

  const workflowStates = [
    { name: "Backlog", type: "backlog", position: 0 },
    { name: "Todo", type: "unstarted", position: 1 },
    { name: "In Progress", type: "started", position: 2 },
    { name: "In Review", type: "started", position: 3 },
    { name: "Done", type: "completed", position: 4 },
    { name: "Canceled", type: "canceled", position: 5 },
  ];

  const statusByName = new Map(
    workflowStates.map((status) => [status.name, status]),
  );

  function issue({
    id,
    title,
    status,
    priority = "Medium",
    description = "",
    descriptionHtml = "",
  }) {
    const workflow = statusByName.get(status);
    return {
      id,
      title,
      description,
      descriptionHtml,
      status,
      statusType: workflow.type,
      statusPosition: workflow.position,
      priority,
      url: "https://linear.app",
      updatedAt: "2026-07-30T18:00:00.000Z",
    };
  }

  const atlasNodes = [
    issue({
      id: "ATS-101",
      title: "Define the Launch Observatory product brief",
      status: "Done",
      priority: "High",
    }),
    issue({
      id: "ATS-102",
      title: "Map the operator journey and intervention points",
      status: "Done",
    }),
    issue({
      id: "ATS-103",
      title: "Establish staging and seeded preview accounts",
      status: "Done",
    }),
    issue({
      id: "ATS-104",
      title: "Design the event and dependency schema",
      status: "Done",
      priority: "High",
    }),
    issue({
      id: "ATS-105",
      title: "Build the streaming ingestion worker",
      status: "In Progress",
      priority: "High",
    }),
    issue({
      id: "ATS-106",
      title: "Add team-scoped permission policies",
      status: "In Progress",
      priority: "High",
    }),
    issue({
      id: "ATS-107",
      title: "Design empty, loading, and partial-data states",
      status: "Todo",
    }),
    issue({
      id: "ATS-108",
      title: "Implement status-change notifications",
      status: "In Review",
    }),
    issue({
      id: "ATS-109",
      title: "Document API limits and retry behavior",
      status: "In Review",
      priority: "Low",
    }),
    issue({
      id: "ATS-110",
      title: "Run keyboard and screen-reader audit",
      status: "Todo",
      priority: "High",
    }),
    issue({
      id: "ATS-111",
      title: "Define the incident response runbook",
      status: "Todo",
    }),
    issue({
      id: "ATS-112",
      title: "Prototype the interactive dependency explorer",
      status: "In Progress",
      priority: "Urgent",
      description: `Build the first complete dependency-map interaction.

**Acceptance criteria**

- Group work by its workflow status
- Highlight blockers and downstream work
- Support keyboard navigation and a compact detail tray
- Keep real workspace credentials out of the demo`,
      descriptionHtml: `<p>Build the first complete dependency-map interaction.</p>
<p><strong>Acceptance criteria</strong></p>
<ul>
  <li>Group work by its workflow status</li>
  <li>Highlight blockers and downstream work</li>
  <li>Support keyboard navigation and a compact detail tray</li>
  <li>Keep real workspace credentials out of the demo</li>
</ul>`,
    }),
    issue({
      id: "ATS-113",
      title: "Refine keyboard navigation and focus order",
      status: "In Review",
      priority: "High",
    }),
    issue({
      id: "ATS-114",
      title: "Add a high-contrast graph palette",
      status: "Done",
    }),
    issue({
      id: "ATS-115",
      title: "Create the staged launch checklist",
      status: "Todo",
      priority: "High",
    }),
    issue({
      id: "ATS-116",
      title: "Measure onboarding drop-off by workflow stage",
      status: "Backlog",
    }),
    issue({
      id: "ATS-117",
      title: "Plan the operational telemetry dashboard",
      status: "Backlog",
      priority: "Low",
    }),
    issue({
      id: "ATS-118",
      title: "Replace the abandoned timeline experiment",
      status: "Canceled",
      priority: "No priority",
    }),
  ];

  const atlasEdges = [
    { source: "ATS-101", target: "ATS-102", type: "blocks" },
    { source: "ATS-101", target: "ATS-104", type: "blocks" },
    { source: "ATS-102", target: "ATS-107", type: "blocks" },
    { source: "ATS-103", target: "ATS-105", type: "blocks" },
    { source: "ATS-104", target: "ATS-105", type: "blocks" },
    { source: "ATS-104", target: "ATS-112", type: "blocks" },
    { source: "ATS-105", target: "ATS-108", type: "blocks" },
    { source: "ATS-105", target: "ATS-112", type: "blocks" },
    { source: "ATS-106", target: "ATS-108", type: "blocks" },
    { source: "ATS-107", target: "ATS-112", type: "blocks" },
    { source: "ATS-110", target: "ATS-113", type: "blocks" },
    { source: "ATS-112", target: "ATS-113", type: "blocks" },
    { source: "ATS-112", target: "ATS-115", type: "blocks" },
    { source: "ATS-108", target: "ATS-115", type: "blocks" },
    { source: "ATS-101", target: "ATS-105", type: "parent" },
    { source: "ATS-101", target: "ATS-106", type: "parent" },
    { source: "ATS-101", target: "ATS-112", type: "parent" },
    { source: "ATS-101", target: "ATS-115", type: "parent" },
  ];

  const beaconNodes = [
    issue({
      id: "LUM-201",
      title: "Define the Beacon mobile navigation model",
      status: "Done",
      priority: "High",
    }),
    issue({
      id: "LUM-202",
      title: "Build offline-first note capture",
      status: "In Progress",
      priority: "High",
    }),
    issue({
      id: "LUM-203",
      title: "Add conflict resolution for shared notes",
      status: "Todo",
      priority: "High",
    }),
    issue({
      id: "LUM-204",
      title: "Prototype the activity feed",
      status: "In Review",
    }),
    issue({
      id: "LUM-205",
      title: "Instrument cold-start performance",
      status: "Todo",
    }),
    issue({
      id: "LUM-206",
      title: "Publish internal beta",
      status: "Backlog",
      priority: "Urgent",
    }),
  ];

  const beaconEdges = [
    { source: "LUM-201", target: "LUM-202", type: "blocks" },
    { source: "LUM-202", target: "LUM-203", type: "blocks" },
    { source: "LUM-202", target: "LUM-204", type: "blocks" },
    { source: "LUM-203", target: "LUM-206", type: "blocks" },
    { source: "LUM-204", target: "LUM-206", type: "blocks" },
    { source: "LUM-201", target: "LUM-203", type: "parent" },
  ];

  const atlasProjectIds = new Set([
    "ATS-101",
    "ATS-102",
    "ATS-103",
    "ATS-104",
    "ATS-105",
    "ATS-107",
    "ATS-108",
    "ATS-110",
    "ATS-112",
    "ATS-113",
    "ATS-114",
    "ATS-115",
  ]);

  function graph(nodes, edges) {
    const identifiers = new Set(nodes.map((node) => node.id));
    return {
      nodes,
      edges: edges.filter(
        (edge) =>
          identifiers.has(edge.source) && identifiers.has(edge.target),
      ),
      workflowStates,
      fetchedAt: new Date().toISOString(),
    };
  }

  const graphs = new Map([
    ["team:demo-team-atlas", graph(atlasNodes, atlasEdges)],
    ["team:demo-team-lumen", graph(beaconNodes, beaconEdges)],
    [
      "project:demo-project-observatory",
      graph(
        atlasNodes.filter((node) => atlasProjectIds.has(node.id)),
        atlasEdges,
      ),
    ],
    [
      "project:demo-project-beacon",
      graph(beaconNodes, beaconEdges),
    ],
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  globalThis.linearDepGraphDemo = {
    async getJson(path) {
      const url = new URL(path, globalThis.location.href);

      if (url.pathname.endsWith("/api/config")) {
        return {
          configured: true,
          demo: true,
          defaultProjectId: "demo-project-observatory",
          refreshIntervalMs: 60 * 60 * 1000,
        };
      }
      if (url.pathname.endsWith("/api/projects")) {
        return { projects: clone(projects) };
      }
      if (url.pathname.endsWith("/api/teams")) {
        return { teams: clone(teams) };
      }
      if (url.pathname.endsWith("/api/graph")) {
        const key = `${url.searchParams.get("scopeType")}:${url.searchParams.get("scopeId")}`;
        const value = graphs.get(key);
        if (!value) throw new Error("Demo scope not found");
        return {
          ...clone(value),
          fetchedAt: new Date().toISOString(),
        };
      }

      throw new Error(`Unknown demo request: ${url.pathname}`);
    },
  };
})();
