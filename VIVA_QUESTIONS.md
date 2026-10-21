# DAA Viva Questions and Answers

**Why use an adjacency list?**  
It stores only roads that exist and lets Dijkstra inspect each location's neighbors efficiently.

**Why normalize cost and time?**  
Rupees and minutes have different units and ranges. Normalization makes the two user-selected weights comparable.

**What is the delivery scheduling key?**  
Negative priority rank, feasibility/lateness flag, deadline, estimated lateness, combined path score, and order ID.

**Why does Dijkstra work here?**  
Distance, time, and cost are non-negative, so their weighted normalized sum is also non-negative.

**Are cheapest and fastest separate algorithms?**  
No. Cost and time are two weighted dimensions inside the one integrated planner.

**Does the planner guarantee a globally optimal route?**  
No. Greedy priority-aware selection recalculates the best next candidate but does not solve the full multi-stop routing problem.

**How are service times used?**  
Arrival is estimated as current time plus road travel time plus that order's delivery service time. This affects late status and the next scheduling round.

**What happens to an unreachable customer?**  
The order is reported with `Unreachable` status and is not falsely counted as delivered.
