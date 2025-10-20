// Smart Parking Allocation System - JavaScript

// Advanced Data Structures for Enhanced Parking System

// Min Heap for finding nearest available slot (DSA Concept)
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    insert(slot) {
        this.heap.push(slot);
        this.heapifyUp();
    }
    
    extractMin() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.heapifyDown();
        return min;
    }
    
    heapifyUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex].distance <= this.heap[index].distance) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }
    
    heapifyDown() {
        let index = 0;
        while (true) {
            let smallest = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            
            if (leftChild < this.heap.length && this.heap[leftChild].distance < this.heap[smallest].distance) {
                smallest = leftChild;
            }
            if (rightChild < this.heap.length && this.heap[rightChild].distance < this.heap[smallest].distance) {
                smallest = rightChild;
            }
            if (smallest === index) break;
            
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
    
    isEmpty() {
        return this.heap.length === 0;
    }
}

// Graph for Multi-Level Parking Navigation (DSA Concept)
class ParkingGraph {
    constructor() {
        this.adjacencyList = new Map();
        this.floors = new Map();
    }
    
    addFloor(floorId, slots) {
        this.floors.set(floorId, slots);
        this.adjacencyList.set(floorId, []);
    }
    
    addConnection(floor1, floor2, distance) {
        this.adjacencyList.get(floor1).push({ floor: floor2, distance });
        this.adjacencyList.get(floor2).push({ floor: floor1, distance });
    }
    
    // BFS to find shortest path to nearest available slot
    findNearestAvailableSlot(startFloor, vehicleType) {
        const queue = [{ floor: startFloor, distance: 0, path: [startFloor] }];
        const visited = new Set();
        
        while (queue.length > 0) {
            const { floor, distance, path } = queue.shift();
            
            if (visited.has(floor)) continue;
            visited.add(floor);
            
            // Check if current floor has available slots
            const availableSlots = this.getAvailableSlots(floor, vehicleType);
            if (availableSlots.length > 0) {
                return {
                    floor,
                    slots: availableSlots,
                    distance,
                    path
                };
            }
            
            // Add connected floors to queue
            const connections = this.adjacencyList.get(floor) || [];
            for (const connection of connections) {
                if (!visited.has(connection.floor)) {
                    queue.push({
                        floor: connection.floor,
                        distance: distance + connection.distance,
                        path: [...path, connection.floor]
                    });
                }
            }
        }
        
        return null;
    }
    
    getAvailableSlots(floorId, vehicleType) {
        const floor = this.floors.get(floorId);
        if (!floor) return [];
        
        return floor.filter(slot => 
            slot.isAvailable && this.isCompatibleSlot(vehicleType, slot)
        );
    }
    
    isCompatibleSlot(vehicleType, slot) {
        const compatibility = {
            'car': ['car', 'truck'],
            'motorcycle': ['twoWheeler', 'car'],
            'truck': ['truck']
        };
        return compatibility[vehicleType]?.includes(slot.lane);
    }
}

// Reservation System with Hash Maps (DSA Concept)
class ReservationSystem {
    constructor() {
        this.reservations = new Map(); // vehicleId -> reservation
        this.timeSlots = new Map(); // timeSlot -> reservations
        this.priorityQueue = new PriorityQueue();
    }
    
    makeReservation(vehicleId, slotId, startTime, endTime, priority = 'regular') {
        const reservation = {
            id: Date.now(),
            vehicleId,
            slotId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            priority,
            status: 'pending'
        };
        
        this.reservations.set(vehicleId, reservation);
        this.priorityQueue.enqueue(reservation, this.getPriorityWeight(priority));
        
        return reservation;
    }
    
    getPriorityWeight(priority) {
        const weights = {
            'emergency': 1,
            'vip': 2,
            'premium': 3,
            'regular': 4
        };
        return weights[priority] || 4;
    }
    
    getReservation(vehicleId) {
        return this.reservations.get(vehicleId);
    }
    
    cancelReservation(vehicleId) {
        const reservation = this.reservations.get(vehicleId);
        if (reservation) {
            reservation.status = 'cancelled';
            this.reservations.delete(vehicleId);
            return true;
        }
        return false;
    }
}

// Waitlist System with Queue and Linked List (DSA Concept)
class WaitlistSystem {
    constructor() {
        this.waitingQueue = new PriorityQueue();
        this.overflowList = new LinkedList();
        this.maxCapacity = 100;
    }
    
    addToWaitlist(vehicle) {
        if (this.waitingQueue.size() < this.maxCapacity) {
            this.waitingQueue.enqueue(vehicle, vehicle.priorityWeight);
            return { status: 'queued', position: this.waitingQueue.size() };
        } else {
            this.overflowList.append(vehicle);
            return { status: 'overflow', position: this.overflowList.size };
        }
    }
    
    processNextVehicle() {
        if (!this.waitingQueue.isEmpty()) {
            return this.waitingQueue.dequeue();
        } else if (!this.overflowList.isEmpty()) {
            return this.overflowList.removeFirst();
        }
        return null;
    }
    
    getWaitlistStatus() {
        return {
            queued: this.waitingQueue.size(),
            overflow: this.overflowList.size,
            total: this.waitingQueue.size() + this.overflowList.size
        };
    }
}

// Linked List for Overflow Management (DSA Concept)
class LinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }
    
    append(data) {
        const newNode = new ListNode(data);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.size++;
    }
    
    removeFirst() {
        if (!this.head) return null;
        
        const data = this.head.data;
        this.head = this.head.next;
        if (!this.head) this.tail = null;
        this.size--;
        return data;
    }
    
    isEmpty() {
        return this.size === 0;
    }
}

