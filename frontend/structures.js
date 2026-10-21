/**
 * RouteWise - Data Structures Explorer Page Logic
 */

import { apiFetch, renderAppShell, renderPriorityBadge, renderStatusPill, formatMinutes, formatDistance, formatCurrency } from './common.js';

let structuresData = null;
let isRawView = false;

async function loadStructures() {
  try {
    structuresData = await apiFetch('/structures');
    renderAllTabs();
  } catch (err) {
    console.error('Failed to load structures data:', err);
  }
}

function renderAllTabs() {
  if (!structuresData) return;

  // 1. Adjacency List
  const graphData = structuresData.weightedGraph || {};
  const graphHuman = document.getElementById('graph-human-view');
  const graphRaw = document.getElementById('graph-raw-view');
  if (graphRaw) graphRaw.textContent = JSON.stringify(graphData, null, 2);

  if (graphHuman) {
    const adj = graphData.adjacency || {};
    const locations = Object.keys(adj);

    if (locations.length === 0) {
      graphHuman.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-title">Adjacency List is Empty</div><div class="empty-text">Add locations and roads in the Road Network page to populate the graph adjacency list.</div></div>`;
    } else {
      graphHuman.innerHTML = locations.map((loc) => {
        const edges = adj[loc] || [];
        return `
          <div class="panel" style="box-shadow:none; border:1px solid #e2e8f0;">
            <div class="panel-header" style="background:#f8fafc; padding:10px 14px;">
              <span style="font-weight:700; color:#0f172a; font-family:var(--font-mono);">Vertex: "${loc}"</span>
              <span class="badge badge-normal">${edges.length} outgoing</span>
            </div>
            <div class="panel-body" style="padding:12px;">
              ${edges.length === 0
                ? '<span style="color:#94a3b8; font-size:0.8rem;">No outbound edges</span>'
                : `<div style="display:flex; flex-direction:column; gap:8px;">
                    ${edges.map((e) => `
                      <div style="font-size:0.82rem; padding:6px 8px; background:#fafbfc; border-radius:4px; border:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                          <strong style="color:#2563eb;">➔ ${e.destination}</strong>
                          <span style="font-size:0.72rem; color:#64748b;">(${e.bidirectional ? 'two-way' : 'one-way'})</span>
                        </div>
                        <div style="font-family:var(--font-mono); font-size:0.75rem; color:#334155;">
                          ${e.distanceKm}km | ${e.travelTimeMin}m | ₹${e.costRupees}
                        </div>
                      </div>
                    `).join('')}
                  </div>`
              }
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Binary Min-Heap (PQ)
  const heapData = structuresData.priorityQueue || {};
  const heapHuman = document.getElementById('heap-human-view');
  const heapRaw = document.getElementById('heap-raw-view');
  if (heapRaw) heapRaw.textContent = JSON.stringify(heapData, null, 2);

  if (heapHuman) {
    heapHuman.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-header">Structure Type</div>
          <div style="font-size:1.1rem; font-weight:700; color:#0f172a; margin-top:4px;">Binary Min-Heap</div>
          <div class="stat-desc">Array-backed complete binary tree</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">Dijkstra Heap Operations</div>
          <div class="stat-value" style="font-size:1.8rem; color:#2563eb;">${heapData.latestDijkstraOperations}</div>
          <div class="stat-desc">Bubble-up and bubble-down steps</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">Optimizer PQ Operations</div>
          <div class="stat-value" style="font-size:1.8rem; color:#16a34a;">${heapData.optimizerQueueOperations}</div>
          <div class="stat-desc">Candidate order queue comparisons</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Binary Heap Invariants & Mathematics</span>
        </div>
        <div class="panel-body" style="font-size:0.86rem; color:#334155; line-height:1.6;">
          <p>The MinPriorityQueue stores entries in an array <code>H[0 ... n-1]</code> maintaining the Min-Heap property:</p>
          <ul style="margin-left:20px; margin-top:8px;">
            <li><strong>Parent node index:</strong> <code>parent(i) = Math.floor((i - 1) / 2)</code></li>
            <li><strong>Left child index:</strong> <code>left(i) = 2 * i + 1</code></li>
            <li><strong>Right child index:</strong> <code>right(i) = 2 * i + 2</code></li>
            <li><strong>Min-Heap Invariant:</strong> <code>H[parent(i)].key &le; H[i].key</code> for all <code>i &gt; 0</code>.</li>
            <li><strong>Time Complexity:</strong> Insert = <code>O(log V)</code>, Extract-Min = <code>O(log V)</code>, Peek = <code>O(1)</code>.</li>
          </ul>
        </div>
      </div>
    `;
  }

  // 3. Distance & Predecessor Maps
  const distTable = structuresData.distanceTable || {};
  const predMap = structuresData.predecessorMap || {};
  const distHuman = document.getElementById('distances-human-view');
  const distRaw = document.getElementById('distances-raw-view');
  if (distRaw) distRaw.textContent = JSON.stringify({ distanceTable: distTable, predecessorMap: predMap }, null, 2);

  if (distHuman) {
    if (!distTable.hasDijkstraRun) {
      distHuman.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No Dijkstra execution recorded yet</div>
          <div class="empty-text">Run Dijkstra shortest path search to inspect real-time relaxation of distances and predecessor pointers.</div>
          <a href="/dijkstra.html" class="btn btn-primary btn-sm">Go to Dijkstra Page →</a>
        </div>
      `;
    } else {
      const entries = Object.entries(distTable.table || {});
      distHuman.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vertex (Location)</th>
                <th>Best Known Distance / Score</th>
                <th>Predecessor Node</th>
                <th>Path Status</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(([loc, score]) => {
                const pred = predMap.map ? predMap.map[loc] : null;
                const isFiniteVal = Number.isFinite(score);
                return `
                  <tr>
                    <td style="font-weight:700; color:#0f172a;">${loc}</td>
                    <td style="font-family:var(--font-mono); font-weight:600; color:${isFiniteVal ? '#2563eb' : '#94a3b8'};">
                      ${isFiniteVal ? score : '∞ (Unreached)'}
                    </td>
                    <td>
                      ${pred ? `<span class="badge badge-normal">${pred}</span>` : '<span style="color:#94a3b8;">None (Origin or Unreached)</span>'}
                    </td>
                    <td>
                      ${isFiniteVal
                        ? '<span class="status-pill status-delivered"><span class="dot"></span>Relaxed</span>'
                        : '<span class="status-pill status-unreachable"><span class="dot"></span>Unreachable</span>'
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // 4. Visited Set
  const visitedData = structuresData.visitedSet || {};
  const visitedHuman = document.getElementById('visited-human-view');
  const visitedRaw = document.getElementById('visited-raw-view');
  if (visitedRaw) visitedRaw.textContent = JSON.stringify(visitedData, null, 2);

  if (visitedHuman) {
    if (!visitedData.hasDijkstraRun) {
      visitedHuman.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No Visited Set Available</div>
          <div class="empty-text">Run Dijkstra or the Route Optimizer to populate the explored vertices set.</div>
          <a href="/dijkstra.html" class="btn btn-primary btn-sm">Run Dijkstra Algorithm</a>
        </div>
      `;
    } else {
      const nodes = visitedData.visitedNodes || [];
      visitedHuman.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Explored Sequence (${nodes.length} vertices)</span>
          </div>
          <div class="panel-body">
            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
              ${nodes.map((n, idx) => `
                <div style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; font-weight:600; color:#1d4ed8; font-size:0.85rem;">
                  <span style="font-size:0.75rem; color:#60a5fa;">#${idx + 1}</span>
                  <span>${n}</span>
                </div>
                ${idx < nodes.length - 1 ? '<span style="color:#94a3b8; font-weight:bold;">➔</span>' : ''}
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  }

  // 5. Warehouse Collection
  const whData = structuresData.warehouseCollection || {};
  const whHuman = document.getElementById('wh-human-view');
  const whRaw = document.getElementById('wh-raw-view');
  if (whRaw) whRaw.textContent = JSON.stringify(whData, null, 2);

  if (whHuman) {
    const items = whData.items || [];
    if (items.length === 0) {
      whHuman.innerHTML = `<div class="empty-state"><div class="empty-title">No Warehouses Registered</div><div class="empty-text">Add warehouses in Warehouse Management.</div></div>`;
    } else {
      whHuman.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location Node</th>
                <th>Capacity</th>
                <th>Default Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((w) => `
                <tr>
                  <td style="font-family:var(--font-mono); font-weight:700;">${w.id}</td>
                  <td style="font-weight:600;">${w.name}</td>
                  <td><strong>${w.location}</strong></td>
                  <td>${w.capacityKg} kg</td>
                  <td>${w.isDefault ? '<span class="badge badge-normal">Default Hub</span>' : 'Secondary'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // 6. Orders Collection
  const ordData = structuresData.deliveryOrderCollection || {};
  const ordHuman = document.getElementById('orders-human-view');
  const ordRaw = document.getElementById('orders-raw-view');
  if (ordRaw) ordRaw.textContent = JSON.stringify(ordData, null, 2);

  if (ordHuman) {
    const items = ordData.items || [];
    if (items.length === 0) {
      ordHuman.innerHTML = `<div class="empty-state"><div class="empty-title">No Orders Registered</div><div class="empty-text">Create orders in Delivery Orders page.</div></div>`;
    } else {
      ordHuman.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Location</th>
                <th>Priority</th>
                <th>Weight</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((o) => `
                <tr>
                  <td style="font-family:var(--font-mono); font-weight:700;">${o.orderId}</td>
                  <td><strong>${o.customerLocation}</strong></td>
                  <td>${renderPriorityBadge(o.priority)}</td>
                  <td>${o.packageWeightKg} kg</td>
                  <td>${renderStatusPill(o.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // 7. Final Delivery Sequence
  const seqData = structuresData.finalDeliverySequence || {};
  const seqHuman = document.getElementById('seq-human-view');
  const seqRaw = document.getElementById('seq-raw-view');
  if (seqRaw) seqRaw.textContent = JSON.stringify(seqData, null, 2);

  if (seqHuman) {
    if (!seqData.hasOptimizationRun) {
      seqHuman.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No Optimization Run Available</div>
          <div class="empty-text">Execute the Multi-Warehouse Route Optimizer to calculate a prioritized delivery sequence.</div>
          <a href="/optimizer.html" class="btn btn-primary btn-sm">Go to Route Optimizer →</a>
        </div>
      `;
    } else {
      const stops = seqData.stops || [];
      seqHuman.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Stop #</th>
                <th>Order / Action</th>
                <th>Destination</th>
                <th>Serving Warehouse</th>
                <th>Leg Distance</th>
                <th>Leg Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${stops.map((s) => `
                <tr>
                  <td><strong>#${s.sequence}</strong></td>
                  <td style="font-family:var(--font-mono); font-weight:700;">${s.orderId}</td>
                  <td><strong>${s.customerLocation || s.location || '-'}</strong></td>
                  <td>${s.servingWarehouse || '-'}</td>
                  <td>${s.legDistanceKm != null ? formatDistance(s.legDistanceKm) : (s.path?.distanceKm ? formatDistance(s.path.distanceKm) : '-')}</td>
                  <td>${s.legTravelTimeMin != null ? formatMinutes(s.legTravelTimeMin) : (s.path?.timeMin ? formatMinutes(s.path.timeMin) : '-')}</td>
                  <td>${renderStatusPill(s.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
}

function setupEvents() {
  // Tabs switching
  document.querySelectorAll('#ds-tabs-header .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ds-tabs-header .tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((tc) => tc.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  // Toggle Raw JSON vs Human View
  document.getElementById('btn-toggle-raw-view')?.addEventListener('click', () => {
    isRawView = !isRawView;
    document.getElementById('raw-view-text').textContent = isRawView ? 'Switch to Human View' : 'Switch to Raw JSON';

    const tabIds = ['graph', 'heap', 'distances', 'visited', 'wh', 'orders', 'seq'];
    tabIds.forEach((id) => {
      const human = document.getElementById(`${id}-human-view`);
      const raw = document.getElementById(`${id}-raw-view`);
      if (human && raw) {
        human.style.display = isRawView ? 'none' : (id === 'graph' ? 'grid' : 'block');
        raw.style.display = isRawView ? 'block' : 'none';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('structures', 'Data Structures Explorer', 'Inspect actual backend representations of Graph, Heap, Visited Set, Distance Table, and Predecessor Map');
  setupEvents();
  await loadStructures();
});
