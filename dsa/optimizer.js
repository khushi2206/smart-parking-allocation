import { Graph, buildMstGraph } from './Graph.js';
import { MinPriorityQueue } from './MinPriorityQueue.js';
import { dijkstra, dijkstraByObjective, objectiveScore } from './Dijkstra.js';
import { primMST } from './Prims.js';

const RANK = { Urgent: 4, Critical: 4, High: 3, Medium: 2, Normal: 2, Low: 1 };
const round = (v) => (v == null ? null : Math.round(v * 100) / 100);

function parseArgs(args) {
  if (args.length === 1 && args[0] && !Array.isArray(args[0])) {
    const o = args[0];
    const hasCustomWeights = (o.costWeight !== undefined && o.costWeight !== 50) || (o.timeWeight !== undefined && o.timeWeight !== 50);
    const hasCritical = Array.isArray(o.orders) && o.orders.some((x) => x.priority === 'Critical');
    return {
      startWarehouse: o.startWarehouse || o.warehouse || 'Central Warehouse',
      orders: o.orders || [],
      graph: o.graph || o.roads,
      objective: o.objective || (hasCustomWeights ? 'balanced' : 'distance'),
      costWeight: o.costWeight ?? 50,
      timeWeight: o.timeWeight ?? 50,
      returnToWarehouse: o.returnToWarehouse !== false,
      orderingMode: o.orderingMode || (hasCritical ? 'priority' : 'addition'),
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
    returnToWarehouse: args[6] !== false,
    orderingMode: 'addition',
    autoWarehouse: true,
    startTime: null
  };
}

/**
 * Integrated Delivery Route Optimizer combining Prim's MST and Dijkstra's Shortest Paths.
 *
 * Stage 1: Prim's algorithm selects the Minimum Spanning Tree of the road network.
 * Stage 2: Dijkstra's algorithm calculates shortest paths on the MST network to destinations.
 * Stage 3: Plans sequential delivery tour visiting pending orders and optional return to hub.
 * Stage 4: Compares Original Network vs. MST Network infrastructure and delivery distances.
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

  // Resolve warehouse location ID
  const warehouseRecords = graph.warehouses || [];
  let startLocation = input.startWarehouse;
  const matchedWh = warehouseRecords.find(
    (w) => w.id === input.startWarehouse || w.name === input.startWarehouse || w.location === input.startWarehouse
  );
  if (matchedWh) {
    startLocation = matchedWh.location || matchedWh.id;
  }

  const allLocations = graph.locations();
  if (allLocations.length === 0) {
    throw new Error('Graph has no locations.');
  }
  if (!allLocations.includes(startLocation)) {
    startLocation = allLocations.includes('W') ? 'W' : allLocations[0];
  }

  const alpha = Number(input.costWeight);
  const beta = Number(input.timeWeight);
  if (alpha < 0 || beta < 0 || alpha + beta !== 100) {
    throw new Error('Cost and time weights must add up to 100.');
  }

  const orders = input.orders || [];
  const pendingOrders = orders.filter((o) => o.status !== 'Delivered');

  // -------------------------------------------------------------------------
  // STAGE 1: Prim's Algorithm - Generate Minimum Spanning Tree
  // -------------------------------------------------------------------------
  const weightFn = (road) => objectiveScore(road, input.objective, alpha, beta);
  const primResult = primMST(graph, startLocation, weightFn);

  // Build the MST Sub-graph G_mst containing ONLY Prim's selected edges
  const mstGraph = buildMstGraph(allLocations, primResult.mstEdges);

  // -------------------------------------------------------------------------
  // STAGE 2: Dijkstra Shortest Paths from Warehouse to Each Pending Destination
  // -------------------------------------------------------------------------
  const warehousePaths = pendingOrders.map((order) => {
    const dest = order.destination || order.customerLocation || order.location;
    const mstDijkstra = dijkstra(mstGraph, startLocation, dest, weightFn);
    const origDijkstra = dijkstra(graph, startLocation, dest, weightFn);

    return {
      orderId: order.orderId,
      customer: order.customer || '',
      destination: dest,
      priority: order.priority || 'Medium',
      mstPath: mstDijkstra.path,
      mstDistanceKm: mstDijkstra.path.length > 0 ? round(mstDijkstra.distanceKm) : null,
      mstTimeMin: mstDijkstra.path.length > 0 ? round(mstDijkstra.timeMin) : null,
      originalPath: origDijkstra.path,
      originalDistanceKm: origDijkstra.path.length > 0 ? round(origDijkstra.distanceKm) : null,
      originalTimeMin: origDijkstra.path.length > 0 ? round(origDijkstra.timeMin) : null,
      reachableOnMst: mstDijkstra.path.length > 0,
      reachableOnOriginal: origDijkstra.path.length > 0
    };
  });

  // -------------------------------------------------------------------------
  // STAGE 3: Sequential Delivery Tour Planning
  // -------------------------------------------------------------------------
  // Sort pending orders according to user ordering mode:
  // - 'addition': in the exact order they were added
  // - 'priority': Urgent > High > Medium > Low
  let sequenceOrders = [...pendingOrders];
  if (input.orderingMode === 'priority') {
    sequenceOrders.sort((a, b) => {
      const rankA = RANK[a.priority] || 1;
      const rankB = RANK[b.priority] || 1;
      if (rankA !== rankB) return rankB - rankA;
      return String(a.orderId).localeCompare(String(b.orderId));
    });
  }

  // Helper to plan sequential route on a given graph
  function planSequentialTour(targetGraph, isMstPlan = false) {
    let current = startLocation;
    let cumDist = 0;
    let cumTime = 0;
    const route = [];
    const unreachable = [];
    let remaining = [...pendingOrders];

    while (remaining.length > 0) {
      let chosenOrder = null;
      let bestDResult = null;

      if (input.orderingMode === 'priority') {
        const maxRank = Math.max(...remaining.map((o) => RANK[o.priority] || 1));
        const highestTier = remaining.filter((o) => (RANK[o.priority] || 1) === maxRank);

        for (const order of highestTier) {
          const dest = order.destination || order.customerLocation || order.location;
          const dResult = dijkstra(targetGraph, current, dest, weightFn);
          if (
            !bestDResult ||
            (dResult.distanceKm < bestDResult.distanceKm) ||
            (dResult.distanceKm === bestDResult.distanceKm && String(order.orderId) < String(chosenOrder.orderId))
          ) {
            bestDResult = dResult;
            chosenOrder = order;
          }
        }
      } else {
        // Addition order (FIFO / creation order)
        chosenOrder = remaining[0];
        const dest = chosenOrder.destination || chosenOrder.customerLocation || chosenOrder.location;
        bestDResult = dijkstra(targetGraph, current, dest, weightFn);
      }

      const order = chosenOrder;
      const dResult = bestDResult;
      const dest = order.destination || order.customerLocation || order.location;

      remaining = remaining.filter((o) => o.orderId !== order.orderId);

      if (!dResult || !dResult.path || dResult.path.length === 0) {
        unreachable.push(order);
        route.push({
          sequence: route.length + 1,
          orderId: order.orderId,
          customer: order.customer || '',
          destination: dest,
          priority: order.priority,
          status: 'Unreachable',
          deadlineStatus: 'Unreachable',
          legDistanceKm: 0,
          legTravelTimeMin: 0,
          cumulativeDistanceKm: round(cumDist),
          cumulativeTimeMin: round(cumTime),
          path: { path: [] }
        });
        continue;
      }

      cumDist += dResult.distanceKm;
      cumTime += dResult.timeMin;

      route.push({
        sequence: route.length + 1,
        orderId: order.orderId,
        customer: order.customer || '',
        destination: dest,
        priority: order.priority,
        status: 'Delivered',
        deadlineStatus: 'On time',
        legDistanceKm: round(dResult.distanceKm),
        legTravelTimeMin: round(dResult.timeMin),
        cumulativeDistanceKm: round(cumDist),
        cumulativeTimeMin: round(cumTime),
        path: {
          path: dResult.path,
          distanceKm: round(dResult.distanceKm),
          timeMin: round(dResult.timeMin)
        }
      });

      current = dest;
    }

    // Return leg to starting warehouse if requested
    if (input.returnToWarehouse && current !== startLocation) {
      const returnResult = dijkstra(targetGraph, current, startLocation, weightFn);
      if (returnResult.path && returnResult.path.length > 0) {
        cumDist += returnResult.distanceKm;
        cumTime += returnResult.timeMin;

        route.push({
          sequence: route.length + 1,
          orderId: 'RETURN',
          customer: 'Return to Starting Warehouse',
          destination: startLocation,
          priority: '-',
          status: 'Return',
          legDistanceKm: round(returnResult.distanceKm),
          legTravelTimeMin: round(returnResult.timeMin),
          cumulativeDistanceKm: round(cumDist),
          cumulativeTimeMin: round(cumTime),
          path: {
            path: returnResult.path,
            distanceKm: round(returnResult.distanceKm),
            timeMin: round(returnResult.timeMin)
          }
        });
      }
    }

    return {
      route,
      unreachable,
      totalDistanceKm: round(cumDist),
      totalTravelTimeMin: round(cumTime)
    };
  }

  // Plan on MST Network
  const mstTour = planSequentialTour(mstGraph, true);
  // Plan on Original Road Network
  const originalTour = planSequentialTour(graph, false);

  // -------------------------------------------------------------------------
  // STAGE 4: Network Comparison Metrics
  // -------------------------------------------------------------------------
  // Calculate total road infrastructure distance in both networks
  let originalRoadTotal = 0;
  const uniqueEdges = new Set();
  for (const loc of allLocations) {
    for (const r of graph.neighbors(loc)) {
      const key = loc < r.destination ? `${loc}---${r.destination}` : `${r.destination}---${loc}`;
      if (!uniqueEdges.has(key)) {
        uniqueEdges.add(key);
        originalRoadTotal += Number(r.distanceKm || 0);
      }
    }
  }

  const mstRoadTotal = round(primResult.totalTreeWeight);
  const roadSavingsKm = round(originalRoadTotal - mstRoadTotal);
  const roadSavingsPercent = originalRoadTotal > 0 ? round((roadSavingsKm / originalRoadTotal) * 100) : 0;

  const originalDeliveryTravelKm = originalTour.totalDistanceKm;
  const mstDeliveryTravelKm = mstTour.totalDistanceKm;
  const travelDiffKm = round(mstDeliveryTravelKm - originalDeliveryTravelKm);
  const travelDiffPercent = originalDeliveryTravelKm > 0 ? round((travelDiffKm / originalDeliveryTravelKm) * 100) : 0;

  const comparison = {
    originalRoadTotal: round(originalRoadTotal),
    mstRoadTotal,
    roadSavingsKm,
    roadSavingsPercent,
    originalDeliveryTravelKm,
    mstDeliveryTravelKm,
    travelDiffKm,
    travelDiffPercent,
    comparisonNote:
      "Prim's Algorithm creates an MST that minimizes the total infrastructure road distance of the connecting network. However, because shortcuts and cycle edges are excluded from the tree, vehicle delivery travel distance on the MST network may be longer than on the original mesh network."
  };

  // Build execution trace for Prim's + Dijkstra steps
  const trace = primResult.trace.map((step) => ({
    stepNumber: step.stepNumber,
    type: 'select',
    algorithm: "Prim's MST + Dijkstra Shortest Path",
    from: step.from || startLocation,
    to: step.to || '',
    weight: step.weight || 0,
    treeVertices: step.currentTree || [],
    reason: step.explanation,
    runningWeight: step.runningWeight || 0
  }));

  // Route returned matches the primary MST delivery tour
  const route = mstTour.route;

  return {
    route,
    mstRoute: mstTour.route,
    originalRoute: originalTour.route,
    warehousePaths,
    stage1_mst: {
      totalDistanceKm: mstRoadTotal,
      selectedEdges: primResult.mstEdges,
      excludedEdges: primResult.excludedEdges,
      selectedCount: primResult.selectedEdgesCount,
      excludedCount: primResult.excludedEdgesCount,
      isConnected: primResult.isConnected,
      unreachedVertices: primResult.unreachedVertices
    },
    stage2_paths: warehousePaths,
    stage3_delivery: {
      orderingMode: input.orderingMode,
      totalDistanceKm: mstTour.totalDistanceKm,
      totalTravelTimeMin: mstTour.totalTravelTimeMin,
      stopsCount: mstTour.route.length,
      deliveredCount: mstTour.route.filter((r) => r.status === 'Delivered').length
    },
    comparison,
    summary: {
      algorithm: "Prim's Algorithm + Dijkstra's Algorithm",
      startWarehouse: startLocation,
      startLocation,
      objective: input.objective,
      totalOrders: orders.length,
      deliveredOrders: mstTour.route.filter((r) => r.status === 'Delivered').length,
      unreachableOrders: mstTour.unreachable.length,
      onTimeOrders: mstTour.route.filter((r) => r.status === 'Delivered').length,
      lateOrders: mstTour.unreachable.length,
      totalDistanceKm: mstTour.totalDistanceKm,
      totalTravelTimeMin: mstTour.totalTravelTimeMin,
      totalServiceTimeMin: 0,
      totalCostRupees: round(mstTour.totalDistanceKm * 10),
      nodesExplored: allLocations.length,
      priorityQueueOperations: primResult.heapOperations,
      candidateRoutes: sequenceOrders.length,
      primCutSteps: primResult.mstEdges.length
    },
    trace
  };
}