class ListNode {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

// Vehicle Search and Reporting System (DSA Concept)
class SearchAndReportingSystem {
    constructor() {
        this.vehicleToSlotMap = new Map(); // vehicleId -> slotId
        this.slotToVehicleMap = new Map(); // slotId -> vehicleId
        this.arrivalTimes = new Map(); // vehicleId -> arrivalTime
        this.departureTimes = new Map(); // vehicleId -> departureTime
        this.hourlyStats = new Map(); // hour -> count
    }
    
    registerVehicle(vehicleId, slotId) {
        this.vehicleToSlotMap.set(vehicleId, slotId);
        this.slotToVehicleMap.set(slotId, vehicleId);
        this.arrivalTimes.set(vehicleId, new Date());
        
        // Update hourly stats
        const hour = new Date().getHours();
        this.hourlyStats.set(hour, (this.hourlyStats.get(hour) || 0) + 1);
    }
    
    findVehicleSlot(vehicleId) {
        return this.vehicleToSlotMap.get(vehicleId);
    }
    
    findSlotVehicle(slotId) {
        return this.slotToVehicleMap.get(slotId);
    }
    
    recordDeparture(vehicleId) {
        this.departureTimes.set(vehicleId, new Date());
    }
    
    getBusiestHours() {
        const sortedHours = Array.from(this.hourlyStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        return sortedHours.map(([hour, count]) => ({
            hour: `${hour}:00`,
            count,
            percentage: (count / Array.from(this.hourlyStats.values()).reduce((a, b) => a + b, 0) * 100).toFixed(1)
        }));
    }
    
    getVehicleHistory(vehicleId) {
        return {
            slotId: this.vehicleToSlotMap.get(vehicleId),
            arrivalTime: this.arrivalTimes.get(vehicleId),
            departureTime: this.departureTimes.get(vehicleId)
        };
    }
}

// Payment and Billing System (DSA Concept)
class PaymentSystem {
    constructor() {
        this.billingInfo = new Map(); // vehicleId -> billing data
        this.pricingRates = new Map(); // vehicleType -> rate per hour
        this.initializePricing();
    }
    
    initializePricing() {
        this.pricingRates.set('car', 2.0);
        this.pricingRates.set('motorcycle', 1.0);
        this.pricingRates.set('truck', 3.0);
    }
    
    calculateCharges(vehicleId, vehicleType, startTime, endTime) {
        const duration = (endTime - startTime) / (1000 * 60 * 60); // hours
        const rate = this.pricingRates.get(vehicleType) || 2.0;
        const baseCharge = duration * rate;
        
        // Apply discounts for longer stays
        let discount = 0;
        if (duration > 8) discount = 0.2; // 20% discount for 8+ hours
        else if (duration > 4) discount = 0.1; // 10% discount for 4+ hours
        
        const finalCharge = baseCharge * (1 - discount);
        
        const billingData = {
            vehicleId,
            vehicleType,
            startTime,
            endTime,
            duration: duration.toFixed(2),
            rate,
            baseCharge: baseCharge.toFixed(2),
            discount: (discount * 100).toFixed(1) + '%',
            finalCharge: finalCharge.toFixed(2)
        };
        
        this.billingInfo.set(vehicleId, billingData);
        return billingData;
    }
    
    getBillingInfo(vehicleId) {
        return this.billingInfo.get(vehicleId);
    }
    
    generateRevenueReport() {
        const totalRevenue = Array.from(this.billingInfo.values())
            .reduce((sum, bill) => sum + parseFloat(bill.finalCharge), 0);
        
        const vehicleTypeRevenue = new Map();
        for (const bill of this.billingInfo.values()) {
            const current = vehicleTypeRevenue.get(bill.vehicleType) || 0;
            vehicleTypeRevenue.set(bill.vehicleType, current + parseFloat(bill.finalCharge));
        }
        
        return {
            totalRevenue: totalRevenue.toFixed(2),
            byVehicleType: Object.fromEntries(vehicleTypeRevenue),
            totalTransactions: this.billingInfo.size
        };
    }
}

// Priority Queue Implementation (DS Concept)
class PriorityQueue {
    constructor() {
        this.items = [];
    }
    
