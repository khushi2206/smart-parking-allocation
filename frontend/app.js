/**
 * Delivery Route Optimization - Main Unified Application Logic
 * Shared data model across Orders, Road Network, Prim's Algorithm, and Delivery Optimization tabs.
 */

import { GraphView } from './graph-view.js';

// Application State
let state = {
  locations: [],
  roads: [],
  orders: [],
  nodePositions: {},
  warehouses: []
};

// Graph View Instances
let networkGraph = null;
let primGraph = null;
let optGraph = null;

// Prim's Algorithm State
let primsData = null;
let primCurrentStep = 0;
let primPlayTimer = null;
let primFinalMstOnly = false;

// Optimization State
let deliveryPlan = null;

// Utility API Fetch
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`/api${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// 1. Data Initialization & Synchronization
// ---------------------------------------------------------------------------

async function fetchState() {
  try {
    const data = await api('/state');
    state = data;
    renderAll();
  } catch (err) {
    console.error('Failed to load state:', err);
    alert('Error loading application data: ' + err.message);
  }
}

function renderAll() {
  renderOrdersTab();
  renderNetworkTab();
  renderPrimsTabControls();
  renderOptimizerTabControls();
}

// ---------------------------------------------------------------------------
// 2. Tab Navigation
// ---------------------------------------------------------------------------

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const targetTab = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach((pane) => pane.classList.remove('active'));
      const activePane = document.getElementById(`pane-${targetTab}`);
      if (activePane) activePane.classList.add('active');

      // Refresh graphs on tab activation
      if (targetTab === 'network' && networkGraph) {
        networkGraph.setData({
          locations: state.locations,
          roads: state.roads,
          positions: state.nodePositions
        });
      } else if (targetTab === 'prims' && primGraph) {
        primGraph.setData({
          locations: state.locations,
          roads: state.roads,
          positions: state.nodePositions
        });
      } else if (targetTab === 'optimizer' && optGraph) {
        optGraph.setData({
          locations: state.locations,
          roads: state.roads,
          positions: state.nodePositions
        });
      }
    });
  });

  // Reset Sample Data Button
  document.getElementById('btn-reset-sample')?.addEventListener('click', async () => {
    if (confirm('Reset to initial sample data? All manual additions and edits will be restored to the initial records.')) {
      try {
        await api('/reset', { method: 'POST' });
        primsData = null;
        deliveryPlan = null;
        await fetchState();
        alert('Initial sample data restored successfully.');
      } catch (err) {
        alert('Reset failed: ' + err.message);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// 3. Tab 1: Orders
// ---------------------------------------------------------------------------

function renderOrdersTab() {
  const tbody = document.getElementById('orders-table-body');
  const countBadge = document.getElementById('orders-count-badge');
  const destSelect = document.getElementById('sel-order-dest');
  const editDestSelect = document.getElementById('edit-order-dest');

  // Populate Destination dropdowns
  const destOptions = state.locations.map(
    (l) => `<option value="${l.id}">${l.id} (${l.name})</option>`
  ).join('');
  if (destSelect) destSelect.innerHTML = destOptions || '<option value="">No locations available</option>';
  if (editDestSelect) editDestSelect.innerHTML = destOptions;

  // Render Table
  if (countBadge) countBadge.textContent = `${state.orders.length} orders`;

  if (!tbody) return;
  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:16px;">No delivery orders found. Add an order above.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.orders.map((o) => {
    const priorityClass = `badge-${o.priority.toLowerCase()}`;
    const statusClass = o.status === 'Delivered' ? 'badge-delivered' : 'badge-pending';
    const isPending = o.status === 'Pending';

    return `
      <tr>
        <td><strong style="font-family:var(--font-mono);">${escapeHtml(o.orderId)}</strong></td>
        <td>${escapeHtml(o.customer)}</td>
        <td><span class="badge" style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1;">${escapeHtml(o.destination || o.customerLocation)}</span></td>
        <td><span class="badge ${priorityClass}">${escapeHtml(o.priority)}</span></td>
        <td><span class="badge ${statusClass}">${escapeHtml(o.status)}</span></td>
        <td style="text-align:right; white-space:nowrap;">
          ${isPending ? `<button class="btn btn-outline btn-sm btn-deliver" data-id="${escapeHtml(o.orderId)}" style="color:var(--success); border-color:#bbf7d0; margin-right:4px;">Mark Delivered</button>` : ''}
          <button class="btn btn-secondary btn-sm btn-edit-order" data-id="${escapeHtml(o.orderId)}" style="margin-right:4px;">Edit</button>
          <button class="btn btn-danger-outline btn-sm btn-del-order" data-id="${escapeHtml(o.orderId)}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function setupOrdersEvents() {
  // Add Order Form
  document.getElementById('form-add-order')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('inp-order-id').value.trim();
    const customer = document.getElementById('inp-order-customer').value.trim();
    const destination = document.getElementById('sel-order-dest').value;
    const priority = document.getElementById('sel-order-priority').value;

    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({ orderId, customer, destination, priority })
      });
      document.getElementById('form-add-order').reset();
      await fetchState();
    } catch (err) {
      alert('Failed to add order: ' + err.message);
    }
  });

  // Table Delegated Actions (Deliver, Edit, Delete)
  document.getElementById('orders-table-body')?.addEventListener('click', async (e) => {
    const deliverBtn = e.target.closest('.btn-deliver');
    if (deliverBtn) {
      const id = deliverBtn.getAttribute('data-id');
      try {
        await api(`/orders/${encodeURIComponent(id)}/deliver`, { method: 'POST' });
        await fetchState();
        if (deliveryPlan) {
          recalculateActivePlan();
        }
      } catch (err) {
        alert('Failed to mark delivered: ' + err.message);
      }
      return;
    }

    const editBtn = e.target.closest('.btn-edit-order');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      const order = state.orders.find((o) => o.orderId === id);
      if (order) openEditOrderModal(order);
      return;
    }

    const delBtn = e.target.closest('.btn-del-order');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      if (confirm(`Delete order ${id}?`)) {
        try {
          await api(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
          await fetchState();
        } catch (err) {
          alert('Failed to delete order: ' + err.message);
        }
      }
    }
  });

  // Edit Order Modal Form
  document.getElementById('form-edit-order')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-order-id').value;
    const customer = document.getElementById('edit-order-customer').value.trim();
    const destination = document.getElementById('edit-order-dest').value;
    const priority = document.getElementById('edit-order-priority').value;
    const status = document.getElementById('edit-order-status').value;

    try {
      await api(`/orders/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ customer, destination, priority, status })
      });
      closeEditOrderModal();
      await fetchState();
    } catch (err) {
      alert('Failed to save order: ' + err.message);
    }
  });

  document.getElementById('btn-cancel-edit-order')?.addEventListener('click', closeEditOrderModal);
}

function openEditOrderModal(order) {
  document.getElementById('edit-order-id').value = order.orderId;
  document.getElementById('edit-order-customer').value = order.customer;
  document.getElementById('edit-order-dest').value = order.destination || order.customerLocation;
  document.getElementById('edit-order-priority').value = order.priority;
  document.getElementById('edit-order-status').value = order.status;
  document.getElementById('modal-edit-order').style.display = 'flex';
}

function closeEditOrderModal() {
  document.getElementById('modal-edit-order').style.display = 'none';
}

// ---------------------------------------------------------------------------
// 4. Tab 2: Road Network
// ---------------------------------------------------------------------------

function initNetworkGraph() {
  const container = document.getElementById('network-graph-container');
  if (container && !networkGraph) {
    networkGraph = new GraphView(container, {
      width: 720,
      height: 340,
      showWeights: true,
      mode: 'network'
    });
  }
}

function renderNetworkTab() {
  initNetworkGraph();
  if (networkGraph) {
    networkGraph.setData({
      locations: state.locations,
      roads: state.roads,
      positions: state.nodePositions
    });
  }

  // Populate Road from/to dropdowns
  const fromSel = document.getElementById('sel-road-from');
  const toSel = document.getElementById('sel-road-to');
  const locOptions = state.locations.map((l) => `<option value="${l.id}">${l.id} (${l.name})</option>`).join('');
  if (fromSel) fromSel.innerHTML = locOptions;
  if (toSel) toSel.innerHTML = locOptions;

  // Render Roads Table
  const rTbody = document.getElementById('roads-table-body');
  if (rTbody) {
    if (state.roads.length === 0) {
      rTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px;">No roads configured.</td></tr>`;
    } else {
      rTbody.innerHTML = state.roads.map((r) => `
        <tr>
          <td><strong style="color:var(--primary); font-family:var(--font-mono);">${escapeHtml(r.start)}</strong></td>
          <td><strong style="color:var(--primary); font-family:var(--font-mono);">${escapeHtml(r.destination)}</strong></td>
          <td>${r.distanceKm} km</td>
          <td style="text-align:right; white-space:nowrap;">
            <button class="btn btn-secondary btn-sm btn-edit-road" data-id="${escapeHtml(r.id)}" data-start="${escapeHtml(r.start)}" data-dest="${escapeHtml(r.destination)}" data-dist="${r.distanceKm}" style="margin-right:4px;">Edit</button>
            <button class="btn btn-danger-outline btn-sm btn-del-road" data-id="${escapeHtml(r.id)}">Delete</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Render Locations Table
  const lTbody = document.getElementById('locations-table-body');
  if (lTbody) {
    if (state.locations.length === 0) {
      lTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:12px;">No locations.</td></tr>`;
    } else {
      lTbody.innerHTML = state.locations.map((l) => `
        <tr>
          <td><strong style="font-family:var(--font-mono);">${escapeHtml(l.id)}</strong></td>
          <td>${escapeHtml(l.name)}</td>
          <td style="text-align:right;">
            <button class="btn btn-danger-outline btn-sm btn-del-loc" data-id="${escapeHtml(l.id)}">Delete</button>
          </td>
        </tr>
      `).join('');
    }
  }
}

