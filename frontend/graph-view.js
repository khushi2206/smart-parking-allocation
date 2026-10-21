/**
 * RouteWise - Interactive Weighted Road Network Graph Visualization
 * Pure SVG, draggable nodes, edge weights, one-way arrow markers, and path highlights.
 */

import { apiFetch, showToast } from './common.js';

export class GraphView {
  constructor(containerElement, options = {}) {
    this.container = typeof containerElement === 'string' ? document.getElementById(containerElement) : containerElement;
    this.options = {
      width: options.width || 800,
      height: options.height || 520,
      interactive: options.interactive !== false,
      onNodeClick: options.onNodeClick || null,
      onEdgeClick: options.onEdgeClick || null,
      showWeights: options.showWeights !== false,
      ...options
    };

    this.locations = [];
    this.roads = [];
    this.warehouses = [];
    this.positions = {};
    this.highlightedPath = []; // Array of location names
    this.routeStops = []; // Array of stop objects with sequence
    this.activeNode = null;
    this.selectedEdge = null;

    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initSvg();
  }

  initSvg() {
    this.container.innerHTML = `
      <div class="graph-toolbar">
        <button class="btn btn-secondary btn-sm" id="btn-auto-layout" title="Automatically arrange nodes">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>Auto Layout</span>
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-reset-zoom" title="Center graph">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
          </svg>
          <span>Center</span>
        </button>
      </div>

      <div class="graph-legend">
        <div class="legend-item"><span class="legend-symbol" style="background:#eff6ff; border:2px solid #2563eb;"></span> Warehouse Hub</div>
        <div class="legend-item"><span class="legend-symbol" style="background:#ffffff; border:2px solid #1e293b;"></span> Location Node</div>
        <div class="legend-item"><span style="width:16px; height:3px; background:#94a3b8; display:inline-block;"></span> Bidirectional Road</div>
        <div class="legend-item"><span style="color:#64748b; font-weight:bold;">➔</span> One-Way Road</div>
        <div class="legend-item"><span style="width:16px; height:4px; background:#2563eb; display:inline-block;"></span> Active Route / Path</div>
      </div>

      <svg class="graph-svg" id="graph-svg-root" viewBox="0 0 ${this.options.width} ${this.options.height}">
        <defs>
          <!-- Arrow marker for one-way roads -->
          <marker id="arrow-default" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748b" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563eb" />
          </marker>
          <marker id="arrow-return" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#7c3aed" />
          </marker>
        </defs>
        <g id="edges-layer"></g>
        <g id="edge-labels-layer"></g>
        <g id="nodes-layer"></g>
      </svg>
    `;

    this.svg = this.container.querySelector('#graph-svg-root');
    this.edgesLayer = this.container.querySelector('#edges-layer');
    this.edgeLabelsLayer = this.container.querySelector('#edge-labels-layer');
    this.nodesLayer = this.container.querySelector('#nodes-layer');

    this.container.querySelector('#btn-auto-layout')?.addEventListener('click', () => {
      this.calculateAutoLayout();
      this.render();
      this.savePositions();
    });

    this.container.querySelector('#btn-reset-zoom')?.addEventListener('click', () => {
      this.centerGraph();
      this.render();
    });

    if (this.options.interactive) {
      this.setupDragging();
    }
  }

  async loadData() {
    try {
      const [locRes, whRes, roadRes, posRes] = await Promise.all([
        apiFetch('/locations'),
        apiFetch('/warehouses'),
        apiFetch('/roads'),
        apiFetch('/graph/positions')
      ]);

      this.locations = locRes.locations || [];
      this.roads = roadRes.roads || [];
      this.warehouses = whRes.warehouses || [];
      this.positions = posRes.positions || {};

      this.validatePositions();
      this.render();
    } catch (err) {
      console.error('Failed to load graph data:', err);
    }
  }

  setData({ locations, roads, warehouses, positions, highlightedPath, routeStops }) {
    if (locations) this.locations = locations;
    if (roads) this.roads = roads;
    if (warehouses) this.warehouses = warehouses;
    if (positions) this.positions = positions;
    if (highlightedPath !== undefined) this.highlightedPath = highlightedPath;
    if (routeStops !== undefined) this.routeStops = routeStops;

    this.validatePositions();
    this.render();
  }