    enqueue(item, priority) {
        const queueElement = { item, priority };
        let added = false;
        
        for (let i = 0; i < this.items.length; i++) {
            if (queueElement.priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        
        if (!added) {
            this.items.push(queueElement);
        }
    }
    
    dequeue() {
        return this.items.shift();
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    peek() {
        return this.items[0];
    }
    
    size() {
        return this.items.length;
    }
    
    get length() {
        return this.items.length;
    }
}

// Vehicle Priority System (OOP Concept)
class Vehicle {
    constructor(licensePlate, type, driverName, priority = 'regular') {
        this.licensePlate = licensePlate;
        this.type = type;
        this.driverName = driverName;
        this.priority = priority;
        this.arrivalTime = new Date();
        this.priorityWeight = this.getPriorityWeight();
    }
    
    getPriorityWeight() {
        const weights = {
            'emergency': 1,    // Highest priority
            'vip': 2,         // VIP customers
            'premium': 3,     // Premium members
            'regular': 4,     // Regular customers
            'late': 5         // Late arrivals
        };
        return weights[this.priority] || 4;
    }
}

// Dynamic Slot Allocator (OOP + DS)
class DynamicSlotAllocator {
    constructor() {
        this.waitingQueue = new PriorityQueue();
        this.availableSlots = new Map();
        this.allocatedSlots = new Map();
    }
    
    addVehicleToQueue(vehicle) {
        // Add vehicle to priority queue
        this.waitingQueue.enqueue(vehicle, vehicle.priorityWeight);
        console.log(`Vehicle ${vehicle.licensePlate} added to queue with priority: ${vehicle.priority}`);
    }
    
    allocateNextAvailableSlot() {
        if (this.waitingQueue.isEmpty()) {
            return null;
        }
        
        const nextVehicle = this.waitingQueue.dequeue();
        const availableSlot = this.findBestSlot(nextVehicle);
        
        if (availableSlot) {
            this.allocatedSlots.set(availableSlot.id, nextVehicle);
            this.availableSlots.delete(availableSlot.id);
            return { vehicle: nextVehicle, slot: availableSlot };
        }
        
        return null;
    }
    
    findBestSlot(vehicle) {
        // Find best slot based on vehicle type and availability
        for (let [slotId, slot] of this.availableSlots) {
            if (this.isCompatibleSlot(vehicle, slot)) {
                return slot;
            }
        }
        return null;
    }
    
    isCompatibleSlot(vehicle, slot) {
        const compatibility = {
            'car': ['car', 'truck'],
            'motorcycle': ['twoWheeler', 'car'],
            'truck': ['truck']
        };
        return compatibility[vehicle.type]?.includes(slot.lane);
    }
}

class ParkingSystem {
    constructor() {
        this.totalSlots = 70; // 20 cars + 40 two-wheelers + 10 trucks
        this.parkingSlots = [];
        this.bookings = [];
        this.selectedSlot = null;
        
        // Initialize advanced systems
        this.dynamicAllocator = new DynamicSlotAllocator();
        this.waitingVehicles = [];
        this.parkingGraph = new ParkingGraph();
        this.reservationSystem = new ReservationSystem();
        this.waitlistSystem = new WaitlistSystem();
        this.searchSystem = new SearchAndReportingSystem();
        this.paymentSystem = new PaymentSystem();
        this.minHeap = new MinHeap();
        
        // Lane configuration
        this.lanes = {
            car: { 
                totalSlots: 20, 
                lanes: [
                    { slots: 10, container: 'carLane1Slots', available: 'carLane1Available' },
                    { slots: 10, container: 'carLane2Slots', available: 'carLane2Available' }
                ],
                sectionAvailable: 'carAvailable'
            },
            twoWheeler: { 
                totalSlots: 40, 
                lanes: [
                    { slots: 10, container: 'twoWheelerLane1Slots', available: 'twoWheelerLane1Available' },
                    { slots: 10, container: 'twoWheelerLane2Slots', available: 'twoWheelerLane2Available' },
                    { slots: 10, container: 'twoWheelerLane3Slots', available: 'twoWheelerLane3Available' },
                    { slots: 10, container: 'twoWheelerLane4Slots', available: 'twoWheelerLane4Available' }
                ],
                sectionAvailable: 'twoWheelerAvailable'
            },
            truck: { 
                totalSlots: 10, 
                lanes: [
                    { slots: 10, container: 'truckLane1Slots', available: 'truckLane1Available' }
                ],
                sectionAvailable: 'truckAvailable'
            }
        };
        
        this.init();
    }

    init() {
        this.initializeSlots();
        this.renderParkingGrid();
        this.bindEvents();
        this.updateStatus();
        this.populateSlotOptions();
        
        // Initialize advanced features
        this.initializeMultiLevelParking();
        
        // Start dynamic simulation
        this.simulateDynamicArrivals();
        
        // Start overstayed vehicle monitoring
        this.startOverstayedMonitoring();
        
        // Demo advanced features
        this.demoAdvancedFeatures();
    }

    demoAdvancedFeatures() {
        console.log('=== Advanced Parking System Features Demo ===');
        
        // Demo reservation system
        setTimeout(() => {
            this.makeReservation('DEMO-001', 1, '2024-01-01 10:00', '2024-01-01 12:00', 'vip');
            console.log('Demo: VIP reservation made for slot 1');
        }, 2000);
        
        // Demo multi-level parking
        setTimeout(() => {
            const result = this.findNearestSlotWithBFS('car', 'ground');
            console.log('Demo: Multi-level parking search result:', result);
        }, 3000);
        
        // Demo waitlist system
        setTimeout(() => {
            const waitlistStatus = this.getWaitlistStatus();
            console.log('Demo: Waitlist status:', waitlistStatus);
        }, 4000);
        
        // Demo reporting system
        setTimeout(() => {
            const busiestHours = this.getBusiestHours();
            console.log('Demo: Busiest hours:', busiestHours);
        }, 5000);
        
        // Demo payment system
        setTimeout(() => {
            const revenueReport = this.generateRevenueReport();
            console.log('Demo: Revenue report:', revenueReport);
        }, 6000);
    }

    initializeSlots() {
        this.parkingSlots = [];
        let slotId = 1;
        
        // Initialize car slots (1-20) - 2 lanes of 10 each
        for (let i = 0; i < this.lanes.car.totalSlots; i++) {
            this.parkingSlots.push({
                id: slotId++,
                lane: 'car',
                laneNumber: Math.floor(i / 10) + 1, // Lane 1 or 2
                isAvailable: true,
                vehicleNumber: null,
                vehicleType: null,
                driverName: null,
                phoneNumber: null,
                bookingTime: null,
                plannedDuration: null, // in minutes
                priority: 'regular',
                status: 'available' // available, occupied, reserved, overstayed, vip
            });
        }
        
        // Initialize two-wheeler slots (21-60) - 4 lanes of 10 each
        for (let i = 0; i < this.lanes.twoWheeler.totalSlots; i++) {
            this.parkingSlots.push({
                id: slotId++,
                lane: 'twoWheeler',
                laneNumber: Math.floor(i / 10) + 1, // Lane 1, 2, 3, or 4
                isAvailable: true,
                vehicleNumber: null,
                vehicleType: null,
                driverName: null,
                phoneNumber: null,
                bookingTime: null,
                plannedDuration: null,
                priority: 'regular',
                status: 'available'
            });
        }
        
        // Initialize truck slots (61-70) - 1 lane of 10
        for (let i = 0; i < this.lanes.truck.totalSlots; i++) {
            this.parkingSlots.push({
                id: slotId++,
                lane: 'truck',
                laneNumber: 1, // Only 1 lane
                isAvailable: true,
                vehicleNumber: null,
                vehicleType: null,
                driverName: null,
                phoneNumber: null,
                bookingTime: null,
                plannedDuration: null,
                priority: 'regular',
                status: 'available'
            });
        }
    }

    renderParkingGrid() {
        // Render each vehicle type section
        Object.keys(this.lanes).forEach(vehicleType => {
            const vehicleLanes = this.lanes[vehicleType];
            
            // Render each lane within the vehicle type
            vehicleLanes.lanes.forEach((lane, laneIndex) => {
                const laneSlots = this.parkingSlots.filter(slot => 
                    slot.lane === vehicleType && slot.laneNumber === (laneIndex + 1)
                );
                const container = document.getElementById(lane.container);
                container.innerHTML = '';

                laneSlots.forEach(slot => {
                    const slotElement = document.createElement('div');
                    const statusClass = this.getSlotStatusClass(slot);
                    slotElement.className = `parking-slot ${statusClass}`;
                    slotElement.dataset.slotId = slot.id;

                    const statusText = this.getSlotStatusText(slot);
                    // Accessibility: make slots focusable and screen-reader friendly
                    slotElement.setAttribute('tabindex', '0');
                    slotElement.setAttribute('aria-label', `Slot ${slot.id}, ${statusText}`);

                    slotElement.innerHTML = `
                        <div class="slot-number">${slot.id}</div>
                        <div class="slot-status">${statusText}</div>
                        ${slot.vehicleNumber ? `<div class="slot-vehicle">${slot.vehicleNumber}</div>` : ''}
                        ${slot.plannedDuration ? `<div class="slot-duration">${slot.plannedDuration}min</div>` : ''}
                        ${slot.priority !== 'regular' ? `<div class="slot-priority">${slot.priority.toUpperCase()}</div>` : ''}
                    `;

                    // Add click and keyboard activation for available slots
                    if (slot.isAvailable) {
                        slotElement.setAttribute('role', 'button');
                        slotElement.setAttribute('aria-pressed', 'false');
                        slotElement.addEventListener('click', () => this.selectSlot(slot.id));
                        slotElement.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                this.selectSlot(slot.id);
                            }
                        });
                    } else {
                        slotElement.setAttribute('aria-disabled', 'true');
                    }

                    container.appendChild(slotElement);
                });
            });
        });

        this.updateLaneCounts();
    }

