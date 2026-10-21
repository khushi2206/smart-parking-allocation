/**
 * RouteWise - Complexity Analysis Page Logic
 */

import { apiFetch, renderAppShell } from './common.js';

async function loadComplexityData() {
  try {
    const [ovRes, rdRes] = await Promise.all([
      apiFetch('/overview'),
      apiFetch('/roads')
    ]);

    const summary = ovRes.summary || {};
    const roads = rdRes.roads || [];

    const V = summary.totalLocations || 0;
    // Calculate total directed edges E in adjacency list
    let directedE = 0;
    roads.forEach((r) => {
      directedE += r.bidirectional ? 2 : 1;
    });

    const W = summary.totalWarehouses || 0;
    const K = summary.totalOrders || 0;

    document.getElementById('cx-v-count').textContent = V;
    document.getElementById('cx-e-count').textContent = `${directedE} (${roads.length} roads)`;
    document.getElementById('cx-w-count').textContent = W;
    document.getElementById('cx-k-count').textContent = K;

    // Calculate theoretical operation bounds
    if (V > 0) {
      const logV = Math.max(1, Math.log2(V));
      const dijkstraBound = Math.round((V + directedE) * logV);
      document.getElementById('cx-dijkstra-bound').textContent = `~${dijkstraBound.toLocaleString()} ops`;

      const optBound = Math.round(Math.max(1, K * K) * dijkstraBound);
      document.getElementById('cx-opt-bound').textContent = `~${optBound.toLocaleString()} ops`;
    } else {
      document.getElementById('cx-dijkstra-bound').textContent = 'O((V + E) log V)';
      document.getElementById('cx-opt-bound').textContent = 'O(K² (V + E) log V)';
    }
  } catch (err) {
    console.error('Failed to load complexity data:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAppShell('complexity', 'DAA Complexity Analysis', 'Mathematical time and space bounds of graph structures, binary min-heap, Dijkstra, and greedy heuristics');
  await loadComplexityData();
});
