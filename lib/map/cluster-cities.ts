import type { City } from './cities';

export type ProjectedCity = {
  city: City;
  x: number;
  y: number;
};

/**
 * Groups projected cities by screen proximity. Two cities belong to the same
 * group when their screen distance is within `threshold`; grouping is
 * transitive (A~B and B~C puts all three together).
 */
export function clusterCities(points: ProjectedCity[], threshold: number): ProjectedCity[][] {
  const clusters: ProjectedCity[][] = [];
  const visited = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;

    const cluster: ProjectedCity[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.shift() as number;
      cluster.push(points[idx]);

      for (let j = 0; j < points.length; j++) {
        if (visited.has(j)) continue;
        const dx = points[idx].x - points[j].x;
        const dy = points[idx].y - points[j].y;
        if (Math.hypot(dx, dy) <= threshold) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}