    getSlotStatusClass(slot) {
        if (slot.isAvailable) {
            if (slot.status === 'reserved') return 'reserved';
            return 'available';
        } else {
            if (slot.priority === 'vip') return 'vip';
            if (this.isOverstayed(slot)) return 'overstayed';
            return 'booked';
        }
    }

    getSlotStatusText(slot) {
        if (slot.isAvailable) {
            if (slot.status === 'reserved') return 'Reserved';
            return 'Available';
        } else {
            if (this.isOverstayed(slot)) return 'Overstayed';
            if (slot.priority === 'vip') return 'VIP';
            return 'Occupied';
        }
    }

    isOverstayed(slot) {
        if (!slot.bookingTime || !slot.plannedDuration) return false;
        
        const currentTime = new Date();
        const elapsedTime = (currentTime - slot.bookingTime) / (1000 * 60); // minutes
        return elapsedTime > slot.plannedDuration;
    }

    // Enhanced slot allocation with planned duration
    allocateSlotWithDuration(slot, vehicleData, plannedDuration = null) {
        slot.isAvailable = false;
        slot.vehicleNumber = vehicleData.vehicleNumber;
        slot.vehicleType = vehicleData.vehicleType;
        slot.driverName = vehicleData.driverName;
        slot.bookingTime = new Date();
        slot.plannedDuration = plannedDuration;
        slot.priority = vehicleData.priority || 'regular';
        slot.status = 'occupied';

        // Register with search system
        this.registerVehicleArrival(vehicleData.vehicleNumber, slot.id);

        // Calculate charges with planned duration
        const startTime = slot.bookingTime;
        const endTime = plannedDuration ? 
            new Date(startTime.getTime() + plannedDuration * 60 * 1000) :
            new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
        
        this.calculateParkingCharges(vehicleData.vehicleNumber, vehicleData.vehicleType, startTime, endTime);

        this.renderParkingGrid();
        this.updateStatus();
        
        return { status: 'allocated', slot: slot.id };
    }

