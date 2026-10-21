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
        ...road, start: road.destination, destination: road.start
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
