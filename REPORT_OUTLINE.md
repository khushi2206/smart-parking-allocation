# Project Report Outline

1. Problem statement and delivery route optimization objectives.
2. Input model: locations, bidirectional road network, customer orders, and priority tiers (Urgent, High, Medium, Low).
3. Core Data Structures:
   - Adjacency List: `Map<Location, Edge[]>` for graph representation.
   - Custom Binary Min-Heap: `MinPriorityQueue` for logarithmic minimum extraction.
   - Visited Set: Cut tracking for cycle avoidance.
4. Prim's Minimum Spanning Tree (MST) Algorithm:
   - Cut property $(S, V \setminus S)$ and greedy expansion.
   - Original Graph vs. Final MST view (hiding excluded edges).
   - Analysis of cycle exclusion on sample graph ($V = 6$, $E = 9$, $5$ selected, $4$ excluded).
5. Priority-Aware Delivery Tour Heuristic:
   - Dijkstra's single-source shortest path algorithm from scratch.
   - Sequential greedy selection based on priority and shortest road distance.
   - Multi-stop tour accumulation and optional return to warehouse.
   - Distinction between Prim's MST total and actual route traversed distance.
6. Algorithmic Complexity:
   - Binary Min-Heap: $O(\log V)$ insertion and extraction.
   - Dijkstra's Algorithm: $O((V + E) \log V)$.
   - Prim's MST: $O(E \log V)$.
   - Delivery Tour Heuristic: $O(K^2 \cdot (V + E) \log V)$ for $K$ orders.
7. Verification and Test Results:
   - 10 automated unit tests covering heap invariants, graph mapping, Prim's MST, and delivery routing.
