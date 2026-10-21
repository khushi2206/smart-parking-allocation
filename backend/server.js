import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Graph } from '../dsa/Graph.js';
import { dijkstraByObjective } from '../dsa/Dijkstra.js';
import { optimizeDeliveries } from '../dsa/optimizer.js';

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
    { id: 'loc-1', name: 'Central Hub', description: 'Main logistics junction & central hub', createdAt: new Date().toISOString() },
    { id: 'loc-2', name: 'North Sector', description: 'Northern residential and commercial zone', createdAt: new Date().toISOString() },
    { id: 'loc-3', name: 'South District', description: 'South industrial area and freight station', createdAt: new Date().toISOString() },
    { id: 'loc-4', name: 'East Port', description: 'Maritime harbor & coastal shipping docks', createdAt: new Date().toISOString() },
    { id: 'loc-5', name: 'West Terminal', description: 'Express transport & warehousing depot', createdAt: new Date().toISOString() },
    { id: 'loc-6', name: 'Tech Park', description: 'Corporate campus & high-density offices', createdAt: new Date().toISOString() },
    { id: 'loc-7', name: 'City Airport', description: 'International air cargo & courier hub', createdAt: new Date().toISOString() }
  ];

  state.warehouses = [
    { id: 'WH-01', name: 'Central Distribution Center', location: 'Central Hub', capacityKg: 600, isDefault: true, createdAt: new Date().toISOString() },
    { id: 'WH-02', name: 'Coastal Fulfillment Depot', location: 'East Port', capacityKg: 400, isDefault: false, createdAt: new Date().toISOString() }
  ];

  state.roads = [
    { id: 'rd-1', start: 'Central Hub', destination: 'North Sector', distanceKm: 8, travelTimeMin: 15, hours: 0, minutes: 15, costRupees: 95, bidirectional: true },
    { id: 'rd-2', start: 'Central Hub', destination: 'South District', distanceKm: 12, travelTimeMin: 22, hours: 0, minutes: 22, costRupees: 140, bidirectional: true },
    { id: 'rd-3', start: 'Central Hub', destination: 'East Port', distanceKm: 16, travelTimeMin: 28, hours: 0, minutes: 28, costRupees: 180, bidirectional: true },
    { id: 'rd-4', start: 'Central Hub', destination: 'West Terminal', distanceKm: 10, travelTimeMin: 18, hours: 0, minutes: 18, costRupees: 110, bidirectional: true },
    { id: 'rd-5', start: 'North Sector', destination: 'Tech Park', distanceKm: 6, travelTimeMin: 10, hours: 0, minutes: 10, costRupees: 70, bidirectional: true },
    { id: 'rd-6', start: 'South District', destination: 'City Airport', distanceKm: 14, travelTimeMin: 25, hours: 0, minutes: 25, costRupees: 165, bidirectional: true },
    { id: 'rd-7', start: 'East Port', destination: 'South District', distanceKm: 9, travelTimeMin: 16, hours: 0, minutes: 16, costRupees: 100, bidirectional: false },
    { id: 'rd-8', start: 'West Terminal', destination: 'Tech Park', distanceKm: 7, travelTimeMin: 12, hours: 0, minutes: 12, costRupees: 85, bidirectional: false },
    { id: 'rd-9', start: 'Tech Park', destination: 'City Airport', distanceKm: 11, travelTimeMin: 20, hours: 0, minutes: 20, costRupees: 130, bidirectional: true }
  ];

  const now = new Date();
  const deadline1 = new Date(now.getTime() + 45 * 60000).toISOString();
  const deadline2 = new Date(now.getTime() + 90 * 60000).toISOString();
  const deadline3 = new Date(now.getTime() + 150 * 60000).toISOString();

  state.orders = [
    { orderId: 'ORD-101', customerLocation: 'Tech Park', warehouseId: 'WH-01', priority: 'Critical', packageWeightKg: 25, serviceTimeMin: 10, deadline: deadline1, status: 'Pending', createdAt: new Date().toISOString() },
    { orderId: 'ORD-102', customerLocation: 'City Airport', warehouseId: 'any', priority: 'High', packageWeightKg: 40, serviceTimeMin: 15, deadline: deadline2, status: 'Pending', createdAt: new Date().toISOString() },
    { orderId: 'ORD-103', customerLocation: 'North Sector', warehouseId: 'WH-01', priority: 'Normal', packageWeightKg: 15, serviceTimeMin: 5, deadline: null, status: 'Pending', createdAt: new Date().toISOString() },
    { orderId: 'ORD-104', customerLocation: 'South District', warehouseId: 'any', priority: 'Low', packageWeightKg: 50, serviceTimeMin: 10, deadline: deadline3, status: 'Pending', createdAt: new Date().toISOString() },
    { orderId: 'ORD-105', customerLocation: 'West Terminal', warehouseId: 'WH-01', priority: 'Normal', packageWeightKg: 20, serviceTimeMin: 8, deadline: null, status: 'Pending', createdAt: new Date().toISOString() }
  ];

  state.nodePositions = {
    'Central Hub': { x: 380, y: 240 },
    'North Sector': { x: 230, y: 110 },
    'Tech Park': { x: 490, y: 100 },
    'City Airport': { x: 670, y: 220 },
    'South District': { x: 540, y: 370 },
    'East Port': { x: 650, y: 380 },
    'West Terminal': { x: 180, y: 330 }
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
const findLocation = (name) => state.locations.find((x) => x.name.toLowerCase() === String(name).trim().toLowerCase());
const bodyNumber = (v, defaultVal = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : defaultVal;
};

export function buildGraph() {
  const g = new Graph();
  state.locations.forEach((l) => g.addLocation(l.name));
  state.roads.forEach((r) => g.addRoad(r));
  g.warehouses = state.warehouses;
  return g;
}

function parseRoadBody(body, existingId = null) {
  const start = String(body.start || '').trim();
  const destination = String(body.destination || '').trim();
  const hours = bodyNumber(body.hours, 0);
  const minutes = bodyNumber(body.minutes, 0);
  const distanceKm = bodyNumber(body.distanceKm, -1);
  const costRupees = bodyNumber(body.costRupees, -1);
  const travelTimeMin = body.travelTimeMin != null ? bodyNumber(body.travelTimeMin) : hours * 60 + minutes;
  const bidirectional = body.bidirectional !== false && body.oneWay !== true;

  if (!start || !destination) return { error: 'Start and Destination locations are required.' };
  if (start.toLowerCase() === destination.toLowerCase()) return { error: 'Start and destination locations cannot be identical.' };
  if (!findLocation(start)) return { error: `Starting location "${start}" does not exist.` };
  if (!findLocation(destination)) return { error: `Destination location "${destination}" does not exist.` };
  if (distanceKm < 0) return { error: 'Distance must be a nonnegative number.' };
  if (travelTimeMin < 0) return { error: 'Travel time must be a nonnegative number.' };
  if (costRupees < 0) return { error: 'Cost must be a nonnegative number.' };

  const id = existingId || body.id || randomUUID();
  const isDuplicate = state.roads.some(
    (r) =>
      r.id !== id &&
      ((r.start.toLowerCase() === start.toLowerCase() && r.destination.toLowerCase() === destination.toLowerCase()) ||
        (bidirectional && r.start.toLowerCase() === destination.toLowerCase() && r.destination.toLowerCase() === start.toLowerCase()))
  );
  if (isDuplicate) {
    return { error: `A road between "${start}" and "${destination}" already exists.` };
  }

  return {
    road: {
      id,
      start: findLocation(start).name,
      destination: findLocation(destination).name,
      distanceKm,
      travelTimeMin,
      hours: Math.floor(travelTimeMin / 60),
      minutes: travelTimeMin % 60,
      costRupees,
      bidirectional
    }
  };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'RouteWise: Multi-Warehouse Delivery Route Optimizer',
    storage: 'in-memory',
    timestamp: new Date().toISOString()
  });
});

