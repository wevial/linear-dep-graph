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
