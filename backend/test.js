import assert from 'node:assert/strict';
import test from 'node:test';
import { Graph } from '../dsa/Graph.js';
import { dijkstra, dijkstraByObjective } from '../dsa/Dijkstra.js';
import { optimizeDeliveries } from '../dsa/optimizer.js';
import { MinPriorityQueue } from '../dsa/MinPriorityQueue.js';
import { state, buildGraph } from './server.js';

const roads = [
  { start: 'Central Warehouse', destination: 'Market', distanceKm: 5, travelTimeMin: 12, costRupees: 90 },
  { start: 'Central Warehouse', destination: 'University', distanceKm: 7, travelTimeMin: 18, costRupees: 120 },
  { start: 'Market', destination: 'Railway Station', distanceKm: 4, travelTimeMin: 8, costRupees: 75 },
  { start: 'University', destination: 'Hospital', distanceKm: 5, travelTimeMin: 10, costRupees: 110 },
  { start: 'Hospital', destination: 'Airport', distanceKm: 12, travelTimeMin: 25, costRupees: 230 }
];

test('cost and time weights can choose different routes', () => {
  const network = [
    { start: 'Central Warehouse', destination: 'Cheap', distanceKm: 10, travelTimeMin: 60, costRupees: 20 },
    { start: 'Cheap', destination: 'Airport', distanceKm: 10, travelTimeMin: 60, costRupees: 20 },
    { start: 'Central Warehouse', destination: 'Fast', distanceKm: 20, travelTimeMin: 10, costRupees: 300 },
    { start: 'Fast', destination: 'Airport', distanceKm: 20, travelTimeMin: 10, costRupees: 300 }
  ];
  const order = [{ orderId: '1', customerLocation: 'Airport', priority: 'Normal', deadline: '2026-01-01T20:00:00Z', serviceTimeMin: 0 }];
  assert.deepEqual(optimizeDeliveries({ roads: network, orders: order, costWeight: 100, timeWeight: 0 }).route[0].path.path, ['Central Warehouse', 'Cheap', 'Airport']);
  assert.deepEqual(optimizeDeliveries({ roads: network, orders: order, costWeight: 0, timeWeight: 100 }).route[0].path.path, ['Central Warehouse', 'Fast', 'Airport']);
});

test('priority, deadlines, service time, and unreachable orders are reported', () => {
  const result = optimizeDeliveries({
    roads: roads.concat([{ start: 'Island', destination: 'Island 2', distanceKm: 1, travelTimeMin: 1, costRupees: 1 }]),
    orders: [
      { orderId: 'critical', customerLocation: 'Airport', priority: 'Critical', deadline: '2026-01-01T08:05:00Z', serviceTimeMin: 10 },
      { orderId: 'unreachable', customerLocation: 'Island', priority: 'Low', deadline: '2026-01-01T09:00:00Z', serviceTimeMin: 0 }
    ]
  });
  assert.equal(result.route[0].orderId, 'critical');
  assert.equal(result.route[1].deadlineStatus, 'Unreachable');
  assert.ok(result.summary.lateOrders >= 1);
});

test('invalid weights are rejected', () => {
  assert.throws(() => optimizeDeliveries({ roads, orders: [], costWeight: 70, timeWeight: 70 }), /add up to 100/);
});

test('dijkstra returns queue and relaxation trace steps', () => {
  const graph = new Graph();
  roads.forEach((road) => graph.addRoad(road));
  const result = dijkstra(graph, 'Central Warehouse', 'Airport', (road) => road.travelTimeMin);
  assert.deepEqual(result.path, ['Central Warehouse', 'University', 'Hospital', 'Airport']);
  assert.equal(result.trace[0].type, 'enqueue');
  assert.ok(result.trace.some((step) => step.type === 'dequeue'));
  assert.ok(result.trace.some((step) => step.type === 'update'));
  assert.ok(result.trace[0].stepNumber >= 1);
});

test('objective modes and one-way roads are supported', () => {
  const graph = new Graph();
  graph.addRoad({ start: 'A', destination: 'B', distanceKm: 4, travelTimeMin: 8, costRupees: 20, bidirectional: false });
  assert.deepEqual(dijkstra(graph, 'B', 'A', (road) => road.distanceKm).path, []);
  assert.equal(dijkstra(graph, 'A', 'B', (road) => road.distanceKm).distanceKm, 4);
});

test('multi-warehouse optimizer respects capacity and return option', () => {
  const graph = new Graph();
  graph.warehouses = [{ id: 'w1', name: 'Warehouse 1', location: 'A', capacityKg: 10 }];
  graph.addRoad({ start: 'A', destination: 'B', distanceKm: 2, travelTimeMin: 5, costRupees: 10 });
  const result = optimizeDeliveries('A', [{ orderId: 'o1', customerLocation: 'B', priority: 'High', packageWeightKg: 2 }], graph, 'time', 0, 100, true);
  assert.equal(result.route[0].status, 'Delivered');
  assert.equal(result.route.at(-1).status, 'Return');
  assert.ok(result.trace.some((step) => step.type === 'select'));
});

test('MinPriorityQueue maintains minimum element and peek invariants', () => {
  const pq = new MinPriorityQueue((a, b) => a < b);
  assert.ok(pq.isEmpty());
  pq.insert(40);
  pq.insert(10);
  pq.insert(30);
  pq.insert(20);
  assert.equal(pq.size(), 4);
  assert.equal(pq.peek(), 10);
  assert.equal(pq.extractMin(), 10);
  assert.equal(pq.extractMin(), 20);
  assert.equal(pq.extractMin(), 30);
  assert.equal(pq.extractMin(), 40);
  assert.ok(pq.isEmpty());
});

test('Graph correctly maps bidirectional vs directed adjacency entries', () => {
  const g = new Graph();
  g.addLocation('NodeX');
  g.addLocation('NodeY');
  g.addRoad({ start: 'NodeX', destination: 'NodeY', distanceKm: 5, travelTimeMin: 10, costRupees: 50, bidirectional: true });
  assert.equal(g.neighbors('NodeX').length, 1);
  assert.equal(g.neighbors('NodeY').length, 1);
  assert.equal(g.neighbors('NodeY')[0].destination, 'NodeX');

  g.addLocation('NodeZ');
  g.addRoad({ start: 'NodeX', destination: 'NodeZ', distanceKm: 3, travelTimeMin: 6, costRupees: 30, bidirectional: false });
  assert.equal(g.neighbors('NodeX').length, 2);
  assert.equal(g.neighbors('NodeZ').length, 0); // one-way, no reverse edge
});