// Overview stats
app.get('/api/overview', (_req, res) => {
  const pendingOrders = state.orders.filter((o) => o.status === 'Pending').length;
  const deliveredOrders = state.orders.filter((o) => o.status === 'Delivered').length;
  const unreachableOrders = state.orders.filter((o) => o.status === 'Unreachable').length;
  const plannedOrders = state.orders.filter((o) => o.status === 'Planned').length;

  res.json({
    summary: {
      totalWarehouses: state.warehouses.length,
      totalLocations: state.locations.length,
      totalRoads: state.roads.length,
      totalOrders: state.orders.length,
      pendingOrders,
      deliveredOrders,
      unreachableOrders,
      plannedOrders
    },
    warehouses: state.warehouses,
    locations: state.locations,
    roads: state.roads,
    recentOrders: state.orders.slice(-6).reverse(),
    lastDijkstra: state.lastDijkstraRun
      ? {
          from: state.lastDijkstraRun.detailedState?.start,
          to: state.lastDijkstraRun.detailedState?.destination,
          path: state.lastDijkstraRun.path,
          distanceKm: state.lastDijkstraRun.distanceKm,
          timeMin: state.lastDijkstraRun.timeMin,
          costRupees: state.lastDijkstraRun.costRupees
        }
      : null,
    lastOptimization: state.lastOptimizationRun
      ? {
          summary: state.lastOptimizationRun.summary,
          routeStops: state.lastOptimizationRun.route.length
        }
      : null
  });
});

