/* ---------- Utilities (Minimal) ---------- */
const now = () => new Date();

// --- Simplified Waitlist System (Pure FIFO Queue) ---
// --- Simplified Waitlist System (FIFO Queue with VIP Priority) ---
class WaitlistSystem {
    constructor() {
        // map vehicleType -> { vip: [], regular: [] }
        this.waitlists = new Map();
    }
    
    // Ensure the structure exists for a vehicle type
    ensureList(vehicleType) {
        if (!this.waitlists.has(vehicleType)) {
            this.waitlists.set(vehicleType, { vip: [], regular: [] });
        }
        return this.waitlists.get(vehicleType);
    }
    
    // Join a vehicle to the appropriate priority queue
    join(vehicleRecord) {
        const lists = this.ensureList(vehicleRecord.vehicleType);
        // The vehicleRecord must now contain an 'isVIP' boolean property
        if (vehicleRecord.isVIP) {
            lists.vip.push(vehicleRecord); // VIPs go to the VIP queue (FIFO)
        } else {
            lists.regular.push(vehicleRecord); // Regulars go to the Regular queue (FIFO)
        }
    }
    
    // Pop: Prioritize VIPs first, then Regulars (FIFO for each category)
    pop(vehicleType) {
        const lists = this.waitlists.get(vehicleType);
        if (!lists) return null;

        // 1. Check and pop from VIP queue first
        if (lists.vip.length > 0) {
            return lists.vip.shift(); 
        }

        // 2. If VIP queue is empty, check and pop from Regular queue
        if (lists.regular.length > 0) {
            return lists.regular.shift(); 
        }

        return null; // Both queues are empty
    }
    
    // PeekAll (for general status)
    peekAll(vehicleType) {
        const lists = this.waitlists.get(vehicleType);
        if (!lists) return 0;
        return lists.vip.length + lists.regular.length;
    }

    // New helper for Admin reporting
    peekVIP(vehicleType) {
        const lists = this.waitlists.get(vehicleType);
        return lists ? lists.vip.length : 0;
    }
    // New helper for Admin reporting
    peekRegular(vehicleType) {
        const lists = this.waitlists.get(vehicleType);
        return lists ? lists.regular.length : 0;
    }
}

/* ---------- Parking Graph (for multi-level allocation) ---------- */
class ParkingGraph {
    constructor() {
        this.adjacencyList = new Map();
        this.floors = new Map();
    }

    addFloor(floorId, slots) {
        this.floors.set(floorId, slots);
        if (!this.adjacencyList.has(floorId)) this.adjacencyList.set(floorId, []);
    }

    addConnection(floor1, floor2, distance = 1) {
        if (!this.adjacencyList.has(floor1)) this.adjacencyList.set(floor1, []);
        if (!this.adjacencyList.has(floor2)) this.adjacencyList.set(floor2, []);
        this.adjacencyList.get(floor1).push({ floor: floor2, distance });
        this.adjacencyList.get(floor2).push({ floor: floor1, distance });
    }

    getFloorsByProximity(startFloor='ground') {
        const q = [{floor:startFloor, dist:0}];
        const seen = new Set();
        const result = [];
        while(q.length){
            const {floor} = q.shift();
            if (seen.has(floor)) continue;
            seen.add(floor);
            result.push({floor});
            const neighbors = this.adjacencyList.get(floor) || [];
            for (const n of neighbors) if (!seen.has(n.floor)) q.push({floor: n.floor});
        }
        return result;
    }

    getAvailableSlotsOnFloor(floorId, vehicleType, isCompatibleSlotFn) {
        const floor = this.floors.get(floorId) || [];
        return floor.filter(s => s.isAvailable && isCompatibleSlotFn(vehicleType, s));
    }
}


/* ---------- Main ParkingSystem (Simplified) ---------- */
class ParkingSystem {
    constructor(options={}) {
        this.parkingSlots = [];
        this.bookings = []; 
        this.selectedSlot = null; // Stubs remain, but unused in simplified flow

        // Subsystems
        this.parkingGraph = new ParkingGraph();
        this.waitlist = new WaitlistSystem();

        // Lane configuration
        this.lanes = options.lanes || {
            car: { totalSlots: 20, lanes:[{slots:10,container:'carLane1Slots',available:'carLane1Available'},{slots:10,container:'carLane2Slots',available:'carLane2Available'}], sectionAvailable:'carAvailable' },
            twoWheeler:{ totalSlots:40, lanes:[
                {slots:10,container:'twoWheelerLane1Slots',available:'twoWheelerLane1Available'},
                {slots:10,container:'twoWheelerLane2Slots',available:'twoWheelerLane2Available'},
                {slots:10,container:'twoWheelerLane3Slots',available:'twoWheelerLane3Available'},
                {slots:10,container:'twoWheelerLane4Slots',available:'twoWheelerLane4Available'}
            ], sectionAvailable:'twoWheelerAvailable' },
            truck: { totalSlots:10, lanes:[{slots:10,container:'truckLane1Slots',available:'truckLane1Available'}], sectionAvailable:'truckAvailable' }
        };

        this.init();
    }

