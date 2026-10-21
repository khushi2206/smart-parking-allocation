/**
 * RouteWise - Shared Frontend Utilities & Layout Component
 */

const API_BASE = '/api';

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// Toast Notification System
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.2s';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Formatters
export function formatMinutes(totalMin) {
  if (totalMin == null || Number.isNaN(totalMin)) return '0m';
  const hrs = Math.floor(totalMin / 60);
  const mins = Math.round(totalMin % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '0 km';
  return `${Number(km).toFixed(1)} km`;
}

export function formatCurrency(amount) {
  if (amount == null || Number.isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function renderPriorityBadge(priority) {
  const p = priority || 'Normal';
  const pLower = p.toLowerCase();
  return `<span class="badge badge-${pLower}">${p}</span>`;
}

export function renderStatusPill(status) {
  const s = status || 'Pending';
  const sLower = s.toLowerCase();
  return `<span class="status-pill status-${sLower}"><span class="dot"></span>${s}</span>`;
}

// Navigation links config
export const NAV_LINKS = [
  { id: 'overview', href: '/index.html', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'warehouses', href: '/warehouses.html', label: 'Warehouses', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'locations', href: '/locations.html', label: 'Locations', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'roads', href: '/roads.html', label: 'Road Network', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'orders', href: '/orders.html', label: 'Delivery Orders', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'structures', href: '/structures.html', label: 'Data Structures', icon: 'M4 7v10c0 2 1.5 3 3.5 3S11 19 11 17V7m-7 0c0-2 1.5-3 3.5-3S11 5 11 7m-7 0h7m6 0v10c0 2 1.5 3 3.5 3s3.5-1 3.5-3V7m-7 0c0-2 1.5-3 3.5-3s3.5 1 3.5 3m-7 0h7' },
  { id: 'dijkstra', href: '/dijkstra.html', label: 'Shortest Path', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'optimizer', href: '/optimizer.html', label: 'Route Optimization', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'trace', href: '/trace.html', label: 'Execution Trace', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'complexity', href: '/complexity.html', label: 'Complexity Analysis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
];

export function renderAppShell(activePageId, pageTitle, pageSubtitle) {
  const currentPath = window.location.pathname.toLowerCase();

  // Sidebar HTML
  const sidebarHtml = `
    <aside class="app-sidebar" id="app-sidebar">
      <div class="brand-section">
        <a href="/index.html" class="brand-link">
          <div class="brand-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
          </div>
          <div>
            <div class="brand-title">RouteWise</div>
            <div class="brand-subtitle">DAA Logistics Lab</div>
          </div>
        </a>
      </div>

      <div class="nav-group-title">Navigation</div>
      <nav class="sidebar-nav">
        ${NAV_LINKS.map(link => {
          const isActive = link.id === activePageId || currentPath.endsWith(link.href) || (link.href === '/index.html' && (currentPath === '/' || currentPath.endsWith('/index.html')));
          return `
            <a href="${link.href}" class="nav-item ${isActive ? 'active' : ''}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${link.icon}"></path>
              </svg>
              <span>${link.label}</span>
            </a>
          `;
        }).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="quick-meta">
          <div class="quick-meta-badge">
            <span class="status-dot"></span>
            <span>In-Memory Server</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b;">Resets on restart • DAA Project</div>
        </div>
      </div>
    </aside>
  `;

  // Top Header HTML
  const headerHtml = `
    <header class="app-header">
      <div class="header-left">
        <button class="mobile-menu-btn" id="mobile-toggle" aria-label="Toggle menu">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <div class="header-title-box">
          <h1>${pageTitle}</h1>
        </div>
      </div>
      <div class="header-right">
        <div class="sys-badge">
          <span class="dot"></span>
          <span>Online</span>
        </div>
        ${activePageId !== 'optimizer' ? `
          <a href="/optimizer.html" class="btn btn-primary btn-sm">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>Route Optimizer</span>
          </a>
        ` : ''}
      </div>
    </header>
  `;

  // Insert Shell into body
  const appContainer = document.getElementById('app-root') || document.body;
  const originalContent = document.getElementById('page-content');
  const contentInner = originalContent ? originalContent.innerHTML : '';

  appContainer.innerHTML = `
    <div id="app-layout">
      ${sidebarHtml}
      <main class="app-main">
        ${headerHtml}
        <div class="page-container" id="page-container">
          <div id="page-content-mount">
            ${contentInner}
          </div>
        </div>
      </main>
    </div>
  `;

  // Attach mobile sidebar toggle
  const mobileBtn = document.getElementById('mobile-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
}

// Modal helper
export function setupModal(modalId, triggerBtnId, closeBtnId) {
  const modal = document.getElementById(modalId);
  const trigger = document.getElementById(triggerBtnId);
  const closer = document.getElementById(closeBtnId);

  if (trigger && modal) {
    trigger.addEventListener('click', () => modal.classList.add('open'));
  }
  if (closer && modal) {
    closer.addEventListener('click', () => modal.classList.remove('open'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }
}