// Locations CRUD
app.get('/api/locations', (_req, res) => {
  res.json({ locations: state.locations, roads: state.roads });
});

app.post('/api/locations', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  if (!name) return fail(res, 'Location name is required.');
  if (findLocation(name)) return fail(res, `Location "${name}" already exists.`);

  const item = {
    id: req.body?.id || randomUUID(),
    name,
    description,
    createdAt: new Date().toISOString()
  };
  state.locations.push(item);
  res.status(201).json({ location: item });
});

app.put('/api/locations/:name', (req, res) => {
  const oldLoc = findLocation(req.params.name);
  if (!oldLoc) return fail(res, `Location "${req.params.name}" not found.`);

  const newName = String(req.body?.name || '').trim();
  if (!newName) return fail(res, 'Location name cannot be empty.');

  if (newName.toLowerCase() !== oldLoc.name.toLowerCase() && findLocation(newName)) {
    return fail(res, `Location name "${newName}" is already taken.`);
  }

  const oldName = oldLoc.name;
  oldLoc.name = newName;
  oldLoc.description = String(req.body.description ?? oldLoc.description).trim();

  // Cascade rename references
  state.roads.forEach((r) => {
    if (r.start.toLowerCase() === oldName.toLowerCase()) r.start = newName;
    if (r.destination.toLowerCase() === oldName.toLowerCase()) r.destination = newName;
  });
  state.orders.forEach((o) => {
    if (o.customerLocation.toLowerCase() === oldName.toLowerCase()) o.customerLocation = newName;
  });
  state.warehouses.forEach((w) => {
    if (w.location.toLowerCase() === oldName.toLowerCase()) w.location = newName;
  });

  if (state.nodePositions[oldName]) {
    state.nodePositions[newName] = state.nodePositions[oldName];
    delete state.nodePositions[oldName];
  }

  res.json({ location: oldLoc });
});

app.delete('/api/locations/:name', (req, res) => {
  const loc = findLocation(req.params.name);
  if (!loc) return fail(res, `Location "${req.params.name}" not found.`);

  const warehouseRefs = state.warehouses.filter((w) => w.location.toLowerCase() === loc.name.toLowerCase());
  const roadRefs = state.roads.filter((r) => r.start.toLowerCase() === loc.name.toLowerCase() || r.destination.toLowerCase() === loc.name.toLowerCase());
  const orderRefs = state.orders.filter((o) => o.customerLocation.toLowerCase() === loc.name.toLowerCase());

  if (warehouseRefs.length > 0 || roadRefs.length > 0 || orderRefs.length > 0) {
    const reasons = [];
    if (warehouseRefs.length > 0) reasons.push(`${warehouseRefs.length} warehouse(s)`);
    if (roadRefs.length > 0) reasons.push(`${roadRefs.length} road(s)`);
    if (orderRefs.length > 0) reasons.push(`${orderRefs.length} order(s)`);
    return fail(res, `Cannot delete location "${loc.name}": It is referenced by ${reasons.join(', ')}. Please delete or reassign those items first.`);
  }

  const idx = state.locations.indexOf(loc);
  state.locations.splice(idx, 1);
  delete state.nodePositions[loc.name];
  res.status(204).end();
});

