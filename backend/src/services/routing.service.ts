import { Edge, Stadium } from '../providers/stadium-data.provider';

export function findPath(
  stadium: Stadium,
  start: string,
  goal: string,
  stepFreeOnly: boolean = false
): Edge[] | null {
  if (start === goal) {
    return [];
  }
  if (!stadium.zones[start] || !stadium.zones[goal]) {
    return null;
  }

  const frontier = [{ cost: 0, node: start }];
  const bestCost: Record<string, number> = { [start]: 0 };
  const cameFrom: Record<string, { prev: string; edge: Edge }> = {};

  while (frontier.length > 0) {
    // Sort to simulate priority queue (min-heap)
    frontier.sort((a, b) => a.cost - b.cost);
    const { cost, node } = frontier.shift()!;

    if (node === goal) {
      return _reconstruct(cameFrom, goal);
    }

    if (cost > (bestCost[node] ?? Infinity)) {
      continue;
    }

    for (const edge of stadium.neighbors(node)) {
      if (stepFreeOnly && !edge.step_free) {
        continue;
      }

      const newCost = cost + edge.distance;
      if (newCost < (bestCost[edge.to] ?? Infinity)) {
        bestCost[edge.to] = newCost;
        cameFrom[edge.to] = { prev: node, edge };
        frontier.push({ cost: newCost, node: edge.to });
      }
    }
  }

  return null;
}

function _reconstruct(
  cameFrom: Record<string, { prev: string; edge: Edge }>,
  goal: string
): Edge[] {
  const path: Edge[] = [];
  let node = goal;
  while (cameFrom[node]) {
    const { prev, edge } = cameFrom[node];
    path.push(edge);
    node = prev;
  }
  path.reverse();
  return path;
}

export function pathDistance(path: Edge[]): number {
  return path.reduce((sum, edge) => sum + edge.distance, 0);
}
