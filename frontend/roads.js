/**
 * RouteWise - Road Network Page Logic
 */

import { apiFetch, renderAppShell, showToast, formatMinutes, formatCurrency, formatDistance } from './common.js';
import { GraphView } from './graph-view.js';

let graphView = null;
let locations = [];
let roads = [];
let warehouses = [];
let editingRoadId = null;

async function loadRoadsData() {
  try {
    const [locRes, whRes, rdRes, posRes] = await Promise.all([
      apiFetch('/locations'),
      apiFetch('/warehouses'),
      apiFetch('/roads'),
      apiFetch('/graph/positions')
    ]);

    locations = locRes.locations || [];
    roads = rdRes.roads || [];
    warehouses = whRes.warehouses || [];

    populateLocationDropdowns();
    renderRoadsTable();

    if (!graphView) {
      const container = document.getElementById('roads-graph-container');
      graphView = new GraphView(container, {
        height: 520,
        showWeights: true,
        interactive: true,
        onNodeClick: (node, wh) => inspectNode(node, wh),
        onEdgeClick: (road) => inspectRoad(road)
      });
    }

    graphView.setData({
      locations,
      roads,
      warehouses,
      positions: posRes.positions || {}
    });
  } catch (err) {
    console.error('Failed to load roads data:', err);
  }
}

function populateLocationDropdowns() {
  const startSelect = document.getElementById('road-start-select');
  const destSelect = document.getElementById('road-dest-select');
  if (!startSelect || !destSelect) return;

  const options = '<option value="">-- Choose location --</option>' +
    locations.map((l) => `<option value="${l.name}">${l.name}</option>`).join('');

  startSelect.innerHTML = options;
  destSelect.innerHTML = options;
}

function inspectNode(node, wh) {
  const box = document.getElementById('inspection-content');
  if (!box) return;

  const connected = roads.filter((r) => r.start === node.name || r.destination === node.name);
  box.innerHTML = `
    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
      <span style="font-weight:700; color:#0f172a; font-size:0.95rem;">📍 Node: ${node.name}</span>
      ${wh ? `<span class="badge badge-normal">Warehouse Hub: ${wh.name} (Cap: ${wh.capacityKg}kg)</span>` : ''}
      <span style="color:#475569;">Connected Roads: <strong>${connected.length}</strong></span>
      <span style="color:#64748b; font-size:0.8rem;">Neighbors: ${connected.map((r) => (r.start === node.name ? r.destination : r.start)).join(', ') || 'None'}</span>
    </div>
  `;
}

function inspectRoad(road) {
  const box = document.getElementById('inspection-content');
  if (!box) return;

  box.innerHTML = `
    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
      <span style="font-weight:700; color:#0f172a; font-size:0.95rem;">🛣️ Edge: ${road.start} ${road.bidirectional ? '⇄' : '➔'} ${road.destination}</span>
      <span class="badge badge-default">${road.bidirectional ? 'Bidirectional' : 'One-Way'}</span>
      <span style="color:#2563eb; font-weight:600;">Distance: ${formatDistance(road.distanceKm)}</span>
      <span style="color:#d97706; font-weight:600;">Time: ${formatMinutes(road.travelTimeMin)}</span>
      <span style="color:#16a34a; font-weight:600;">Cost: ${formatCurrency(road.costRupees)}</span>
    </div>
  `;
}

function renderRoadsTable(filterTerm = '') {
  const tbody = document.getElementById('roads-table-body');
  const countLabel = document.getElementById('roads-count-label');
  if (!tbody) return;

  const filtered = roads.filter((r) => {
    const term = filterTerm.toLowerCase();
    return (
      r.start.toLowerCase().includes(term) ||
      r.destination.toLowerCase().includes(term) ||
      String(r.distanceKm).includes(term) ||
      String(r.costRupees).includes(term)
    );
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} of ${roads.length} road(s) configured`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state" style="padding:32px 16px;">
            <div class="empty-title">No roads configured</div>
            <div class="empty-text">Add weighted edges between locations with independent distance, travel time, and cost values.</div>
            <button class="btn btn-primary btn-sm" id="empty-add-road-btn">+ Add Road</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('empty-add-road-btn')?.addEventListener('click', () => openRoadModal());
    return;
  }

  tbody.innerHTML = filtered.map((r) => `
    <tr>
      <td style="font-weight:600; color:#0f172a;">${r.start}</td>
      <td style="font-weight:600; color:#0f172a;">${r.destination}</td>
      <td>
        <span class="badge ${r.bidirectional ? 'badge-default' : 'badge-normal'}">
          ${r.bidirectional ? 'Two-way ⇄' : 'One-way ➔'}
        </span>
      </td>
      <td><strong>${formatDistance(r.distanceKm)}</strong></td>
      <td>${formatMinutes(r.travelTimeMin)}</td>
      <td><strong>${formatCurrency(r.costRupees)}</strong></td>
      <td style="text-align:right;">
        <button class="btn-icon edit-road-btn" data-id="${r.id}" title="Edit road">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button class="btn-icon delete delete-road-btn" data-id="${r.id}" title="Delete road">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Attach actions
  tbody.querySelectorAll('.edit-road-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const r = roads.find((x) => x.id === id);
      if (r) openRoadModal(r);
    });
  });

  tbody.querySelectorAll('.delete-road-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const r = roads.find((x) => x.id === id);
      if (!r) return;

      if (confirm(`Delete road between "${r.start}" and "${r.destination}"?`)) {
        try {
          await apiFetch(`/roads/${id}`, { method: 'DELETE' });
          showToast('Road deleted.', 'info');
          await loadRoadsData();
        } catch {
          // Handled in apiFetch
        }
      }
    });
  });
}