// Warehouses CRUD
app.get('/api/warehouses', (_req, res) => {
  res.json({ warehouses: state.warehouses });
});

app.get('/api/warehouse', (_req, res) => {
  res.json({ warehouse: state.warehouses.find((x) => x.isDefault) || state.warehouses[0] || null });
});

app.post('/api/warehouses', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const locationName = String(req.body?.location || '').trim();
  const capacityKg = bodyNumber(req.body?.capacityKg, 0);
  const isDefault = Boolean(req.body?.isDefault);
  const id = req.body?.id ? String(req.body.id).trim() : 'WH-' + (state.warehouses.length + 1).toString().padStart(2, '0');

  if (!name) return fail(res, 'Warehouse name is required.');
  const loc = findLocation(locationName);
  if (!loc) return fail(res, `Location "${locationName}" does not exist. Please create the location first.`);
  if (capacityKg <= 0) return fail(res, 'Warehouse capacity must be a positive number (kg).');
  if (state.warehouses.some((w) => w.id.toLowerCase() === id.toLowerCase() || w.name.toLowerCase() === name.toLowerCase())) {
    return fail(res, 'A warehouse with this ID or Name already exists.');
  }

  if (isDefault || state.warehouses.length === 0) {
    state.warehouses.forEach((w) => (w.isDefault = false));
  }

  const warehouse = {
    id,
    name,
    location: loc.name,
    capacityKg,
    isDefault: isDefault || state.warehouses.length === 0,
    createdAt: new Date().toISOString()
  };

  state.warehouses.push(warehouse);
  res.status(201).json({ warehouse });
});

app.put('/api/warehouses/:id', (req, res) => {
  const w = state.warehouses.find((x) => x.id === req.params.id);
  if (!w) return fail(res, `Warehouse with ID "${req.params.id}" not found.`);

  const name = String(req.body?.name || w.name).trim();
  const locationName = String(req.body?.location || w.location).trim();
  const capacityKg = req.body?.capacityKg != null ? bodyNumber(req.body.capacityKg) : w.capacityKg;
  const isDefault = req.body?.isDefault != null ? Boolean(req.body.isDefault) : w.isDefault;

  if (!name) return fail(res, 'Warehouse name is required.');
  const loc = findLocation(locationName);
  if (!loc) return fail(res, `Location "${locationName}" does not exist.`);
  if (capacityKg <= 0) return fail(res, 'Warehouse capacity must be a positive number (kg).');

  if (state.warehouses.some((x) => x.id !== w.id && x.name.toLowerCase() === name.toLowerCase())) {
    return fail(res, `Another warehouse already has the name "${name}".`);
  }

  w.name = name;
  w.location = loc.name;
  w.capacityKg = capacityKg;

  if (isDefault) {
    state.warehouses.forEach((x) => (x.isDefault = x.id === w.id));
  } else if (w.isDefault && state.warehouses.length > 1) {
    w.isDefault = false;
    const another = state.warehouses.find((x) => x.id !== w.id);
    if (another) another.isDefault = true;
  }

  res.json({ warehouse: w });
});

app.delete('/api/warehouses/:id', (req, res) => {
  const idx = state.warehouses.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return fail(res, `Warehouse with ID "${req.params.id}" not found.`);

  const assignedOrders = state.orders.filter((o) => o.warehouseId === req.params.id);
  if (assignedOrders.length > 0) {
    return fail(res, `Cannot delete warehouse: ${assignedOrders.length} order(s) are assigned to it. Reassign or delete those orders first.`);
  }

  const wasDefault = state.warehouses[idx].isDefault;
  state.warehouses.splice(idx, 1);

  if (wasDefault && state.warehouses.length > 0) {
    state.warehouses[0].isDefault = true;
  }

  res.status(204).end();
});

