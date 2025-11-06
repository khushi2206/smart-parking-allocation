/* ---------- Utilities (Minimal) ---------- */
const now = () => new Date();

/* ---------- Binary Search Tree for Slot Management ---------- */

// BST Node for Parking Slots
class BSTNode {
    constructor(slot) {
        this.slot = slot;
        this.left = null;
        this.right = null;
        this.height = 1; // For AVL balancing
    }
}

// Binary Search Tree for Efficient Slot Management
class SlotBST {
    constructor() {
        this.root = null;
        this.size = 0;
    }
    
    // Get height of a node
    getHeight(node) {
        return node ? node.height : 0;
    }
    
    // Update height of a node
    updateHeight(node) {
        if (node) {
            node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
        }
    }
    
    // Get balance factor
    getBalance(node) {
        return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
    }
    
    // Right rotation
    rotateRight(y) {
        const x = y.left;
        const T2 = x.right;
        
        x.right = y;
        y.left = T2;
        
        this.updateHeight(y);
        this.updateHeight(x);
        
        return x;
    }
    
    // Left rotation
    rotateLeft(x) {
        const y = x.right;
        const T2 = y.left;
        
        y.left = x;
        x.right = T2;
        
        this.updateHeight(x);
        this.updateHeight(y);
        
        return y;
    }
    
    // Insert a slot into BST
    insert(slot) {
        const prevSize = this.countNodes(this.root);
        this.root = this._insert(this.root, slot);
        const newSize = this.countNodes(this.root);
        this.size = newSize; // Update size based on actual node count
    }
    
    // Count nodes in tree
    countNodes(node) {
        if (!node) return 0;
        return 1 + this.countNodes(node.left) + this.countNodes(node.right);
    }
    
    _insert(node, slot) {
        if (!node) {
            return new BSTNode(slot);
        }
        
        // Insert based on slot ID
        if (slot.id < node.slot.id) {
            node.left = this._insert(node.left, slot);
        } else if (slot.id > node.slot.id) {
            node.right = this._insert(node.right, slot);
        } else {
            // Update existing slot
            node.slot = slot;
            return node;
        }
        
        // Update height
        this.updateHeight(node);
        
        // Get balance factor
        const balance = this.getBalance(node);
        
        // Left Left Case
        if (balance > 1 && slot.id < node.left.slot.id) {
            return this.rotateRight(node);
        }
        
        // Right Right Case
        if (balance < -1 && slot.id > node.right.slot.id) {
            return this.rotateLeft(node);
        }
        
        // Left Right Case
        if (balance > 1 && slot.id > node.left.slot.id) {
            node.left = this.rotateLeft(node.left);
            return this.rotateRight(node);
        }
        
        // Right Left Case
        if (balance < -1 && slot.id < node.right.slot.id) {
            node.right = this.rotateRight(node.right);
            return this.rotateLeft(node);
        }
        
        return node;
    }
    
    // Search for a slot by ID
    search(slotId) {
        return this._search(this.root, slotId);
    }
    
    _search(node, slotId) {
        if (!node) return null;
        
        if (slotId === node.slot.id) {
            return node.slot;
        } else if (slotId < node.slot.id) {
            return this._search(node.left, slotId);
        } else {
            return this._search(node.right, slotId);
        }
    }
    
    // Find available slots for a specific vehicle type
    findAvailableSlots(vehicleType) {
        const availableSlots = [];
        this._inorderTraversal(this.root, (slot) => {
            if (slot.isAvailable && slot.lane === vehicleType) {
                availableSlots.push(slot);
            }
        });
        return availableSlots;
    }
    
    // Find slots in a range
    findSlotsInRange(minId, maxId) {
        const slotsInRange = [];
        this._rangeSearch(this.root, minId, maxId, slotsInRange);
        return slotsInRange;
    }
    
