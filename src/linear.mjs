const PROJECTS_QUERY = `
  query DependencyGraphProjects($after: String) {
    projects(first: 100, after: $after, includeArchived: false) {
      nodes {
        id
        name
        slugId
        url
        teams(first: 20) {
          nodes {
            id
            key
            name
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PROJECT_WORKFLOW_QUERY = `
  query DependencyGraphProjectWorkflow($projectId: String!) {
    project(id: $projectId) {
      teams(first: 20) {
        nodes {
          states(first: 100) {
            nodes {
              name
              type
              position
            }
          }
        }
      }
    }
  }
`;

const ISSUES_QUERY = `
  query DependencyGraphIssues($projectId: ID!, $after: String) {
    issues(
      first: 100
      after: $after
      includeArchived: false
      filter: { project: { id: { eq: $projectId } } }
    ) {
      nodes {
        identifier
        title
        priority
        url
        updatedAt
        state {
          name
          type
          position
        }
        parent {
          identifier
        }
        relations(first: 20) {
          nodes {
            type
            relatedIssue {
              identifier
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const priorityLabels = new Map([
  [0, "No priority"],
  [1, "Urgent"],
  [2, "High"],
  [3, "Medium"],
  [4, "Low"],
]);

const statusTypeOrder = new Map([
  ["triage", 0],
  ["backlog", 1],
  ["unstarted", 2],
  ["started", 3],
  ["completed", 4],
  ["canceled", 5],
]);

export class LinearApiError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "LinearApiError";
    this.status = options.status ?? 502;
  }
}

export async function requestLinear({
  apiKey,
  apiUrl = "https://api.linear.app/graphql",
  query,
  variables,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    throw new LinearApiError(
      "LINEAR_API_KEY is not configured. Copy .env.example to .env and add a personal Linear API key.",
      { status: 503 },
    );
  }

  const response = await fetchImpl(apiUrl, {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new LinearApiError(`Linear returned HTTP ${response.status}`, {
      status: response.status === 401 ? 401 : 502,
    });
  }
  if (payload.errors?.length) {
    throw new LinearApiError(
      payload.errors.map((error) => error.message).join("; "),
    );
  }
  if (!payload.data) {
    throw new LinearApiError("Linear returned an empty response");
  }
  return payload.data;
}

export function normalizeIssues(issues) {
  const identifiers = new Set(issues.map((issue) => issue.identifier));
  const edges = [];
  const edgeKeys = new Set();

  const addEdge = (source, target, type) => {
    if (!identifiers.has(source) || !identifiers.has(target)) return;
    const key = `${source}\u0000${target}\u0000${type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, type });
  };

  for (const issue of issues) {
    if (issue.parent?.identifier) {
      addEdge(issue.parent.identifier, issue.identifier, "parent");
    }
    for (const relation of issue.relations?.nodes ?? []) {
      if (relation.type === "blocks" && relation.relatedIssue?.identifier) {
        addEdge(issue.identifier, relation.relatedIssue.identifier, "blocks");
      }
    }
  }

  const nodes = issues
    .map((issue) => ({
      id: issue.identifier,
      title: issue.title,
      status: issue.state?.name ?? "Unknown",
      statusType: issue.state?.type ?? "unknown",
      statusPosition: issue.state?.position ?? Number.MAX_SAFE_INTEGER,
      priority: priorityLabels.get(issue.priority) ?? "No priority",
      url: issue.url,
      updatedAt: issue.updatedAt,
    }))
    .sort((left, right) =>
      left.id.localeCompare(right.id, undefined, { numeric: true }),
    );

  return { nodes, edges };
}

export function normalizeWorkflowStates(teams) {
  const states = new Map();

  for (const team of teams) {
    for (const state of team.states?.nodes ?? []) {
      const type = state.type ?? "unknown";
      const name = state.name ?? "Unknown";
      const key = `${type}\u0000${name}`;
      const position = Number.isFinite(state.position)
        ? state.position
        : Number.MAX_SAFE_INTEGER;
      const existing = states.get(key);

      if (!existing || position < existing.position) {
        states.set(key, { name, type, position });
      }
    }
  }

  return [...states.values()].sort(
    (left, right) =>
      (statusTypeOrder.get(left.type) ?? 99) -
        (statusTypeOrder.get(right.type) ?? 99) ||
      left.position - right.position ||
      left.name.localeCompare(right.name),
  );
}

export function createLinearClient({
  apiKey,
  apiUrl,
  fetchImpl = fetch,
}) {
  const query = (document, variables) =>
    requestLinear({
      apiKey,
      apiUrl,
      query: document,
      variables,
      fetchImpl,
    });

  return {
    async listProjects() {
      const projects = [];
      let after = null;

      do {
        const data = await query(PROJECTS_QUERY, { after });
        projects.push(
          ...data.projects.nodes.map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slugId,
            url: project.url,
            teams: project.teams.nodes,
          })),
        );
        after = data.projects.pageInfo.hasNextPage
          ? data.projects.pageInfo.endCursor
          : null;
      } while (after);

      return projects.sort((left, right) =>
        left.name.localeCompare(right.name),
      );
    },

    async getProjectGraph(projectId) {
      if (!projectId) {
        throw new LinearApiError("A projectId query parameter is required", {
          status: 400,
        });
      }

      const workflowData = await query(PROJECT_WORKFLOW_QUERY, { projectId });
      const workflowStates = normalizeWorkflowStates(
        workflowData.project?.teams.nodes ?? [],
      );
      const issues = [];
      let after = null;

      do {
        const data = await query(ISSUES_QUERY, { projectId, after });
        issues.push(...data.issues.nodes);
        after = data.issues.pageInfo.hasNextPage
          ? data.issues.pageInfo.endCursor
          : null;
      } while (after);

      return {
        ...normalizeIssues(issues),
        workflowStates,
        fetchedAt: new Date().toISOString(),
      };
    },
  };
}