    init(){
        this.initializeSlots();
        this.initializeMultiLevelParking();
        this.renderParkingGrid();
        this.bindEvents();
        this.updateStatus();
        this.populateSlotOptions();
    }

    /* ---------------- slot initialization ---------------- */
    initializeSlots(){
        this.parkingSlots = [];
        let slotId = 1;
        // cars
        for (let i=0;i<this.lanes.car.totalSlots;i++){
            this.parkingSlots.push(this._createSlot(slotId++, 'car', Math.floor(i/10)+1));
        }
        // twoWheeler
        for (let i=0;i<this.lanes.twoWheeler.totalSlots;i++){
            this.parkingSlots.push(this._createSlot(slotId++, 'twoWheeler', Math.floor(i/10)+1));
        }
        
        // trucks
        for (let i=0;i<this.lanes.truck.totalSlots;i++){
            this.parkingSlots.push(this._createSlot(slotId++, 'truck', 1));
        }
    }

    _createSlot(id, lane, laneNumber){
        return {
            id, lane, laneNumber,
            isAvailable: true, vehicleNumber:null, vehicleType:null,
            driverName:null, phoneNumber:null, 
            bookingTime:null, // Retained only as a basic timestamp
            status:'available' // Simplified status
        };
    }

    initializeMultiLevelParking(){
        const half = Math.ceil(this.parkingSlots.length / 2);
        this.parkingGraph.addFloor('ground', this.parkingSlots.slice(0, half));
        this.parkingGraph.addFloor('first', this.parkingSlots.slice(half));
        this.parkingGraph.addConnection('ground','first',1);
    }

    /* ---------------- compatibility ---------------- */
    isCompatibleSlot(vehicleType, slot){
        switch(vehicleType){
            case 'car': return slot.lane === 'car';
            case 'twoWheeler': return slot.lane === 'twoWheeler';
            case 'truck': return slot.lane === 'truck';
            default: return false;
        }
    }
    
    
    

    /* ---------------- find nearest slot (graph-based) ---------------- */
    findNearestSlotByGraph(vehicleType, startFloor='ground'){
        const floors = this.parkingGraph.getFloorsByProximity(startFloor);
        
        for (const f of floors){
            const available = this.parkingGraph.getAvailableSlotsOnFloor(f.floor, vehicleType, (vt, s)=>{
                const ok = this.isCompatibleSlot(vt, s);
                if(ok && s.isAvailable) {
                    console.log(`[DEBUG] Candidate slot on floor "${f.floor}": Slot ${s.id} (${s.lane})`);
                }
                return ok;
            });
            
            if (available && available.length) {
                console.log(`[DEBUG] Allocating Slot ${available[0].id} to vehicle type "${vehicleType}"`);
                return available[0];
            }
        }
    
        console.warn(`[WARN] No available slot found for vehicle type "${vehicleType}"`);
        return null;
    }
    

    /* ---------------- dynamic allocation strategy (simplified) ---------------- */
    dynamicAllocate(vehicleType){
        // Finds nearest compatible slot, prioritizing proximity
        const nearest = this.findNearestSlotByGraph(vehicleType, 'ground');
        if (nearest) return nearest;
        const any = this.parkingSlots.find(s => s.isAvailable && this.isCompatibleSlot(vehicleType, s));
        return any || null;
    }

    /* ---------------- allocation ---------------- */
    allocateSlot(slot, vehicleData){
        slot.isAvailable = false;
        slot.vehicleNumber = vehicleData.vehicleNumber;
        slot.vehicleType = vehicleData.vehicleType;
        slot.driverName = vehicleData.driverName;
        slot.phoneNumber = vehicleData.phoneNumber;
        slot.bookingTime = now(); 
        slot.status = 'occupied';
    
        const bookingRecord = {
            id: Date.now() + Math.random(),
            slotId: slot.id,
            vehicleNumber: slot.vehicleNumber,
            vehicleType: slot.vehicleType,
            driverName: slot.driverName,
            phoneNumber: slot.phoneNumber,
            bookingTime: slot.bookingTime,
        };
        this.bookings.unshift(bookingRecord);
        this.saveBooking(bookingRecord).catch(()=>{});
    
        this.renderParkingGridDebounced();
        this.updateStatus();
    
        // <-- Add pop-up message here
        this.showMessage(`✅ Slot ${slot.id} allocated to vehicle ${slot.vehicleNumber}!`, 'success');
    
        return { status: 'allocated', slot: slot.id };
    }
    
