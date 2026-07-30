export function graphLayout({
  viewportWidth,
  columnCount,
  minColumnWidth = 218,
  columnGap = 20,
  canvasPadding = 12,
}) {
  const gapWidth = Math.max(0, columnCount - 1) * columnGap;
  const availableWidth = Math.max(
    0,
    viewportWidth - canvasPadding * 2 - gapWidth,
  );
  const columnWidth = Math.max(
    minColumnWidth,
    columnCount ? availableWidth / columnCount : minColumnWidth,
  );
  const columnStride = columnWidth + columnGap;
  const width = Math.max(
    viewportWidth,
    canvasPadding * 2 + columnCount * columnWidth + gapWidth,
  );

  return {
    canvasPadding,
    columnGap,
    columnStride,
    columnWidth,
    nodeWidth: columnWidth - 20,
    width,
  };
}

export function edgePath(source, target) {
  const sourceCenter = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const targetCenter = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };

  if (source.column === target.column) {
    const movingDown = sourceCenter.y < targetCenter.y;
    const startY = movingDown ? source.y + source.height : source.y;
    const endY = movingDown ? target.y : target.y + target.height;
    return `M${sourceCenter.x},${startY} L${targetCenter.x},${endY}`;
  }

  const movingRight = source.column < target.column;
  const start = {
    x: movingRight ? source.x + source.width : source.x,
    y: sourceCenter.y,
  };
  const end = {
    x: movingRight ? target.x : target.x + target.width,
    y: targetCenter.y,
  };
  const midpoint = (start.x + end.x) / 2;
  return `M${start.x},${start.y} C${midpoint},${start.y} ${midpoint},${end.y} ${end.x},${end.y}`;
}
