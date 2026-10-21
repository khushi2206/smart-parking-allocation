/**
 * RouteWise - Dijkstra Shortest Path Page Logic
 */

import { apiFetch, renderAppShell, showToast, formatMinutes, formatDistance, formatCurrency } from './common.js';
import { GraphView } from './graph-view.js';

let locations = [];
let warehouses = [];
let roads = [];
let positions = {};
let currentResult = null;
let graphView = null;
let currentStepIdx = 0;
let playInterval = null;

async function loadData() {
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
    positions = posRes.positions || {};

    populateDropdowns();
  } catch (err) {
    console.error('Failed to load dijkstra data:', err);
  }
}

function populateDropdowns() {
  const startSelect = document.getElementById('dijkstra-start-select');
  const destSelect = document.getElementById('dijkstra-dest-select');
  if (!startSelect || !destSelect) return;

  const opts = '<option value="">-- Choose location --</option>' +
    locations.map((l) => `<option value="${l.name}">${l.name}</option>`).join('');

  startSelect.innerHTML = opts;
  destSelect.innerHTML = opts;

  if (locations.length >= 2) {
    startSelect.value = locations[0].name;
    destSelect.value = locations[locations.length - 1].name;
  }
}

async function runDijkstra(from, to, objective) {
  try {
    const result = await apiFetch('/dijkstra', {
      method: 'POST',
      body: JSON.stringify({ from, to, objective })
    });

    currentResult = result;
    renderResults(result);
  } catch {
    // Handled in apiFetch
  }
}

function renderResults(result) {
  const container = document.getElementById('dijkstra-results-container');
  if (!container) return;

  container.style.display = 'flex';

  document.getElementById('res-distance').textContent = formatDistance(result.distanceKm);
  document.getElementById('res-time').textContent = formatMinutes(result.timeMin);
  document.getElementById('res-cost').textContent = formatCurrency(result.costRupees);
  document.getElementById('res-explored').textContent = (result.explored || []).length;
  document.getElementById('res-heap-ops').textContent = result.queueOperations || 0;

  document.getElementById('res-objective-badge').textContent = `Metric: ${result.objective}`;

  const breadcrumbs = document.getElementById('res-path-breadcrumbs');
  if (breadcrumbs) {
    if (!result.path || result.path.length === 0) {
      breadcrumbs.innerHTML = `
        <div class="empty-state" style="padding:16px; margin:0 auto;">
          <div class="empty-title" style="color:#dc2626;">Destination Unreachable</div>
          <div class="empty-text">No path connects "${result.detailedState?.start}" to "${result.detailedState?.destination}" through the current road network.</div>
        </div>
      `;
    } else {
      breadcrumbs.innerHTML = result.path.map((loc, idx) => `
        <div style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; font-weight:700; color:#1d4ed8; font-size:0.9rem;">
          <span style="font-size:0.75rem; color:#60a5fa;">#${idx + 1}</span>
          <span>${loc}</span>
        </div>
        ${idx < result.path.length - 1 ? '<span style="color:#2563eb; font-weight:bold; font-size:1.1rem;">➔</span>' : ''}
      `).join('');
    }
  }

  // Update Graph Visualization
  const graphContainer = document.getElementById('dijkstra-graph-container');
  if (graphContainer) {
    if (!graphView) {
      graphView = new GraphView(graphContainer, {
        height: 440,
        showWeights: true,
        interactive: true
      });
    }
    graphView.setData({
      locations,
      roads,
      warehouses,
      positions,
      highlightedPath: result.path || []
    });
  }

  // Setup Step Trace Controls
  setupTracePlayer(result.trace || []);
}

function setupTracePlayer(trace) {
  currentStepIdx = trace.length > 0 ? trace.length - 1 : 0; // default to final state

  function updateStepView() {
    if (!trace || trace.length === 0) {
      document.getElementById('trace-step-indicator').textContent = 'Step 0 of 0';
      document.getElementById('step-explanation-box').textContent = 'No trace steps recorded.';
      return;
    }

    const step = trace[currentStepIdx];
    document.getElementById('trace-step-indicator').textContent = `Step ${currentStepIdx + 1} of ${trace.length}`;
    document.getElementById('step-explanation-box').innerHTML = `
      <div><strong>Step ${step.stepNumber} [${step.type.toUpperCase()}]:</strong> ${step.explanation || ''}</div>
    `;

    // Heap snapshot
    const heapBox = document.getElementById('step-heap-container');
    if (heapBox) {
      if (!step.queue || step.queue.length === 0) {
        heapBox.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">Heap is empty</span>';
      } else {
        heapBox.innerHTML = step.queue.map((item, i) => `
          <div style="padding:4px 8px; background:#ffffff; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem; font-family:var(--font-mono);">
            <strong style="color:#2563eb;">${item.location}</strong>: ${item.distance}
          </div>
        `).join('');
      }
    }

    // Visited set snapshot
    const visitedBox = document.getElementById('step-visited-container');
    if (visitedBox) {
      if (!step.visited || step.visited.length === 0) {
        visitedBox.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">No nodes visited yet</span>';
      } else {
        visitedBox.innerHTML = step.visited.map((loc) => `
          <div style="padding:4px 8px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; font-size:0.75rem; color:#15803d; font-weight:600;">
            ✓ ${loc}
          </div>
        `).join('');
      }
    }
  }

  document.getElementById('btn-trace-first')?.addEventListener('click', () => {
    currentStepIdx = 0;
    updateStepView();
  });

  document.getElementById('btn-trace-prev')?.addEventListener('click', () => {
    if (currentStepIdx > 0) {
      currentStepIdx--;
      updateStepView();
    }
  });

  document.getElementById('btn-trace-next')?.addEventListener('click', () => {
    if (currentStepIdx < trace.length - 1) {
      currentStepIdx++;
      updateStepView();
    }
  });

  document.getElementById('btn-trace-last')?.addEventListener('click', () => {
    currentStepIdx = trace.length - 1;
    updateStepView();
  });

  const playBtn = document.getElementById('btn-trace-play');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        playBtn.innerHTML = '▶ Play';
      } else {
        playBtn.innerHTML = '⏸ Pause';
        if (currentStepIdx >= trace.length - 1) currentStepIdx = 0;
        playInterval = setInterval(() => {
          if (currentStepIdx < trace.length - 1) {
            currentStepIdx++;
            updateStepView();
          } else {
            clearInterval(playInterval);
            playInterval = null;
            playBtn.innerHTML = '▶ Play';
          }
        }, 800);
      }
    });
  }

  updateStepView();
}

function setupEvents() {
  document.getElementById('dijkstra-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const from = document.getElementById('dijkstra-start-select').value;
    const to = document.getElementById('dijkstra-dest-select').value;
    const objective = document.getElementById('dijkstra-objective-select').value;

    if (!from || !to) {
      showToast('Please select both Origin and Destination.', 'error');
      return;
    }

    await runDijkstra(from, to, objective);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('dijkstra', 'Dijkstra Shortest Path', 'Find single-source optimal routes using custom Binary Min-Heap and Adjacency List');
  setupEvents();
  await loadData();
});
