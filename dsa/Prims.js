/**
 * Prim's Minimum Spanning Tree (MST) Algorithm
 * Implemented manually from scratch using a custom MinPriorityQueue (Binary Min-Heap)
 * and Adjacency List for road networks.
 */

import { MinPriorityQueue } from './MinPriorityQueue.js';

export function primMST(graph, startNode, edgeWeightFn = (r) => r.distanceKm) {
  const allLocations = graph.locations();
  const totalLocations = allLocations.length;

  if (!allLocations.includes(startNode)) {
    startNode = allLocations[0] || '';
  }

  const inMST = new Set();
  const mstEdges = [];
  const trace = [];
  const pq = new MinPriorityQueue((a, b) => a.weight < b.weight || (a.weight === b.weight && (a.from + a.to < b.from + b.to)));

  let runningWeight = 0;
  let stepCounter = 1;

  if (startNode) {
    inMST.add(startNode);

    // Initial cut edges crossing ({startNode}, V \ {startNode})
    for (const road of graph.neighbors(startNode)) {
      const weight = edgeWeightFn(road);
      pq.insert({
        from: startNode,
        to: road.destination,
        weight,
        road
      });
    }

    trace.push({
      stepNumber: stepCounter++,
      type: 'init',
      currentNode: startNode,
      currentTree: [...inMST],
      selectedEdges: [],
      runningWeight: 0,
      queueSize: pq.size(),
      explanation: `Started Prim's algorithm at root node "${startNode}". Enqueued ${pq.size()} crossing edges.`
    });
  }

  while (!pq.isEmpty() && inMST.size < totalLocations) {
    const minEdge = pq.extractMin();

    // If destination is already in the MST tree, skip to prevent cycles
    if (inMST.has(minEdge.to)) {
      trace.push({
        stepNumber: stepCounter++,
        type: 'skip_cycle',
        from: minEdge.from,
        to: minEdge.to,
        weight: minEdge.weight,
        currentTree: [...inMST],
        selectedEdges: mstEdges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
        runningWeight,
        explanation: `Edge (${minEdge.from} ➔ ${minEdge.to}, weight ${minEdge.weight}) excluded because "${minEdge.to}" is already in the tree (would form a cycle).`
      });
      continue;
    }

    // Add new vertex to MST tree (Prim's cut property)
    inMST.add(minEdge.to);
    mstEdges.push({
      from: minEdge.from,
      to: minEdge.to,
      weight: minEdge.weight,
      road: minEdge.road
    });
    runningWeight += minEdge.weight;

    trace.push({
      stepNumber: stepCounter++,
      type: 'add_mst_edge',
      from: minEdge.from,
      to: minEdge.to,
      weight: minEdge.weight,
      currentTree: [...inMST],
      selectedEdges: mstEdges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
      runningWeight,
      explanation: `Selected minimum crossing edge (${minEdge.from} ➔ ${minEdge.to}, weight: ${minEdge.weight}). Added "${minEdge.to}" to tree. Running MST Total: ${runningWeight} km.`
    });

    // Enqueue edges crossing from the newly added vertex to unvisited nodes
    for (const nextRoad of graph.neighbors(minEdge.to)) {
      if (!inMST.has(nextRoad.destination)) {
        const weight = edgeWeightFn(nextRoad);
        pq.insert({
          from: minEdge.to,
          to: nextRoad.destination,
          weight,
          road: nextRoad
        });
      }
    }
  }

  // Gather all unique undirected edges in graph to compute excluded edges
  const allUniqueEdges = [];
  const edgeKeySet = new Set();

  for (const u of allLocations) {
    for (const road of graph.neighbors(u)) {
      const v = road.destination;
      const key = u < v ? `${u}---${v}` : `${v}---${u}`;
      if (!edgeKeySet.has(key)) {
        edgeKeySet.add(key);
        allUniqueEdges.push({
          from: u < v ? u : v,
          to: u < v ? v : u,
          weight: edgeWeightFn(road),
          road
        });
      }
    }
  }

  const mstEdgeKeySet = new Set(
    mstEdges.map((e) => (e.from < e.to ? `${e.from}---${e.to}` : `${e.to}---${e.from}`))
  );

  const excludedEdges = allUniqueEdges.filter((e) => !mstEdgeKeySet.has(`${e.from}---${e.to}`));

  const isConnected = inMST.size === totalLocations;
  const unreachedVertices = allLocations.filter((l) => !inMST.has(l));

  return {
    startNode,
    totalLocations,
    isConnected,
    mstVertices: [...inMST],
    unreachedVertices,
    mstEdges: mstEdges.map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      distanceKm: e.road?.distanceKm ?? e.weight,
      travelTimeMin: e.road?.travelTimeMin ?? (e.weight * 1.5),
      costRupees: e.road?.costRupees ?? e.weight,
      road: e.road
    })),
    excludedEdges: excludedEdges.map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      distanceKm: e.road?.distanceKm ?? e.weight,
      travelTimeMin: e.road?.travelTimeMin ?? (e.weight * 1.5),
      costRupees: e.road?.costRupees ?? e.weight,
      road: e.road
    })),
    selectedEdgesCount: mstEdges.length,
    excludedEdgesCount: excludedEdges.length,
    totalTreeWeight: runningWeight,
    trace,
    heapOperations: pq.operations
  };
}