app.post('/api/warehouses/:id/set-default', (req, res) => {
  const w = state.warehouses.find((x) => x.id === req.params.id);
  if (!w) return fail(res, 'Warehouse not found.');
  state.warehouses.forEach((x) => (x.isDefault = x.id === w.id));
  res.json({ warehouse: w });
});

app.post('/api/warehouse', (req, res) => {
  const w = state.warehouses.find((x) => x.id === req.body?.id || x.name === req.body?.name);
  if (w) {
    state.warehouses.forEach((x) => (x.isDefault = x.id === w.id));
    return res.json({ warehouse: w });
  }
  return fail(res, 'Use /api/warehouses with a valid warehouse.');
});

// Roads CRUD
app.get('/api/roads', (_req, res) => {
  res.json({ roads: state.roads });
});

app.post('/api/roads', (req, res) => {
  const parsed = parseRoadBody(req.body);
  if (parsed.error) return fail(res, parsed.error);

  state.roads.push(parsed.road);
  res.status(201).json({ road: parsed.road });
});

app.put('/api/roads/:id', (req, res) => {
  const idx = state.roads.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return fail(res, `Road with ID "${req.params.id}" not found.`);

  const parsed = parseRoadBody(req.body, req.params.id);
  if (parsed.error) return fail(res, parsed.error);

  state.roads[idx] = parsed.road;
  res.json({ road: parsed.road });
});

app.delete('/api/roads/:id', (req, res) => {
  const idx = state.roads.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return fail(res, `Road with ID "${req.params.id}" not found.`);

  state.roads.splice(idx, 1);
  res.status(204).end();
});

// Orders CRUD
function validateOrderPayload(body, existingId = null) {
  const orderId = String(body.orderId || '').trim();
  const customerLocation = String(body.customerLocation || body.location || '').trim();
  const priority = String(body.priority || 'Normal').trim();
  const packageWeightKg = bodyNumber(body.packageWeightKg, 0);
  const serviceTimeMin = bodyNumber(body.serviceTimeMin, 0);
  const warehouseId = body.warehouseId ? String(body.warehouseId).trim() : 'any';
  const deadline = body.deadline ? String(body.deadline).trim() : null;
  const status = body.status && ['Pending', 'Planned', 'Delivered', 'Unreachable'].includes(body.status) ? body.status : 'Pending';

  if (!orderId) return { error: 'Order ID is required.' };
  if (!existingId && state.orders.some((o) => o.orderId.toLowerCase() === orderId.toLowerCase())) {
    return { error: `An order with ID "${orderId}" already exists.` };
  }
  const loc = findLocation(customerLocation);
  if (!loc) return { error: `Destination location "${customerLocation}" does not exist.` };
  if (!['Critical', 'High', 'Normal', 'Low'].includes(priority)) {
    return { error: 'Priority must be one of: Critical, High, Normal, Low.' };
  }
  if (packageWeightKg < 0) return { error: 'Package weight must be nonnegative.' };
  if (serviceTimeMin < 0) return { error: 'Service time must be nonnegative.' };

  return {
    order: {
      orderId,
      customerLocation: loc.name,
      warehouseId,
      priority,
      packageWeightKg,
      serviceTimeMin,
      deadline,
      status,
      createdAt: body.createdAt || new Date().toISOString()
    }
  };
}

app.get('/api/orders', (_req, res) => {
  res.json({ orders: state.orders });
});

app.post('/api/orders', (req, res) => {
  const parsed = validateOrderPayload(req.body);
  if (parsed.error) return fail(res, parsed.error);

  state.orders.push(parsed.order);
  res.status(201).json({ order: parsed.order });
});

app.put('/api/orders/:id', (req, res) => {
  const idx = state.orders.findIndex((x) => x.orderId === req.params.id);
  if (idx < 0) return fail(res, `Order "${req.params.id}" not found.`);

  const parsed = validateOrderPayload({ ...state.orders[idx], ...req.body, orderId: req.params.id }, req.params.id);
  if (parsed.error) return fail(res, parsed.error);

  state.orders[idx] = parsed.order;
  res.json({ order: parsed.order });
});