function setupNetworkEvents() {
  // Add Location Form
  document.getElementById('form-add-loc')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('inp-loc-id').value.trim().toUpperCase();
    const name = document.getElementById('inp-loc-name').value.trim();

    try {
      await api('/locations', {
        method: 'POST',
        body: JSON.stringify({ id, name, isWarehouse: id === 'W' })
      });
      document.getElementById('form-add-loc').reset();
      await fetchState();
    } catch (err) {
      alert('Failed to add location: ' + err.message);
    }
  });

  // Delete Location
  document.getElementById('locations-table-body')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-del-loc');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (confirm(`Delete location "${id}"?`)) {
      try {
        await api(`/locations/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await fetchState();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  // Add Road Form
  document.getElementById('form-add-road')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const start = document.getElementById('sel-road-from').value;
    const destination = document.getElementById('sel-road-to').value;
    const distanceKm = Number(document.getElementById('inp-road-weight').value);

    if (start === destination) {
      alert('From and To locations cannot be the same.');
      return;
    }

    try {
      await api('/roads', {
        method: 'POST',
        body: JSON.stringify({ start, destination, distanceKm })
      });
      document.getElementById('inp-road-weight').value = '';
      await fetchState();
    } catch (err) {
      alert('Failed to add road: ' + err.message);
    }
  });

  // Edit / Delete Road
  document.getElementById('roads-table-body')?.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.btn-del-road');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      if (confirm('Delete this road?')) {
        try {
          await api(`/roads/${encodeURIComponent(id)}`, { method: 'DELETE' });
          await fetchState();
        } catch (err) {
          alert('Failed to delete road: ' + err.message);
        }
      }
      return;
    }

    const editBtn = e.target.closest('.btn-edit-road');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      const start = editBtn.getAttribute('data-start');
      const dest = editBtn.getAttribute('data-dest');
      const dist = editBtn.getAttribute('data-dist');
      openEditRoadModal(id, start, dest, dist);
    }
  });

  // Edit Road Modal Form
  document.getElementById('form-edit-road')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-road-id').value;
    const distanceKm = Number(document.getElementById('edit-road-dist').value);

    try {
      await api(`/roads/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ distanceKm })
      });
      closeEditRoadModal();
      await fetchState();
    } catch (err) {
      alert('Failed to update road: ' + err.message);
    }
  });

  document.getElementById('btn-cancel-edit-road')?.addEventListener('click', closeEditRoadModal);
}