    // Auto-notify waitlist when a slot frees
    notifyWaitlistForSlot(slot){
        const popped = this.waitlist.pop(slot.lane);
        if (popped) {
            this.showMessage(`Allocating freed slot ${slot.id} to waitlisted vehicle ${popped.vehicleNumber}`, 'success');
            this.allocateSlot(slot, popped);
        }
    }
    

    /* ---------------- booking processing (complete) ---------------- */
   // ... in ParkingSystem class ...

    /* ---------------- booking processing (complete) ---------------- */
    processBooking(){
        const formData = {
            vehicleNumber: document.getElementById('vehicleNumber').value.trim(),
            vehicleType: document.getElementById('vehicleType').value,
            driverName: document.getElementById('driverName').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            // ADDED: Capture the new VIP status from the checkbox
            isVIP: document.getElementById('isVIPCheckbox').checked, 
        };
        
        // Map form vehicle types to internal lane types
        let vehicleType = formData.vehicleType;
        if(vehicleType === 'motorcycle') vehicleType = 'twoWheeler';
        formData.vehicleType = vehicleType;

        // check duplicate booking
        const existing = this.parkingSlots.find(s => s.vehicleNumber && s.vehicleNumber.toLowerCase() === formData.vehicleNumber.toLowerCase());
        if (existing) {
            this.showMessage('This vehicle is already parked!', 'error');
            return;
        }

        // Dynamic allocation (no preferred slot)
        let targetSlot = this.dynamicAllocate(formData.vehicleType);

        if (!targetSlot) {
            // no slot available - push to waitlist (VIP/Regular logic is now inside waitlist.join)
            this.waitlist.join(formData);
            const status = formData.isVIP ? 'VIP' : 'Regular';
            this.showMessage(`No slots available — you were added to the **${status} waitlist**.`, 'info');
        } else {
            // allocate and create booking
            this.allocateSlot(targetSlot, formData);
            const status = formData.isVIP ? 'VIP' : 'First-Come';
            this.showMessage(`**Slot ${targetSlot.id} allocated successfully (${status}).**`, 'success');
        }

        this.hideBookingModal();
        this.populateSlotOptions();
    }

    /* ---------------- release processing (complete) ---------------- */
    processRelease(){
        const vehicleNumber = document.getElementById('releaseVehicleNumber').value.trim();
        if (!vehicleNumber) {
            this.showMessage('Please enter vehicle number.', 'error');
            return;
        }
        const slot = this.parkingSlots.find(s => s.vehicleNumber && s.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase());
        if (!slot) {
            this.showMessage('Vehicle not found.', 'error');
            return;
        }
    
        // <-- Add pop-up message here
        this.showMessage(`🅾️ Slot ${slot.id} released from vehicle ${vehicleNumber}.`, 'info');
    
        // free slot
        slot.isAvailable = true;
        slot.vehicleNumber = null; slot.vehicleType = null; slot.driverName = null; slot.phoneNumber = null;
        slot.bookingTime = null; slot.status='available';
    
        // notify waitlist
        this.notifyWaitlistForSlot(slot);
    
        this.renderParkingGrid();
        this.updateStatus();
        this.hideReleaseModal();
        this.populateSlotOptions();
    }
    

    /* ---------------- UI rendering & helpers ---------------- */
    renderParkingGrid(){
        Object.keys(this.lanes).forEach(vehicleType => {
            const vehicleLanes = this.lanes[vehicleType];
            vehicleLanes.lanes.forEach((lane, laneIndex) => {
                const laneSlots = this.parkingSlots.filter(slot => slot.lane === vehicleType && slot.laneNumber === (laneIndex + 1));
                const container = document.getElementById(lane.container);
                if (!container) return;
                const fragment = document.createDocumentFragment();
                laneSlots.forEach(slot => {
                    const slotElement = document.createElement('div');
                    const statusClass = this.getSlotStatusClass(slot);
                    slotElement.className = `parking-slot ${statusClass}`;
                    slotElement.dataset.slotId = slot.id;
                    // Slot Numbering is preserved here
                    slotElement.innerHTML = `
                        <div class="slot-number">${slot.id}</div> 
                        <div class="slot-status">${this.getSlotStatusText(slot)}</div>
                        ${slot.vehicleNumber ? `<div class="slot-vehicle">${slot.vehicleNumber}</div>` : ''}
                    `;
                    if (slot.isAvailable) {
                        slotElement.addEventListener('click', () => this.showBookingModal()); 
                    }
                    fragment.appendChild(slotElement);
                });
                container.innerHTML = '';
                container.appendChild(fragment);
            });
        });
        this.updateLaneCounts();
    }

