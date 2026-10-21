export class Graph {
  constructor() {
    this.adjacency = new Map();
  }

  addLocation(name) {
    if (!this.adjacency.has(name)) this.adjacency.set(name, []);
  }

  addRoad(road) {
    this.addLocation(road.start);
    this.addLocation(road.destination);
    this.adjacency.get(road.start).push(road);
    if (road.bidirectional !== false && road.oneWay !== true) {
      this.adjacency.get(road.destination).push({
        ...road,
        start: road.destination,
        destination: road.start
      });
    }
  }

  neighbors(location) {
    return this.adjacency.get(location) || [];
  }

  locations() {
    return [...this.adjacency.keys()];
  }

  roads() {
    const result = [];
    for (const [location, edges] of this.adjacency) {
      for (const edge of edges) {
        if (location < edge.destination) result.push(edge);
      }
    }
    return result;
  }
}

/**
 * Builds a graph containing exclusively the edges selected by Prim's MST.
 */
export function buildMstGraph(locations, mstEdges) {
  const g = new Graph();
  locations.forEach((loc) => {
    const id = typeof loc === 'string' ? loc : (loc.id || loc.name);
    g.addLocation(id);
  });

  mstEdges.forEach((edge) => {
    const start = edge.from || edge.start;
    const destination = edge.to || edge.destination;
    const r = edge.road || edge;
    const dist = Number(r.distanceKm ?? edge.weight ?? 0);
    g.addRoad({
      start,
      destination,
      distanceKm: dist,
      travelTimeMin: Number(r.travelTimeMin ?? dist * 1.5),
      costRupees: Number(r.costRupees ?? dist * 10),
      bidirectional: true
    });
  });

  return g;
}