function openEditRoadModal(id, start, dest, dist) {
  document.getElementById('edit-road-id').value = id;
  document.getElementById('edit-road-endpoints-text').textContent = `Road: ${start} ➔ ${dest}`;
  document.getElementById('edit-road-dist').value = dist;
  document.getElementById('modal-edit-road').style.display = 'flex';
}

function closeEditRoadModal() {
  document.getElementById('modal-edit-road').style.display = 'none';
}

// ---------------------------------------------------------------------------
// 5. Tab 3: Prim's Algorithm
// ---------------------------------------------------------------------------

function initPrimGraph() {
  const container = document.getElementById('prim-graph-container');
  if (container && !primGraph) {
    primGraph = new GraphView(container, {
      width: 720,
      height: 340,
      showWeights: true,
      mode: 'prims'
    });
  }
}

function renderPrimsTabControls() {
  initPrimGraph();
  if (primGraph) {
    primGraph.setData({
      locations: state.locations,
      roads: state.roads,
      positions: state.nodePositions
    });
  }

  const startSel = document.getElementById('sel-prim-start');
  if (startSel) {
    const currentVal = startSel.value;
    startSel.innerHTML = state.locations.map(
      (l) => `<option value="${l.id}">${l.id} (${l.name})</option>`
    ).join('');
    if (currentVal && state.locations.some((l) => l.id === currentVal)) {
      startSel.value = currentVal;
    } else if (state.locations.some((l) => l.id === 'W')) {
      startSel.value = 'W';
    }
  }
}

