/**
 * GraphView - Interactive SVG Weighted Graph Visualization
 * Supports Road Network inspection, Prim's Algorithm step & final MST modes,
 * and Delivery Route sequence highlighting.
 */

export class GraphView {
  constructor(containerElement, options = {}) {
    this.container = typeof containerElement === 'string' ? document.getElementById(containerElement) : containerElement;
    this.options = {
      width: options.width || 720,
      height: options.height || 340,
      interactive: options.interactive !== false,
      showWeights: options.showWeights !== false,
      mode: options.mode || 'network', // 'network' | 'prims' | 'route'
      ...options
    };

    this.locations = [];
    this.roads = [];
    this.positions = {};
    this.mstEdges = []; // array of { from, to, weight }
    this.finalMstOnly = false;
    this.visitedNodes = new Set();
    this.currentEdge = null;
    this.highlightedPath = []; // array of location IDs
    this.routeStops = []; // array of { destination, sequence }

    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initSvg();
  }

  initSvg() {
    this.container.innerHTML = `
      <svg class="graph-svg" id="graph-svg-root" viewBox="0 0 ${this.options.width} ${this.options.height}" style="width:100%; height:100%; display:block; user-select:none;">
        <defs>
          <marker id="arrow-route" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563eb" />
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

    if (this.options.interactive) {
      this.setupDragging();
    }
  }

  setData({
    locations,
    roads,
    positions,
    mstEdges,
    finalMstOnly,
    visitedNodes,
    currentEdge,
    highlightedPath,
    routeStops
  }) {
    if (locations) this.locations = locations;
    if (roads) this.roads = roads;
    if (positions) this.positions = positions;
    if (mstEdges !== undefined) this.mstEdges = mstEdges || [];
    if (finalMstOnly !== undefined) this.finalMstOnly = Boolean(finalMstOnly);
    if (visitedNodes !== undefined) this.visitedNodes = new Set(visitedNodes || []);
    if (currentEdge !== undefined) this.currentEdge = currentEdge;
    if (highlightedPath !== undefined) this.highlightedPath = highlightedPath || [];
    if (routeStops !== undefined) this.routeStops = routeStops || [];

    this.validatePositions();
    this.render();
  }

  validatePositions() {
    const w = this.options.width;
    const h = this.options.height;
    const count = this.locations.length;

    this.locations.forEach((loc, idx) => {
      const id = loc.id;
      if (!this.positions[id]) {
        const angle = (idx / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2;
        const radius = Math.min(w, h) * 0.35;
        this.positions[id] = {
          x: Math.round(w / 2 + radius * Math.cos(angle)),
          y: Math.round(h / 2 + radius * Math.sin(angle))
        };
      }
    });
  }

  isMstEdge(u, v) {
    if (!this.mstEdges || this.mstEdges.length === 0) return false;
    return this.mstEdges.some(
      (e) => (e.from === u && e.to === v) || (e.from === v && e.to === u)
    );
  }

  isCurrentCutEdge(u, v) {
    if (!this.currentEdge) return false;
    const { from, to } = this.currentEdge;
    return (from === u && to === v) || (from === v && to === u);
  }

  isPathEdge(u, v) {
    if (!this.highlightedPath || this.highlightedPath.length < 2) return false;
    for (let i = 0; i < this.highlightedPath.length - 1; i++) {
      const p1 = this.highlightedPath[i];
      const p2 = this.highlightedPath[i + 1];
      if ((p1 === u && p2 === v) || (p1 === v && p2 === u)) return true;
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
          No locations in graph. Add locations to view network.
        </text>
      `;
      return;
    }

    // 1. Draw Edges
    this.roads.forEach((road) => {
      const p1 = this.positions[road.start];
      const p2 = this.positions[road.destination];
      if (!p1 || !p2) return;

      const isMst = this.isMstEdge(road.start, road.destination);
      const isCut = this.isCurrentCutEdge(road.start, road.destination);
      const isPath = this.isPathEdge(road.start, road.destination);

      // In Final MST view, ONLY show selected MST edges (hide excluded edges without deleting them!)
      if (this.finalMstOnly && !isMst) {
        return;
      }

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);

      let strokeColor = '#cbd5e1';
      let strokeWidth = '2';
      let strokeDash = '';

      if (isPath) {
        strokeColor = '#2563eb'; // Blue for active delivery tour path
        strokeWidth = '4';
      } else if (this.finalMstOnly || isMst) {
        strokeColor = '#16a34a'; // Vibrant green for MST tree edges
        strokeWidth = '3';
      } else if (isCut) {
        strokeColor = '#eab308'; // Amber/yellow for currently considered cut edge
        strokeWidth = '3';
        strokeDash = '4,3';
      }

      line.setAttribute('stroke', strokeColor);
      line.setAttribute('stroke-width', strokeWidth);
      if (strokeDash) line.setAttribute('stroke-dasharray', strokeDash);
      line.setAttribute('stroke-linecap', 'round');

      this.edgesLayer.appendChild(line);

      // Edge Weight Label
      if (this.options.showWeights) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const weightText = `${road.distanceKm} km`;
        const rectW = Math.max(50, weightText.length * 7.5);
        const rectH = 18;

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', midX - rectW / 2);
        bg.setAttribute('y', midY - rectH / 2);
        bg.setAttribute('width', rectW);
        bg.setAttribute('height', rectH);
        bg.setAttribute('rx', '4');
        bg.setAttribute('fill', isPath ? '#eff6ff' : (isMst ? '#f0fdf4' : '#ffffff'));
        bg.setAttribute('stroke', isPath ? '#2563eb' : (isMst ? '#16a34a' : '#cbd5e1'));
        bg.setAttribute('stroke-width', '1');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY + 4);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', isPath ? '#1e40af' : (isMst ? '#15803d' : '#475569'));
        text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
        text.textContent = weightText;

