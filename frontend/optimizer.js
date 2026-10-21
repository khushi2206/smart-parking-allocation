/**
 * RouteWise - Multi-Warehouse Route Optimizer Page Logic
 */

import { apiFetch, renderAppShell, showToast, renderPriorityBadge, renderStatusPill, formatMinutes, formatDistance, formatCurrency } from './common.js';
import { GraphView } from './graph-view.js';

let warehouses = [];
let locations = [];
let roads = [];
let orders = [];
let positions = {};
let latestPlan = null;
let graphView = null;

async function loadData() {
  try {
    const [whRes, locRes, rdRes, ordRes, posRes] = await Promise.all([
      apiFetch('/warehouses'),
      apiFetch('/locations'),
      apiFetch('/roads'),
      apiFetch('/orders'),
      apiFetch('/graph/positions')
    ]);

    warehouses = whRes.warehouses || [];
    locations = locRes.locations || [];
    roads = rdRes.roads || [];
    orders = ordRes.orders || [];
    positions = posRes.positions || {};

    populateWarehouseDropdown();
    populateOrdersChecklist();
  } catch (err) {
    console.error('Failed to load optimizer inputs:', err);
  }
}

function populateWarehouseDropdown() {
  const select = document.getElementById('opt-start-wh');
  if (!select) return;

  if (warehouses.length === 0) {
    select.innerHTML = '<option value="">No warehouses found - create one first</option>';
    return;
  }

  select.innerHTML = warehouses.map((w) => `
    <option value="${w.name}" ${w.isDefault ? 'selected' : ''}>
      ${w.name} (at ${w.location}, cap: ${w.capacityKg}kg)${w.isDefault ? ' [Default]' : ''}
    </option>
  `).join('');
}

function populateOrdersChecklist() {
  const container = document.getElementById('orders-checklist-container');
  if (!container) return;

  const eligibleOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Planned');

  if (eligibleOrders.length === 0) {
    container.innerHTML = `
      <div style="padding:14px; text-align:center; color:#94a3b8; font-size:0.85rem;">
        No pending or planned orders found. <a href="/orders.html" style="color:#2563eb; font-weight:600;">Create orders in Delivery Orders page</a>.
      </div>
    `;
    return;
  }

  container.innerHTML = eligibleOrders.map((o) => `
    <label class="form-check" style="padding:6px 10px; border-radius:4px; border:1px solid #f1f5f9; background:#fafbfc; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" class="order-chk" value="${o.orderId}" checked>
        <strong style="color:#0f172a; font-family:var(--font-mono);">${o.orderId}</strong>
        <span>➔ <strong>${o.customerLocation}</strong></span>
        ${renderPriorityBadge(o.priority)}
      </div>
      <div style="font-size:0.75rem; color:#64748b; font-family:var(--font-mono);">
        ${o.packageWeightKg}kg · svc: ${o.serviceTimeMin}m
      </div>
    </label>
  `).join('');
}

async function runOptimization() {
  const startWarehouse = document.getElementById('opt-start-wh').value;
  const objective = document.getElementById('opt-objective')?.value || 'distance';
  const autoWarehouse = document.getElementById('opt-auto-wh').checked;
  const returnToWarehouse = document.getElementById('opt-return-wh').checked;

  const selectedOrderIds = Array.from(document.querySelectorAll('.order-chk:checked')).map((cb) => cb.value);

  if (selectedOrderIds.length === 0) {
    showToast('Please select at least one order to optimize.', 'error');
    return;
  }

  if (!startWarehouse) {
    showToast('Please select a starting warehouse.', 'error');
    return;
  }

  try {
    const result = await apiFetch('/optimize', {
      method: 'POST',
      body: JSON.stringify({
        startWarehouse,
        orderIds: selectedOrderIds,
        objective,
        autoWarehouse,
        returnToWarehouse,
        markAsPlanned: true
      })
    });

    latestPlan = result;
    renderPlanResults(result);
    showToast('Optimal delivery tour computed!', 'success');
  } catch {
    // Handled in apiFetch
  }
}

