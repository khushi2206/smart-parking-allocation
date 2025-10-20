// Smart Parking Allocation System - JavaScript

// Advanced Data Structures for Enhanced Parking System

// Min Heap removed (unused)

// Graph for Multi-Level Parking Navigation (BFS shortest path)
class ParkingGraph {
    constructor() {
        this.adjacencyList = new Map();
        this.floors = new Map();
    }

    addFloor(floorId, slots) {
        this.floors.set(floorId, slots);
        if (!this.adjacencyList.has(floorId)) {
            this.adjacencyList.set(floorId, []);
        }
    }

    addConnection(floor1, floor2, distance) {
        this.adjacencyList.get(floor1).push({ floor: floor2, distance });
        this.adjacencyList.get(floor2).push({ floor: floor1, distance });
    }

    findNearestAvailableSlot(startFloor, vehicleType) {
        const queue = [{ floor: startFloor, distance: 0, path: [startFloor] }];
        const visited = new Set();
        while (queue.length > 0) {
            const { floor, distance, path } = queue.shift();
            if (visited.has(floor)) continue;
            visited.add(floor);

            const availableSlots = this.getAvailableSlots(floor, vehicleType);
            if (availableSlots.length > 0) {
                return { floor, slots: availableSlots, distance, path };
            }

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
        return floor.filter(slot => slot.isAvailable && this.isCompatibleSlot(vehicleType, slot));
    }

    isCompatibleSlot(vehicleType, slot) {
        const compatibility = {
            car: ['car', 'truck'],
            motorcycle: ['twoWheeler', 'car'],
            truck: ['truck']
        };
        return compatibility[vehicleType]?.includes(slot.lane);
    }
}

// ReservationSystem removed (unused)

// WaitlistSystem removed (unused)

// LinkedList and ListNode removed (unused)

// PaymentSystem will be reintroduced below

// PriorityQueue, Vehicle, and DynamicSlotAllocator removed (unused)

class ParkingSystem {
    constructor() {
        this.totalSlots = 70; // 20 cars + 40 two-wheelers + 10 trucks
        this.parkingSlots = [];
        this.bookings = [];
        this.selectedSlot = null;
        
        // Subsystems
        this.parkingGraph = new ParkingGraph();
        this.paymentSystem = new PaymentSystem();
        
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
        this.initializeMultiLevelParking();
        this.renderParkingGrid();
        this.bindEvents();
        this.updateStatus();
        this.populateSlotOptions();
        
        // Start overstayed vehicle monitoring
        this.startOverstayedMonitoring();
        
    }

    // Advanced features demo removed

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

