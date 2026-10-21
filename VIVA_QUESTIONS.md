# DAA Viva Questions and Answers

**1. Why use an Adjacency List instead of an Adjacency Matrix?**  
Transportation networks are sparse graphs where $|E| \ll |V|^2$. An adjacency list requires $O(V + E)$ space, avoiding the $O(V^2)$ memory overhead of a matrix, and allows Dijkstra and Prim to iterate over adjacent edges in $O(\text{deg}(u))$ time.

**2. How does Prim's Algorithm find the Minimum Spanning Tree (MST)?**  
Prim's algorithm starts with a single vertex in visited set $S$. At each step, it identifies all edges crossing the cut $(S, V \setminus S)$ and greedily extracts the minimum-weight crossing edge using a Binary Min-Heap. The destination vertex is added to $S$, expanding the tree until all reachable vertices are connected.

**3. Why does the sample graph have 9 edges but the MST only has 5?**  
A connected tree spanning $V = 6$ vertices always has exactly $V - 1 = 5$ edges. Adding any of the remaining 4 edges would create cycles ($W-A-B-W$, $A-B-C-A$, $B-C-D-B$, $C-D-E-C$). Prim's algorithm detects when an edge leads to an already-visited vertex and safely excludes it.

**4. Why is the Delivery Route Distance (40 km) different from the Prim's MST total (15 km)?**  
Prim's MST finds the minimum total edge weight needed to connect all vertices into a tree with no cycles. A delivery route is a vehicle tour (Hamiltonian path / TSP) that must visit locations sequentially and return to the warehouse, traversing edges multiple times if needed.

**5. Why is a Greedy Heuristic used for Delivery Route Optimization?**  
Finding the globally optimal multi-stop delivery sequence across $K$ customer locations is the Traveling Salesperson Problem (TSP) / Vehicle Routing Problem (VRP), which is provably **NP-hard**. An exact solution requires factorial $O(K!)$ or exponential $O(2^K K^2)$ time. The priority-aware greedy heuristic combined with Dijkstra computes a high-quality tour in polynomial time $O(K^2 (V + E) \log V)$.

**6. How are order priorities and tie-breakers handled?**  
Orders are categorized into priority tiers: `Urgent` (4) > `High` (3) > `Medium` (2) > `Low` (1). When multiple orders share the same priority, Dijkstra's algorithm determines the shortest road distance from the vehicle's current location. If both priority and distance are identical, Order ID serves as a deterministic tie-breaker.

**7. Why does Dijkstra's algorithm require non-negative weights?**  
Dijkstra's greedy choice assumes that once a vertex is extracted from the priority queue, its shortest distance is finalized. Negative edge weights could allow a longer path to become shorter later, violating Dijkstra's greedy invariant. In our road network, all physical distances in km are strictly non-negative.