app.delete('/api/orders/:id', (req, res) => {
  const idx = state.orders.findIndex((x) => x.orderId === req.params.id);
  if (idx < 0) return fail(res, `Order "${req.params.id}" not found.`);

  state.orders.splice(idx, 1);
  res.status(204).end();
});

app.post('/api/orders/:id/deliver', (req, res) => {
  const order = state.orders.find((x) => x.orderId === req.params.id);
  if (!order) return fail(res, 'Order not found.');
  order.status = req.body?.status || (order.status === 'Delivered' ? 'Pending' : 'Delivered');
  res.json({ order });
});

app.post('/api/orders/batch-deliver', (req, res) => {
  const ids = Array.isArray(req.body?.orderIds) ? req.body.orderIds : [];
  let updatedCount = 0;
  state.orders.forEach((o) => {
    if (ids.includes(o.orderId)) {
      o.status = 'Delivered';
      updatedCount++;
    }
  });
  res.json({ updatedCount });
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

// Dijkstra Shortest Path
app.post('/api/dijkstra', (req, res) => {
  try {
    const from = String(req.body?.from || '').trim();
    const to = String(req.body?.to || '').trim();
    const objective = req.body?.objective || 'distance';
    const costWeight = bodyNumber(req.body?.costWeight, 50);
    const timeWeight = bodyNumber(req.body?.timeWeight, 50);

    if (!from || !to) return fail(res, 'Start and Destination locations are required.');
    if (!findLocation(from)) return fail(res, `Start location "${from}" does not exist.`);
    if (!findLocation(to)) return fail(res, `Destination location "${to}" does not exist.`);

    const g = buildGraph();
    const result = dijkstraByObjective(g, from, to, objective, costWeight, timeWeight);

    state.lastDijkstraRun = result;
    res.json(result);
  } catch (e) {
    fail(res, e.message);
  }
});

// Multi-Warehouse Route Optimizer
app.post('/api/optimize', (req, res) => {
  try {
    const defaultWh = state.warehouses.find((x) => x.isDefault) || state.warehouses[0];
    const startWarehouse = req.body?.startWarehouse || defaultWh?.location || defaultWh?.name;

    if (!startWarehouse) {
      return fail(res, 'Please create at least one warehouse before running route optimization.');
    }

    const requestedOrders = req.body?.orderIds
      ? state.orders.filter((o) => req.body.orderIds.includes(o.orderId))
      : req.body?.orders || state.orders.filter((o) => o.status === 'Pending' || o.status === 'Planned');

    if (!requestedOrders || requestedOrders.length === 0) {
      return fail(res, 'No pending orders available to optimize. Please create orders first.');
    }

    const g = buildGraph();
    const objective = req.body?.objective || 'balanced';
    const costWeight = bodyNumber(req.body?.costWeight, 50);
    const timeWeight = bodyNumber(req.body?.timeWeight, 50);
    const returnToWarehouse = Boolean(req.body?.returnToWarehouse);

    const result = optimizeDeliveries(
      startWarehouse,
      requestedOrders,
      g,
      objective,
      costWeight,
      timeWeight,
      returnToWarehouse
    );

    // Keep state.orders as is, or mark as 'Planned' if user requested
    if (req.body?.markAsPlanned) {
      state.orders.forEach((o) => {
        if (result.route.some((r) => r.orderId === o.orderId && r.status === 'Delivered')) {
          o.status = 'Planned';
        }
      });
    }

    state.lastOptimizationRun = result;
    res.json(result);
  } catch (e) {
    fail(res, e.message);
  }
});

// Execution Trace
app.get('/api/trace', (_req, res) => {
  if (!state.lastOptimizationRun) {
    return res.json({ hasRun: false, message: 'No optimization run recorded yet.' });
  }
  res.json({
    hasRun: true,
    summary: state.lastOptimizationRun.summary,
    weights: state.lastOptimizationRun.weights,
    complexity: state.lastOptimizationRun.complexity,
    heuristicNote: state.lastOptimizationRun.heuristicNote,
    trace: state.lastOptimizationRun.trace,
    route: state.lastOptimizationRun.route
  });
});

// Data Structures Explorer
app.get('/api/structures', (_req, res) => {
  const g = buildGraph();
  const adjacencyList = {};
  for (const [loc, edges] of g.adjacency.entries()) {
    adjacencyList[loc] = edges.map((e) => ({
      destination: e.destination,
      distanceKm: e.distanceKm,
      travelTimeMin: e.travelTimeMin,
      costRupees: e.costRupees,
      bidirectional: e.bidirectional
    }));
  }

  res.json({
    weightedGraph: {
      type: 'Weighted Adjacency List (Map<Location, Edge[]>)',
      locationsCount: g.locations().length,
      roadsCount: state.roads.length,
      adjacency: adjacencyList
    },
    warehouseCollection: {
      type: 'Warehouse Entity Collection',
      count: state.warehouses.length,
      items: state.warehouses
    },
    deliveryOrderCollection: {
      type: 'Delivery Order Priority List',
      count: state.orders.length,
      items: state.orders
    },
    priorityQueue: {
      type: 'Custom Binary Min-Heap (Array-backed tree)',
      latestDijkstraOperations: state.lastDijkstraRun?.queueOperations || 0,
      latestDijkstraTraceLength: state.lastDijkstraRun?.trace?.length || 0,
      optimizerQueueOperations: state.lastOptimizationRun?.summary?.priorityQueueOperations || 0
    },
    visitedSet: {
      type: 'Explored Vertices Set',
      hasDijkstraRun: Boolean(state.lastDijkstraRun),
      visitedNodes: state.lastDijkstraRun?.explored || []
    },
    distanceTable: {
      type: 'Dijkstra Distance Map (Location → Minimum Weight)',
      hasDijkstraRun: Boolean(state.lastDijkstraRun),
      table: state.lastDijkstraRun?.distances || {}
    },
    predecessorMap: {
      type: 'Path Reconstruction Map (Location → Predecessor Location)',
      hasDijkstraRun: Boolean(state.lastDijkstraRun),
      map: state.lastDijkstraRun?.predecessors || {}
    },
    finalDeliverySequence: {
      type: 'Scheduled Delivery Stops Sequence',
      hasOptimizationRun: Boolean(state.lastOptimizationRun),
      startWarehouse: state.lastOptimizationRun?.summary?.startWarehouse,
      stops: state.lastOptimizationRun?.route || []
    }
  });
});

// Load Demo Dataset for instant testing
app.post('/api/demo-data', (_req, res) => {
  seedDemoData();

  res.json({
    message: 'Demo dataset loaded successfully.',
    locations: state.locations.length,
    warehouses: state.warehouses.length,
    roads: state.roads.length,
    orders: state.orders.length
  });
});

// Reset all in-memory data
app.post('/api/reset-data', (_req, res) => {
  state.warehouses = [];
  state.locations = [];
  state.roads = [];
  state.orders = [];
  state.nodePositions = {};
  state.lastDijkstraRun = null;
  state.lastOptimizationRun = null;

  res.json({ message: 'All in-memory data has been reset to empty state.' });
});

// Web Page Routes with clean URL support (with or without .html)
const pages = [
  'warehouses',
  'locations',
  'roads',
  'orders',
  'structures',
  'dijkstra',
  'optimizer',
  'trace',
  'complexity'
];

app.get(['/', '/overview', '/index', '/index.html', '/overview.html'], (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

pages.forEach((p) => {
  app.get([`/${p}`, `/${p}.html`], (_req, res) => {
    res.sendFile(path.join(frontendPath, `${p}.html`));
  });
});

// 404 Handler for unmatched routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `API endpoint '${req.method} ${req.path}' not found.` });
  }
  res.status(404).sendFile(path.join(frontendPath, 'index.html'));
});

export { app };

const isInvokedDirectly = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isInvokedDirectly && process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`RouteWise delivery route optimizer running at http://localhost:${PORT}`);
  });
}
