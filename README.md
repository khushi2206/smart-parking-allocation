# RouteWise: Multi-Warehouse Delivery Route Optimizer

A complete, production-grade Design and Analysis of Algorithms (DAA) project demonstrating graph theory, custom data structures, shortest-path algorithms, and multi-warehouse logistics optimization.

Built with **HTML5, CSS3, Vanilla JavaScript, Node.js, and Express.js** without heavy frameworks, TypeScript, or external map dependencies.

---

## 🌟 Key Highlights & DAA Concepts

1. **Topological Weighted Graph ($G = (V, E)$)**:
   - Represented using a custom `Map<Location, Edge[]>` adjacency list.
   - Independent non-negative weights for:
     - Distance in kilometres
     - Travel time in total minutes (hours and minutes converted internally)
     - Monetary cost in Indian Rupees (₹)
   - Supports both two-way (**bidirectional**) and one-way (**directed**) roads.

2. **Custom Binary Min-Heap (`MinPriorityQueue`)**:
   - Manually implemented array-backed complete binary tree without any third-party packages.
   - Operations: `insert` with bubble-up in $O(\log V)$, `extractMin` with bubble-down in $O(\log V)$, `peek` in $O(1)$.
   - Full mathematical properties: parent $\lfloor(i-1)/2\rfloor$, children $2i+1$ and $2i+2$.

3. **Dijkstra's Algorithm with Single Objective Weight**:
   - Single-source shortest path algorithm using the custom binary min-heap.
   - Strictly avoids mixing incompatible units: operates purely on Distance, Time, or Cost.
   - Step-by-step interactive debugger capturing heap state, visited set, distance table updates, and edge relaxations.
   - Path reconstruction using a linear predecessor map.
   - Time Complexity: $\mathcal{O}((V + E) \log V)$, Space Complexity: $\mathcal{O}(V + E)$.

4. **Multi-Warehouse Priority-Aware Delivery Optimizer**:
   - Plans multi-stop vehicle tours departing from any designated warehouse.
   - Solves vehicle routing with a documented **Priority-Aware Greedy Heuristic**:
     1. Prioritizes orders by urgency: **Critical** $>$ **High** $>$ **Normal** $>$ **Low**.
     2. Evaluates deadline lateness and delivery service times.
     3. For flexible orders, assigns the best eligible warehouse respecting vehicle/depot capacity constraints.
     4. Dynamically re-runs Dijkstra from current location to candidate stops.
     5. Optional return routing to the starting warehouse.
   - Includes **Balanced Normalization** mode combining Cost & Time with customizable weights ($W_{\text{cost}} + W_{\text{time}} = 100\%$):
     $$\text{score} = \frac{W_{\text{cost}}}{100} \cdot \frac{\text{cost} - \text{minCost}}{\text{maxCost} - \text{minCost}} + \frac{W_{\text{time}}}{100} \cdot \frac{\text{time} - \text{minTime}}{\text{maxTime} - \text{minTime}}$$
   - Overall Optimizer Worst-case Complexity: $\mathcal{O}(K^2 \cdot (V + E) \log V)$ where $K$ is the number of orders.

5. **Interactive Pure SVG Graph Visualization**:
   - Custom SVG canvas with zero external graph libraries.
   - Draggable nodes with coordinate persistence across sessions.
   - Warehouse hub indicators, edge weight badges, one-way directed arrow markers, and tour stop numbering (①, ②, ③...).
   - Node and road inspector cards.

6. **In-Memory Server State**:
   - Deliberately starts 100% empty to let the user create and test everything from scratch.
   - Includes a **Load Demo Scenario** button for instant one-click demonstration during evaluations and viva presentations.
   - Explains in the UI that data resets on server restart.

---

## 📁 Project Structure

