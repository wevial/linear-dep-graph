import assert from "node:assert/strict";
import test from "node:test";
import { relatedIssueIds } from "../public/graph-data.js";

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