        g.appendChild(bg);
        g.appendChild(text);
        this.edgeLabelsLayer.appendChild(g);
      }
    });

    // 2. Draw Nodes
    this.locations.forEach((loc) => {
      const p = this.positions[loc.id];
      if (!p) return;

      const isWh = loc.isWarehouse || loc.id === 'W';
      const isVisited = this.visitedNodes.has(loc.id);
      const isPathNode = this.highlightedPath && this.highlightedPath.includes(loc.id);

      // Check if this node is a stop in delivery plan
      const stopIdx = this.routeStops.findIndex((s) => (s.destination || s.customerLocation) === loc.id);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'graph-node');
      g.setAttribute('data-node-id', loc.id);
      g.setAttribute('transform', `translate(${p.x}, ${p.y})`);
      g.style.cursor = 'grab';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', isWh ? '22' : '18');

      let fillColor = '#ffffff';
      let strokeColor = '#334155';
      let strokeWidth = '2';

      if (isVisited) {
        fillColor = '#dcfce7'; // Soft green for Prim's visited set S
        strokeColor = '#16a34a';
        strokeWidth = '2.5';
      } else if (isPathNode) {
        fillColor = '#eff6ff'; // Soft blue for route
        strokeColor = '#2563eb';
        strokeWidth = '2.5';
      }

      if (isWh) {
        strokeWidth = '3';
        if (!isVisited && !isPathNode) {
          fillColor = '#f8fafc';
          strokeColor = '#0f172a';
        }
      }

      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', strokeColor);
      circle.setAttribute('stroke-width', strokeWidth);
      g.appendChild(circle);

      // Node ID Text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('y', isWh ? '-2' : '4');
      text.setAttribute('font-size', '13');
      text.setAttribute('font-weight', '700');
      text.setAttribute('fill', isVisited ? '#15803d' : (isPathNode ? '#1e40af' : '#0f172a'));
      text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      text.textContent = loc.id;
      g.appendChild(text);

      // Warehouse Hub tag
      if (isWh) {
        const subtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subtext.setAttribute('text-anchor', 'middle');
        subtext.setAttribute('y', '11');
        subtext.setAttribute('font-size', '8');
        subtext.setAttribute('font-weight', '800');
        subtext.setAttribute('fill', '#2563eb');
        subtext.setAttribute('letter-spacing', '0.5');
        subtext.textContent = 'HUB';
        g.appendChild(subtext);
      }

      // Stop badge for Delivery Plan sequence
      if (stopIdx !== -1) {
        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const badgeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        badgeCircle.setAttribute('cx', '14');
        badgeCircle.setAttribute('cy', '-14');
        badgeCircle.setAttribute('r', '8');
        badgeCircle.setAttribute('fill', '#2563eb');
        badgeCircle.setAttribute('stroke', '#ffffff');
        badgeCircle.setAttribute('stroke-width', '1.5');

        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', '14');
        badgeText.setAttribute('y', '-11');
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('font-size', '9');
        badgeText.setAttribute('font-weight', '700');
        badgeText.setAttribute('fill', '#ffffff');
        badgeText.textContent = stopIdx + 1;

        badgeG.appendChild(badgeCircle);
        badgeG.appendChild(badgeText);
        g.appendChild(badgeG);
      }

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
        const id = nodeG.getAttribute('data-node-id');
        if (id && this.positions[id]) {
          this.dragTarget = id;
          const pt = getSvgPoint(e);
          this.dragOffset = {
            x: pt.x - this.positions[id].x,
            y: pt.y - this.positions[id].y
          };
          nodeG.style.cursor = 'grabbing';
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.dragTarget) return;
      const pt = getSvgPoint(e);
      const newX = Math.max(30, Math.min(this.options.width - 30, Math.round(pt.x - this.dragOffset.x)));
      const newY = Math.max(30, Math.min(this.options.height - 30, Math.round(pt.y - this.dragOffset.y)));

      this.positions[this.dragTarget] = { x: newX, y: newY };
      this.render();
    });

    window.addEventListener('mouseup', async () => {
      if (this.dragTarget) {
        this.dragTarget = null;
        try {
          await fetch('/api/graph/positions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions: this.positions })
          });
        } catch {
          // ignore
        }
      }
    });
  }
}
