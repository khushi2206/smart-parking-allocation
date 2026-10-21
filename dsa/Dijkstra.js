import { MinPriorityQueue } from './MinPriorityQueue.js';

export function dijkstra(graph, start, destination, edgeScore) {
  const distances = new Map(graph.locations().map((x) => [x, Infinity]));
  const previous = new Map();
  const explored = [];
  const trace = [];
  const queue = new MinPriorityQueue((a, b) => a.distance < b.distance || (a.distance === b.distance && a.location < b.location));

  distances.set(start, 0);
  queue.insert({ location: start, distance: 0 });

  let stepCounter = 1;
  const snapQueue = () => queue.heap.map((item) => ({ location: item.location, distance: item.distance }));
  const snapDistances = () => Object.fromEntries(distances);
  const snapPredecessors = () => Object.fromEntries([...previous.entries()].map(([k, v]) => [k, v.location]));

  trace.push({
    stepNumber: stepCounter++,
    type: 'enqueue',
    location: start,
    distance: 0,
    queueSize: queue.size(),
    queue: snapQueue(),
    distances: snapDistances(),
    previous: snapPredecessors(),
    visited: [...explored],
    explanation: `Initialized start node "${start}" with distance 0 and enqueued into priority queue.`
  });

  while (!queue.isEmpty()) {
    const current = queue.extractMin();
    trace.push({
      stepNumber: stepCounter++,
      type: 'dequeue',
      ...current,
      queueSize: queue.size(),
      queue: snapQueue(),
      distances: snapDistances(),
      previous: snapPredecessors(),
      visited: [...explored],
      explanation: `Extracted minimum node "${current.location}" with distance ${current.distance} from priority queue.`
    });

    if (current.distance !== distances.get(current.location)) {
      trace.push({
        stepNumber: stepCounter++,
        type: 'skip',
        location: current.location,
        reason: 'stale queue entry',
        queueSize: queue.size(),
        queue: snapQueue(),
        distances: snapDistances(),
        previous: snapPredecessors(),
        visited: [...explored],
        explanation: `Skipped stale entry for "${current.location}" (recorded ${current.distance} vs best ${distances.get(current.location)}).`
      });
      continue;
    }

    explored.push(current.location);
    trace.push({
      stepNumber: stepCounter++,
      type: 'visit',
      ...current,
      queueSize: queue.size(),
      queue: snapQueue(),
      distances: snapDistances(),
      previous: snapPredecessors(),
      visited: [...explored],
      explanation: `Marked "${current.location}" as visited (shortest distance ${current.distance} finalized).`
    });

    if (current.location === destination) {
      trace.push({
        stepNumber: stepCounter++,
        type: 'destination_reached',
        location: destination,
        distance: current.distance,
        queueSize: queue.size(),
        queue: snapQueue(),
        distances: snapDistances(),
        previous: snapPredecessors(),
        visited: [...explored],
        explanation: `Target destination "${destination}" reached with optimal score ${current.distance}. Halting search.`
      });
      break;
    }

    for (const road of graph.neighbors(current.location)) {
      const weight = edgeScore(road);
      const distance = current.distance + weight;
      const old = distances.get(road.destination) ?? Infinity;

      if (distance < old) {
        distances.set(road.destination, distance);
        previous.set(road.destination, { location: current.location, road });
        queue.insert({ location: road.destination, distance });
        trace.push({
          stepNumber: stepCounter++,
          type: 'update',
          from: current.location,
          location: road.destination,
          distance,
          weight,
          previousDistance: Number.isFinite(old) ? old : null,
          queueSize: queue.size(),
          queue: snapQueue(),
          distances: snapDistances(),
          previous: snapPredecessors(),
          visited: [...explored],
          explanation: `Relaxed edge (${current.location} → ${road.destination}): Improved distance from ${Number.isFinite(old) ? old : '∞'} to ${distance}.`
        });
      } else {
        trace.push({
          stepNumber: stepCounter++,
          type: 'check',
          from: current.location,
          location: road.destination,
          distance,
          weight,
          kept: old,
          queueSize: queue.size(),
          queue: snapQueue(),
          distances: snapDistances(),
          previous: snapPredecessors(),
          visited: [...explored],
          explanation: `Checked edge (${current.location} → ${road.destination}): Proposed ${distance} is not better than current ${old}. Keeping ${old}.`
        });
      }
    }
  }

  const predecessorsObj = snapPredecessors();
  const distancesObj = snapDistances();

  if (distances.get(destination) === Infinity || !distances.has(destination)) {
    return {
      path: [],
      score: null,
      distanceKm: 0,
      timeMin: 0,
      costRupees: 0,
      explored,
      queueOperations: queue.operations,
      trace,
      distances: distancesObj,
      predecessors: predecessorsObj
    };
  }

  const path = [destination];
  const roads = [];
  let curr = destination;

  while (curr !== start) {
    const step = previous.get(curr);
    if (!step) {
      return {
        path: [],
        score: null,
        distanceKm: 0,
        timeMin: 0,
        costRupees: 0,
        explored,
        queueOperations: queue.operations,
        trace,
        distances: distancesObj,
        predecessors: predecessorsObj
      };
    }
    roads.unshift(step.road);
    path.unshift(step.location);
    curr = step.location;
  }

  return {
    path,
    score: distances.get(destination),
    distanceKm: roads.reduce((s, r) => s + r.distanceKm, 0),
    timeMin: roads.reduce((s, r) => s + r.travelTimeMin, 0),
    costRupees: roads.reduce((s, r) => s + r.costRupees, 0),
    explored,
    queueOperations: queue.operations,
    trace,
    distances: distancesObj,
    predecessors: predecessorsObj
  };
}

export function objectiveScore(road, objective = 'balanced', costWeight = 50, timeWeight = 50) {
  if (objective === 'distance') return road.distanceKm;
  if (objective === 'time') return road.travelTimeMin;
  if (objective === 'cost') return road.costRupees;
  const alpha = Number(costWeight), beta = Number(timeWeight);
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0 || alpha + beta !== 100) {
    throw new Error('Cost and time weights must add up to 100.');
  }
  return (road.costRupees * alpha + road.travelTimeMin * beta) / 100;
}

export function dijkstraByObjective(graph, start, destination, objective = 'balanced', costWeight = 50, timeWeight = 50) {
  const allRoads = graph.locations().flatMap((location) => graph.neighbors(location));
  const costValues = allRoads.map((road) => road.costRupees);
  const timeValues = allRoads.map((road) => road.travelTimeMin);
  const costBounds = costValues.length ? [Math.min(...costValues), Math.max(...costValues)] : [0, 0];
  const timeBounds = timeValues.length ? [Math.min(...timeValues), Math.max(...timeValues)] : [0, 0];
  const normalize = (value, [min, max]) => max === min ? 0 : (value - min) / (max - min);

  const score = objective === 'balanced'
    ? (road) => (Number(costWeight) / 100) * normalize(road.costRupees, costBounds)
      + (Number(timeWeight) / 100) * normalize(road.travelTimeMin, timeBounds)
    : (road) => objectiveScore(road, objective, costWeight, timeWeight);

  const result = dijkstra(graph, start, destination, score);
  return {
    ...result,
    objective,
    normalization: { costBounds, timeBounds },
    detailedState: {
      start,
      destination,
      objective,
      costWeight,
      timeWeight,
      explored: result.explored,
      queueOperations: result.queueOperations,
      trace: result.trace
    }
  };
}
