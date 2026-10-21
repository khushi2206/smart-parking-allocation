/**
 * RouteWise - Execution Trace Page Logic
 */

import { apiFetch, renderAppShell, renderPriorityBadge, formatMinutes, formatDistance, formatCurrency } from './common.js';
import { GraphView } from './graph-view.js';

let traceData = null;
let locations = [];
let warehouses = [];
let roads = [];
let positions = {};
let currentStepIdx = 0;
let playTimer = null;
let graphView = null;

async function loadTrace() {
  try {
    const [tRes, locRes, whRes, rdRes, posRes] = await Promise.all([
      apiFetch('/trace'),
      apiFetch('/locations'),
      apiFetch('/warehouses'),
      apiFetch('/roads'),
      apiFetch('/graph/positions')
    ]);

    traceData = tRes;
    locations = locRes.locations || [];
    warehouses = whRes.warehouses || [];
    roads = rdRes.roads || [];
    positions = posRes.positions || {};

    const emptyPanel = document.getElementById('trace-empty-panel');
    const activeContainer = document.getElementById('trace-active-container');

    if (!traceData || !traceData.hasRun || !traceData.trace || traceData.trace.length === 0) {
      if (emptyPanel) emptyPanel.style.display = 'block';
      if (activeContainer) activeContainer.style.display = 'none';
      return;
    }

    if (emptyPanel) emptyPanel.style.display = 'none';
    if (activeContainer) activeContainer.style.display = 'flex';

    initGraph();
    renderStep(0);
  } catch (err) {
    console.error('Failed to load trace:', err);
  }
}

function initGraph() {
  const container = document.getElementById('trace-graph-container');
  if (container && !graphView) {
    graphView = new GraphView(container, {
      height: 440,
      showWeights: true,
      interactive: true
    });
  }
}

function renderStep(index) {
  const trace = traceData.trace;
  if (!trace || index < 0 || index >= trace.length) return;
  currentStepIdx = index;

  const step = trace[index];
  document.getElementById('step-number-pill').textContent = `Step ${index + 1} of ${trace.length}`;

  const isReturn = step.type === 'return';
  const title = isReturn
    ? `Step ${step.stepNumber}: Vehicle Return to Hub`
    : `Step ${step.stepNumber}: Selected Order ${step.orderId || ''}`;

  document.getElementById('step-title').textContent = title;
  document.getElementById('step-location-badge').textContent = `Departing from: ${step.from || 'Warehouse'}`;
  document.getElementById('step-reason-text').textContent = step.reason || 'Optimal candidate selected according to priority and heuristic score.';

  document.getElementById('trace-cum-dist').textContent = formatDistance(step.cumulativeDistanceKm);
  document.getElementById('trace-cum-time').textContent = formatMinutes(step.cumulativeTimeMin);
  document.getElementById('trace-cum-cost').textContent = formatCurrency(step.cumulativeCostRupees);

  // Candidates Table
  const tbody = document.getElementById('trace-candidates-body');
  if (tbody) {
    const candidates = step.candidatesConsidered || [];
    if (candidates.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:16px;">Direct leg execution (no candidate competition).</td></tr>`;
    } else {
      tbody.innerHTML = candidates.map((c) => {
        const isSelected = c.orderId === step.orderId;
        return `
          <tr style="${isSelected ? 'background:#eff6ff; font-weight:600;' : ''}">
            <td>
              <span style="font-family:var(--font-mono);">${c.orderId}</span>
              ${isSelected ? ' <span class="badge badge-normal" style="font-size:0.68rem;">Selected ✓</span>' : ''}
            </td>
            <td>${c.target}</td>
            <td>${renderPriorityBadge(c.priority)}</td>
            <td>${c.warehouse || '-'}</td>
            <td><strong style="color:#2563eb;">${c.score != null ? c.score : '-'}</strong></td>
            <td>${c.distanceKm != null ? formatDistance(c.distanceKm) : '-'}</td>
            <td>${c.timeMin != null ? formatMinutes(c.timeMin) : '-'}</td>
            <td>${c.costRupees != null ? formatCurrency(c.costRupees) : '-'}</td>
            <td style="font-family:var(--font-mono); font-size:0.75rem;">${c.path ? c.path.join(' ➔ ') : 'Unreachable'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Highlight current leg in graph
  if (graphView) {
    graphView.setData({
      locations,
      roads,
      warehouses,
      positions,
      highlightedPath: step.path || []
    });
  }
}

function setupEvents() {
  document.getElementById('btn-trace-start')?.addEventListener('click', () => renderStep(0));

  document.getElementById('btn-trace-prev')?.addEventListener('click', () => {
    if (currentStepIdx > 0) renderStep(currentStepIdx - 1);
  });

  document.getElementById('btn-trace-next')?.addEventListener('click', () => {
    if (traceData?.trace && currentStepIdx < traceData.trace.length - 1) {
      renderStep(currentStepIdx + 1);
    }
  });

  document.getElementById('btn-trace-end')?.addEventListener('click', () => {
    if (traceData?.trace) renderStep(traceData.trace.length - 1);
  });

  const playBtn = document.getElementById('btn-trace-play');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
        playBtn.innerHTML = '▶ Play';
      } else {
        playBtn.innerHTML = '⏸ Pause';
        if (traceData?.trace && currentStepIdx >= traceData.trace.length - 1) currentStepIdx = 0;
        playTimer = setInterval(() => {
          if (traceData?.trace && currentStepIdx < traceData.trace.length - 1) {
            renderStep(currentStepIdx + 1);
          } else {
            clearInterval(playTimer);
            playTimer = null;
            playBtn.innerHTML = '▶ Play';
          }
        }, 1200);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('trace', 'Execution Trace', 'Detailed step-by-step decision log of the multi-warehouse delivery route optimizer');
  setupEvents();
  await loadTrace();
});