  validatePositions() {
    let needsSave = false;
    const w = this.options.width;
    const h = this.options.height;
    const count = this.locations.length;

    this.locations.forEach((loc, idx) => {
      if (!this.positions[loc.name]) {
        // Place in circle
        const angle = (idx / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2;
        const radius = Math.min(w, h) * 0.35;
        this.positions[loc.name] = {
          x: Math.round(w / 2 + radius * Math.cos(angle)),
          y: Math.round(h / 2 + radius * Math.sin(angle))
        };
        needsSave = true;
      }
    });

    if (needsSave && count > 0) {
      this.savePositions();
    }
  }

  calculateAutoLayout() {
    const w = this.options.width;
    const h = this.options.height;
    const count = this.locations.length;
    if (count === 0) return;

    // Arrange warehouse hubs centrally or distinctly, others in circle
    const whLocations = new Set(this.warehouses.map((w) => w.location));

    this.locations.forEach((loc, idx) => {
      if (whLocations.has(loc.name) && count > 3) {
        // inner ring
        const angle = (idx / count) * 2 * Math.PI;
        this.positions[loc.name] = {
          x: Math.round(w / 2 + 110 * Math.cos(angle)),
          y: Math.round(h / 2 + 90 * Math.sin(angle))
        };
      } else {
        const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
        const radius = Math.min(w, h) * 0.38;
        this.positions[loc.name] = {
          x: Math.round(w / 2 + radius * Math.cos(angle)),
          y: Math.round(h / 2 + radius * Math.sin(angle))
        };
      }
    });
  }

  centerGraph() {
    const locNames = Object.keys(this.positions);
    if (!locNames.length) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    locNames.forEach((name) => {
      const p = this.positions[name];
      if (p) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    });

    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;
    const targetCenterX = this.options.width / 2;
    const targetCenterY = this.options.height / 2;
    const shiftX = Math.round(targetCenterX - currentCenterX);
    const shiftY = Math.round(targetCenterY - currentCenterY);

    locNames.forEach((name) => {
      if (this.positions[name]) {
        this.positions[name].x += shiftX;
        this.positions[name].y += shiftY;
      }
    });
    this.savePositions();
  }

  async savePositions() {
    try {
      await apiFetch('/graph/positions', {
        method: 'POST',
        body: JSON.stringify({ positions: this.positions })
      });
    } catch {
      // silent
    }
  }

  isPathEdge(start, dest) {
    if (!this.highlightedPath || this.highlightedPath.length < 2) return false;
    for (let i = 0; i < this.highlightedPath.length - 1; i++) {
      const u = this.highlightedPath[i];
      const v = this.highlightedPath[i + 1];
      if ((u === start && v === dest) || (u === dest && v === start)) return true;
    }
    return false;
  }

  render() {
    this.edgesLayer.innerHTML = '';
    this.edgeLabelsLayer.innerHTML = '';
    this.nodesLayer.innerHTML = '';

    if (this.locations.length === 0) {
      this.nodesLayer.innerHTML = `
        <text x="${this.options.width / 2}" y="${this.options.height / 2}" text-anchor="middle" fill="#94a3b8" font-size="14">
          No locations added yet. Click "+ Add Location" to start.
        </text>
      `;
      return;
    }

    // 1. Draw Edges
    this.roads.forEach((road) => {
      const p1 = this.positions[road.start];
      const p2 = this.positions[road.destination];
      if (!p1 || !p2) return;

      const isPath = this.isPathEdge(road.start, road.destination);
      const isOneWay = road.bidirectional === false;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('class', `graph-edge ${isPath ? 'edge-path' : ''}`);

      if (isOneWay) {
        line.setAttribute('marker-end', isPath ? 'url(#arrow-active)' : 'url(#arrow-default)');
      }

      line.addEventListener('click', () => {
        if (this.options.onEdgeClick) this.options.onEdgeClick(road);
      });

      this.edgesLayer.appendChild(line);

      // Edge Weight Label
      if (this.options.showWeights) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'graph-edge-label-group');

        const weightText = `${road.distanceKm}km · ${road.travelTimeMin}m · ₹${road.costRupees}`;
        const rectW = Math.max(76, weightText.length * 6.5);
        const rectH = 18;

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', midX - rectW / 2);
        bg.setAttribute('y', midY - rectH / 2);
        bg.setAttribute('width', rectW);
        bg.setAttribute('height', rectH);
        bg.setAttribute('class', 'graph-edge-label-bg');
        if (isPath) {
          bg.setAttribute('stroke', '#2563eb');
          bg.setAttribute('stroke-width', '1.5');
        }

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('class', 'graph-edge-label-text');
        text.textContent = weightText;

        g.appendChild(bg);
        g.appendChild(text);
        g.addEventListener('click', () => {
          if (this.options.onEdgeClick) this.options.onEdgeClick(road);
        });

        this.edgeLabelsLayer.appendChild(g);
      }
    });

