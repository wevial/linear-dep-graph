function sortIdentifiers(values) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  );
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
