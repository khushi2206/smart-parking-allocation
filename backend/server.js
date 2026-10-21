import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Graph } from '../dsa/Graph.js';
import { dijkstraByObjective } from '../dsa/Dijkstra.js';
import { optimizeDeliveries } from '../dsa/optimizer.js';
import { primMST } from '../dsa/Prims.js';

export const state = {
  warehouses: [],
  locations: [],
  roads: [],
  orders: [],
  nodePositions: {},
  lastDijkstraRun: null,
  lastOptimizationRun: null
};

export function seedDemoData() {
  state.locations = [
    { id: 'W', name: 'Main Warehouse', isWarehouse: true },
    { id: 'A', name: 'Location A', isWarehouse: false },
    { id: 'B', name: 'Location B', isWarehouse: false },
    { id: 'C', name: 'Location C', isWarehouse: false },
    { id: 'D', name: 'Location D', isWarehouse: false },
    { id: 'E', name: 'Location E', isWarehouse: false }
  ];

  state.warehouses = [
    { id: 'W', name: 'Main Warehouse', location: 'W', isDefault: true }
  ];

  state.roads = [
    { id: 'rd-1', start: 'W', destination: 'A', distanceKm: 4, travelTimeMin: 6, bidirectional: true },
    { id: 'rd-2', start: 'W', destination: 'B', distanceKm: 3, travelTimeMin: 5, bidirectional: true },
    { id: 'rd-3', start: 'A', destination: 'B', distanceKm: 2, travelTimeMin: 4, bidirectional: true },
    { id: 'rd-4', start: 'A', destination: 'C', distanceKm: 5, travelTimeMin: 8, bidirectional: true },
    { id: 'rd-5', start: 'B', destination: 'C', distanceKm: 6, travelTimeMin: 9, bidirectional: true },
    { id: 'rd-6', start: 'B', destination: 'D', distanceKm: 7, travelTimeMin: 11, bidirectional: true },
    { id: 'rd-7', start: 'C', destination: 'D', distanceKm: 2, travelTimeMin: 3, bidirectional: true },
    { id: 'rd-8', start: 'C', destination: 'E', distanceKm: 4, travelTimeMin: 6, bidirectional: true },
    { id: 'rd-9', start: 'D', destination: 'E', distanceKm: 3, travelTimeMin: 5, bidirectional: true }
  ];

  state.orders = [
    { orderId: 'O101', customer: 'Customer One', destination: 'C', customerLocation: 'C', priority: 'Urgent', status: 'Pending' },
    { orderId: 'O102', customer: 'Customer Two', destination: 'A', customerLocation: 'A', priority: 'Medium', status: 'Pending' },
    { orderId: 'O103', customer: 'Customer Three', destination: 'D', customerLocation: 'D', priority: 'High', status: 'Pending' },
    { orderId: 'O104', customer: 'Customer Four', destination: 'B', customerLocation: 'B', priority: 'Urgent', status: 'Pending' },
    { orderId: 'O105', customer: 'Customer Five', destination: 'E', customerLocation: 'E', priority: 'Low', status: 'Pending' }
  ];

  state.nodePositions = {
    'W': { x: 120, y: 160 },
    'A': { x: 280, y: 80 },
    'B': { x: 280, y: 260 },
    'C': { x: 440, y: 80 },
    'D': { x: 440, y: 260 },
    'E': { x: 600, y: 160 }
  };

  state.lastDijkstraRun = null;
  state.lastOptimizationRun = null;
}

// Pre-seed demo data so the system is ready immediately
seedDemoData();

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.join(root, '..', 'frontend');

app.use(express.json());
app.use(express.static(frontendPath));

const fail = (res, message) => res.status(400).json({ error: message });

export const findLocation = (key) => {
  if (!key) return null;
  const s = String(key).trim().toLowerCase();
  return state.locations.find((x) => x.id.toLowerCase() === s || x.name.toLowerCase() === s);
};

export function buildGraph() {
  const g = new Graph();
  state.locations.forEach((l) => g.addLocation(l.id));
  state.roads.forEach((r) => {
    const startLoc = findLocation(r.start);
    const destLoc = findLocation(r.destination);
    const startId = startLoc ? startLoc.id : r.start;
    const destId = destLoc ? destLoc.id : r.destination;
    g.addRoad({
      ...r,
      start: startId,
      destination: destId,
      distanceKm: Number(r.distanceKm),
      travelTimeMin: Number(r.travelTimeMin || r.distanceKm * 1.5),
      bidirectional: r.bidirectional !== false
    });
  });
  g.warehouses = state.warehouses;
  return g;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Delivery Route Optimization (DSA)',
    locationsCount: state.locations.length,
    roadsCount: state.roads.length,
    ordersCount: state.orders.length
  });
});

// Full state endpoint
app.get('/api/state', (_req, res) => {
  res.json({
    locations: state.locations,
    warehouses: state.warehouses,
    roads: state.roads,
    orders: state.orders,
    nodePositions: state.nodePositions
  });
});

