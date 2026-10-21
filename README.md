# Delivery Route Optimization (DSA)

A simple, functional web application for delivery route optimization using Data Structures and Algorithms. The entire UI is consistent, light-themed, and connected across four tabs sharing the same application state.

Built with **HTML5, CSS3, Vanilla JavaScript, Node.js, and Express.js** with zero external frontend libraries or map frameworks.

---

## 🌟 Application Tabs

The application consists of exactly four connected tabs in a clean top navigation bar:

1. **Orders (`Tab 1`)**:
   - Compact table listing: Order ID, Customer, Destination, Priority, Status, and Actions.
   - Priority levels: `Urgent`, `High`, `Medium`, `Low`.
   - Actions to add new orders, edit existing orders, delete orders, and mark orders as delivered.
   - Validates unique Order IDs and ensures destinations reference existing graph locations.

2. **Road Network (`Tab 2`)**:
   - Weighted road network graph rendered with pure SVG (draggable nodes, edge weights in km).
   - Compact forms and tables to add, edit, or delete roads and locations.
   - Adjacency list representation; updates instantly synchronize with all tabs.

3. **Prim's Algorithm (`Tab 3`)**:
   - Minimum Spanning Tree (MST) computation using a custom Binary Min-Heap and visited set.
   - Full playback controls: Starting node selector, Run, Previous Step, Next Step, Play/Pause, Reset.
   - **Original Graph / Final MST Toggle**:
     - In **Final MST View**, only the selected MST edges ($V - 1$) are displayed, and all excluded edges are hidden without deleting them from the graph.
     - Displays total MST weight, number of selected edges, and number of excluded edges.
     - Detects disconnected graphs and reports unreachable components.

4. **Delivery Optimization (`Tab 4`)**:
   - Calculates delivery tour from the starting warehouse through all pending customer orders.
   - Uses a Priority-Aware Greedy Heuristic combined with Dijkstra's shortest paths.
   - Prioritizes by `Urgent` > `High` > `Medium` > `Low`, with Dijkstra distance and Order ID as tie-breakers.
   - Sums actual traversed road distances and provides an optional return to warehouse leg.
   - In-table **Mark Delivered** action recalculates the remaining tour from the active delivery location.

---

## 📊 Pre-Loaded Sample Dataset

Loaded automatically on launch and restorable via the **Reset Sample Data** button:

### Locations
- `W`: Main Warehouse (Root)
- `A`: Location A
- `B`: Location B
- `C`: Location C
- `D`: Location D
- `E`: Location E

### Roads (All Bidirectional, Weights in km)
- $W - A$: 4 km
- $W - B$: 3 km
- $A - B$: 2 km
- $A - C$: 5 km
- $B - C$: 6 km
- $B - D$: 7 km
- $C - D$: 2 km
- $C - E$: 4 km
- $D - E$: 3 km

*Graph contains multiple cycles ($W-A-B-W$, $A-B-C-A$, $B-C-D-B$, $C-D-E-C$). Prim's MST selects exactly 5 edges with total weight 15 km, excluding 4 cycle-forming edges.*

### Orders
- `O101`: Customer One, Destination: C, Priority: Urgent
- `O102`: Customer Two, Destination: A, Priority: Medium
- `O103`: Customer Three, Destination: D, Priority: High
- `O104`: Customer Four, Destination: B, Priority: Urgent
- `O105`: Customer Five, Destination: E, Priority: Low

---

## 📁 Clean Project Structure

```text
smart-parking-allocation/
├── backend/
│   ├── server.js              # Express REST API, sample data & endpoints
│   └── test.js                # Automated test suite (10 tests)
├── dsa/
│   ├── Graph.js               # Adjacency list graph implementation
│   ├── MinPriorityQueue.js    # Custom binary min-heap implementation
│   ├── Dijkstra.js            # Dijkstra shortest path algorithm
│   ├── Prims.js               # Prim's MST algorithm with step trace
│   └── optimizer.js           # Priority-aware delivery tour optimizer
├── frontend/
│   ├── index.html             # Single-page 4-tab application UI
│   ├── app.js                 # Unified state management & tab controller
│   ├── graph-view.js          # Interactive SVG graph visualizer
│   └── style.css              # Clean light-theme design system
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
```bash
npm test
```

### 3. Start Application
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