async function runPrimAlgorithm() {
  const startNode = document.getElementById('sel-prim-start').value || 'W';
  try {
    const data = await api('/prims', {
      method: 'POST',
      body: JSON.stringify({ startNode })
    });

    primsData = data;
    primFinalMstOnly = false;
    updateToggleViewButton();

    // Start at step 0 or completed run:
    // When user clicks Run, initialize trace and jump to the full completed run
    // so they see the result immediately, while enabling step inspection controls
    primCurrentStep = primsData.trace.length - 1;
    renderPrimStep(primCurrentStep);
  } catch (err) {
    alert('Failed to execute Prim algorithm: ' + err.message);
  }
}

function renderPrimStep(stepIdx) {
  if (!primsData || !primsData.trace || primsData.trace.length === 0) return;
  if (stepIdx < 0) stepIdx = 0;
  if (stepIdx >= primsData.trace.length) stepIdx = primsData.trace.length - 1;
  primCurrentStep = stepIdx;

  const step = primsData.trace[stepIdx];
  const stepInd = document.getElementById('prim-step-indicator');
  if (stepInd) {
    stepInd.textContent = `Step ${stepIdx + 1} of ${primsData.trace.length}`;
  }

  // Explanation
  const expBox = document.getElementById('prim-step-explanation');
  if (expBox) expBox.textContent = step.explanation;

  // Running metrics
  document.getElementById('prim-metric-weight').textContent = `${step.runningWeight} km`;
  document.getElementById('prim-metric-selected').textContent = step.selectedEdges.length;
  document.getElementById('prim-metric-excluded').textContent = primsData.excludedEdgesCount || 0;
  document.getElementById('prim-metric-status').textContent = primsData.isConnected ? 'Connected (Single MST)' : 'Disconnected';

  // Disconnected box
  const discBox = document.getElementById('prim-disconnected-box');
  if (discBox) {
    discBox.style.display = primsData.isConnected ? 'none' : 'block';
    if (!primsData.isConnected) {
      discBox.innerHTML = `<strong>Graph Disconnected:</strong> One MST covering every vertex does not exist. Reachable: { ${primsData.mstVertices.join(', ')} }, Unreachable: { ${primsData.unreachedVertices.join(', ')} }.`;
    }
  }

  // Render Table of Selected Edges up to this step
  const tbody = document.getElementById('prim-edges-table-body');
  if (tbody) {
    if (step.selectedEdges.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:14px;">No tree edges selected yet (Step 1 is root initialization).</td></tr>`;
    } else {
      tbody.innerHTML = step.selectedEdges.map((e, idx) => `
        <tr>
          <td><strong style="color:var(--text-muted); font-size:0.8rem;">#${idx + 1}</strong></td>
          <td><strong style="color:var(--primary); font-family:var(--font-mono);">${escapeHtml(e.from)}</strong></td>
          <td><strong style="color:var(--primary); font-family:var(--font-mono);">${escapeHtml(e.to)}</strong></td>
          <td>${e.weight} km</td>
          <td><span class="badge badge-delivered">MST Edge ✓</span></td>
        </tr>
      `).join('');
    }
  }

  // Update Graph Visualization
  if (primGraph) {
    primGraph.setData({
      locations: state.locations,
      roads: state.roads,
      positions: state.nodePositions,
      mstEdges: step.selectedEdges,
      finalMstOnly: primFinalMstOnly,
      visitedNodes: step.currentTree,
      currentEdge: step.type === 'add_mst_edge' ? { from: step.from, to: step.to } : null
    });
  }
}

