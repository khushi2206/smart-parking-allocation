/**
 * RouteWise - Overview Page Logic
 */

import { apiFetch, renderAppShell, renderPriorityBadge, renderStatusPill, formatMinutes } from './common.js';
import { GraphView } from './graph-view.js';

let graphViewInstance = null;

async function initOverview() {
  renderAppShell('overview', 'Dashboard Overview', 'Real-time multi-warehouse network statistics and active routing state');

  try {
    const data = await apiFetch('/overview');
    const summary = data.summary || {};

    // Update Stats
    document.getElementById('stat-warehouses').textContent = summary.totalWarehouses ?? 0;
    document.getElementById('stat-locations').textContent = summary.totalLocations ?? 0;
    document.getElementById('stat-roads').textContent = summary.totalRoads ?? 0;
    document.getElementById('stat-pending').textContent = summary.pendingOrders ?? 0;
    document.getElementById('stat-delivered').textContent = summary.deliveredOrders ?? 0;
    document.getElementById('stat-unreachable').textContent = summary.unreachableOrders ?? 0;

    const isEmpty = (summary.totalLocations === 0 && summary.totalWarehouses === 0);
    const emptyPanel = document.getElementById('overview-empty-panel');
    const activeContent = document.getElementById('overview-active-content');

    if (isEmpty) {
      if (emptyPanel) emptyPanel.style.display = 'block';
      if (activeContent) activeContent.style.display = 'none';
      return;
    }

    if (emptyPanel) emptyPanel.style.display = 'none';
    if (activeContent) activeContent.style.display = 'flex';

    // Populate Warehouses Table
    const whBody = document.getElementById('overview-warehouses-body');
    if (whBody) {
      if (!data.warehouses || data.warehouses.length === 0) {
        whBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:20px;">No warehouses created yet.</td></tr>`;
      } else {
        whBody.innerHTML = data.warehouses.map((w) => `
          <tr>
            <td>
              <div style="font-weight:600; color:#0f172a;">${w.name}</div>
              ${w.isDefault ? '<span class="badge badge-normal" style="font-size:0.68rem; margin-top:2px;">Default Hub</span>' : ''}
            </td>
            <td><span style="font-family:var(--font-mono); color:#2563eb; font-weight:600;">${w.location}</span></td>
            <td>${w.capacityKg} kg</td>
          </tr>
        `).join('');
      }
    }

    // Populate Orders Table
    const ordersBody = document.getElementById('overview-orders-body');
    if (ordersBody) {
      if (!data.recentOrders || data.recentOrders.length === 0) {
        ordersBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:24px;">No delivery orders yet.</td></tr>`;
      } else {
        ordersBody.innerHTML = data.recentOrders.map((o) => `
          <tr>
            <td style="font-family:var(--font-mono); font-weight:700; color:#0f172a;">${o.orderId}</td>
            <td><strong>${o.customerLocation}</strong></td>
            <td>${o.warehouseId === 'any' ? '<span style="color:#64748b;">Auto / Any</span>' : (o.warehouseId || '-')}</td>
            <td>${renderPriorityBadge(o.priority)}</td>
            <td>${o.packageWeightKg} kg</td>
            <td>${formatMinutes(o.serviceTimeMin)}</td>
            <td>${renderStatusPill(o.status)}</td>
          </tr>
        `).join('');
      }
    }

    // Initialize compact graph preview
    const graphContainer = document.getElementById('overview-graph-container');
    if (graphContainer) {
      graphViewInstance = new GraphView(graphContainer, {
        height: 360,
        showWeights: true,
        interactive: true
      });
      await graphViewInstance.loadData();
    }
  } catch (err) {
    console.error('Overview init failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', initOverview);