function updateTotalMinPreview() {
  const hrs = Number(document.getElementById('road-hours-input').value || 0);
  const mins = Number(document.getElementById('road-minutes-input').value || 0);
  const total = hrs * 60 + mins;
  const preview = document.getElementById('total-min-preview');
  if (preview) {
    preview.textContent = `Total: ${total} minutes (${hrs}h ${mins}m)`;
  }
}

function openRoadModal(road = null) {
  if (locations.length < 2) {
    showToast('Please create at least 2 locations before adding roads.', 'error');
    return;
  }

  const modal = document.getElementById('road-modal');
  const title = document.getElementById('road-modal-title');
  const startSelect = document.getElementById('road-start-select');
  const destSelect = document.getElementById('road-dest-select');
  const distInput = document.getElementById('road-distance-input');
  const hrsInput = document.getElementById('road-hours-input');
  const minsInput = document.getElementById('road-minutes-input');
  const costInput = document.getElementById('road-cost-input');
  const biRadio = document.getElementById('road-dir-bi');
  const oneRadio = document.getElementById('road-dir-one');

  if (road) {
    editingRoadId = road.id;
    title.textContent = 'Edit Road Connection';
    startSelect.value = road.start;
    destSelect.value = road.destination;
    distInput.value = road.distanceKm;
    hrsInput.value = Math.floor(road.travelTimeMin / 60);
    minsInput.value = road.travelTimeMin % 60;
    costInput.value = road.costRupees;
    if (road.bidirectional) biRadio.checked = true;
    else oneRadio.checked = true;
  } else {
    editingRoadId = null;
    title.textContent = 'Add Weighted Road Connection';
    startSelect.value = locations[0]?.name || '';
    destSelect.value = locations[1]?.name || '';
    distInput.value = '10';
    hrsInput.value = '0';
    minsInput.value = '20';
    costInput.value = '120';
    biRadio.checked = true;
  }

  updateTotalMinPreview();
  modal.classList.add('open');
}

function closeRoadModal() {
  document.getElementById('road-modal')?.classList.remove('open');
}

function setupEvents() {
  document.getElementById('btn-open-add-road')?.addEventListener('click', () => openRoadModal());
  document.getElementById('road-modal-close')?.addEventListener('click', closeRoadModal);
  document.getElementById('road-modal-cancel')?.addEventListener('click', closeRoadModal);

  document.getElementById('road-hours-input')?.addEventListener('input', updateTotalMinPreview);
  document.getElementById('road-minutes-input')?.addEventListener('input', updateTotalMinPreview);

  document.getElementById('roads-search-input')?.addEventListener('input', (e) => {
    renderRoadsTable(e.target.value);
  });

  document.getElementById('road-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const start = document.getElementById('road-start-select').value;
    const destination = document.getElementById('road-dest-select').value;
    const distanceKm = Number(document.getElementById('road-distance-input').value);
    const hours = Number(document.getElementById('road-hours-input').value);
    const minutes = Number(document.getElementById('road-minutes-input').value);
    const costRupees = Number(document.getElementById('road-cost-input').value);
    const bidirectional = document.getElementById('road-dir-bi').checked;

    const payload = {
      start,
      destination,
      distanceKm,
      hours,
      minutes,
      travelTimeMin: hours * 60 + minutes,
      costRupees,
      bidirectional
    };

    try {
      if (editingRoadId) {
        await apiFetch(`/roads/${editingRoadId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Road updated.', 'success');
      } else {
        await apiFetch('/roads', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Road created successfully.', 'success');
      }
      closeRoadModal();
      await loadRoadsData();
    } catch {
      // Handled in apiFetch
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('roads', 'Road Network & Graph Visualization', 'Configure weighted graph edges and interact with the SVG network map');
  setupEvents();
  await loadRoadsData();
});