    getSlotStatusClass(slot){
        if (slot.isAvailable) return 'available';
        return 'booked'; 
    }
    getSlotStatusText(slot){
        if (slot.isAvailable) return 'Available';
        return 'Occupied';
    }

    renderParkingGridDebounced(){
        if (this._renderTimeout) clearTimeout(this._renderTimeout);
        this._renderTimeout = setTimeout(()=> this.renderParkingGrid(), 150);
    }

    /* ---------------- UI interactions & event binding ---------------- */
    bindEvents(){
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', (e)=>{
            const page = e.target.dataset.page;
            this.showPage(page);
            document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
            e.target.classList.add('active');
        }));

        const bookBtn = document.getElementById('bookSlotBtn');
        if (bookBtn) bookBtn.addEventListener('click', ()=> this.showBookingModal());
        const releaseBtn = document.getElementById('releaseSlotBtn');
        if (releaseBtn) releaseBtn.addEventListener('click', ()=> this.showReleaseModal());
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', ()=> this.refreshData());

        this.bindModalEvents();
    }

    bindModalEvents(){
        const bookingModal = document.getElementById('bookingModal');
        const closeModal = document.getElementById('closeModal');
        const cancelBooking = document.getElementById('cancelBooking');
        const bookingForm = document.getElementById('bookingForm');
        if (closeModal) closeModal.addEventListener('click', ()=> this.hideBookingModal());
        if (cancelBooking) cancelBooking.addEventListener('click', ()=> this.hideBookingModal());
        if (bookingForm) bookingForm.addEventListener('submit', (e)=> { e.preventDefault(); this.processBooking(); });

        const releaseModal = document.getElementById('releaseModal');
        const closeReleaseModal = document.getElementById('closeReleaseModal');
        const cancelRelease = document.getElementById('cancelRelease');
        const releaseForm = document.getElementById('releaseForm');
        if (closeReleaseModal) closeReleaseModal.addEventListener('click', ()=> this.hideReleaseModal());
        if (cancelRelease) cancelRelease.addEventListener('click', ()=> this.hideReleaseModal());
        if (releaseForm) releaseForm.addEventListener('submit', (e)=> { e.preventDefault(); this.processRelease(); });

        window.addEventListener('click', (e) => {
            if (e.target === bookingModal) this.hideBookingModal();
            if (e.target === releaseModal) this.hideReleaseModal();
        });
    }

    showPage(pageId){
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');
        if (pageId === 'admin') this.updateAdminPanel();
    }

    // ... in ParkingSystem class ...

    showBookingModal(){
        const modal = document.getElementById('bookingModal');
        if (!modal) return;
        modal.classList.add('active'); document.body.style.overflow='hidden';
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) bookingForm.reset();
        
        // --- Hiding elements (Modified to show priority row) ---
        const hideEl = (id) => { 
            const el = document.getElementById(id); 
            if(el) el.style.display = 'none'; 
        };
        const showEl = (id) => { // New helper to show the priority row
            const el = document.getElementById(id); 
            if(el) el.style.display = 'flex'; // Use flex or block based on your CSS
        };
        
        hideEl('slotNumber');
        hideEl('slotNumberLabel');
        hideEl('plannedDurationRow');
        // hideEl('priorityRow'); // NOW SHOWN
        showEl('priorityRow');
        hideEl('makeReservationRow');
    }
    hideBookingModal(){
        const modal = document.getElementById('bookingModal');
        if (!modal) return;
        modal.classList.remove('active'); document.body.style.overflow='auto';
    }
    showReleaseModal(){
        const modal = document.getElementById('releaseModal');
        if (!modal) return;
        modal.classList.add('active'); document.body.style.overflow='hidden';
        const releaseForm = document.getElementById('releaseForm');
        if (releaseForm) releaseForm.reset();
    }
    hideReleaseModal(){
        const modal = document.getElementById('releaseModal');
        if (!modal) return;
        modal.classList.remove('active'); document.body.style.overflow='auto';
    }

    populateSlotOptions(){
        // Function retained but serves no practical purpose as manual selection is removed
        const slotSelect = document.getElementById('slotNumber');
        if (slotSelect) slotSelect.innerHTML = '';
    }

    /* ---------------- admin & status ---------------- */
    updateStatus(){
        const available = this.parkingSlots.filter(s => s.isAvailable).length;
        const booked = this.parkingSlots.filter(s => !s.isAvailable).length;
        const total = this.parkingSlots.length;
        const occupancyRate = Math.round((booked / total) * 100);
        const el = (id) => document.getElementById(id);
        if (el('availableCount')) el('availableCount').textContent = available;
        if (el('bookedCount')) el('bookedCount').textContent = booked;
        if (el('totalCount')) el('totalCount').textContent = total;
        if (el('occupancyRate')) el('occupancyRate').textContent = `${occupancyRate}%`;
        this.updateLaneCounts();
    }

    updateLaneCounts(){
        Object.keys(this.lanes).forEach(vehicleType => {
            const vehicleLanes = this.lanes[vehicleType];
            const sectionAvailableCount = this.parkingSlots.filter(slot => slot.lane === vehicleType && slot.isAvailable).length;
            const sectionEl = document.getElementById(vehicleLanes.sectionAvailable);
            if (sectionEl) sectionEl.textContent = sectionAvailableCount;
            vehicleLanes.lanes.forEach((lane, laneIndex) => {
                const laneAvailableCount = this.parkingSlots.filter(slot => slot.lane===vehicleType && slot.laneNumber === laneIndex+1 && slot.isAvailable).length;
                const el = document.getElementById(lane.available);
                if (el) el.textContent = laneAvailableCount;
            });
        });
    }

    // ... in ParkingSystem class ...

    updateAdminPanel(){
        this.renderBookingsList();
        const reportEl = document.getElementById('adminReport');
        if (reportEl) {
            reportEl.innerHTML = `
                <div>Total Bookings: ${this.bookings.length}</div>
                <div>Total Waiting: Car: ${this.waitlist.peekAll('car')}, 2-Wheeler: ${this.waitlist.peekAll('twoWheeler')}, Truck: ${this.waitlist.peekAll('truck')}</div>
                <div>**Waitlist Breakdown (VIP / Regular)**:</div>
                <ul>
                    <li>🚗 Car: **${this.waitlist.peekVIP('car')}** / ${this.waitlist.peekRegular('car')}</li>
                    <li>🏍️ 2-Wheeler: **${this.waitlist.peekVIP('twoWheeler')}** / ${this.waitlist.peekRegular('twoWheeler')}</li>
                    <li>🚚 Truck: **${this.waitlist.peekVIP('truck')}** / ${this.waitlist.peekRegular('truck')}</li>
                </ul>
            `;
        }
    }

    renderBookingsList(){
        const listContainer = document.getElementById('bookingsList');
        if (!listContainer) return;
        
        let html = '<table><thead><tr><th>Slot</th><th>Vehicle</th><th>Type</th><th>Driver</th><th>Booked At</th><th>Status</th></tr></thead><tbody>';
        
        this.bookings.forEach(booking => {
            const slot = this.parkingSlots.find(s => s.id === booking.slotId);
            const isCurrentlyParked = slot && slot.vehicleNumber === booking.vehicleNumber && !slot.isAvailable;
            
            let statusText = 'Completed';
            let statusClass = 'completed';
            if (isCurrentlyParked) {
                statusText = this.getSlotStatusText(slot);
                statusClass = this.getSlotStatusClass(slot);
            }
            
            html += `
                <tr class="${isCurrentlyParked ? 'active-booking' : ''}">
                    <td>${booking.slotId}</td>
                    <td>${booking.vehicleNumber}</td>
                    <td>${booking.vehicleType}</td>
                    <td>${booking.driverName}</td>
                    <td>${this.formatTime(booking.bookingTime)}</td>
                    <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        listContainer.innerHTML = html;
    }

    formatTime(date){
        if (!date) return '-';
        return new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'}).format(date);
    }

    refreshData(){
        this.renderParkingGrid();
        this.updateStatus();
        this.populateSlotOptions();
        this.showMessage('Data refreshed!', 'success');
    }

    showMessage(text, type='success'){
        document.querySelectorAll('.message').forEach(m=>m.remove());
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = text; 
        const main = document.querySelector('.main') || document.body;
        main.insertBefore(message, main.firstChild);
        setTimeout(()=> message.remove(), 3500);
    }

    /* ---------------- backend stubs ---------------- */
    async saveBooking(bookingRecord){
        return Promise.resolve({ok:true, id: bookingRecord.id});
    }
}

/* ---------- Initialize when DOM ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
    window.parkingSystem = new ParkingSystem();
}); 