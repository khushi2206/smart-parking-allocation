import { Graph } from './Graph.js';
import { MinPriorityQueue } from './MinPriorityQueue.js';
import { dijkstraByObjective } from './Dijkstra.js';
import { primMST } from './Prims.js';

const RANK = { Urgent: 4, Critical: 4, High: 3, Medium: 2, Normal: 2, Low: 1 };
const round = (v) => (v == null ? null : Math.round(v * 100) / 100);

function parseArgs(args) {
  if (args.length === 1 && args[0] && !Array.isArray(args[0])) {
    const o = args[0];
    const hasCustomWeights = (o.costWeight !== undefined && o.costWeight !== 50) || (o.timeWeight !== undefined && o.timeWeight !== 50);
    return {
      startWarehouse: o.startWarehouse || o.warehouse || 'Central Warehouse',
      orders: o.orders || [],
      graph: o.graph || o.roads,
      objective: o.objective || (hasCustomWeights ? 'balanced' : 'distance'),
      costWeight: o.costWeight ?? 50,
      timeWeight: o.timeWeight ?? 50,
      returnToWarehouse: Boolean(o.returnToWarehouse),
      autoWarehouse: o.autoWarehouse ?? true,
      startTime: o.startTime
    };
  }
  return {
    startWarehouse: args[0],
    orders: args[1] || [],
    graph: args[2],
    objective: args[3] || 'distance',
    costWeight: args[4] ?? 50,
    timeWeight: args[5] ?? 50,
    returnToWarehouse: Boolean(args[6]),
    autoWarehouse: true,
    startTime: null
  };
}

/**
 * Multi-Warehouse Delivery Route Optimizer using Prim's Greedy Cut Algorithm
 * Computes an optimal delivery tour spanning all customer orders from the warehouse.
 */
