/**
 * RouteWise - Delivery Orders Management Page Logic
 */

import { apiFetch, renderAppShell, showToast, renderPriorityBadge, renderStatusPill, formatMinutes } from './common.js';

let orders = [];
let locations = [];
let warehouses = [];
let editingOrderId = null;

async function loadOrdersData() {
  try {
    const [ordRes, locRes, whRes] = await Promise.all([
      apiFetch('/orders'),
      apiFetch('/locations'),
      apiFetch('/warehouses')
    ]);

    orders = ordRes.orders || [];
    locations = locRes.locations || [];
    warehouses = whRes.warehouses || [];

    populateDropdowns();
    renderOrdersTable();
  } catch (err) {
    console.error('Failed to load orders data:', err);
  }
}

function populateDropdowns() {
  // Modal location select
  const locSelect = document.getElementById('order-loc-select');
  if (locSelect) {
    locSelect.innerHTML = '<option value="">-- Choose destination --</option>' +
      locations.map((l) => `<option value="${l.name}">${l.name}</option>`).join('');
  }

  // Modal warehouse select
  const whSelect = document.getElementById('order-wh-select');
  if (whSelect) {
    whSelect.innerHTML = '<option value="any">Auto / Any Eligible Hub</option>' +
      warehouses.map((w) => `<option value="${w.id}">${w.name} (${w.id})</option>`).join('');
  }

  // Filter warehouse select
  const filterWh = document.getElementById('filter-warehouse');
  if (filterWh) {
    filterWh.innerHTML = '<option value="">All Warehouses</option><option value="any">Auto / Any Hub</option>' +
      warehouses.map((w) => `<option value="${w.id}">${w.name}</option>`).join('');
  }
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  const countLabel = document.getElementById('orders-count-label');
  if (!tbody) return;

  const searchTerm = (document.getElementById('order-search-input')?.value || '').toLowerCase().trim();
  const priorityFilter = document.getElementById('filter-priority')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const warehouseFilter = document.getElementById('filter-warehouse')?.value || '';

  const filtered = orders.filter((o) => {
    const matchSearch = o.orderId.toLowerCase().includes(searchTerm) || o.customerLocation.toLowerCase().includes(searchTerm);
    const matchPriority = !priorityFilter || o.priority === priorityFilter;
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchWarehouse = !warehouseFilter || (warehouseFilter === 'any' ? o.warehouseId === 'any' : o.warehouseId === warehouseFilter);
    return matchSearch && matchPriority && matchStatus && matchWarehouse;
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} of ${orders.length} order(s)`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state" style="padding:32px 16px;">
            <div class="empty-title">No orders found</div>
            <div class="empty-text">Create delivery orders with specific destination locations and priority levels.</div>
            <button class="btn btn-primary btn-sm" id="empty-add-order-btn">+ Create Order</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('empty-add-order-btn')?.addEventListener('click', () => openOrderModal());
    return;
  }

  tbody.innerHTML = filtered.map((o) => {
    const deadlineText = o.deadline ? new Date(o.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '<span style="color:#94a3b8;">None</span>';
    const whName = o.warehouseId === 'any' ? '<span style="color:#64748b;">Auto Hub</span>' : (warehouses.find((w) => w.id === o.warehouseId)?.name || o.warehouseId || '-');

    return `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:700; color:#0f172a;">${o.orderId}</td>
        <td><strong>${o.customerLocation}</strong></td>
        <td>${whName}</td>
        <td>${renderPriorityBadge(o.priority)}</td>
        <td>${o.packageWeightKg} kg</td>
        <td>${formatMinutes(o.serviceTimeMin)}</td>
        <td>${deadlineText}</td>
        <td>${renderStatusPill(o.status)}</td>
        <td style="text-align:right;">
          <button class="btn btn-secondary btn-sm toggle-deliver-btn" data-id="${o.orderId}" title="Toggle Delivered status">
            ${o.status === 'Delivered' ? 'Mark Pending' : 'Mark Delivered'}
          </button>
          <button class="btn-icon edit-order-btn" data-id="${o.orderId}" title="Edit order">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button class="btn-icon delete delete-order-btn" data-id="${o.orderId}" title="Delete order">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Row event listeners
  tbody.querySelectorAll('.toggle-deliver-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await apiFetch(`/orders/${id}/deliver`, { method: 'POST' });
      await loadOrdersData();
    });
  });

  tbody.querySelectorAll('.edit-order-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const o = orders.find((x) => x.orderId === id);
      if (o) openOrderModal(o);
    });
  });

  tbody.querySelectorAll('.delete-order-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm(`Delete order "${id}"?`)) {
        try {
          await apiFetch(`/orders/${id}`, { method: 'DELETE' });
          showToast(`Order "${id}" deleted.`, 'info');
          await loadOrdersData();
        } catch {
          // Handled in apiFetch
        }
      }
    });
  });
}