function renderPlanResults(result) {
  const container = document.getElementById('optimizer-results-container');
  if (!container) return;
  container.style.display = 'flex';

  const summary = result.summary || {};
  document.getElementById('opt-res-distance').textContent = formatDistance(summary.totalDistanceKm);
  document.getElementById('opt-res-travel-time').textContent = formatMinutes(summary.totalTravelTimeMin);
  document.getElementById('opt-res-service-time').textContent = formatMinutes(summary.totalServiceTimeMin);
  document.getElementById('opt-res-cost').textContent = formatCurrency(summary.totalCostRupees);
  document.getElementById('opt-res-delivered-count').textContent = `${summary.deliveredOrders} of ${summary.totalOrders}`;

  const onTimeBox = document.getElementById('opt-res-ontime-count');
  const lateDesc = document.getElementById('opt-res-late-desc');
  if (onTimeBox) onTimeBox.textContent = `${summary.onTimeOrders} On-Time`;
  if (lateDesc) {
    lateDesc.textContent = summary.lateOrders > 0 ? `${summary.lateOrders} late warning(s)` : 'All deadlines met';
    lateDesc.style.color = summary.lateOrders > 0 ? '#dc2626' : '#16a34a';
  }

  // Populate Stops Table
  const tbody = document.getElementById('optimizer-stops-body');
  if (tbody) {
    const route = result.route || [];
    tbody.innerHTML = route.map((stop) => {
      const isReturn = stop.orderId === 'RETURN';
      const pathStr = stop.path && stop.path.path ? stop.path.path.join(' ➔ ') : 'Direct';
      const deadlineBadge = stop.deadlineStatus === 'Late'
        ? '<span class="badge badge-critical">Late (' + stop.latenessMin + 'm)</span>'
        : (stop.deadlineStatus === 'On time' ? '<span class="badge badge-normal" style="background:#f0fdf4; color:#16a34a; border-color:#bbf7d0;">On Time</span>' : stop.deadlineStatus || '-');

      return `
        <tr>
          <td><strong style="color:#2563eb;">#${stop.sequence}</strong></td>
          <td style="font-family:var(--font-mono); font-weight:700;">${isReturn ? '<span class="badge badge-default">RETURN</span>' : stop.orderId}</td>
          <td><strong>${stop.customerLocation}</strong></td>
          <td>${isReturn ? '-' : renderPriorityBadge(stop.priority)}</td>
          <td>${stop.servingWarehouse || '-'}</td>
          <td>${formatDistance(stop.legDistanceKm)}</td>
          <td>${formatMinutes(stop.legTravelTimeMin)}</td>
          <td>${formatMinutes(stop.serviceTimeMin)}</td>
          <td>${formatCurrency(stop.legCostRupees)}</td>
          <td style="font-size:0.75rem; font-family:var(--font-mono);">${stop.arrivalTime ? new Date(stop.arrivalTime).toLocaleTimeString() : '-'}</td>
          <td>${deadlineBadge}</td>
          <td style="font-size:0.75rem; font-family:var(--font-mono); color:#475569;">${pathStr}</td>
        </tr>
      `;
    }).join('');
  }

  // Highlight tour on SVG Graph
  const graphContainer = document.getElementById('optimizer-graph-container');
  if (graphContainer) {
    if (!graphView) {
      graphView = new GraphView(graphContainer, {
        height: 480,
        showWeights: true,
        interactive: true
      });
    }

    // Collect all nodes in route sequence
    const fullTourNodes = [];
    (result.route || []).forEach((r) => {
      if (r.path && r.path.path) {
        r.path.path.forEach((loc) => {
          if (!fullTourNodes.includes(loc)) fullTourNodes.push(loc);
        });
      }
    });

    graphView.setData({
      locations,
      roads,
      warehouses,
      positions,
      highlightedPath: fullTourNodes,
      routeStops: result.route || []
    });
  }
}

function setupEvents() {
  // Select / Deselect All Orders
  document.getElementById('btn-select-all-orders')?.addEventListener('click', () => {
    document.querySelectorAll('.order-chk').forEach((cb) => (cb.checked = true));
  });

  document.getElementById('btn-deselect-all-orders')?.addEventListener('click', () => {
    document.querySelectorAll('.order-chk').forEach((cb) => (cb.checked = false));
  });

  // Optimizer submit
  document.getElementById('optimizer-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    runOptimization();
  });

  // Mark Route Delivered
  document.getElementById('btn-mark-all-delivered')?.addEventListener('click', async () => {
    if (!latestPlan || !latestPlan.route) return;
    const orderIds = latestPlan.route
      .filter((r) => r.orderId && r.orderId !== 'RETURN' && r.status === 'Delivered')
      .map((r) => r.orderId);

    if (orderIds.length === 0) {
      showToast('No delivered orders to mark.', 'info');
      return;
    }

    await apiFetch('/orders/batch-deliver', {
      method: 'POST',
      body: JSON.stringify({ orderIds })
    });
    showToast(`Marked ${orderIds.length} orders as Delivered!`, 'success');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('optimizer', 'Multi-Warehouse Route Optimizer', "Prim's MST algorithm & priority-aware greedy cut combined with Dijkstra shortest paths");
  setupEvents();
  await loadData();
});