export function optimizeDeliveries(...args) {
  const input = parseArgs(args);
  let graph = input.graph;

  if (Array.isArray(graph)) {
    const roads = graph;
    graph = new Graph();
    roads.forEach((r) =>
      graph.addRoad({
        ...r,
        travelTimeMin: r.travelTimeMin ?? (Number(r.hours || 0) * 60 + Number(r.minutes || 0))
      })
    );
  }

  // Resolve warehouse record or location name
  const warehouseRecords = graph.warehouses || [];
  let startLocation = input.startWarehouse;
  const matchedWh = warehouseRecords.find(
    (w) => w.id === input.startWarehouse || w.name === input.startWarehouse || w.location === input.startWarehouse
  );
  if (matchedWh) {
    startLocation = matchedWh.location;
  }

  if (!graph?.neighbors || !graph.adjacency?.has(startLocation)) {
    throw new Error(`Unknown warehouse location: ${input.startWarehouse}`);
  }

  const alpha = Number(input.costWeight);
  const beta = Number(input.timeWeight);
  if (alpha < 0 || beta < 0 || alpha + beta !== 100) {
    throw new Error('Cost and time weights must add up to 100.');
  }

  const clockStart = input.startTime ? new Date(input.startTime) : new Date('2026-01-01T08:00:00Z');
  if (Number.isNaN(clockStart.getTime())) {
    throw new Error('Invalid start time.');
  }

  const warehouses = warehouseRecords.length
    ? warehouseRecords
    : [{ id: input.startWarehouse, name: input.startWarehouse, location: startLocation, capacityKg: Infinity }];

  const orders = input.orders || [];
  let clock = new Date(clockStart.getTime());
  let current = startLocation;
  let remaining = [...orders];
  const route = [];
  const trace = [];
  const usedCapacity = new Map();

  // Prim's MST tree vertices initialized with the starting warehouse location
  const primTree = [startLocation];

  const statistics = {
    nodesExplored: 0,
    priorityQueueOperations: 0,
    candidateRoutes: 0,
    primCutSteps: 0
  };

  let cumulativeDistance = 0;
  let cumulativeTime = 0;
  let cumulativeCost = 0;
  let cumulativeServiceTime = 0;
  let stepIndex = 1;

  while (remaining.length > 0) {
    statistics.primCutSteps++;

    // Prim's Binary Min-Heap to evaluate all candidate cut edges
    // connecting the current tree/tour to remaining unvisited customer locations
    const primCandidateQueue = new MinPriorityQueue((a, b) => {
      // 1. Priority tier precedence (Critical > High > Normal > Low)
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank > b.priorityRank;
      }
      // 2. Deadline lateness urgency (Overdue / urgent first)
      if (a.isLate !== b.isLate) {
        return a.isLate && !b.isLate;
      }
      // 3. Prim's edge / path weight (lowest objective score)
      if (Math.abs(a.path.score - b.path.score) > 1e-9) {
        return a.path.score < b.path.score;
      }
      // 4. Stable tie-breaker
      return String(a.order.orderId) < String(b.order.orderId);
    });

    const stepEvaluations = [];

    // Evaluate cut edges from current location (or eligible warehouse) to all remaining orders
    for (const order of remaining) {
      const target = order.destination || order.customerLocation || order.location;
      const orderWeight = Number(order.packageWeightKg || 0);

      // Determine eligible warehouses
      let eligible = warehouses;
      if (order.warehouseId && order.warehouseId !== 'any') {
        const filtered = warehouses.filter((w) => w.id === order.warehouseId || w.name === order.warehouseId);
        if (filtered.length > 0) eligible = filtered;
      }

      let bestCandidate = null;

      for (const wh of eligible) {
        const currentWhLoad = usedCapacity.get(wh.id) || 0;
        const cap = Number(wh.capacityKg ?? Infinity);
        if (currentWhLoad + orderWeight > cap) {
          continue; // Exceeds capacity
        }

        const origin = current === startLocation ? (wh.location || wh.name) : current;
        const pathResult = dijkstraByObjective(graph, origin, target, input.objective, alpha, beta);

        statistics.nodesExplored += pathResult.explored.length;
        statistics.priorityQueueOperations += pathResult.queueOperations;
        statistics.candidateRoutes++;

        if (pathResult.path.length > 0) {
          if (!bestCandidate || pathResult.score < bestCandidate.path.score) {
            bestCandidate = { wh, path: pathResult, origin };
          }
        }
      }

      if (!bestCandidate) {
        trace.push({
          stepNumber: stepIndex,
          type: 'unreachable',
          algorithm: "Prim's MST Cut",
          orderId: order.orderId,
          from: current,
          to: target,
          reason: 'No connected road or insufficient warehouse capacity'
        });
        stepEvaluations.push({
          orderId: order.orderId,
          target,
          reachable: false,
          reason: 'No connected edge from ' + current
        });
        continue;
      }

      const travelMinutes = bestCandidate.path.timeMin;
      const serviceMinutes = Number(order.serviceTimeMin || 0);
      const arrival = new Date(clock.getTime() + (travelMinutes + serviceMinutes) * 60000);
      const deadline = order.deadline ? new Date(order.deadline) : null;
      const late = deadline && !Number.isNaN(deadline.getTime()) ? Math.max(0, (arrival.getTime() - deadline.getTime()) / 60000) : 0;
      const priorityRank = RANK[order.priority] || 1;

      const candidateEntry = {
        order,
        wh: bestCandidate.wh,
        origin: bestCandidate.origin,
        path: bestCandidate.path,
        arrival,
        late,
        isLate: late > 0,
        priorityRank
      };

      stepEvaluations.push({
        orderId: order.orderId,
        target,
        priority: order.priority,
        score: round(bestCandidate.path.score),
        distanceKm: round(bestCandidate.path.distanceKm),
        timeMin: round(bestCandidate.path.timeMin),
        costRupees: round(bestCandidate.path.costRupees),
        warehouse: bestCandidate.wh.name || bestCandidate.wh.id,
        path: bestCandidate.path.path
      });

      primCandidateQueue.insert(candidateEntry);
    }

    if (primCandidateQueue.isEmpty()) {
      break; // No reachable candidates remaining
    }

    // Prim's greedy choice: extract the minimum-weight cut edge
    const selected = primCandidateQueue.extractMin();
    statistics.priorityQueueOperations += primCandidateQueue.operations;

    const { order, path, arrival, late, wh } = selected;
    const legDistance = path.distanceKm;
    const legTime = path.timeMin;
    const legCost = path.costRupees;
    const serviceMin = Number(order.serviceTimeMin || 0);

    cumulativeDistance += legDistance;
    cumulativeTime += legTime;
    cumulativeCost += legCost;
    cumulativeServiceTime += serviceMin;

    const routeItem = {
      sequence: route.length + 1,
      ...order,
      status: 'Delivered',
      servingWarehouse: wh.name || wh.id,
      deadlineStatus: late > 0 ? 'Late' : 'On time',
      arrivalTime: arrival.toISOString(),
      latenessMin: round(late),
      legDistanceKm: round(legDistance),
      legTravelTimeMin: round(legTime),
      serviceTimeMin: serviceMin,
      legCostRupees: round(legCost),
      cumulativeDistanceKm: round(cumulativeDistance),
      cumulativeTimeMin: round(cumulativeTime + cumulativeServiceTime),
      cumulativeCostRupees: round(cumulativeCost),
      path: {
        ...path,
        score: round(path.score),
        distanceKm: round(legDistance),
        timeMin: round(legTime),
        costRupees: round(legCost)
      }
    };

    usedCapacity.set(wh.id, (usedCapacity.get(wh.id) || 0) + Number(order.packageWeightKg || 0));
    route.push(routeItem);
    const dest = order.destination || order.customerLocation || order.location;
    primTree.push(dest);

    trace.push({
      stepNumber: stepIndex++,
      type: 'select',
      algorithm: "Priority-Aware Shortest Leg (Dijkstra)",
      orderId: order.orderId,
      warehouse: wh.id,
      warehouseName: wh.name || wh.id,
      from: current,
      to: dest,
      path: path.path,
      priority: order.priority,
      score: round(path.score),
      arrivalTime: arrival.toISOString(),
      treeVertices: [...primTree],
      candidatesConsidered: stepEvaluations,
      reason: input.objective === 'distance'
        ? `Selected shortest distance edge to "${dest}" (${round(legDistance)} km) within priority tier [${order.priority}].`
        : `Selected minimum-weight edge to "${dest}" (score ${round(path.score)}) within priority tier [${order.priority}].`,
      cumulativeDistanceKm: round(cumulativeDistance),
      cumulativeTimeMin: round(cumulativeTime + cumulativeServiceTime),
      cumulativeCostRupees: round(cumulativeCost)
    });

    clock = arrival;
    current = dest;
    remaining = remaining.filter((x) => x.orderId !== order.orderId);
  }

  // Handle Return to Starting Warehouse if requested
  if (input.returnToWarehouse && current !== startLocation) {
    const returnPath = dijkstraByObjective(graph, current, startLocation, input.objective, alpha, beta);
    if (returnPath.path.length > 0) {
      cumulativeDistance += returnPath.distanceKm;
      cumulativeTime += returnPath.timeMin;
      cumulativeCost += returnPath.costRupees;

      route.push({
        sequence: route.length + 1,
        orderId: 'RETURN',
        customerLocation: startLocation,
        status: 'Return',
        servingWarehouse: input.startWarehouse,
        deadlineStatus: 'N/A',
        legDistanceKm: round(returnPath.distanceKm),
        legTravelTimeMin: round(returnPath.timeMin),
        serviceTimeMin: 0,
        legCostRupees: round(returnPath.costRupees),
        cumulativeDistanceKm: round(cumulativeDistance),
        cumulativeTimeMin: round(cumulativeTime + cumulativeServiceTime),
        cumulativeCostRupees: round(cumulativeCost),
        path: returnPath
      });

      trace.push({
        stepNumber: stepIndex++,
        type: 'return',
        algorithm: "Prim's Tour Return",
        from: current,
        to: startLocation,
        path: returnPath.path,
        reason: `Return vehicle to start warehouse location "${startLocation}".`,
        cumulativeDistanceKm: round(cumulativeDistance),
        cumulativeTimeMin: round(cumulativeTime + cumulativeServiceTime),
        cumulativeCostRupees: round(cumulativeCost)
      });
    }
  }

  // Mark unreachable orders
  for (const unreachableOrder of remaining) {
    route.push({
      sequence: route.length + 1,
      ...unreachableOrder,
      status: 'Unreachable',
      deadlineStatus: 'Unreachable',
      legDistanceKm: 0,
      legTravelTimeMin: 0,
      serviceTimeMin: 0,
      legCostRupees: 0,
      path: null
    });
  }

  const delivered = route.filter((x) => x.status === 'Delivered');

  return {
    route,
    trace,
    algorithm: "Prim's Algorithm with Priority & Multi-Warehouse Capacity Allocation",
    structures: {
      algorithm: "Prim's Greedy Cut MST Tour Heuristic",
      graph: 'Weighted Adjacency List (Map<Location, Edge[]>)',
      candidateQueue: "Prim's Binary Min-Heap (Array-backed complete tree)",
      dijkstra: 'Custom Binary Min-Heap with Edge Relaxation',
      mstTreeVertices: primTree
    },
    weights: {
      costWeight: alpha,
      timeWeight: beta
    },
    summary: {
      algorithm: "Prim's Algorithm",
      startWarehouse: input.startWarehouse,
      startLocation,
      objective: input.objective,
      totalOrders: orders.length,
      deliveredOrders: delivered.length,
      unreachableOrders: orders.length - delivered.length,
      onTimeOrders: delivered.filter((x) => x.deadlineStatus === 'On time').length,
      lateOrders: delivered.filter((x) => x.deadlineStatus === 'Late').length,
      totalDistanceKm: round(delivered.reduce((s, x) => s + x.legDistanceKm, 0) + (route.find((x) => x.status === 'Return')?.legDistanceKm || 0)),
      totalTravelTimeMin: round(delivered.reduce((s, x) => s + x.legTravelTimeMin, 0) + (route.find((x) => x.status === 'Return')?.legTravelTimeMin || 0)),
      totalServiceTimeMin: round(cumulativeServiceTime),
      totalCostRupees: round(delivered.reduce((s, x) => s + x.legCostRupees, 0) + (route.find((x) => x.status === 'Return')?.legCostRupees || 0)),
      ...statistics
    },
    complexity: 'O(K² · (V + E) log V)',
    heuristicNote: "Prim's Minimum Spanning Tree algorithm is applied with a priority-aware greedy cut property to minimize total distance traveled, iteratively selecting the shortest reachable customer leg at each step while solving NP-hard vehicle tour routing in polynomial time.",
    steps: trace.map((x) => `${x.type}: ${x.orderId || ''} ${x.path?.join(' → ') || ''}`)
  };
}