function openOrderModal(order = null) {
  if (locations.length === 0) {
    showToast('Please create at least one location node first.', 'error');
    return;
  }

  const modal = document.getElementById('order-modal');
  const title = document.getElementById('order-modal-title');
  const idInput = document.getElementById('order-id-input');
  const locSelect = document.getElementById('order-loc-select');
  const prioSelect = document.getElementById('order-priority-select');
  const whSelect = document.getElementById('order-wh-select');
  const wtInput = document.getElementById('order-weight-input');
  const srvInput = document.getElementById('order-service-input');
  const ddlInput = document.getElementById('order-deadline-input');
  const stSelect = document.getElementById('order-status-select');

  if (order) {
    editingOrderId = order.orderId;
    title.textContent = `Edit Order (${order.orderId})`;
    idInput.value = order.orderId;
    idInput.disabled = true;
    locSelect.value = order.customerLocation;
    prioSelect.value = order.priority;
    whSelect.value = order.warehouseId || 'any';
    wtInput.value = order.packageWeightKg;
    srvInput.value = order.serviceTimeMin;
    ddlInput.value = order.deadline ? new Date(order.deadline).toISOString().slice(0, 16) : '';
    stSelect.value = order.status;
  } else {
    editingOrderId = null;
    title.textContent = 'Create Delivery Order';
    const nextNum = (orders.length + 101);
    idInput.value = `ORD-${nextNum}`;
    idInput.disabled = false;
    locSelect.value = locations[0]?.name || '';
    prioSelect.value = 'Normal';
    whSelect.value = 'any';
    wtInput.value = '20';
    srvInput.value = '10';
    ddlInput.value = '';
    stSelect.value = 'Pending';
  }

  modal.classList.add('open');
}

function closeOrderModal() {
  document.getElementById('order-modal')?.classList.remove('open');
}

function setupEvents() {
  document.getElementById('btn-open-add-order')?.addEventListener('click', () => openOrderModal());
  document.getElementById('order-modal-close')?.addEventListener('click', closeOrderModal);
  document.getElementById('order-modal-cancel')?.addEventListener('click', closeOrderModal);

  ['order-search-input', 'filter-priority', 'filter-status', 'filter-warehouse'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderOrdersTable);
    document.getElementById(id)?.addEventListener('change', renderOrdersTable);
  });

  document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
    document.getElementById('order-search-input').value = '';
    document.getElementById('filter-priority').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-warehouse').value = '';
    renderOrdersTable();
  });

  document.getElementById('order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('order-id-input').value.trim();
    const customerLocation = document.getElementById('order-loc-select').value;
    const priority = document.getElementById('order-priority-select').value;
    const warehouseId = document.getElementById('order-wh-select').value;
    const packageWeightKg = Number(document.getElementById('order-weight-input').value);
    const serviceTimeMin = Number(document.getElementById('order-service-input').value);
    const deadlineVal = document.getElementById('order-deadline-input').value;
    const deadline = deadlineVal ? new Date(deadlineVal).toISOString() : null;
    const status = document.getElementById('order-status-select').value;

    const payload = {
      orderId,
      customerLocation,
      priority,
      warehouseId,
      packageWeightKg,
      serviceTimeMin,
      deadline,
      status
    };

    try {
      if (editingOrderId) {
        await apiFetch(`/orders/${editingOrderId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast(`Order "${orderId}" updated.`, 'success');
      } else {
        await apiFetch('/orders', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast(`Order "${orderId}" created successfully.`, 'success');
      }
      closeOrderModal();
      await loadOrdersData();
    } catch {
      // Handled in apiFetch
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('orders', 'Delivery Orders', 'Manage customer orders, priority tiers, weights, and deadlines');
  setupEvents();
  await loadOrdersData();
});