    initializeMultiLevelParking() {
        this.parkingGraph.addFloor('ground', this.parkingSlots.slice(0, 35));
        this.parkingGraph.addFloor('first', this.parkingSlots.slice(35, 70));
        this.parkingGraph.addConnection('ground', 'first', 1);
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
                    
                    slotElement.innerHTML = `
                        <div class="slot-number">${slot.id}</div>
                        <div class="slot-status">${this.getSlotStatusText(slot)}</div>
                        ${slot.vehicleNumber ? `<div class="slot-vehicle">${slot.vehicleNumber}</div>` : ''}
                        ${slot.plannedDuration ? `<div class="slot-duration">${slot.plannedDuration}min</div>` : ''}
                        ${slot.priority !== 'regular' ? `<div class="slot-priority">${slot.priority.toUpperCase()}</div>` : ''}
                    `;

                    // Add click event for available slots
                    if (slot.isAvailable) {
                        slotElement.addEventListener('click', () => this.selectSlot(slot.id));
                    }

                    container.appendChild(slotElement);
                });
            });
        });

        this.updateLaneCounts();
    }

    getSlotStatusClass(slot) {
        if (slot.isAvailable) {
            return 'available';
        }
        if (slot.priority === 'vip') return 'vip';
        if (this.isOverstayed(slot)) return 'overstayed';
        return 'booked';
    }

    getSlotStatusText(slot) {
        if (slot.isAvailable) return 'Available';
        if (this.isOverstayed(slot)) return 'Overstayed';
        if (slot.priority === 'vip') return 'VIP';
        return 'Occupied';
    }

    isOverstayed(slot) {
        if (!slot.bookingTime || !slot.plannedDuration) return false;
        
        const currentTime = new Date();
        const elapsedTime = (currentTime - slot.bookingTime) / (1000 * 60); // minutes
        return elapsedTime > slot.plannedDuration;
    }

    // Enhanced slot allocation with planned duration and cost estimate
    allocateSlotWithDuration(slot, vehicleData, plannedDuration = null) {
        slot.isAvailable = false;
        slot.vehicleNumber = vehicleData.vehicleNumber;
        slot.vehicleType = vehicleData.vehicleType;
        slot.driverName = vehicleData.driverName;
        slot.bookingTime = new Date();
        slot.plannedDuration = plannedDuration;
        slot.priority = vehicleData.priority || 'regular';
        slot.status = 'occupied';

        // Show estimated base cost if planned duration provided
        if (this.paymentSystem && plannedDuration) {
            const estimate = this.paymentSystem.estimateCharge(slot.vehicleType, plannedDuration);
            if (estimate) {
                this.showMessage(`Estimated base: ${estimate.currency}${estimate.base.toFixed(2)} for ${plannedDuration} min (rate ${estimate.currency}${estimate.ratePerHour}/hr). Penalty on overstay: ${estimate.currency}${this.paymentSystem.penaltyRatesPerHour.get(slot.vehicleType) || 0}/hr.`, 'success');
            }
        }

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

    findNearestSlotWithBFS(vehicleType, startFloor = 'ground') {
        const result = this.parkingGraph.findNearestAvailableSlot(startFloor, vehicleType);
        if (result && result.slots.length > 0) {
            return result.slots[0];
        }
        return null;
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

    // Dynamic simulation and other advanced features removed

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
            // Auto-assign using graph BFS shortest path
            targetSlot = this.findNearestSlotWithBFS(formData.vehicleType, 'ground');
            if (!targetSlot) {
                const preferredLane = this.getPreferredLane(formData.vehicleType);
                targetSlot = this.parkingSlots.find(slot => slot.lane === preferredLane && slot.isAvailable)
                    || this.parkingSlots.find(slot => slot.isAvailable);
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
        if (this.paymentSystem && formData.plannedDuration) {
            const est = this.paymentSystem.estimateCharge(formData.vehicleType, formData.plannedDuration);
            if (est) {
                this.showMessage(`Slot ${targetSlot.id} booked for ${formData.vehicleNumber}. Estimated: ${est.currency}${est.base.toFixed(2)} for ${formData.plannedDuration} min.`, 'success');
            } else {
                this.showMessage(`Slot ${targetSlot.id} booked successfully for ${formData.vehicleNumber}!`, 'success');
            }
        } else {
            this.showMessage(`Slot ${targetSlot.id} booked successfully for ${formData.vehicleNumber}!`, 'success');
        }
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

        // Compute billing before releasing (INR and penalties for overstay)
        const slotId = slot.id;
        const endTime = new Date();
        if (this.paymentSystem && slot.bookingTime) {
            const billing = this.paymentSystem.calculateFinal(
                slot.vehicleNumber,
                slot.vehicleType,
                slot.bookingTime,
                slot.plannedDuration || 0,
                endTime
            );
            const penaltyText = billing.penalty > 0 ? `, penalty ${billing.currency}${billing.penalty.toFixed(2)}` : '';
            this.showMessage(`Slot ${slotId} released. Charge: ${billing.currency}${billing.total.toFixed(2)} (base ${billing.currency}${billing.base.toFixed(2)}${penaltyText}).`, 'success');
        } else {
            this.showMessage(`Slot ${slotId} released successfully!`, 'success');
        }

        // Release the slot
        slot.isAvailable = true;
        slot.vehicleNumber = null;
        slot.vehicleType = null;
        slot.driverName = null;
        slot.phoneNumber = null;
        slot.bookingTime = null;
        slot.plannedDuration = null;
        slot.status = 'available';

        // Update UI
        this.renderParkingGrid();
        this.updateStatus();
        this.hideReleaseModal();
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

// Minimal demo data: keep only 2 entries for quick visualization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!window.parkingSystem) return;
        const demoBookings = [
            { slotId: 1, vehicleNumber: 'ABC-1234', vehicleType: 'car', driverName: 'John Doe', phoneNumber: '123-456-7890' },
            { slotId: 21, vehicleNumber: 'BIKE-001', vehicleType: 'motorcycle', driverName: 'Mike Wilson', phoneNumber: '555-123-4567' }
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
    }, 500);
});