// Reset to Sample Data
app.post(['/api/reset', '/api/demo-data'], (_req, res) => {
  seedDemoData();
  res.json({ success: true, message: 'Sample data restored successfully.' });
});

// Locations API
app.get('/api/locations', (_req, res) => {
  res.json({ locations: state.locations, roads: state.roads });
});

app.post('/api/locations', (req, res) => {
  const id = String(req.body?.id || '').trim().toUpperCase();
  const name = String(req.body?.name || req.body?.description || '').trim();
  const isWarehouse = Boolean(req.body?.isWarehouse);

  if (!id) return fail(res, 'Location ID is required.');
  if (!name) return fail(res, 'Location name is required.');
  if (state.locations.some((l) => l.id.toUpperCase() === id)) {
    return fail(res, `Location with ID "${id}" already exists.`);
  }

  const newLoc = { id, name, isWarehouse };
  state.locations.push(newLoc);

  if (isWarehouse && !state.warehouses.some((w) => w.id === id)) {
    state.warehouses.push({ id, name, location: id, isDefault: state.warehouses.length === 0 });
  }

  if (!state.nodePositions[id]) {
    const count = state.locations.length;
    state.nodePositions[id] = { x: 100 + ((count * 95) % 520), y: 100 + ((count * 70) % 220) };
  }

  res.status(201).json({ location: newLoc });
});

app.delete('/api/locations/:id', (req, res) => {
  const id = String(req.params.id).trim().toUpperCase();
  const loc = state.locations.find((l) => l.id.toUpperCase() === id || l.name.toLowerCase() === id.toLowerCase());
  if (!loc) return fail(res, `Location "${id}" not found.`);

  // Check road references
  const usedInRoads = state.roads.some(
    (r) => r.start.toUpperCase() === loc.id.toUpperCase() || r.destination.toUpperCase() === loc.id.toUpperCase()
  );
  if (usedInRoads) {
    return fail(res, `Cannot delete location "${loc.id}" because roads are connected to it. Delete the connected roads first.`);
  }

  // Check order references
  const usedInOrders = state.orders.some(
    (o) => (o.destination || o.customerLocation || '').toUpperCase() === loc.id.toUpperCase()
  );
  if (usedInOrders) {
    return fail(res, `Cannot delete location "${loc.id}" because delivery orders target this destination.`);
  }

  state.locations = state.locations.filter((l) => l.id !== loc.id);
  state.warehouses = state.warehouses.filter((w) => w.id !== loc.id && w.location !== loc.id);
  delete state.nodePositions[loc.id];

  res.json({ success: true, message: `Location "${loc.id}" deleted.` });
});

// Roads API
app.get('/api/roads', (_req, res) => {
  res.json({ roads: state.roads });
});

app.post('/api/roads', (req, res) => {
  const startLoc = findLocation(req.body?.start);
  const destLoc = findLocation(req.body?.destination);
  const distanceKm = Number(req.body?.distanceKm);
  const travelTimeMin = Number(req.body?.travelTimeMin || distanceKm * 1.5);

  if (!startLoc || !destLoc) return fail(res, 'Valid start and destination locations are required.');
  if (startLoc.id === destLoc.id) return fail(res, 'Start and destination locations cannot be the same.');
  if (Number.isNaN(distanceKm) || distanceKm <= 0) return fail(res, 'Distance must be a positive number.');

  const isDuplicate = state.roads.some(
    (r) => (r.start === startLoc.id && r.destination === destLoc.id) || (r.start === destLoc.id && r.destination === startLoc.id)
  );
  if (isDuplicate) {
    return fail(res, `A road already exists between "${startLoc.id}" and "${destLoc.id}".`);
  }

  const road = {
    id: req.body?.id || `rd-${randomUUID().slice(0, 8)}`,
    start: startLoc.id,
    destination: destLoc.id,
    distanceKm,
    travelTimeMin,
    bidirectional: true
  };
  state.roads.push(road);
  res.status(201).json({ road });
});

app.put('/api/roads/:id', (req, res) => {
  const road = state.roads.find((r) => r.id === req.params.id);
  if (!road) return fail(res, 'Road not found.');

  if (req.body?.distanceKm != null) {
    const d = Number(req.body.distanceKm);
    if (Number.isNaN(d) || d <= 0) return fail(res, 'Distance must be a positive number.');
    road.distanceKm = d;
  }
  if (req.body?.travelTimeMin != null) {
    const t = Number(req.body.travelTimeMin);
    if (Number.isNaN(t) || t <= 0) return fail(res, 'Travel time must be a positive number.');
    road.travelTimeMin = t;
  }
  res.json({ road });
});

app.delete('/api/roads/:id', (req, res) => {
  const idx = state.roads.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return fail(res, 'Road not found.');
  state.roads.splice(idx, 1);
  res.json({ success: true });
});