    _rangeSearch(node, minId, maxId, result) {
        if (!node) return;
        
        if (node.slot.id >= minId) {
            this._rangeSearch(node.left, minId, maxId, result);
        }
        
        if (node.slot.id >= minId && node.slot.id <= maxId) {
            result.push(node.slot);
        }
        
        if (node.slot.id <= maxId) {
            this._rangeSearch(node.right, minId, maxId, result);
        }
    }
    
    // Inorder traversal
    _inorderTraversal(node, callback) {
        if (node) {
            this._inorderTraversal(node.left, callback);
            callback(node.slot);
            this._inorderTraversal(node.right, callback);
        }
    }
    
    // Get all slots as array
    getAllSlots() {
        const allSlots = [];
        this._inorderTraversal(this.root, (slot) => allSlots.push(slot));
        return allSlots;
    }
    
    // Delete a slot
    delete(slotId) {
        this.root = this._delete(this.root, slotId);
        this.size--;
    }
    
    _delete(node, slotId) {
        if (!node) return node;
        
        if (slotId < node.slot.id) {
            node.left = this._delete(node.left, slotId);
        } else if (slotId > node.slot.id) {
            node.right = this._delete(node.right, slotId);
        } else {
            // Node to be deleted found
            if (!node.left) {
                return node.right;
            } else if (!node.right) {
                return node.left;
            }
            
            // Node with two children: get inorder successor
            const minValueNode = this._getMinValueNode(node.right);
            node.slot = minValueNode.slot;
            node.right = this._delete(node.right, minValueNode.slot.id);
        }
        
        this.updateHeight(node);
        
        const balance = this.getBalance(node);
        
        // Left Left Case
        if (balance > 1 && this.getBalance(node.left) >= 0) {
            return this.rotateRight(node);
        }
        
        // Left Right Case
        if (balance > 1 && this.getBalance(node.left) < 0) {
            node.left = this.rotateLeft(node.left);
            return this.rotateRight(node);
        }
        
        // Right Right Case
        if (balance < -1 && this.getBalance(node.right) <= 0) {
            return this.rotateLeft(node);
        }
        
        // Right Left Case
        if (balance < -1 && this.getBalance(node.right) > 0) {
            node.right = this.rotateRight(node.right);
            return this.rotateLeft(node);
        }
        
        return node;
    }
    
    _getMinValueNode(node) {
        let current = node;
        while (current.left) {
            current = current.left;
        }
        return current;
    }
    
    // Get size
    getSize() {
        return this.size;
    }
    
    // Check if empty
    isEmpty() {
        return this.size === 0;
    }
    
    // Clear all slots
    clear() {
        this.root = null;
        this.size = 0;
    }
}

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


/* ---------- Main ParkingSystem (Enhanced with BST) ---------- */
class ParkingSystem {
    constructor(options={}) {
        this.parkingSlots = [];
        this.bookings = []; 
        this.tokens = []; // Track all parking tokens
        this.selectedSlot = null; // Stubs remain, but unused in simplified flow

        // BST for efficient slot management
        this.slotBST = new SlotBST();

        // Subsystems
        this.parkingGraph = new ParkingGraph();
        this.waitlist = new WaitlistSystem();
        
        // Pricing structure (per day)
        this.pricing = {
            car: 120,
            twoWheeler: 50,
            truck: 300
        };

        // Lane configuration
        this.lanes = options.lanes || {
            car: { totalSlots: 20, lanes:[{slots:10,container:'carLane1Slots',available:'carLane1Available'},{slots:10,container:'carLane2Slots',available:'carLane2Available'}], sectionAvailable:'carAvailable' },
            twoWheeler:{ totalSlots:40, lanes:[
                {slots:10,container:'twoWheelerLane1Slots',available:'twoWheelerLane1Available'},
                {slots:10,container:'twoWheelerLane2Slots',available:'twoWheelerLane2Available'},
                {slots:10,container:'twoWheelerLane3Slots',available:'twoWheelerLane3Available'},
                {slots:10,container:'twoWheelerLane4Slots',available:'twoWheelerLane4Available'}
            ], sectionAvailable:'twoWheelerAvailable' },
            truck: { totalSlots:20, lanes:[{slots:20,container:'truckLane1Slots',available:'truckLane1Available'}], sectionAvailable:'truckAvailable' }
        };

        this.init();
    }

