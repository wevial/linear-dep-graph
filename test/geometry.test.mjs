import assert from "node:assert/strict";
import test from "node:test";
import { edgePath } from "../public/graph-geometry.js";

const upper = {
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  column: 0,
};
const lower = {
  x: 10,
  y: 200,
  width: 100,
  height: 50,
  column: 0,
};

test("same-column edges are straight and attach to vertical card centers", () => {
  assert.equal(edgePath(upper, lower), "M60,70 L60,200");
  assert.equal(edgePath(lower, upper), "M60,200 L60,70");
});

test("cross-column edges attach to the facing card sides", () => {
  const right = {
    x: 200,
    y: 100,
    width: 100,
    height: 50,
    column: 1,
  };

  assert.equal(edgePath(upper, right), "M110,45 C155,45 155,125 200,125");
  assert.equal(edgePath(right, upper), "M200,125 C155,125 155,45 110,45");
});
