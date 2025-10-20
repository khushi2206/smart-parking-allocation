// Smart Parking Allocation System - JavaScript

// Advanced Data Structures for Enhanced Parking System

// Min Heap removed (unused)

// ParkingGraph removed (unused)

// ReservationSystem removed (unused)

// WaitlistSystem removed (unused)

// LinkedList and ListNode removed (unused)

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

// PriorityQueue, Vehicle, and DynamicSlotAllocator removed (unused)

class ParkingSystem {
    constructor() {
        this.totalSlots = 70; // 20 cars + 40 two-wheelers + 10 trucks
        this.parkingSlots = [];
        this.bookings = [];
        this.selectedSlot = null;
        
        // Core subsystems
        this.searchSystem = new SearchAndReportingSystem();
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

    // Dynamic simulation and wait queue removed

    // Advanced features (MinHeap/Graph/Reservations/Waitlist) removed

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

    // Advanced booking/reservations removed

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