function updateToggleViewButton() {
  const btn = document.getElementById('btn-prim-toggle-view');
  const title = document.getElementById('prim-view-title');
  if (btn) {
    btn.textContent = primFinalMstOnly ? 'Show Original Graph' : 'Show Final MST';
  }
  if (title) {
    title.textContent = primFinalMstOnly
      ? "Prim's Final Minimum Spanning Tree (MST)"
      : "Prim's Algorithm Execution View";
  }
}

function setupPrimEvents() {
  document.getElementById('btn-prim-run')?.addEventListener('click', runPrimAlgorithm);

  document.getElementById('btn-prim-prev')?.addEventListener('click', () => {
    if (primsData && primCurrentStep > 0) {
      renderPrimStep(primCurrentStep - 1);
    }
  });

  document.getElementById('btn-prim-next')?.addEventListener('click', () => {
    if (primsData && primCurrentStep < primsData.trace.length - 1) {
      renderPrimStep(primCurrentStep + 1);
    }
  });

  document.getElementById('btn-prim-reset')?.addEventListener('click', () => {
    if (primsData) {
      if (primPlayTimer) {
        clearInterval(primPlayTimer);
        primPlayTimer = null;
        document.getElementById('btn-prim-play').textContent = 'Play';
      }
      renderPrimStep(0);
    }
  });

  document.getElementById('btn-prim-play')?.addEventListener('click', () => {
    if (!primsData) return;
    const btn = document.getElementById('btn-prim-play');

    if (primPlayTimer) {
      clearInterval(primPlayTimer);
      primPlayTimer = null;
      btn.textContent = 'Play';
    } else {
      btn.textContent = 'Pause';
      if (primCurrentStep >= primsData.trace.length - 1) {
        primCurrentStep = 0;
      }
      primPlayTimer = setInterval(() => {
        if (primCurrentStep < primsData.trace.length - 1) {
          renderPrimStep(primCurrentStep + 1);
        } else {
          clearInterval(primPlayTimer);
          primPlayTimer = null;
          btn.textContent = 'Play';
        }
      }, 1000);
    }
  });

  // Toggle Final MST view (displays ONLY the selected MST edges, hiding unselected edges without deleting them!)
  document.getElementById('btn-prim-toggle-view')?.addEventListener('click', () => {
    if (!primsData) {
      alert("Please click 'Run' first to compute the Minimum Spanning Tree.");
      return;
    }
    primFinalMstOnly = !primFinalMstOnly;
    updateToggleViewButton();

    if (primFinalMstOnly) {
      // In final MST view, show all final selected edges
      primCurrentStep = primsData.trace.length - 1;
    }
    renderPrimStep(primCurrentStep);
  });
}

// ---------------------------------------------------------------------------
// 6. Tab 4: Delivery Optimization
// ---------------------------------------------------------------------------

function initOptGraph() {
  const container = document.getElementById('opt-graph-container');
  if (container && !optGraph) {
    optGraph = new GraphView(container, {
      width: 720,
      height: 340,
      showWeights: true,
      mode: 'route'
    });
  }
}

function renderOptimizerTabControls() {
  initOptGraph();
  if (optGraph) {
    optGraph.setData({
      locations: state.locations,
      roads: state.roads,
      positions: state.nodePositions
    });
  }

  const whSel = document.getElementById('sel-opt-warehouse');
  if (whSel) {
    const currentVal = whSel.value;
    whSel.innerHTML = state.locations.map(
      (l) => `<option value="${l.id}">${l.id} (${l.name})</option>`
    ).join('');
    if (currentVal && state.locations.some((l) => l.id === currentVal)) {
      whSel.value = currentVal;
    } else if (state.locations.some((l) => l.id === 'W')) {
      whSel.value = 'W';
    }
  }
}

async function runDeliveryOptimization() {
  const startWarehouse = document.getElementById('sel-opt-warehouse').value || 'W';
  const metric = document.getElementById('sel-opt-metric').value || 'distance';
  const returnToWarehouse = document.getElementById('chk-opt-return').checked;

  try {
    const plan = await api('/optimize', {
      method: 'POST',
      body: JSON.stringify({ startWarehouse, metric, returnToWarehouse })
    });

    deliveryPlan = plan;
    renderDeliveryPlan(plan);
  } catch (err) {
    alert('Failed to generate delivery route: ' + err.message);
  }
}