    // 2. Draw Nodes
    const whMap = new Map();
    this.warehouses.forEach((w) => whMap.set(w.location, w));

    this.locations.forEach((loc) => {
      const p = this.positions[loc.name];
      if (!p) return;

      const isWh = whMap.has(loc.name);
      const whInfo = whMap.get(loc.name);
      const isPath = this.highlightedPath && this.highlightedPath.includes(loc.name);

      // Find stop sequence if this is in a route run
      const stopInfo = this.routeStops.find((s) => s.customerLocation === loc.name || (s.path && s.path.path && s.path.path.includes(loc.name)));

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `graph-node ${isWh ? 'node-warehouse' : ''} ${isPath ? 'node-active' : ''}`);
      g.setAttribute('data-node-name', loc.name);
      g.setAttribute('transform', `translate(${p.x}, ${p.y})`);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', isWh ? '24' : '20');
      circle.setAttribute('class', 'node-circle');
      g.appendChild(circle);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'node-text');
      text.setAttribute('y', isWh ? '-2' : '0');
      text.textContent = loc.name.length > 10 ? loc.name.slice(0, 9) + '…' : loc.name;
      g.appendChild(text);

      if (isWh) {
        const subtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subtext.setAttribute('class', 'node-subtext');
        subtext.setAttribute('y', '12');
        subtext.textContent = 'HUB';
        g.appendChild(subtext);
      }

      // Stop badge if scheduled in route
      if (stopInfo && stopInfo.sequence != null) {
        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const badgeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        badgeCircle.setAttribute('cx', '16');
        badgeCircle.setAttribute('cy', '-16');
        badgeCircle.setAttribute('r', '9');
        badgeCircle.setAttribute('class', 'node-stop-badge');

        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', '16');
        badgeText.setAttribute('y', '-16');
        badgeText.setAttribute('class', 'node-stop-badge-text');
        badgeText.textContent = stopInfo.sequence;

        badgeG.appendChild(badgeCircle);
        badgeG.appendChild(badgeText);
        g.appendChild(badgeG);
      }

      g.addEventListener('click', () => {
        if (this.options.onNodeClick) this.options.onNodeClick(loc, isWh ? whInfo : null);
      });

      this.nodesLayer.appendChild(g);
    });
  }

  setupDragging() {
    const getSvgPoint = (e) => {
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    };

    this.svg.addEventListener('mousedown', (e) => {
      const nodeG = e.target.closest('.graph-node');
      if (nodeG) {
        const name = nodeG.getAttribute('data-node-name');
        if (name && this.positions[name]) {
          this.dragTarget = name;
          const svgPt = getSvgPoint(e);
          this.dragOffset = {
            x: svgPt.x - this.positions[name].x,
            y: svgPt.y - this.positions[name].y
          };
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.dragTarget && this.positions[this.dragTarget]) {
        const svgPt = getSvgPoint(e);
        const newX = Math.max(30, Math.min(this.options.width - 30, Math.round(svgPt.x - this.dragOffset.x)));
        const newY = Math.max(30, Math.min(this.options.height - 30, Math.round(svgPt.y - this.dragOffset.y)));
        this.positions[this.dragTarget].x = newX;
        this.positions[this.dragTarget].y = newY;
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.dragTarget) {
        this.dragTarget = null;
        this.savePositions();
      }
    });
  }
}
