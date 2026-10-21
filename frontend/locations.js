/**
 * RouteWise - Location Management Page Logic
 */

import { apiFetch, renderAppShell, showToast } from './common.js';

let locations = [];
let warehouses = [];
let roads = [];
let orders = [];
let editingLocationName = null;

async function loadLocationsData() {
  try {
    const [locRes, whRes, ordRes] = await Promise.all([
      apiFetch('/locations'),
      apiFetch('/warehouses'),
      apiFetch('/orders')
    ]);

    locations = locRes.locations || [];
    roads = locRes.roads || [];
    warehouses = whRes.warehouses || [];
    orders = ordRes.orders || [];

    renderLocationsTable();
  } catch (err) {
    console.error('Failed to load locations:', err);
  }
}

function renderLocationsTable(filterTerm = '') {
  const tbody = document.getElementById('locations-table-body');
  const countLabel = document.getElementById('loc-count-label');
  if (!tbody) return;

  const filtered = locations.filter((l) => {
    const term = filterTerm.toLowerCase();
    return (
      l.name.toLowerCase().includes(term) ||
      (l.description && l.description.toLowerCase().includes(term))
    );
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} of ${locations.length} location node(s)`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state" style="padding:32px 16px;">
            <div class="empty-title">No locations created yet</div>
            <div class="empty-text">Locations serve as graph vertices where warehouses, roads, and delivery orders connect.</div>
            <button class="btn btn-primary btn-sm" id="empty-add-loc-btn">+ Add Location</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('empty-add-loc-btn')?.addEventListener('click', () => openLocationModal());
    return;
  }

  tbody.innerHTML = filtered.map((l) => {
    const connectedWarehouses = warehouses.filter((w) => w.location.toLowerCase() === l.name.toLowerCase());
    const connectedRoadsCount = roads.filter((r) => r.start.toLowerCase() === l.name.toLowerCase() || r.destination.toLowerCase() === l.name.toLowerCase()).length;
    const pendingOrdersCount = orders.filter((o) => o.customerLocation.toLowerCase() === l.name.toLowerCase() && o.status === 'Pending').length;

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="color:#2563eb;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            </svg>
            <span>${l.name}</span>
          </div>
        </td>
        <td style="color:#475569; max-width:280px; font-size:0.82rem;">${l.description || '<em style="color:#94a3b8;">No description provided</em>'}</td>
        <td>
          ${connectedWarehouses.length > 0
            ? connectedWarehouses.map((w) => `<span class="badge badge-normal">${w.name}</span>`).join(' ')
            : '<span style="color:#94a3b8; font-size:0.75rem;">Standard Stop</span>'
          }
        </td>
        <td><strong>${connectedRoadsCount}</strong> road(s)</td>
        <td><strong>${pendingOrdersCount}</strong> pending</td>
        <td style="text-align:right;">
          <button class="btn-icon edit-loc-btn" data-name="${encodeURIComponent(l.name)}" title="Edit location">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button class="btn-icon delete delete-loc-btn" data-name="${encodeURIComponent(l.name)}" title="Delete location">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach actions
  tbody.querySelectorAll('.edit-loc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.getAttribute('data-name'));
      const loc = locations.find((x) => x.name === name);
      if (loc) openLocationModal(loc);
    });
  });

  tbody.querySelectorAll('.delete-loc-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = decodeURIComponent(btn.getAttribute('data-name'));
      if (confirm(`Are you sure you want to delete location "${name}"?`)) {
        try {
          await apiFetch(`/locations/${encodeURIComponent(name)}`, { method: 'DELETE' });
          showToast(`Location "${name}" deleted.`, 'info');
          await loadLocationsData();
        } catch {
          // Handled in apiFetch
        }
      }
    });
  });
}

function openLocationModal(loc = null) {
  const modal = document.getElementById('loc-modal');
  const title = document.getElementById('loc-modal-title');
  const nameInput = document.getElementById('loc-name-input');
  const descInput = document.getElementById('loc-desc-input');

  if (loc) {
    editingLocationName = loc.name;
    title.textContent = `Edit Location (${loc.name})`;
    nameInput.value = loc.name;
    descInput.value = loc.description || '';
  } else {
    editingLocationName = null;
    title.textContent = 'Add New Location Node';
    nameInput.value = '';
    descInput.value = '';
  }

  modal.classList.add('open');
}

function closeLocationModal() {
  document.getElementById('loc-modal')?.classList.remove('open');
}

function setupEvents() {
  document.getElementById('btn-open-add-loc')?.addEventListener('click', () => openLocationModal());
  document.getElementById('loc-modal-close')?.addEventListener('click', closeLocationModal);
  document.getElementById('loc-modal-cancel')?.addEventListener('click', closeLocationModal);

  document.getElementById('loc-search-input')?.addEventListener('input', (e) => {
    renderLocationsTable(e.target.value);
  });

  document.getElementById('loc-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('loc-name-input').value.trim();
    const description = document.getElementById('loc-desc-input').value.trim();

    try {
      if (editingLocationName) {
        await apiFetch(`/locations/${encodeURIComponent(editingLocationName)}`, {
          method: 'PUT',
          body: JSON.stringify({ name, description })
        });
        showToast(`Location "${name}" updated.`, 'success');
      } else {
        await apiFetch('/locations', {
          method: 'POST',
          body: JSON.stringify({ name, description })
        });
        showToast(`Location "${name}" created.`, 'success');
      }
      closeLocationModal();
      await loadLocationsData();
    } catch {
      // Handled in apiFetch
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('locations', 'Location Management', 'Configure network vertices (delivery destinations & hubs)');
  setupEvents();
  await loadLocationsData();
});
