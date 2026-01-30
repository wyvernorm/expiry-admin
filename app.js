const WORKER_URL = "https://expiry-worker.iplusview.workers.dev";

let editingServiceId = null;
let currentCustomerId = null;
let currentCustomer = null;

// ระบบจัดการข้อมูล
class ExpiryManager {
    constructor() {
        this.services = [];
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.editingService = null;
        this.selectedDate = null;
        this.init();
    }

    async init() {
        await loadCustomers();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // View Toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                e.target.closest('.toggle-btn').classList.add('active');
                const view = e.target.closest('.toggle-btn').dataset.view;
                document.getElementById(view + 'View').classList.add('active');
            });
        });

        // Calendar Navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.renderCalendar();
        });

        // Modal
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('closeDayModal').addEventListener('click', () => {
            document.getElementById('dayModal').classList.remove('active');
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Form Submit
        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveService();
        });

        // Filters and Search
        document.getElementById('filterStatus').addEventListener('change', () => {
            this.renderList();
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderList();
        });

        // Customer Search
        document.getElementById('customerSearch').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.customer-item').forEach(el => {
                el.style.display = el.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
            });
        });

        // Customer Selected Toggle
        document.getElementById('customerSelected').addEventListener('click', () => {
            document.getElementById('customerDropdown').classList.toggle('hidden');
        });

        // Refresh Customer
        document.getElementById('refreshCustomer').addEventListener('click', async () => {
            if (!currentCustomer) return;
            await fetch(`${WORKER_URL}/api/customers/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: currentCustomer.id })
            });
            await loadCustomers();
        });

        // Close modal on background click
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });

        document.getElementById('dayModal').addEventListener('click', (e) => {
            if (e.target.id === 'dayModal') {
                document.getElementById('dayModal').classList.remove('active');
            }
        });
    }

    openModal(service = null, date = null) {
        this.editingService = service;
        this.selectedDate = date;
        editingServiceId = service ? service.id : null;
        
        const modal = document.getElementById('modal');
        const form = document.getElementById('itemForm');
        const title = document.getElementById('modalTitle');

        if (!currentCustomerId) {
            alert('กรุณาเลือกลูกค้าก่อน');
            return;
        }

        if (service) {
            title.textContent = 'แก้ไขบริการ';
            document.getElementById('serviceName').value = service.service_name;
            document.getElementById('expireDate').value = service.expire_date;
            document.getElementById('notifyBefore').value = service.notify_before;
            document.getElementById('message').value = service.message || '';
        } else {
            title.textContent = 'เพิ่มบริการใหม่';
            form.reset();
            document.getElementById('notifyBefore').value = 7;
            if (date) {
                document.getElementById('expireDate').value = date;
            }
        }

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.editingService = null;
        this.selectedDate = null;
        editingServiceId = null;
        document.getElementById('itemForm').reset();
    }

    async saveService() {
        if (!currentCustomerId) {
            alert('กรุณาเลือกลูกค้าก่อน');
            return;
        }

        const body = {
            customer_id: currentCustomerId,
            service_name: document.getElementById('serviceName').value,
            expire_date: document.getElementById('expireDate').value,
            notify_before: document.getElementById('notifyBefore').value,
            message: document.getElementById('message').value
        };

        const url = editingServiceId
            ? `${WORKER_URL}/api/services/${editingServiceId}`
            : `${WORKER_URL}/api/services`;

        await fetch(url, {
            method: editingServiceId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        this.closeModal();
        await loadServices();
    }

    async deleteService(id) {
        if (!confirm('ลบบริการนี้?')) return;

        await fetch(`${WORKER_URL}/api/services/${id}`, {
            method: 'DELETE'
        });

        await loadServices();
    }

    getServiceStatus(expireDate, notifyBefore) {
        const expire = new Date(expireDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expire.setHours(0, 0, 0, 0);

        const diffTime = expire - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= notifyBefore) return 'soon';
        return 'active';
    }

    renderCalendar() {
        const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        
        document.getElementById('currentMonth').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear + 543}`;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayDiv = this.createDayElement(day, true, -1);
            calendarDays.appendChild(dayDiv);
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = this.createDayElement(day, false, 0);
            calendarDays.appendChild(dayDiv);
        }

        // Next month days
        const totalCells = calendarDays.children.length;
        const remainingCells = 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const dayDiv = this.createDayElement(day, true, 1);
            calendarDays.appendChild(dayDiv);
        }
    }

    createDayElement(day, otherMonth, monthOffset) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        let year = this.currentYear;
        let month = this.currentMonth + monthOffset;
        
        if (month < 0) {
            month = 11;
            year--;
        } else if (month > 11) {
            month = 0;
            year++;
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (otherMonth) {
            dayDiv.classList.add('other-month');
        }

        // Check if today
        const today = new Date();
        if (day === today.getDate() && 
            month === today.getMonth() && 
            year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        // Get services for this day
        const dayServices = this.services.filter(s => s.expire_date === dateStr);
        
        if (dayServices.length > 0) {
            dayDiv.classList.add('has-items');
        }

        dayDiv.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-items">
                ${dayServices.slice(0, 3).map(s => {
                    const status = this.getServiceStatus(s.expire_date, s.notify_before);
                    return `<div class="item-dot ${status}"></div>`;
                }).join('')}
                ${dayServices.length > 3 ? `<div class="item-dot">+${dayServices.length - 3}</div>` : ''}
            </div>
        `;

        // Click to add or view services
        dayDiv.addEventListener('click', () => {
            if (dayServices.length > 0) {
                this.showDayDetails(dateStr, dayServices);
            } else if (!otherMonth) {
                this.openModal(null, dateStr);
            }
        });

        return dayDiv;
    }

    showDayDetails(date, services) {
        const modal = document.getElementById('dayModal');
        const title = document.getElementById('dayModalTitle');
        const list = document.getElementById('dayItemsList');

        const thaiDate = this.formatThaiDate(date);
        title.textContent = thaiDate;
        
        list.innerHTML = `
            <button class="btn-primary" style="width: 100%; margin-bottom: 1rem;" onclick="manager.openModal(null, '${date}')">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
                </svg>
                เพิ่มบริการในวันนี้
            </button>
        ` + services.map(s => {
            const status = this.getServiceStatus(s.expire_date, s.notify_before);
            return `
                <div class="day-item ${status}">
                    <div class="day-item-name">${s.service_name}</div>
                    <div class="day-item-details">
                        แจ้งเตือนล่วงหน้า: ${s.notify_before} วัน<br>
                        สถานะ: ${status === 'expired' ? 'หมดอายุแล้ว' : 
                                status === 'soon' ? 'ใกล้หมดอายุ' : 'ปกติ'}
                    </div>
                    ${s.message ? `<div class="item-note" style="margin-top: 0.5rem; font-size: 0.9rem;">📝 ${s.message}</div>` : ''}
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button class="icon-btn" onclick="manager.openModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                        </button>
                        <button class="icon-btn delete" onclick="manager.deleteService(${s.id}); document.getElementById('dayModal').classList.remove('active');">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        modal.classList.add('active');
    }

    formatThaiDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        });
    }

    renderList() {
        const statusFilter = document.getElementById('filterStatus').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();

        let filteredServices = this.services.filter(s => {
            const status = this.getServiceStatus(s.expire_date, s.notify_before);
            const matchStatus = statusFilter === 'all' || status === statusFilter;
            const matchSearch = s.service_name.toLowerCase().includes(searchQuery) ||
                              (s.message && s.message.toLowerCase().includes(searchQuery));

            return matchStatus && matchSearch;
        });

        // Sort by expire date
        filteredServices.sort((a, b) => new Date(a.expire_date) - new Date(b.expire_date));

        const list = document.getElementById('itemsList');
        
        if (filteredServices.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.3; margin-bottom: 1rem;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p style="font-size: 1.2rem;">ไม่พบบริการ</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filteredServices.map(s => {
            const status = this.getServiceStatus(s.expire_date, s.notify_before);
            const expireDate = new Date(s.expire_date);
            const today = new Date();
            const diffTime = expireDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (status === 'expired') {
                statusText = `หมดอายุแล้ว ${Math.abs(diffDays)} วัน`;
            } else if (status === 'soon') {
                statusText = `อีก ${diffDays} วัน`;
            } else {
                statusText = `อีก ${diffDays} วัน`;
            }

            return `
                <div class="item-card ${status}">
                    <div class="item-header">
                        <div class="item-info">
                            <div class="item-name">${s.service_name}</div>
                        </div>
                        <div class="item-actions">
                            <button class="icon-btn" onclick="manager.openModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                </svg>
                            </button>
                            <button class="icon-btn delete" onclick="manager.deleteService(${s.id})">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="item-details">
                        <div class="detail-item">
                            <div class="detail-label">วันหมดอายุ</div>
                            <div class="detail-value ${status}">
                                ${expireDate.toLocaleDateString('th-TH', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">เหลือเวลา</div>
                            <div class="detail-value ${status}">${statusText}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">แจ้งล่วงหน้า</div>
                            <div class="detail-value">${s.notify_before} วัน</div>
                        </div>
                    </div>
                    ${s.message ? `<div class="item-note">📝 ${s.message}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    updateStats() {
        let expired = 0;
        let soon = 0;
        let active = 0;

        this.services.forEach(s => {
            const status = this.getServiceStatus(s.expire_date, s.notify_before);
            if (status === 'expired') expired++;
            else if (status === 'soon') soon++;
            else active++;
        });

        document.getElementById('expiredCount').textContent = expired;
        document.getElementById('soonCount').textContent = soon;
        document.getElementById('activeCount').textContent = active;
    }
}

// Load Customers
async function loadCustomers() {
    const res = await fetch(`${WORKER_URL}/api/customers`);
    const customers = await res.json();

    const dropdown = document.getElementById('customerDropdown');
    const selected = document.getElementById('customerSelected');
    dropdown.innerHTML = '';

    customers.forEach(c => {
        const div = document.createElement('div');
        div.className = 'customer-item';
        div.innerHTML = `
            <img src="${c.picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`}">
            <div class="customer-info">
                <strong>${c.name}</strong>
                <span class="badge ${c.status}">
                    ${c.status === 'ok' ? 'ปกติ' : c.status === 'warning' ? 'ใกล้หมด' : 'หมดแล้ว'}
                </span>
            </div>
        `;

        div.onclick = () => {
            currentCustomer = c;
            currentCustomerId = c.id;

            selected.innerHTML = `
                <img src="${c.picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`}">
                <div class="customer-info">
                    <strong>${c.name}</strong>
                    <span class="badge ${c.status}">
                        ${c.status === 'ok' ? 'ปกติ' : c.status === 'warning' ? 'ใกล้หมด' : 'หมดแล้ว'}
                    </span>
                </div>
            `;

            dropdown.classList.add('hidden');
            loadServices();
        };

        dropdown.appendChild(div);
    });

    if (customers.length && !currentCustomerId) {
        dropdown.firstChild.click();
    }
}

// Load Services
async function loadServices() {
    if (!currentCustomerId) return;

    const res = await fetch(`${WORKER_URL}/api/services?customer_id=${currentCustomerId}`);
    const services = await res.json();

    manager.services = services;
    manager.renderCalendar();
    manager.renderList();
    manager.updateStats();
}

// Initialize
let manager;
document.addEventListener('DOMContentLoaded', () => {
    manager = new ExpiryManager();
});