// Orders API
app.get('/api/orders', (_req, res) => {
  res.json({ orders: state.orders });
});

app.post('/api/orders', (req, res) => {
  const orderId = String(req.body?.orderId || '').trim();
  const customer = String(req.body?.customer || '').trim();
  const destLoc = findLocation(req.body?.destination || req.body?.customerLocation);
  const priority = String(req.body?.priority || 'Medium').trim();

  if (!orderId) return fail(res, 'Order ID is required.');
  if (!customer) return fail(res, 'Customer name is required.');
  if (!destLoc) return fail(res, 'Valid destination location is required.');

  const validPriorities = ['Urgent', 'High', 'Medium', 'Low', 'Critical', 'Normal'];
  if (!validPriorities.includes(priority)) {
    return fail(res, 'Priority must be Urgent, High, Medium, or Low.');
  }

  if (state.orders.some((o) => o.orderId.toLowerCase() === orderId.toLowerCase())) {
    return fail(res, `Order with ID "${orderId}" already exists.`);
  }

  const normalizedPriority = priority === 'Critical' ? 'Urgent' : (priority === 'Normal' ? 'Medium' : priority);

  const newOrder = {
    orderId,
    customer,
    destination: destLoc.id,
    customerLocation: destLoc.id,
    priority: normalizedPriority,
    status: req.body?.status || 'Pending'
  };

  state.orders.push(newOrder);
  res.status(201).json({ order: newOrder });
});

app.put('/api/orders/:id', (req, res) => {
  const order = state.orders.find((o) => o.orderId === req.params.id);
  if (!order) return fail(res, 'Order not found.');

  if (req.body?.customer) order.customer = String(req.body.customer).trim();
  if (req.body?.destination) {
    const dest = findLocation(req.body.destination);
    if (!dest) return fail(res, 'Invalid destination location.');
    order.destination = dest.id;
    order.customerLocation = dest.id;
  }
  if (req.body?.priority) {
    const p = req.body.priority;
    order.priority = p === 'Critical' ? 'Urgent' : (p === 'Normal' ? 'Medium' : p);
  }
  if (req.body?.status) order.status = req.body.status;

  res.json({ order });
});

app.delete('/api/orders/:id', (req, res) => {
  const idx = state.orders.findIndex((o) => o.orderId === req.params.id);
  if (idx === -1) return fail(res, 'Order not found.');
  state.orders.splice(idx, 1);
  res.json({ success: true });
});

app.post('/api/orders/:id/deliver', (req, res) => {
  const orderId = String(req.params.id);
  const order = state.orders.find((o) => o.orderId === orderId);
  if (!order) return fail(res, `Order "${orderId}" not found.`);
  order.status = 'Delivered';
  res.json({ success: true, order });
});

// Graph Node Positions
app.get('/api/graph/positions', (_req, res) => {
  res.json({ positions: state.nodePositions });
});

app.post('/api/graph/positions', (req, res) => {
  if (req.body?.positions && typeof req.body.positions === 'object') {
    state.nodePositions = { ...state.nodePositions, ...req.body.positions };
  }
  res.json({ positions: state.nodePositions });
});

// Prim's MST Algorithm Endpoint
app.post('/api/prims', (req, res) => {
  try {
    const g = buildGraph();
    const allLocs = g.locations();
    if (allLocs.length === 0) return fail(res, 'No locations found in graph.');

    const startNode = req.body?.startNode || (allLocs.includes('W') ? 'W' : allLocs[0]);
    const metric = req.body?.metric || 'distance';
    const weightFn = metric === 'time' ? (r) => (r.travelTimeMin || r.distanceKm) : (r) => r.distanceKm;

    const result = primMST(g, startNode, weightFn);
    res.json(result);
  } catch (e) {
    fail(res, e.message);
  }
});

// Delivery Optimization Endpoint
app.post('/api/optimize', (req, res) => {
  try {
    const g = buildGraph();
    const allLocs = g.locations();
    if (allLocs.length === 0) return fail(res, 'No locations found in graph.');

    const startWarehouse = req.body?.startWarehouse || (allLocs.includes('W') ? 'W' : allLocs[0]);
    const metric = req.body?.metric || 'distance';
    const returnToWarehouse = req.body?.returnToWarehouse !== false;

    // Filter pending orders
    const pendingOrders = state.orders.filter((o) => o.status === 'Pending');

    const result = optimizeDeliveries({
      startWarehouse,
      orders: pendingOrders,
      graph: g,
      objective: metric,
      returnToWarehouse
    });

    state.lastOptimizationRun = result;
    res.json(result);
  } catch (e) {
    fail(res, e.message);
  }
});

// Single Page Application Route
app.use((_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

export { app };

const isInvokedDirectly = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isInvokedDirectly && process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Delivery route optimizer running at http://localhost:${PORT}`);
  });
}
