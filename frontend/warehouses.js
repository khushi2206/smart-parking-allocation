/**
 * RouteWise - Warehouse Management Page Logic
 */

import { apiFetch, renderAppShell, showToast } from './common.js';

let warehouses = [];
let locations = [];
let editingWarehouseId = null;

async function loadWarehousesData() {
  try {
    const [whRes, locRes] = await Promise.all([
      apiFetch('/warehouses'),
      apiFetch('/locations')
    ]);
    warehouses = whRes.warehouses || [];
    locations = locRes.locations || [];

    populateLocationDropdown();
    renderWarehousesTable();
  } catch (err) {
    console.error('Failed to load warehouses:', err);
  }
}

function populateLocationDropdown() {
  const select = document.getElementById('wh-location-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select location node --</option>' +
    locations.map((l) => `<option value="${l.name}">${l.name}</option>`).join('');
}

function renderWarehousesTable(filterTerm = '') {
  const tbody = document.getElementById('warehouses-table-body');
  const countLabel = document.getElementById('wh-count-label');
  if (!tbody) return;

  const filtered = warehouses.filter((w) => {
    const term = filterTerm.toLowerCase();
    return (
      w.name.toLowerCase().includes(term) ||
      w.id.toLowerCase().includes(term) ||
      w.location.toLowerCase().includes(term)
    );
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} of ${warehouses.length} warehouse(s)`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state" style="padding:32px 16px;">
            <div class="empty-title">No warehouses found</div>
            <div class="empty-text">Add your first warehouse to serve as a hub for delivery operations.</div>
            <button class="btn btn-primary btn-sm" id="empty-add-wh-btn">+ Add Warehouse</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('empty-add-wh-btn')?.addEventListener('click', () => openWarehouseModal());
    return;
  }

  tbody.innerHTML = filtered.map((w) => `
    <tr>
      <td style="font-family:var(--font-mono); font-weight:700; color:#0f172a;">${w.id}</td>
      <td>
        <div style="font-weight:600; color:#0f172a;">${w.name}</div>
      </td>
      <td>
        <span class="badge badge-normal" style="font-size:0.75rem;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          </svg>
          ${w.location}
        </span>
      </td>
      <td><strong>${w.capacityKg}</strong> kg</td>
      <td>
        ${w.isDefault
          ? '<span class="status-pill status-planned"><span class="dot"></span>Default Hub</span>'
          : '<button class="btn btn-secondary btn-sm set-default-btn" data-id="' + w.id + '">Set as Default</button>'
        }
      </td>
      <td style="text-align:right;">
        <button class="btn-icon edit-wh-btn" data-id="${w.id}" title="Edit warehouse">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button class="btn-icon delete delete-wh-btn" data-id="${w.id}" title="Delete warehouse">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Attach row actions
  tbody.querySelectorAll('.set-default-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await apiFetch(`/warehouses/${id}/set-default`, { method: 'POST' });
      showToast('Default warehouse updated.', 'success');
      await loadWarehousesData();
    });
  });

  tbody.querySelectorAll('.edit-wh-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const w = warehouses.find((x) => x.id === id);
      if (w) openWarehouseModal(w);
    });
  });

  tbody.querySelectorAll('.delete-wh-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const w = warehouses.find((x) => x.id === id);
      if (!w) return;

      if (confirm(`Are you sure you want to delete warehouse "${w.name}" (${w.id})?`)) {
        try {
          await apiFetch(`/warehouses/${id}`, { method: 'DELETE' });
          showToast(`Warehouse "${w.name}" deleted.`, 'info');
          await loadWarehousesData();
        } catch {
          // Handled in apiFetch
        }
      }
    });
  });
}

function openWarehouseModal(warehouse = null) {
  const modal = document.getElementById('wh-modal');
  const title = document.getElementById('wh-modal-title');
  const idInput = document.getElementById('wh-id-input');
  const nameInput = document.getElementById('wh-name-input');
  const locSelect = document.getElementById('wh-location-select');
  const capInput = document.getElementById('wh-capacity-input');
  const defCheck = document.getElementById('wh-default-checkbox');

  if (locations.length === 0) {
    showToast('Please create at least one Location node first!', 'error');
    return;
  }

  if (warehouse) {
    editingWarehouseId = warehouse.id;
    title.textContent = `Edit Warehouse (${warehouse.id})`;
    idInput.value = warehouse.id;
    idInput.disabled = true;
    nameInput.value = warehouse.name;
    locSelect.value = warehouse.location;
    capInput.value = warehouse.capacityKg;
    defCheck.checked = Boolean(warehouse.isDefault);
  } else {
    editingWarehouseId = null;
    title.textContent = 'Add New Warehouse';
    idInput.value = '';
    idInput.disabled = false;
    nameInput.value = '';
    locSelect.value = locations[0]?.name || '';
    capInput.value = '500';
    defCheck.checked = warehouses.length === 0;
  }

  modal.classList.add('open');
}

function closeWarehouseModal() {
  document.getElementById('wh-modal')?.classList.remove('open');
}

function setupEvents() {
  document.getElementById('btn-open-add-wh')?.addEventListener('click', () => openWarehouseModal());
  document.getElementById('wh-modal-close')?.addEventListener('click', closeWarehouseModal);
  document.getElementById('wh-modal-cancel')?.addEventListener('click', closeWarehouseModal);

  document.getElementById('wh-search-input')?.addEventListener('input', (e) => {
    renderWarehousesTable(e.target.value);
  });

  document.getElementById('wh-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('wh-id-input').value.trim();
    const name = document.getElementById('wh-name-input').value.trim();
    const location = document.getElementById('wh-location-select').value;
    const capacityKg = Number(document.getElementById('wh-capacity-input').value);
    const isDefault = document.getElementById('wh-default-checkbox').checked;

    try {
      if (editingWarehouseId) {
        await apiFetch(`/warehouses/${editingWarehouseId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, location, capacityKg, isDefault })
        });
        showToast(`Warehouse "${name}" updated.`, 'success');
      } else {
        await apiFetch('/warehouses', {
          method: 'POST',
          body: JSON.stringify({ id: id || undefined, name, location, capacityKg, isDefault })
        });
        showToast(`Warehouse "${name}" created.`, 'success');
      }
      closeWarehouseModal();
      await loadWarehousesData();
    } catch {
      // Handled in apiFetch
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('warehouses', 'Warehouse Management', 'Create and configure multi-warehouse distribution hubs');
  setupEvents();
  await loadWarehousesData();
});