    init(){
        this.initializeSlots();
        this.initializeMultiLevelParking();
        this.initializeBST();
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

    initializeBST(){
        // Insert all slots into BST for efficient management
        this.parkingSlots.forEach(slot => {
            this.slotBST.insert(slot);
        });
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
    
    
    

    /* ---------------- find nearest slot (BST-based) ---------------- */
    findNearestSlotByBST(vehicleType){
        // Use BST to find available slots for the vehicle type
        const availableSlots = this.slotBST.findAvailableSlots(vehicleType);
        
        if (availableSlots.length > 0) {
            console.log(`[DEBUG] Found ${availableSlots.length} available slots for vehicle type "${vehicleType}"`);
            return availableSlots[0]; // Return first available slot
        }
        
        console.warn(`[WARN] No available slot found for vehicle type "${vehicleType}"`);
        return null;
    }
    
    /* ---------------- find slots in range (BST feature) ---------------- */
    findSlotsInRange(minId, maxId){
        return this.slotBST.findSlotsInRange(minId, maxId);
    }

    /* ---------------- dynamic allocation strategy (BST-enhanced) ---------------- */
    dynamicAllocate(vehicleType){
        // Use BST for efficient slot finding
        const availableSlot = this.findNearestSlotByBST(vehicleType);
        if (availableSlot) return availableSlot;
        
        // Fallback to linear search if BST doesn't find anything
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
    
        // Update slot in BST
        this.slotBST.insert(slot);
    
        // Generate parking token
        const tokenId = this.generateTokenId();
        const dailyRate = this.pricing[slot.vehicleType] || 0;
        
        const bookingRecord = {
            id: Date.now() + Math.random(),
            slotId: slot.id,
            vehicleNumber: slot.vehicleNumber,
            vehicleType: slot.vehicleType,
            driverName: slot.driverName,
            phoneNumber: slot.phoneNumber,
            bookingTime: slot.bookingTime,
            tokenId: tokenId,
            dailyRate: dailyRate,
            status: 'active'
        };
        this.bookings.unshift(bookingRecord);
        this.tokens.push(bookingRecord); // Store in tokens array
        this.saveBooking(bookingRecord).catch(()=>{});
    
        this.renderParkingGridDebounced();
        this.updateStatus();
    
        // <-- Add pop-up message here
        this.showMessage(`✅ Slot ${slot.id} allocated to vehicle ${slot.vehicleNumber}! Token: ${tokenId}`, 'success');
    
        return { status: 'allocated', slot: slot.id, tokenId: tokenId };
    }
    
    // Generate unique token ID
    generateTokenId(){
        const date = new Date();
        const dateStr = date.getFullYear() + 
                       String(date.getMonth() + 1).padStart(2, '0') + 
                       String(date.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
        return `TKN-${dateStr}-${random}`;
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
    
        // Mark token as completed
        const booking = this.bookings.find(b => b.vehicleNumber === vehicleNumber && b.status === 'active');
        if (booking) {
            booking.status = 'completed';
            booking.exitTime = now();
        }
    
        // <-- Add pop-up message here
        this.showMessage(`🅾️ Slot ${slot.id} released from vehicle ${vehicleNumber}.`, 'info');
    
        // free slot
        slot.isAvailable = true;
        slot.vehicleNumber = null; slot.vehicleType = null; slot.driverName = null; slot.phoneNumber = null;
        slot.bookingTime = null; slot.status='available';
    
        // Update slot in BST
        this.slotBST.insert(slot);
    
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
        // Render active tokens
        this.renderActiveTokens();
        
        // Render bookings list
        this.renderBookingsList();
        
        // Update token counts
        const activeTokens = this.bookings.filter(b => b.status === 'active').length;
        const activeTokensCountEl = document.getElementById('activeTokensCount');
        if (activeTokensCountEl) activeTokensCountEl.textContent = activeTokens;
        
        const totalBookingsCountEl = document.getElementById('totalBookingsCount');
        if (totalBookingsCountEl) totalBookingsCountEl.textContent = this.bookings.length;
        
        // Calculate revenue statistics
        let totalRevenue = 0;
        let totalDuration = 0;
        let activeCount = 0;
        
        this.bookings.forEach(booking => {
            if (booking.status === 'active' && booking.bookingTime) {
                const fee = this.calculateParkingFee(booking.bookingTime, booking.vehicleType);
                totalRevenue += fee;
                const duration = Math.ceil((new Date() - new Date(booking.bookingTime)) / (1000 * 60 * 60 * 24));
                totalDuration += duration;
                activeCount++;
            }
        });
        
        const avgDuration = activeCount > 0 ? Math.round(totalDuration / activeCount) : 0;
        
        // Update statistics
        const el = (id) => document.getElementById(id);
        
        // Occupancy Rate
        const available = this.parkingSlots.filter(s => s.isAvailable).length;
        const booked = this.parkingSlots.filter(s => !s.isAvailable).length;
        const total = this.parkingSlots.length;
        const occupancyRate = Math.round((booked / total) * 100);
        if (el('occupancyRate')) el('occupancyRate').textContent = `${occupancyRate}%`;
        
        // Total Revenue
        if (el('totalRevenue')) el('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
        
        // Active Vehicles
        if (el('activeVehicles')) el('activeVehicles').textContent = activeCount;
        
        // Average Duration
        if (el('avgDuration')) el('avgDuration').textContent = `${avgDuration} day${avgDuration !== 1 ? 's' : ''}`;
        
        // Vehicle Type Breakdown
        const carCount = this.bookings.filter(b => b.status === 'active' && b.vehicleType === 'car').length;
        const twoWheelerCount = this.bookings.filter(b => b.status === 'active' && b.vehicleType === 'twoWheeler').length;
        const truckCount = this.bookings.filter(b => b.status === 'active' && b.vehicleType === 'truck').length;
        
        if (el('carCount')) el('carCount').textContent = carCount;
        if (el('twoWheelerCount')) el('twoWheelerCount').textContent = twoWheelerCount;
        if (el('truckCount')) el('truckCount').textContent = truckCount;
        
        // Waitlist Status
        const totalWaiting = this.waitlist.peekAll('car') + this.waitlist.peekAll('twoWheeler') + this.waitlist.peekAll('truck');
        const vipWaiting = this.waitlist.peekVIP('car') + this.waitlist.peekVIP('twoWheeler') + this.waitlist.peekVIP('truck');
        
        if (el('totalWaiting')) el('totalWaiting').textContent = totalWaiting;
        if (el('vipWaiting')) el('vipWaiting').textContent = vipWaiting;
        
        // Setup search functionality if not already done
        const searchInput = document.getElementById('tokenSearchInput');
        if (searchInput && !searchInput.dataset.listenerAdded) {
            searchInput.addEventListener('input', (e) => {
                this.searchTokens(e.target.value);
            });
            searchInput.dataset.listenerAdded = 'true';
        }
        
        // Update DSA Statistics
        this.updateDSAStats();
    }
    
    updateDSAStats(){
        const el = (id) => document.getElementById(id);
        
        // === BST Statistics ===
        const bstSize = this.slotBST.getSize();
        const bstHeight = this.getBSTHeight();
        const availableSlots = this.parkingSlots.filter(s => s.isAvailable).length;
        
        if (el('bstSize')) el('bstSize').textContent = bstSize;
        if (el('bstHeight')) el('bstHeight').textContent = bstHeight;
        if (el('bstAvailable')) el('bstAvailable').textContent = availableSlots;
        
        // BST Recent Operations
        const bstOpsContainer = el('bstRecentOps');
        if (bstOpsContainer) {
            let opsHtml = '<div class="ops-title">Recent BST Operations:</div>';
            
            // Show last 3 bookings as BST operations
            const recentBookings = this.bookings.slice(0, 3);
            if (recentBookings.length > 0) {
                recentBookings.forEach(booking => {
                    const isActive = booking.status === 'active';
                    const operation = isActive ? 'INSERT' : 'UPDATE';
                    const className = isActive ? 'success' : '';
                    opsHtml += `<div class="dsa-op-item ${className}">
                        ${operation}: Slot ${booking.slotId} → ${booking.vehicleNumber} (${booking.vehicleType})
                    </div>`;
                });
            } else {
                opsHtml += '<div class="dsa-op-item">No operations yet - Tree initialized with ${bstSize} slots</div>';
            }
            
            bstOpsContainer.innerHTML = opsHtml;
        }
        
        // === Priority Queue (Waitlist) Statistics ===
        const carVip = this.waitlist.peekVIP('car');
        const twoWheelerVip = this.waitlist.peekVIP('twoWheeler');
        const truckVip = this.waitlist.peekVIP('truck');
        
        const carRegular = this.waitlist.peekRegular('car');
        const twoWheelerRegular = this.waitlist.peekRegular('twoWheeler');
        const truckRegular = this.waitlist.peekRegular('truck');
        
        if (el('queueCars')) el('queueCars').textContent = `${carVip}/${carRegular}`;
        if (el('queueTwoWheelers')) el('queueTwoWheelers').textContent = `${twoWheelerVip}/${twoWheelerRegular}`;
        if (el('queueTrucks')) el('queueTrucks').textContent = `${truckVip}/${truckRegular}`;
        
        // Queue Status
        const totalWaiting = carVip + carRegular + twoWheelerVip + twoWheelerRegular + truckVip + truckRegular;
        const queueStatusEl = el('queueStatus');
        if (queueStatusEl) {
            if (totalWaiting === 0) {
                queueStatusEl.innerHTML = '✅ All slots available - No waiting vehicles';
                queueStatusEl.className = 'queue-status-msg';
            } else {
                queueStatusEl.innerHTML = `⏳ ${totalWaiting} vehicle(s) waiting. VIP customers will be served first!`;
                queueStatusEl.className = 'queue-status-msg';
                queueStatusEl.style.background = '#fffbeb';
                queueStatusEl.style.color = '#d97706';
            }
        }
        
        // === Graph Statistics ===
        const totalSlots = this.parkingSlots.length;
        const totalLanes = Object.keys(this.lanes).length;
        
        // Calculate connections (each slot connected to neighbors in same lane)
        let totalConnections = 0;
        Object.values(this.lanes).forEach(laneConfig => {
            laneConfig.lanes.forEach(lane => {
                // Each lane with N slots has N-1 connections
                if (lane.slots > 1) {
                    totalConnections += (lane.slots - 1);
                }
            });
        });
        
        if (el('graphVertices')) el('graphVertices').textContent = totalSlots;
        if (el('graphEdges')) el('graphEdges').textContent = totalConnections;
        if (el('graphLanes')) el('graphLanes').textContent = totalLanes;
        
        // Graph Layout Info
        const graphOpsContainer = el('graphRecentOps');
        if (graphOpsContainer) {
            let graphHtml = '<div class="ops-title">Layout Structure:</div>';
            
            Object.entries(this.lanes).forEach(([vehicleType, config]) => {
                const occupied = this.parkingSlots.filter(s => s.lane === vehicleType && !s.isAvailable).length;
                const total = config.totalSlots;
                const icon = vehicleType === 'car' ? '🚗' : vehicleType === 'truck' ? '🚚' : '🏍️';
                
                graphHtml += `<div class="graph-lane-info">
                    <span>${icon} ${vehicleType.toUpperCase()}: ${config.lanes.length} lanes</span>
                    <span>${occupied}/${total} occupied</span>
                </div>`;
            });
            
            graphOpsContainer.innerHTML = graphHtml;
        }
        
        // === Stack Statistics (using bookings array as stack) ===
        const stackSize = this.bookings.length;
        const stackTop = this.bookings.length > 0 ? this.bookings[0].vehicleNumber : '-';
        if (el('stackSize')) el('stackSize').textContent = stackSize;
        if (el('stackTop')) el('stackTop').textContent = stackTop;
    }
    
    getBSTHeight(){
        return this.slotBST.getHeight(this.slotBST.root);
    }

    renderBookingsList(){
        const listContainer = document.getElementById('bookingsList');
        if (!listContainer) return;
        
        if (this.bookings.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No bookings yet</div>';
            return;
        }
        
        let html = '';
        
        this.bookings.slice(0, 10).forEach(booking => {
            const slot = this.parkingSlots.find(s => s.id === booking.slotId);
            const isCurrentlyParked = slot && slot.vehicleNumber === booking.vehicleNumber && !slot.isAvailable;
            
            let statusText = isCurrentlyParked ? 'Active' : 'Completed';
            let statusClass = isCurrentlyParked ? 'active' : 'completed';
            
            const vehicleIcon = booking.vehicleType === 'car' ? '🚗' : booking.vehicleType === 'truck' ? '🚚' : '🏍️';
            const duration = booking.bookingTime ? Math.ceil((new Date() - new Date(booking.bookingTime)) / (1000 * 60 * 60 * 24)) : 0;
            
            html += `
                <div class="booking-item ${isCurrentlyParked ? 'booking-active' : 'booking-completed'}">
                    <div class="booking-main">
                        <div class="booking-icon">${vehicleIcon}</div>
                        <div class="booking-details">
                            <div class="booking-vehicle">
                                <strong>${booking.vehicleNumber}</strong>
                                <span class="booking-status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <div class="booking-info">
                                <span class="booking-slot"><i class="fas fa-parking"></i> Slot ${booking.slotId}</span>
                                <span class="booking-driver"><i class="fas fa-user"></i> ${booking.driverName}</span>
                            </div>
                        </div>
                    </div>
                    <div class="booking-meta">
                        <div class="booking-time">
                            <i class="fas fa-clock"></i> ${this.formatTime(booking.bookingTime)}
                        </div>
                        ${isCurrentlyParked ? `<div class="booking-duration">${duration} day(s)</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
    }

    formatTime(date){
        if (!date) return '-';
        return new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'}).format(date);
    }

    /* ---------------- Token Management Methods ---------------- */
    calculateParkingFee(entryTime, vehicleType){
        if (!entryTime) return 0;
        const now = new Date();
        const entry = new Date(entryTime);
        const durationMs = now - entry;
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)); // Round up to full days
        const dailyRate = this.pricing[vehicleType] || 0;
        return durationDays * dailyRate;
    }

    generateTokenHTML(booking){
        const currentFee = this.calculateParkingFee(booking.bookingTime, booking.vehicleType);
        const duration = booking.bookingTime ? Math.ceil((new Date() - new Date(booking.bookingTime)) / (1000 * 60 * 60 * 24)) : 0;
        const vehicleIcon = booking.vehicleType === 'car' ? '🚗' : booking.vehicleType === 'truck' ? '🚚' : '🏍️';
        
        return `
            <div class="token-card" data-token-id="${booking.tokenId}">
                <div class="token-header">
                    <div class="token-id">
                        <strong>Token:</strong> ${booking.tokenId}
                    </div>
                    <div class="token-status ${booking.status}">
                        ${booking.status === 'active' ? '🟢 Active' : '⚪ Completed'}
                    </div>
                </div>
                <div class="token-body">
                    <div class="token-qr">
                        <div class="qr-placeholder">QR</div>
                    </div>
                    <div class="token-details">
                        <div class="token-row">
                            <span class="token-label">Vehicle:</span>
                            <span class="token-value">${vehicleIcon} ${booking.vehicleNumber}</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Driver:</span>
                            <span class="token-value">${booking.driverName}</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Slot:</span>
                            <span class="token-value">${booking.slotId}</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Entry:</span>
                            <span class="token-value">${this.formatTime(booking.bookingTime)}</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Type:</span>
                            <span class="token-value">${booking.vehicleType}</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Rate:</span>
                            <span class="token-value">₹${booking.dailyRate}/day</span>
                        </div>
                        <div class="token-row highlight">
                            <span class="token-label">Duration:</span>
                            <span class="token-value">${duration} day(s)</span>
                        </div>
                        <div class="token-row highlight">
                            <span class="token-label">Current Fee:</span>
                            <span class="token-value">₹${currentFee}</span>
                        </div>
                    </div>
                </div>
                <div class="token-actions">
                    <button class="btn-token-download" onclick="parkingSystem.downloadToken('${booking.tokenId}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    ${booking.status === 'active' ? `
                        <button class="btn-token-share" onclick="parkingSystem.shareToken('${booking.tokenId}')">
                            <i class="fas fa-share"></i> Share
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderActiveTokens(){
        const container = document.getElementById('activeTokensList');
        if (!container) return;
        
        const activeBookings = this.bookings.filter(b => b.status === 'active');
        
        if (activeBookings.length === 0) {
            container.innerHTML = '<div class="empty-state">No active tokens</div>';
            return;
        }
        
        let html = '';
        activeBookings.forEach(booking => {
            html += this.generateTokenHTML(booking);
        });
        
        container.innerHTML = html;
    }

    searchTokens(query){
        if (!query) {
            this.renderActiveTokens();
            return;
        }
        
        const container = document.getElementById('activeTokensList');
        if (!container) return;
        
        const filtered = this.bookings.filter(b => 
            b.status === 'active' && 
            (b.tokenId.toLowerCase().includes(query.toLowerCase()) ||
             b.vehicleNumber.toLowerCase().includes(query.toLowerCase()))
        );
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state">No tokens found</div>';
            return;
        }
        
        let html = '';
        filtered.forEach(booking => {
            html += this.generateTokenHTML(booking);
        });
        
        container.innerHTML = html;
    }

    downloadToken(tokenId){
        const booking = this.bookings.find(b => b.tokenId === tokenId);
        if (!booking) return;
        
        // Create a downloadable text representation
        const duration = Math.ceil((new Date() - new Date(booking.bookingTime)) / (1000 * 60 * 60 * 24));
        const currentFee = this.calculateParkingFee(booking.bookingTime, booking.vehicleType);
        
        const tokenText = `
========================================
    SMART PARKING ALLOCATION SYSTEM
========================================

Token ID: ${booking.tokenId}
Status: ${booking.status.toUpperCase()}

Vehicle Details:
- Vehicle Number: ${booking.vehicleNumber}
- Vehicle Type: ${booking.vehicleType}
- Driver Name: ${booking.driverName}
- Phone: ${booking.phoneNumber || 'N/A'}

Parking Details:
- Slot: ${booking.slotId}
- Entry Time: ${this.formatTime(booking.bookingTime)}
- Daily Rate: ₹${booking.dailyRate}
- Duration: ${duration} day(s)
- Current Fee: ₹${currentFee}

${booking.status === 'active' ? 'Please present this token at exit.' : 'COMPLETED'}

========================================
        `;
        
        // Create blob and download
        const blob = new Blob([tokenText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parking-token-${booking.tokenId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showMessage('Token downloaded successfully!', 'success');
    }

    shareToken(tokenId){
        const booking = this.bookings.find(b => b.tokenId === tokenId);
        if (!booking) return;
        
        const tokenUrl = `Token: ${booking.tokenId}\nVehicle: ${booking.vehicleNumber}\nSlot: ${booking.slotId}\nRate: ₹${booking.dailyRate}/day`;
        
        // Try to use native share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Parking Token',
                text: tokenUrl
            }).then(() => {
                this.showMessage('Token shared successfully!', 'success');
            }).catch(() => {
                this.copyToClipboard(tokenUrl);
            });
        } else {
            this.copyToClipboard(tokenUrl);
        }
    }

    copyToClipboard(text){
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            this.showMessage('Token details copied to clipboard!', 'success');
        } catch (err) {
            this.showMessage('Failed to copy token details', 'error');
        }
        document.body.removeChild(textarea);
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