function sortIdentifiers(values) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  );
}

const statusTypeOrder = new Map([
  ["triage", 0],
  ["backlog", 1],
  ["unstarted", 2],
  ["started", 3],
  ["completed", 4],
  ["canceled", 5],
]);

export function workflowLaneKey({ type, name }) {
  return `${type}\u0000${name}`;
}

export function workflowColumns(nodes, workflowStates = []) {
  const columns = new Map();

  const addColumn = ({ name, type, position }) => {
    const key = workflowLaneKey({ type, name });
    if (!columns.has(key)) {
      columns.set(key, {
        key,
        name,
        type,
        position: Number.isFinite(position)
          ? position
          : Number.MAX_SAFE_INTEGER,
        nodes: [],
      });
    }
    return columns.get(key);
  };

  for (const workflowState of workflowStates) {
    addColumn(workflowState);
  }

  for (const node of nodes) {
    addColumn({
      name: node.status,
      type: node.statusType,
      position: node.statusPosition,
    }).nodes.push(node);
  }

  return [...columns.values()].sort(
    (left, right) =>
      (statusTypeOrder.get(left.type) ?? 99) -
        (statusTypeOrder.get(right.type) ?? 99) ||
      left.position - right.position ||
      left.name.localeCompare(right.name),
  );
}

export function resolveLaneVisibility(columns, overrides = {}) {
  const visibleKeys = new Set();
  let hiddenIssueCount = 0;

  for (const column of columns) {
    const hasOverride = Object.prototype.hasOwnProperty.call(
      overrides,
      column.key,
    );
    const visible = hasOverride
      ? Boolean(overrides[column.key])
      : column.nodes.length > 0;

    if (visible) visibleKeys.add(column.key);
    else hiddenIssueCount += column.nodes.length;
  }

  return {
    visibleKeys,
    visibleCount: visibleKeys.size,
    hiddenIssueCount,
  };
}

export function relatedIssueIds(edges, issueId) {
  const blockedBy = [];
  const blocks = [];
  const parents = [];
  const children = [];

  for (const edge of edges) {
    if (edge.type === "blocks") {
      if (edge.target === issueId) blockedBy.push(edge.source);
      if (edge.source === issueId) blocks.push(edge.target);
    }
    if (edge.type === "parent") {
      if (edge.target === issueId) parents.push(edge.source);
      if (edge.source === issueId) children.push(edge.target);
    }
  }

  return {
    blockedBy: sortIdentifiers(blockedBy),
    blocks: sortIdentifiers(blocks),
    parents: sortIdentifiers(parents),
    children: sortIdentifiers(children),
  };
}