async function recalculateActivePlan() {
  if (!deliveryPlan) return;
  const startWarehouse = document.getElementById('sel-opt-warehouse').value || 'W';
  const metric = document.getElementById('sel-opt-metric').value || 'distance';
  const returnToWarehouse = document.getElementById('chk-opt-return').checked;

  try {
    const plan = await api('/optimize', {
      method: 'POST',
      body: JSON.stringify({ startWarehouse, metric, returnToWarehouse })
    });
    deliveryPlan = plan;
    renderDeliveryPlan(plan);
  } catch (err) {
    console.error('Failed to recalculate plan:', err);
  }
}

function renderDeliveryPlan(plan) {
  const summary = plan.summary || {};
  document.getElementById('opt-metric-dist').textContent = `${summary.totalDistanceKm || 0} km`;
  document.getElementById('opt-metric-time').textContent = `${summary.totalTravelTimeMin || 0} min`;
  document.getElementById('opt-metric-orders').textContent = `${summary.deliveredOrders || 0} / ${summary.totalOrders || 0}`;
  document.getElementById('opt-plan-status').textContent = `Route planned: ${summary.totalDistanceKm || 0} km`;

  const tbody = document.getElementById('opt-route-table-body');
  if (!tbody) return;

  const route = plan.route || [];
  if (route.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:16px;">All orders are delivered! No pending deliveries.</td></tr>`;
  } else {
    tbody.innerHTML = route.map((stop, idx) => {
      const isReturn = stop.status === 'Return';
      const orderId = isReturn ? 'RETURN' : (stop.orderId || '-');
      const customer = isReturn ? 'Return to Warehouse' : (stop.customer || '-');
      const dest = stop.destination || stop.customerLocation || stop.location || '-';
      const priority = isReturn ? '-' : (stop.priority || 'Medium');
      const priorityClass = isReturn ? '' : `badge-${priority.toLowerCase()}`;

      return `
        <tr style="${isReturn ? 'background:#f8fafc; font-style:italic;' : ''}">
          <td><strong>#${idx + 1}</strong></td>
          <td><strong style="font-family:var(--font-mono);">${escapeHtml(orderId)}</strong></td>
          <td>${escapeHtml(customer)}</td>
          <td><span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">${escapeHtml(dest)}</span></td>
          <td>${isReturn ? '-' : `<span class="badge ${priorityClass}">${escapeHtml(priority)}</span>`}</td>
          <td>${stop.legDistanceKm || 0} km</td>
          <td><strong>${stop.cumulativeDistanceKm || 0} km</strong></td>
          <td style="text-align:right;">
            ${!isReturn ? `<button class="btn btn-outline btn-sm btn-plan-deliver" data-id="${escapeHtml(stop.orderId)}" style="color:var(--success); border-color:#bbf7d0;">Mark Delivered</button>` : `<span style="font-size:0.75rem; color:var(--text-muted);">End of Tour</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Highlight on Opt Graph View
  if (optGraph) {
    const fullPath = [];
    route.forEach((s) => {
      if (s.path && Array.isArray(s.path.path)) {
        s.path.path.forEach((node, i) => {
          if (fullPath.length === 0 || fullPath[fullPath.length - 1] !== node) {
            fullPath.push(node);
          }
        });
      }
    });

    optGraph.setData({
      locations: state.locations,
      roads: state.roads,
      positions: state.nodePositions,
      highlightedPath: fullPath,
      routeStops: route.filter((r) => r.status !== 'Return')
    });
  }
}

function setupOptimizerEvents() {
  document.getElementById('btn-generate-route')?.addEventListener('click', runDeliveryOptimization);

  // Table Delegated Mark Delivered on Optimizer tab
  document.getElementById('opt-route-table-body')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-plan-deliver');
    if (!btn) return;
    const orderId = btn.getAttribute('data-id');
    try {
      await api(`/orders/${encodeURIComponent(orderId)}/deliver`, { method: 'POST' });
      await fetchState();
      await recalculateActivePlan();
    } catch (err) {
      alert('Failed to mark delivered: ' + err.message);
    }
  });
}

// ---------------------------------------------------------------------------
// 7. Security / Helper
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// 8. Application Startup
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupOrdersEvents();
  setupNetworkEvents();
  setupPrimEvents();
  setupOptimizerEvents();
  fetchState();
});
