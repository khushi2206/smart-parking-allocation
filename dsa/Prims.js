/**
 * Prim's Minimum Spanning Tree (MST) Algorithm
 * Implemented manually using custom MinPriorityQueue (Binary Min-Heap)
 * and Adjacency List for DAA multi-stop delivery route optimization.
 */

import { MinPriorityQueue } from './MinPriorityQueue.js';
import { dijkstraByObjective } from './Dijkstra.js';

export function primMST(graph, startNode, edgeWeightFn) {
  const inMST = new Set([startNode]);
  const mstEdges = [];
  const trace = [];
  const pq = new MinPriorityQueue((a, b) => a.weight < b.weight || (a.weight === b.weight && a.to < b.to));

  let stepCounter = 1;

  // Insert all initial cut edges crossing ({startNode}, V \ {startNode})
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
    currentTree: [...inMST],
    queueSize: pq.size(),
    explanation: `Prim's MST initialized at "${startNode}". Enqueued ${pq.size()} adjacent cut edges into Binary Min-Heap.`
  });

  const totalLocations = graph.locations().length;

  while (!pq.isEmpty() && inMST.size < totalLocations) {
    const minEdge = pq.extractMin();

    // If destination already in MST, skip to avoid cycles
    if (inMST.has(minEdge.to)) {
      trace.push({
        stepNumber: stepCounter++,
        type: 'skip_cycle',
        from: minEdge.from,
        to: minEdge.to,
        weight: minEdge.weight,
        explanation: `Edge (${minEdge.from} ➔ ${minEdge.to}) discarded because vertex "${minEdge.to}" is already in the tree (avoids cycle).`
      });
      continue;
    }

    // Add vertex to MST (Prim's cut property)
    inMST.add(minEdge.to);
    mstEdges.push(minEdge);

    trace.push({
      stepNumber: stepCounter++,
      type: 'add_mst_edge',
      from: minEdge.from,
      to: minEdge.to,
      weight: minEdge.weight,
      currentTree: [...inMST],
      explanation: `Prim's cut selection: Added minimum edge (${minEdge.from} ➔ ${minEdge.to}, weight: ${minEdge.weight}) to MST tree.`
    });

    // Enqueue newly exposed cut edges from minEdge.to
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

  const totalTreeWeight = mstEdges.reduce((sum, e) => sum + e.weight, 0);

  return {
    startNode,
    mstVertices: [...inMST],
    mstEdges,
    totalTreeWeight,
    trace,
    heapOperations: pq.operations
  };
}
