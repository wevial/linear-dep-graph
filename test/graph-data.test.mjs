import assert from "node:assert/strict";
import test from "node:test";
import {
  relatedIssueIds,
  workflowColumns,
} from "../public/graph-data.js";

test("workflowColumns retains empty configured statuses in workflow order", () => {
  const inReview = {
    name: "In Review",
    type: "started",
    position: 2,
  };
  const columns = workflowColumns(
    [
      {
        id: "APP-1",
        status: "In Progress",
        statusType: "started",
        statusPosition: 1,
      },
    ],
    [
      { name: "Done", type: "completed", position: 3 },
      inReview,
      { name: "In Progress", type: "started", position: 1 },
    ],
  );

  assert.deepEqual(
    columns.map(({ name, nodes }) => [name, nodes.map((node) => node.id)]),
    [
      ["In Progress", ["APP-1"]],
      ["In Review", []],
      ["Done", []],
    ],
  );
});

test("relatedIssueIds includes blocking and hierarchy neighborhoods", () => {
  const edges = [
    { source: "APP-1", target: "APP-3", type: "blocks" },
    { source: "APP-3", target: "APP-5", type: "blocks" },
    { source: "APP-2", target: "APP-3", type: "parent" },
    { source: "APP-3", target: "APP-10", type: "parent" },
    { source: "APP-3", target: "APP-4", type: "parent" },
  ];

  assert.deepEqual(relatedIssueIds(edges, "APP-3"), {
    blockedBy: ["APP-1"],
    blocks: ["APP-5"],
    parents: ["APP-2"],
    children: ["APP-4", "APP-10"],
  });
});
