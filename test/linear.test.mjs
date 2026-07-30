import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeIssues,
  normalizeWorkflowStates,
  requestLinear,
} from "../src/linear.mjs";

test("normalizeWorkflowStates merges team workflows and preserves position", () => {
  const states = normalizeWorkflowStates([
    {
      states: {
        nodes: [
          { name: "In Review", type: "started", position: 2 },
          { name: "Done", type: "completed", position: 4 },
        ],
      },
    },
    {
      states: {
        nodes: [
          { name: "In Progress", type: "started", position: 1 },
          { name: "In Review", type: "started", position: 3 },
        ],
      },
    },
  ]);

  assert.deepEqual(states, [
    { name: "In Progress", type: "started", position: 1 },
    { name: "In Review", type: "started", position: 2 },
    { name: "Done", type: "completed", position: 4 },
  ]);
});

test("normalizeIssues creates dependency and parent edges without duplicates", () => {
  const issues = [
    {
      identifier: "APP-1",
      title: "Define the contract",
      priority: 2,
      url: "https://linear.app/example/issue/APP-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      state: { name: "Done", type: "completed" },
      parent: null,
      relations: {
        nodes: [
          {
            type: "blocks",
            relatedIssue: { identifier: "APP-2" },
          },
          {
            type: "blocks",
            relatedIssue: { identifier: "APP-2" },
          },
        ],
      },
    },
    {
      identifier: "APP-2",
      title: "Build the feature",
      priority: 1,
      url: "https://linear.app/example/issue/APP-2",
      updatedAt: "2026-01-02T00:00:00.000Z",
      state: { name: "In Progress", type: "started" },
      parent: { identifier: "APP-1" },
      relations: { nodes: [] },
    },
  ];

  const graph = normalizeIssues(issues);
  assert.equal(graph.nodes.length, 2);
  assert.deepEqual(graph.edges, [
    { source: "APP-1", target: "APP-2", type: "blocks" },
    { source: "APP-1", target: "APP-2", type: "parent" },
  ]);
  assert.equal(graph.nodes[0].priority, "High");
  assert.equal(graph.nodes[1].priority, "Urgent");
});

test("normalizeIssues omits relationships outside the selected project", () => {
  const graph = normalizeIssues([
    {
      identifier: "APP-1",
      title: "Visible issue",
      priority: 0,
      url: "https://linear.app/example/issue/APP-1",
      state: { name: "Backlog", type: "backlog" },
      parent: { identifier: "OTHER-1" },
      relations: {
        nodes: [
          {
            type: "blocks",
            relatedIssue: { identifier: "OTHER-2" },
          },
        ],
      },
    },
  ]);

  assert.deepEqual(graph.edges, []);
});

test("requestLinear keeps the key in the authorization header", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ data: { viewer: { id: "viewer" } } }),
    };
  };

  const data = await requestLinear({
    apiKey: "secret-key",
    query: "query { viewer { id } }",
    variables: {},
    fetchImpl,
  });

  assert.equal(request.options.headers.authorization, "secret-key");
  assert.ok(!request.options.body.includes("secret-key"));
  assert.deepEqual(data, { viewer: { id: "viewer" } });
});