```text
smart-parking-allocation/
├── backend/
│   ├── server.js              # Express REST API, in-memory state, demo seed & routing
│   └── test.js                # Node test suite (8 comprehensive tests)
├── dsa/
│   ├── Graph.js               # Adjacency list graph implementation
│   ├── MinPriorityQueue.js    # Manual binary min-heap implementation
│   ├── Dijkstra.js            # Dijkstra algorithm, trace snapshots & objectives
│   └── optimizer.js           # Multi-warehouse priority-aware greedy tour optimizer
├── frontend/
│   ├── index.html             # Page 1: Overview Dashboard
│   ├── warehouses.html        # Page 2: Warehouse Management
│   ├── locations.html         # Page 3: Location Management
│   ├── roads.html             # Page 4: Interactive Weighted Road Network & SVG Map
│   ├── orders.html            # Page 5: Delivery Order Management
│   ├── structures.html        # Page 6: Data Structures Explorer (Heap, Maps, Lists)
│   ├── dijkstra.html          # Page 7: Dijkstra Shortest Path & Step Debugger
│   ├── optimizer.html         # Page 8: Multi-Warehouse Route Optimization
│   ├── trace.html             # Page 9: Execution Trace Player & Step Inspector
│   ├── complexity.html        # Page 10: DAA Complexity Analysis & Live Graph Bounds
│   ├── style.css              # Modern logistics design system (CSS variables, badges, SVG styles)
│   ├── common.js              # Shared shell, sidebar, notifications, and formatters
│   ├── graph-view.js          # Interactive SVG Graph Renderer with drag & drop
│   ├── overview.js            # Overview dashboard controller
│   ├── warehouses.js          # Warehouse CRUD controller
│   ├── locations.js           # Location CRUD controller
│   ├── roads.js               # Road CRUD & graph interaction controller
│   ├── orders.js              # Order CRUD & filter controller
│   ├── structures.js          # Data structures inspection controller (Human + Raw JSON)
│   ├── dijkstra.js            # Dijkstra shortest path controller & step animator
│   ├── optimizer.js           # Route optimizer controller & tour highlighter
│   ├── trace.js               # Execution trace player controller
│   ├── complexity.js          # Dynamic complexity calculator controller
│   └── script.js              # Script entry fallback
├── package.json               # Scripts (start, dev, test) and dependencies
└── README.md                  # Complete documentation
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)

### Installation

```bash
npm install
```

### Run Locally

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Running Automated Tests

Run the backend and algorithm test suite:

```bash
npm test
```

All 8 tests execute in sub-second time using Node's native test runner (`node --test`), verifying:
1. Distance vs. Time vs. Cost route divergence
2. Priority queues, deadlines, service times, and unreachable destination detection
3. Input validation and invalid weight rejection
4. Min-Heap relaxation step logging
5. One-way vs. bidirectional road connectivity
6. Multi-warehouse capacity constraints and return options
7. Binary min-heap invariants (`extractMin`, `peek`, `isEmpty`)
8. Adjacency list directional mapping

---

## 📋 Comprehensive 10-Page Application Guide

| # | Page | File | Purpose |
|---|---|---|---|
| 1 | **Overview** | `index.html` | Real-time KPI cards (warehouses, locations, roads, orders), compact road network preview, recent orders table, and quick actions. |
| 2 | **Warehouses** | `warehouses.html` | Register supply hubs, set default departure hub, assign location nodes, configure weight capacity constraints (kg), with safe dependency deletion checks. |
| 3 | **Locations** | `locations.html` | Manage graph vertices (nodes). Rejects deletion if connected roads, warehouses, or orders depend on the node. |
| 4 | **Road Network** | `roads.html` | Interactive pure SVG graph visualization with draggable nodes, edge weight badges ($km, min, ₹$), one-way directed arrow markers, and inspector card. |
| 5 | **Delivery Orders** | `orders.html` | Create customer orders with priority tiers (Critical, High, Normal, Low), destination nodes, package weight, service times, and deadlines. Filter by priority, status, and hub. |
| 6 | **Data Structures** | `structures.html` | DAA pedagogical inspector showing: Adjacency List, Binary Min-Heap, Distance Table, Predecessor Map, Visited Set, Warehouses, and Final Sequence. Supports toggle between Human View and Raw JSON. |
| 7 | **Shortest Path** | `dijkstra.html` | Execute Dijkstra with custom Min-Heap for Distance, Time, or Cost. Interactive step debugger with Previous/Next/Play controls and SVG path highlight. |
| 8 | **Route Optimization** | `optimizer.html` | Main multi-warehouse delivery planner. Select departure warehouse, candidate orders, automatic hub selection, return to hub, and balanced cost/time sliders with min-max normalization. |
| 9 | **Execution Trace** | `trace.html` | Step-by-step playback of the latest optimizer run. Inspects candidate queue evaluations, selection reasons, and leg-by-leg SVG tour progress. |
| 10 | **Complexity Analysis** | `complexity.html` | Educational breakdown of all algorithms. Calculates live theoretical operation bounds based on the actual in-memory graph size ($|V|, |E|, |W|, |K|$). |

---

## 💡 Quick Evaluation / Viva Demo Tips

1. **Clean Start**: RouteWise begins with empty state to demonstrate data structure creation.
2. **Instant Demo**: Click the **"Load Demo"** button on the top banner or on the Overview empty state to instantly load 7 realistic locations, 2 warehouse hubs, 9 weighted roads, and 5 prioritized delivery orders.
3. **Compare Dijkstra Metrics**: Go to **Shortest Path**, pick `Central Hub` $\to$ `City Airport`. Notice how changing the objective from **Minimum Distance** to **Minimum Travel Time** or **Minimum Cost** discovers different optimal paths based on road conditions.
4. **Run Route Optimizer**: Go to **Route Optimization**, select `Central Distribution Center`, choose **Balanced Cost & Time**, select all pending orders, and click **Calculate Optimal Delivery Tour**.
5. **Inspect Execution Trace**: Navigate through the timeline to see why Critical orders were prioritized before Normal orders, and how the vehicle returned to the warehouse depot.
6. **Reset State**: Click the **"Reset"** button on the top banner at any time to return the server to a clean empty state.
