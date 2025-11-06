# 🚗 Smart Parking Allocation System

A comprehensive parking management system that demonstrates **Data Structures & Algorithms** in action! This project efficiently manages parking spots using advanced DSA concepts including Binary Search Trees, Priority Queues, Graphs, and Stacks.

---

## 📋 Table of Contents
- [Overview](#overview)
- [How to Run](#how-to-run)
- [Features](#features)
- [Data Structures Explained](#data-structures-explained)
- [System Architecture](#system-architecture)
- [Usage Guide](#usage-guide)
- [Technical Details](#technical-details)

---

## 🎯 Overview

This project is a **real-world application of Data Structures & Algorithms** built for managing a parking facility with:
- **80 Total Parking Slots**: 20 Cars + 40 Two-Wheelers + 20 Trucks
- **Multi-lane Layout**: Different lanes for different vehicle types
- **Priority-based Waitlist**: VIP customers get priority when parking is full
- **Real-time Token Generation**: Downloadable parking tokens with QR codes
- **Admin Dashboard**: Monitor system performance and DSA operations

---

## 🚀 How to Run

### Option 1: Python HTTP Server (Recommended)
```bash
cd smart-parking-allocation
python3 -m http.server 8000
```
Then open: `http://localhost:8000`

### Option 2: Node.js http-server
```bash
npx http-server -p 8000
```

### Option 3: PHP Server
```bash
php -S localhost:8000
```

### Option 4: Direct Open (May have limitations)
```bash
open index.html
```

---

## ✨ Features

### 🎫 **Smart Token System**
- Auto-generated tokens with unique IDs (Format: `TKN-YYYYMMDD-XXXXX`)
- Downloadable tokens as text files
- Share functionality (clipboard/native share)
- Real-time fee calculation based on parking duration
- Pricing: Cars ₹120/day | Two-Wheelers ₹50/day | Trucks ₹300/day

### 🎨 **Modern Admin Panel**
- Blue & white professional theme
- Real-time statistics dashboard
- Active token management with search
- Recent bookings history
- Revenue tracking
- **DSA Showcase Section** - See your data structures in action!

### 🔍 **Search & Filter**
- Search tokens by ID or vehicle number
- Filter by vehicle type
- Real-time updates

### ⚡ **Efficient Slot Management**
- Dynamic allocation based on availability
- VIP priority queue system
- Automatic waitlist processing
- Multi-lane support

---

## 🧠 Data Structures Explained

### 1. **Binary Search Tree (BST) - AVL Balanced Tree**

**What it does:**
- Manages all 80 parking slots efficiently
- Self-balancing for optimal performance
- Enables fast slot search, insert, and update operations

**Real Numbers Explained:**
- **Total Slots in Tree: 80** - All parking slots stored as nodes
- **Tree Height: ~6-7** - Maximum depth from root to leaf (log₂(80) ≈ 6.3)
- **Available Slots Found: X** - How many empty slots the BST can quickly locate
- **Time Complexity: O(log n)** - Super fast even with thousands of slots!

**What you see:**
```
Recent BST Operations:
INSERT: Slot C-1-5 → ABC123 (car)
INSERT: Slot T-2-3 → XYZ789 (twoWheeler)
UPDATE: Slot C-1-5 → RELEASED
```

---

### 2. **Priority Queue (Waitlist System)**

**What it does:**
- When parking is FULL, customers join a waitlist
- VIP customers are served FIRST (priority)
- Regular customers wait in normal queue
- When a slot frees up, VIP queue is checked first, then regular queue

**Real Numbers Explained:**
- **Cars Waiting (VIP/Regular): 2/5** means:
  - 2 VIP customers waiting for car slots
  - 5 Regular customers waiting for car slots
  - **VIPs will get slots first when they become available!**

**Why it shows 0/0:**
> ✅ **This is NORMAL!** Waitlist only fills when ALL 80 parking slots are full. Right now you have available slots, so nobody needs to wait!

**To test the waitlist:**
1. Book all 20 car slots
2. Try booking another car
3. You'll be added to the waitlist!
4. Release a car slot
5. Watch the waitlist automatically allocate to the waiting vehicle

**Time Complexity: O(1)** - Instant enqueue/dequeue!

---

### 3. **Graph (Adjacency List) - Parking Layout**

**What it does:**
- Represents the physical layout of parking slots
- Each slot is a **vertex (node)**
- Connections between neighboring slots are **edges (links)**
- Used for pathfinding and layout visualization

**Real Numbers Explained:**
- **Total Parking Slots: 80** - Total vertices in the graph
- **Slot Connections: 73** - Total edges (connections between neighbors)
- **Lanes Mapped: 3** - Car, Two-Wheeler, Truck sections

**🤔 Why 73 Connections?**

Let me break it down:

**Car Section: 2 lanes**
- Car Lane A: 10 slots → 9 connections (each slot connects to next)
- Car Lane B: 10 slots → 9 connections
- **Subtotal: 18 connections**

**Two-Wheeler Section: 4 lanes**
- Lane A: 10 slots → 9 connections
- Lane B: 10 slots → 9 connections
- Lane C: 10 slots → 9 connections
- Lane D: 10 slots → 9 connections
- **Subtotal: 36 connections**

**Truck Section: 1 lane**
- Lane A: 20 slots → 19 connections
- **Subtotal: 19 connections**

**Total: 18 + 36 + 19 = 73 connections!** ✅

Think of it like this: If you have 10 parking slots in a row, there are 9 connections between them (slot 1↔2, 2↔3, 3↔4... 9↔10).

**Layout Structure shows:**
```
🚗 CAR: 2 lanes (5/20 occupied)
🏍️ TWOWHEELER: 4 lanes (1/40 occupied)  
🚚 TRUCK: 1 lane (0/20 occupied)
```

---

### 4. **Stack (LIFO - Last In, First Out)**

**What it does:**
- Stores booking history
- Most recent booking is on top (last in)
- Operates like a stack of papers - last added is first accessed

**Real Numbers Explained:**
- **Total Records: 15** - Total bookings made (stack size)
- **Recent Entry: ABC123** - Vehicle number on top of stack (most recent booking)

**Time Complexity: O(1)** - Push and pop in constant time!

---

## 🏗️ System Architecture

### Parking Layout
```
Total Slots: 80

┌─────────────────────────────────────┐
│  CAR SECTION (20 slots)             │
│  ├─ Lane A: 10 slots                │
│  └─ Lane B: 10 slots                │
├─────────────────────────────────────┤
│  TWO-WHEELER SECTION (40 slots)     │
│  ├─ Lane A: 10 slots                │
│  ├─ Lane B: 10 slots                │
│  ├─ Lane C: 10 slots                │
│  └─ Lane D: 10 slots                │
├─────────────────────────────────────┤
│  TRUCK SECTION (20 slots)           │
│  └─ Lane A: 20 slots                │
└─────────────────────────────────────┘
```

### Data Flow
```
1. User books slot
   ↓
2. BST searches for available slot (O(log n))
   ↓
3. If found → Allocate & generate token
   If not found → Add to Priority Queue
   ↓
4. When slot releases:
   - Update BST
   - Check Priority Queue (VIP first)
   - Auto-allocate to waiting customer
```

---

## 📖 Usage Guide

### 1. **Book a Parking Slot**
1. Click "Book Slot" button
2. Enter vehicle details (number, type, driver name)
3. Optional: Check "VIP Customer" for priority
4. Click "Book Slot"
5. Token generated automatically!

### 2. **Release a Slot**
1. Click "Release Slot" button
2. Enter vehicle number
3. Click "Release Slot"
4. If someone is waiting, they'll be auto-allocated!

### 3. **View Admin Panel**
1. Click "Admin Panel" tab
2. See:
   - **Active Tokens** - All current parking tokens with download/share options
   - **Recent Bookings** - Booking history with status
   - **System Statistics** - Occupancy, revenue, vehicle counts
   - **DSA in Action** - Real-time data structure operations!

### 4. **Download/Share Token**
- In Active Tokens section, click "Download" to save token as `.txt` file
- Click "Share" to copy token details to clipboard
- Perfect for sending to customers!

### 5. **Search Tokens**
- Use search bar in Active Tokens section
- Search by token ID or vehicle number
- Results update in real-time

---

## 🔧 Technical Details

### Technologies Used
- **HTML5** - Structure
- **CSS3** - Modern UI with gradients, animations, flexbox, grid
- **Vanilla JavaScript** - No frameworks, pure JS
- **Font Awesome** - Icons

### DSA Concepts Implemented
1. **Binary Search Tree (AVL)**
   - Self-balancing tree
   - Rotations: Left, Right, Left-Right, Right-Left
   - In-order, Pre-order, Post-order traversal
   - Height calculation

2. **Priority Queue**
   - Dual-queue system (VIP + Regular)
   - FIFO within each queue
   - Priority-based dequeue

3. **Graph (Adjacency List)**
   - Vertex: Each parking slot
   - Edge: Connection between neighboring slots
   - Can implement BFS/DFS for pathfinding

4. **Stack**
   - LIFO booking history
   - Push on new booking
   - Peek for recent entry

### Time Complexities
| Operation | Complexity |
|-----------|-----------|
| Search slot (BST) | O(log n) |
| Insert slot (BST) | O(log n) |
| Enqueue waitlist | O(1) |
| Dequeue waitlist | O(1) |
| Push to stack | O(1) |
| Pop from stack | O(1) |
| Add graph vertex | O(1) |
| Add graph edge | O(1) |

### Space Complexity
- **BST**: O(n) - One node per slot
- **Priority Queue**: O(w) - Where w = waiting vehicles
- **Graph**: O(v + e) - Vertices + Edges
- **Stack**: O(b) - Where b = total bookings

---

## 🎨 Color Scheme

- **Primary Blue**: `#2563eb` - Headers, buttons, highlights
- **Light Blue**: `#dbeafe` - Backgrounds, accents
- **White**: `#ffffff` - Cards, content areas
- **Green**: `#16a34a` - Success states, revenue
- **Purple**: `#9333ea` - VIP indicators
- **Orange**: `#ea580c` - Warnings, duration

---

## 📊 Statistics Tracked

1. **Occupancy Rate** - Percentage of slots in use
2. **Total Revenue** - Calculated from active bookings (₹)
3. **Active Vehicles** - Currently parked vehicles
4. **Average Duration** - Average parking time (days)
5. **Vehicle Breakdown** - Count by type (cars, two-wheelers, trucks)
6. **Waitlist Status** - Total waiting + VIP queue count

---

## 🎓 Learning Outcomes

By studying this project, you'll understand:
1. ✅ How to implement self-balancing BST (AVL tree)
2. ✅ Priority queue implementation with dual queues
3. ✅ Graph representation using adjacency list
4. ✅ Stack operations in real-world scenarios
5. ✅ Real-time UI updates without frameworks
6. ✅ Token generation and download functionality
7. ✅ Search and filter implementations
8. ✅ Modern CSS with gradients and animations
9. ✅ Responsive design principles
10. ✅ Clean code architecture with OOP

---

## 🐛 Common Questions

**Q: Why is my waitlist showing 0/0?**  
A: This is normal! The waitlist only fills when parking is completely full (all 80 slots occupied). Try booking all slots to test it.

**Q: Why do I see 73 connections in the graph?**  
A: Each lane has N-1 connections (10 slots = 9 connections). Total: (9×2) + (9×4) + (19×1) = 73

**Q: How is the tree height calculated?**  
A: For a balanced BST with 80 nodes, height ≈ log₂(80) ≈ 6-7 levels

**Q: Can I change the pricing?**  
A: Yes! Edit the `pricing` object in the `ParkingSystem` constructor in `script.js`

**Q: Can I add more parking slots?**  
A: Yes! Modify the `lanes` configuration in the constructor. The system automatically adjusts.

---

## 🚀 Future Enhancements

Potential improvements:
- [ ] Payment gateway integration
- [ ] Real QR code generation (using qrcode.js)
- [ ] Email/SMS notifications
- [ ] Booking history export (CSV/PDF)
- [ ] User authentication
- [ ] Mobile app version
- [ ] Analytics dashboard with charts
- [ ] Multi-level parking support
- [ ] Reservation system (book in advance)
- [ ] API for third-party integration

---

## 👨‍💻 Project Structure

```
smart-parking-allocation/
├── index.html          # Main HTML structure
├── styles.css          # All styling (admin panel, tokens, DSA cards)
├── script.js           # Complete logic (BST, Queue, Graph, Stack)
└── README.md           # This file
```

---

## 📝 License

This project is open source and available for educational purposes.

---

## 🤝 Contributing

Feel free to fork, improve, and submit pull requests!

---

## 📞 Support

If you have questions about the DSA implementation or need help understanding any part of the code, feel free to reach out!

---

**Made with ❤️ and Data Structures**

*This project demonstrates that DSA isn't just theory - it solves real-world problems efficiently!*