    // Check for overstayed vehicles and update status
    checkOverstayedVehicles() {
        this.parkingSlots.forEach(slot => {
            if (!slot.isAvailable && this.isOverstayed(slot)) {
                slot.status = 'overstayed';
                console.log(`Vehicle ${slot.vehicleNumber} in slot ${slot.id} has overstayed!`);
            }
        });
        this.renderParkingGrid();
    }

    startOverstayedMonitoring() {
        // Check for overstayed vehicles every minute
        setInterval(() => {
            this.checkOverstayedVehicles();
        }, 60000); // 60 seconds
    }

    selectSlot(slotId) {
        // Remove previous selection
        document.querySelectorAll('.parking-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked slot
        const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);
        slotElement.classList.add('selected');
        
        this.selectedSlot = slotId;
        
        // Update slot number in booking form
        document.getElementById('slotNumber').value = slotId;
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.showPage(page);
                
                // Update active nav button
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Book Slot Button
        document.getElementById('bookSlotBtn').addEventListener('click', () => {
            this.showBookingModal();
        });

        // Release Slot Button
        document.getElementById('releaseSlotBtn').addEventListener('click', () => {
            this.showReleaseModal();
        });

        // Refresh Button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Modal Events
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Booking Modal
        const bookingModal = document.getElementById('bookingModal');
        const closeModal = document.getElementById('closeModal');
        const cancelBooking = document.getElementById('cancelBooking');
        const bookingForm = document.getElementById('bookingForm');

        closeModal.addEventListener('click', () => this.hideBookingModal());
        cancelBooking.addEventListener('click', () => this.hideBookingModal());
        
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processBooking();
        });

        // Release Modal
        const releaseModal = document.getElementById('releaseModal');
        const closeReleaseModal = document.getElementById('closeReleaseModal');
        const cancelRelease = document.getElementById('cancelRelease');
        const releaseForm = document.getElementById('releaseForm');

        closeReleaseModal.addEventListener('click', () => this.hideReleaseModal());
        cancelRelease.addEventListener('click', () => this.hideReleaseModal());
        
        releaseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processRelease();
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === bookingModal) {
                this.hideBookingModal();
            }
            if (e.target === releaseModal) {
                this.hideReleaseModal();
            }
        });
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        if (pageId === 'admin') {
            this.updateAdminPanel();
        }
    }

    showBookingModal() {
        const modal = document.getElementById('bookingModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('bookingForm').reset();
        this.selectedSlot = null;
        document.querySelectorAll('.parking-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    hideBookingModal() {
        const modal = document.getElementById('bookingModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    showReleaseModal() {
        const modal = document.getElementById('releaseModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('releaseForm').reset();
    }

    hideReleaseModal() {
        const modal = document.getElementById('releaseModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    populateSlotOptions() {
        const slotSelect = document.getElementById('slotNumber');
        slotSelect.innerHTML = '<option value="">Auto-assign</option>';
        
        // Group slots by vehicle type and lane for better organization
        Object.keys(this.lanes).forEach(vehicleType => {
            const vehicleLanes = this.lanes[vehicleType];
            const availableSlots = this.parkingSlots.filter(slot => 
                slot.lane === vehicleType && slot.isAvailable
            );
            
            if (availableSlots.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)} Parking`;
                
                availableSlots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot.id;
                    option.textContent = `Slot ${slot.id} (Lane ${slot.laneNumber})`;
                    optgroup.appendChild(option);
                });
                
                slotSelect.appendChild(optgroup);
            }
        });
    }

    // Simulate dynamic vehicle arrivals (DS + OOP Concept)
    simulateDynamicArrivals() {
        const vehicleTypes = ['car', 'motorcycle', 'truck'];
        const priorities = ['emergency', 'vip', 'premium', 'regular', 'late'];
        const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Mike Wilson'];
        
        // Simulate random vehicle arrivals
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance every interval
                const randomType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
                const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
                const randomName = names[Math.floor(Math.random() * names.length)];
                const randomPlate = this.generateRandomPlate();
                
                const vehicle = new Vehicle(randomPlate, randomType, randomName, randomPriority);
                this.addVehicleToQueue(vehicle);
            }
        }, 5000); // Every 5 seconds
    }
    
    generateRandomPlate() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let plate = '';
        for (let i = 0; i < 3; i++) {
            plate += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        plate += '-';
        for (let i = 0; i < 4; i++) {
            plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
        return plate;
    }
    
    addVehicleToQueue(vehicle) {
        this.dynamicAllocator.addVehicleToQueue(vehicle);
        this.waitingVehicles.push(vehicle);
        this.updateWaitingQueueDisplay();
        this.attemptAutoAllocation();
    }
    
    attemptAutoAllocation() {
        const allocation = this.dynamicAllocator.allocateNextAvailableSlot();
        if (allocation) {
            this.autoBookSlot(allocation.vehicle, allocation.slot);
        }
    }
    
    autoBookSlot(vehicle, slot) {
        // Auto-book the slot for the vehicle
        slot.isAvailable = false;
        slot.vehicleNumber = vehicle.licensePlate;
        slot.vehicleType = vehicle.type;
        slot.driverName = vehicle.driverName;
        slot.bookingTime = new Date();
        
        // Add to bookings
        this.bookings.unshift({
            id: Date.now(),
            slotId: slot.id,
            vehicleNumber: vehicle.licensePlate,
            vehicleType: vehicle.type,
            driverName: vehicle.driverName,
            bookingTime: slot.bookingTime,
            priority: vehicle.priority
        });
        
        this.renderParkingGrid();
        this.updateStatus();
        this.showMessage(`Auto-allocated Slot ${slot.id} to ${vehicle.licensePlate} (${vehicle.priority} priority)`, 'success');
    }
    
    updateWaitingQueueDisplay() {
        // Update UI to show waiting vehicles
        const queueInfo = document.getElementById('queueInfo') || this.createQueueDisplay();
        queueInfo.innerHTML = `
            <h4>Waiting Queue (${this.waitingVehicles.length} vehicles)</h4>
            <div class="queue-list">
                ${this.waitingVehicles.map(vehicle => `
                    <div class="queue-item priority-${vehicle.priority}">
                        <span class="vehicle-plate">${vehicle.licensePlate}</span>
                        <span class="vehicle-type">${vehicle.type}</span>
                        <span class="vehicle-priority">${vehicle.priority}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    createQueueDisplay() {
        const queueDiv = document.createElement('div');
        queueDiv.id = 'queueInfo';
        queueDiv.className = 'queue-display';
        document.querySelector('.dashboard-header').appendChild(queueDiv);
        return queueDiv;
    }

    // Advanced Features Implementation

    // 1. Dynamic Slot Assignment with Min Heap
    findNearestAvailableSlot(vehicleType, preferredLane = null) {
        const availableSlots = this.parkingSlots.filter(slot => 
            slot.isAvailable && this.isCompatibleSlot(vehicleType, slot)
        );

        if (availableSlots.length === 0) return null;

        // Calculate distances and add to min heap
        availableSlots.forEach(slot => {
            const distance = this.calculateDistance(slot, preferredLane);
            this.minHeap.insert({ ...slot, distance });
        });

        return this.minHeap.extractMin();
    }

    calculateDistance(slot, preferredLane) {
        if (!preferredLane) return 0;
        
        // Simple distance calculation based on lane and slot position
        const laneDistance = slot.lane === preferredLane ? 0 : 1;
        const slotDistance = slot.id % 10; // Distance within lane
        return laneDistance + slotDistance;
    }

    isCompatibleSlot(vehicleType, slot) {
        const compatibility = {
            'car': ['car', 'truck'],
            'motorcycle': ['twoWheeler', 'car'],
            'truck': ['truck']
        };
        return compatibility[vehicleType]?.includes(slot.lane);
    }

    // 2. Multi-Level Parking with Graph Navigation
    initializeMultiLevelParking() {
        // Add floors to the graph
        this.parkingGraph.addFloor('ground', this.parkingSlots.slice(0, 35));
        this.parkingGraph.addFloor('first', this.parkingSlots.slice(35, 70));
        
        // Add connections between floors
        this.parkingGraph.addConnection('ground', 'first', 1);
        
        console.log('Multi-level parking initialized with 2 floors');
    }

    findNearestSlotWithBFS(vehicleType, startFloor = 'ground') {
        const result = this.parkingGraph.findNearestAvailableSlot(startFloor, vehicleType);
        if (result) {
            console.log(`Found available slots on floor ${result.floor} with distance ${result.distance}`);
            console.log(`Path: ${result.path.join(' -> ')}`);
        }
        return result;
    }

    // 3. Reservation System
    makeReservation(vehicleId, slotId, startTime, endTime, priority = 'regular') {
        const reservation = this.reservationSystem.makeReservation(
            vehicleId, slotId, startTime, endTime, priority
        );
        
        console.log(`Reservation made for vehicle ${vehicleId} at slot ${slotId}`);
        return reservation;
    }

    checkReservation(vehicleId) {
        return this.reservationSystem.getReservation(vehicleId);
    }

    cancelReservation(vehicleId) {
        return this.reservationSystem.cancelReservation(vehicleId);
    }

    // 4. Waitlist and Overflow Management
    addToWaitlist(vehicle) {
        const result = this.waitlistSystem.addToWaitlist(vehicle);
        console.log(`Vehicle ${vehicle.licensePlate} added to waitlist: ${result.status}`);
        return result;
    }

    processWaitlist() {
        const nextVehicle = this.waitlistSystem.processNextVehicle();
        if (nextVehicle) {
            console.log(`Processing vehicle from waitlist: ${nextVehicle.licensePlate}`);
            return nextVehicle;
        }
        return null;
    }

    getWaitlistStatus() {
        return this.waitlistSystem.getWaitlistStatus();
    }

    // 5. Vehicle Search and Reporting
    findVehicle(vehicleId) {
        const slotId = this.searchSystem.findVehicleSlot(vehicleId);
        if (slotId) {
            const slot = this.parkingSlots.find(s => s.id === slotId);
            return { slotId, slot, history: this.searchSystem.getVehicleHistory(vehicleId) };
        }
        return null;
    }

    registerVehicleArrival(vehicleId, slotId) {
        this.searchSystem.registerVehicle(vehicleId, slotId);
        console.log(`Vehicle ${vehicleId} registered at slot ${slotId}`);
    }

    recordVehicleDeparture(vehicleId) {
        this.searchSystem.recordDeparture(vehicleId);
        console.log(`Vehicle ${vehicleId} departure recorded`);
    }

    getBusiestHours() {
        return this.searchSystem.getBusiestHours();
    }

    // 6. Payment and Billing
    calculateParkingCharges(vehicleId, vehicleType, startTime, endTime) {
        const billingData = this.paymentSystem.calculateCharges(vehicleId, vehicleType, startTime, endTime);
        console.log(`Charges calculated for vehicle ${vehicleId}: $${billingData.finalCharge}`);
        return billingData;
    }

    getBillingInfo(vehicleId) {
        return this.paymentSystem.getBillingInfo(vehicleId);
    }

    generateRevenueReport() {
        return this.paymentSystem.generateRevenueReport();
    }

    // Enhanced booking with all advanced features
    processAdvancedBooking(vehicleData) {
        const { vehicleNumber, vehicleType, driverName, priority = 'regular' } = vehicleData;
        
        // 1. Check for existing reservation
        const reservation = this.checkReservation(vehicleNumber);
        if (reservation && reservation.status === 'pending') {
            console.log('Using existing reservation');
            return this.fulfillReservation(reservation);
        }

        // 2. Find nearest available slot using Min Heap
        const nearestSlot = this.findNearestAvailableSlot(vehicleType);
        if (nearestSlot) {
            return this.allocateSlot(nearestSlot, vehicleData);
        }

        // 3. If no slots available, add to waitlist
        const vehicle = new Vehicle(vehicleNumber, vehicleType, driverName, priority);
        const waitlistResult = this.addToWaitlist(vehicle);
        
        if (waitlistResult.status === 'overflow') {
            console.log('Parking is full and waitlist is at capacity');
            return { status: 'overflow', message: 'Parking is completely full' };
        }

        return { status: 'waitlisted', position: waitlistResult.position };
    }

    allocateSlot(slot, vehicleData) {
        slot.isAvailable = false;
        slot.vehicleNumber = vehicleData.vehicleNumber;
        slot.vehicleType = vehicleData.vehicleType;
        slot.driverName = vehicleData.driverName;
        slot.bookingTime = new Date();

        // Register with search system
        this.registerVehicleArrival(vehicleData.vehicleNumber, slot.id);

        // Calculate charges
        const startTime = slot.bookingTime;
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
        this.calculateParkingCharges(vehicleData.vehicleNumber, vehicleData.vehicleType, startTime, endTime);

        this.renderParkingGrid();
        this.updateStatus();
        
        return { status: 'allocated', slot: slot.id };
    }

    fulfillReservation(reservation) {
        const slot = this.parkingSlots.find(s => s.id === reservation.slotId);
        if (slot && slot.isAvailable) {
            return this.allocateSlot(slot, {
                vehicleNumber: reservation.vehicleId,
                vehicleType: 'car', // Default, should be stored in reservation
                driverName: 'Reserved User'
            });
        }
        return { status: 'reservation_conflict', message: 'Reserved slot is no longer available' };
    }

    processBooking() {
        const formData = {
            vehicleNumber: document.getElementById('vehicleNumber').value.trim(),
            vehicleType: document.getElementById('vehicleType').value,
            driverName: document.getElementById('driverName').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            slotNumber: document.getElementById('slotNumber').value || this.selectedSlot,
            priority: document.getElementById('priority')?.value || 'regular',
            plannedDuration: parseInt(document.getElementById('plannedDuration')?.value) || null
        };

        // Validation
        if (!formData.vehicleNumber || !formData.vehicleType || !formData.driverName) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Check if vehicle is already booked
        const existingBooking = this.bookings.find(booking => 
            booking.vehicleNumber.toLowerCase() === formData.vehicleNumber.toLowerCase()
        );

        if (existingBooking) {
            this.showMessage('This vehicle is already booked!', 'error');
            return;
        }

        // Find available slot based on vehicle type
        let targetSlot;
        if (formData.slotNumber) {
            targetSlot = this.parkingSlots.find(slot => slot.id === parseInt(formData.slotNumber));
            if (!targetSlot || !targetSlot.isAvailable) {
                this.showMessage('Selected slot is not available!', 'error');
                return;
            }
        } else {
            // Auto-assign based on vehicle type
            const preferredLane = this.getPreferredLane(formData.vehicleType);
            targetSlot = this.parkingSlots.find(slot => 
                slot.lane === preferredLane && slot.isAvailable
            );
            
            // If preferred lane is full, try other lanes
            if (!targetSlot) {
                targetSlot = this.parkingSlots.find(slot => slot.isAvailable);
            }
            
            if (!targetSlot) {
                this.showMessage('No available slots!', 'error');
                return;
            }
        }

        // Book the slot using enhanced allocation
        this.allocateSlotWithDuration(targetSlot, formData, formData.plannedDuration);

        // Add to bookings history
        this.bookings.unshift({
            id: Date.now(),
            slotId: targetSlot.id,
            vehicleNumber: formData.vehicleNumber,
            vehicleType: formData.vehicleType,
            driverName: formData.driverName,
            phoneNumber: formData.phoneNumber,
            bookingTime: targetSlot.bookingTime
        });

        // Update UI
        this.renderParkingGrid();
        this.updateStatus();
        this.hideBookingModal();
        this.showMessage(`Slot ${targetSlot.id} booked successfully for ${formData.vehicleNumber}!`, 'success');
    }

    processRelease() {
        const vehicleNumber = document.getElementById('releaseVehicleNumber').value.trim();

        if (!vehicleNumber) {
            this.showMessage('Please enter vehicle number.', 'error');
            return;
        }

        // Find the slot with this vehicle
        const slot = this.parkingSlots.find(s => 
            s.vehicleNumber && s.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase()
        );

        if (!slot) {
            this.showMessage('Vehicle not found in parking slots!', 'error');
            return;
        }

        // Release the slot
        const slotId = slot.id;
        slot.isAvailable = true;
        slot.vehicleNumber = null;
        slot.vehicleType = null;
        slot.driverName = null;
        slot.phoneNumber = null;
        slot.bookingTime = null;

        // Update UI
        this.renderParkingGrid();
        this.updateStatus();
        this.hideReleaseModal();
        this.showMessage(`Slot ${slotId} released successfully!`, 'success');
    }

    updateStatus() {
        const available = this.parkingSlots.filter(slot => slot.isAvailable).length;
        const booked = this.parkingSlots.filter(slot => !slot.isAvailable).length;

        document.getElementById('availableCount').textContent = available;
        document.getElementById('bookedCount').textContent = booked;
        document.getElementById('totalCount').textContent = this.totalSlots;

        // Update occupancy rate
        const occupancyRate = Math.round((booked / this.totalSlots) * 100);
        document.getElementById('occupancyRate').textContent = `${occupancyRate}%`;

        this.updateLaneCounts();
    }

    updateLaneCounts() {
        Object.keys(this.lanes).forEach(vehicleType => {
            const vehicleLanes = this.lanes[vehicleType];
            
            // Update section total
            const sectionAvailableCount = this.parkingSlots.filter(slot => 
                slot.lane === vehicleType && slot.isAvailable
            ).length;
            document.getElementById(vehicleLanes.sectionAvailable).textContent = sectionAvailableCount;
            
            // Update individual lane counts
            vehicleLanes.lanes.forEach((lane, laneIndex) => {
                const laneAvailableCount = this.parkingSlots.filter(slot => 
                    slot.lane === vehicleType && slot.laneNumber === (laneIndex + 1) && slot.isAvailable
                ).length;
                document.getElementById(lane.available).textContent = laneAvailableCount;
            });
        });
    }

    getPreferredLane(vehicleType) {
        switch(vehicleType) {
            case 'car':
                return 'car';
            case 'motorcycle':
                return 'twoWheeler';
            case 'truck':
                return 'truck';
            default:
                return 'car'; // Default to car lane
        }
    }

    updateAdminPanel() {
        this.renderBookingsList();
    }

    renderBookingsList() {
        const bookingsList = document.getElementById('bookingsList');
        
        if (this.bookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No bookings yet</p>
                </div>
            `;
            return;
        }

        bookingsList.innerHTML = this.bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-info">
                    <div class="booking-vehicle">${booking.vehicleNumber}</div>
                    <div class="booking-details">
                        ${booking.driverName} • ${booking.vehicleType} • Slot ${booking.slotId}
                    </div>
                    <div class="booking-time">
                        ${this.formatTime(booking.bookingTime)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    refreshData() {
        this.renderParkingGrid();
        this.updateStatus();
        this.populateSlotOptions();
        this.showMessage('Data refreshed!', 'success');
    }

    showMessage(text, type = 'success') {
        // Remove existing messages
        document.querySelectorAll('.message').forEach(msg => msg.remove());

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        // Insert at the top of the main content
        const main = document.querySelector('.main');
        main.insertBefore(message, main.firstChild);

        // Auto remove after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

// Initialize the parking system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.parkingSystem = new ParkingSystem();
});

// Add some demo data for testing
document.addEventListener('DOMContentLoaded', () => {
    // Add some demo bookings after a short delay
    setTimeout(() => {
        if (window.parkingSystem) {
            // Book a few demo slots
            const demoBookings = [
                { slotId: 1, vehicleNumber: 'ABC-1234', vehicleType: 'car', driverName: 'John Doe', phoneNumber: '123-456-7890' },
                { slotId: 3, vehicleNumber: 'CAR-5678', vehicleType: 'car', driverName: 'Alice Brown', phoneNumber: '987-654-3210' },
                { slotId: 5, vehicleNumber: 'SUV-9999', vehicleType: 'car', driverName: 'Bob Johnson', phoneNumber: '111-222-3333' },
                { slotId: 21, vehicleNumber: 'BIKE-001', vehicleType: 'motorcycle', driverName: 'Mike Wilson', phoneNumber: '555-123-4567' },
                { slotId: 25, vehicleNumber: 'MOTO-002', vehicleType: 'motorcycle', driverName: 'Sarah Davis', phoneNumber: '444-555-6666' },
                { slotId: 30, vehicleNumber: 'SCOOT-01', vehicleType: 'motorcycle', driverName: 'Lisa Park', phoneNumber: '666-777-8888' },
                { slotId: 61, vehicleNumber: 'TRUCK-01', vehicleType: 'truck', driverName: 'Tom Smith', phoneNumber: '777-888-9999' },
                { slotId: 63, vehicleNumber: 'HAUL-02', vehicleType: 'truck', driverName: 'David Lee', phoneNumber: '999-000-1111' }
            ];

            demoBookings.forEach(booking => {
                const slot = window.parkingSystem.parkingSlots.find(s => s.id === booking.slotId);
                if (slot && slot.isAvailable) {
                    slot.isAvailable = false;
                    slot.vehicleNumber = booking.vehicleNumber;
                    slot.vehicleType = booking.vehicleType;
                    slot.driverName = booking.driverName;
                    slot.phoneNumber = booking.phoneNumber;
                    slot.bookingTime = new Date();

                    window.parkingSystem.bookings.push({
                        id: Date.now() + Math.random(),
                        ...booking,
                        bookingTime: slot.bookingTime
                    });
                }
            });

            window.parkingSystem.renderParkingGrid();
            window.parkingSystem.updateStatus();
        }
    }, 1000);
});
