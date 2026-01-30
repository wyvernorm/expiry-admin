// ระบบจัดการข้อมูล
class ExpiryManager {
    constructor() {
        this.items = this.loadItems();
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.editingItem = null;
        this.init();
    }

    init() {
        this.renderCalendar();
        this.renderList();
        this.updateStats();
        this.setupEventListeners();
        this.populateCategoryFilter();
    }

    setupEventListeners() {
        // View Toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                e.target.classList.add('active');
                const view = e.target.dataset.view;
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
            this.saveItem();
        });

        // Filters and Search
        document.getElementById('filterStatus').addEventListener('change', () => {
            this.renderList();
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.renderList();
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderList();
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

    openModal(item = null) {
        this.editingItem = item;
        const modal = document.getElementById('modal');
        const form = document.getElementById('itemForm');
        const title = document.getElementById('modalTitle');

        if (item) {
            title.textContent = 'แก้ไขรายการ';
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemExpiry').value = item.expiry;
            document.getElementById('itemQuantity').value = item.quantity;
            document.getElementById('itemNote').value = item.note || '';
        } else {
            title.textContent = 'เพิ่มรายการใหม่';
            form.reset();
        }

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.editingItem = null;
        document.getElementById('itemForm').reset();
    }

    saveItem() {
        const name = document.getElementById('itemName').value;
        const category = document.getElementById('itemCategory').value;
        const expiry = document.getElementById('itemExpiry').value;
        const quantity = parseInt(document.getElementById('itemQuantity').value);
        const note = document.getElementById('itemNote').value;

        const item = {
            id: this.editingItem ? this.editingItem.id : Date.now(),
            name,
            category,
            expiry,
            quantity,
            note,
            createdAt: this.editingItem ? this.editingItem.createdAt : new Date().toISOString()
        };

        if (this.editingItem) {
            const index = this.items.findIndex(i => i.id === this.editingItem.id);
            this.items[index] = item;
        } else {
            this.items.push(item);
        }

        this.saveItems();
        this.closeModal();
        this.renderCalendar();
        this.renderList();
        this.updateStats();
        this.populateCategoryFilter();
    }

    deleteItem(id) {
        if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveItems();
            this.renderCalendar();
            this.renderList();
            this.updateStats();
            this.populateCategoryFilter();
        }
    }

    getItemStatus(expiry) {
        const expiryDate = new Date(expiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);

        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 7) return 'soon';
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
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
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

        // Get items for this day
        const dayItems = this.items.filter(item => item.expiry === dateStr);
        
        if (dayItems.length > 0) {
            dayDiv.classList.add('has-items');
        }

        dayDiv.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-items">
                ${dayItems.slice(0, 3).map(item => {
                    const status = this.getItemStatus(item.expiry);
                    return `<div class="item-dot ${status}"></div>`;
                }).join('')}
                ${dayItems.length > 3 ? `<div class="item-dot">+${dayItems.length - 3}</div>` : ''}
            </div>
        `;

        if (dayItems.length > 0) {
            dayDiv.addEventListener('click', () => {
                this.showDayDetails(dateStr, dayItems);
            });
        }

        return dayDiv;
    }

    showDayDetails(date, items) {
        const modal = document.getElementById('dayModal');
        const title = document.getElementById('dayModalTitle');
        const list = document.getElementById('dayItemsList');

        const dateObj = new Date(date);
        const thaiDate = dateObj.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        title.textContent = thaiDate;
        list.innerHTML = items.map(item => {
            const status = this.getItemStatus(item.expiry);
            return `
                <div class="day-item ${status}">
                    <div class="day-item-name">${item.name}</div>
                    <span class="day-item-category">${item.category}</span>
                    <div class="day-item-details">
                        จำนวน: ${item.quantity} | 
                        สถานะ: ${status === 'expired' ? 'หมดอายุแล้ว' : 
                                status === 'soon' ? 'ใกล้หมดอายุ' : 'ปกติ'}
                    </div>
                    ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
                </div>
            `;
        }).join('');

        modal.classList.add('active');
    }

    renderList() {
        const statusFilter = document.getElementById('filterStatus').value;
        const categoryFilter = document.getElementById('filterCategory').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();

        let filteredItems = this.items.filter(item => {
            const status = this.getItemStatus(item.expiry);
            const matchStatus = statusFilter === 'all' || status === statusFilter;
            const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
            const matchSearch = item.name.toLowerCase().includes(searchQuery) ||
                              item.category.toLowerCase().includes(searchQuery) ||
                              (item.note && item.note.toLowerCase().includes(searchQuery));

            return matchStatus && matchCategory && matchSearch;
        });

        // Sort by expiry date
        filteredItems.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

        const list = document.getElementById('itemsList');
        
        if (filteredItems.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.3; margin-bottom: 1rem;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p style="font-size: 1.2rem;">ไม่พบรายการ</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filteredItems.map(item => {
            const status = this.getItemStatus(item.expiry);
            const expiryDate = new Date(item.expiry);
            const today = new Date();
            const diffTime = expiryDate - today;
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
                            <div class="item-name">${item.name}</div>
                            <span class="item-category">${item.category}</span>
                        </div>
                        <div class="item-actions">
                            <button class="icon-btn" onclick="manager.openModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                </svg>
                            </button>
                            <button class="icon-btn delete" onclick="manager.deleteItem(${item.id})">
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
                                ${expiryDate.toLocaleDateString('th-TH', { 
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
                            <div class="detail-label">จำนวน</div>
                            <div class="detail-value">${item.quantity}</div>
                        </div>
                    </div>
                    ${item.note ? `<div class="item-note">📝 ${item.note}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    updateStats() {
        let expired = 0;
        let soon = 0;
        let active = 0;

        this.items.forEach(item => {
            const status = this.getItemStatus(item.expiry);
            if (status === 'expired') expired++;
            else if (status === 'soon') soon++;
            else active++;
        });

        document.getElementById('expiredCount').textContent = expired;
        document.getElementById('soonCount').textContent = soon;
        document.getElementById('activeCount').textContent = active;
    }

    populateCategoryFilter() {
        const categories = [...new Set(this.items.map(item => item.category))];
        const select = document.getElementById('filterCategory');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="all">หมวดหมู่ทั้งหมด</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    }

    loadItems() {
        const data = localStorage.getItem('expiryItems');
        return data ? JSON.parse(data) : this.getSampleData();
    }

    saveItems() {
        localStorage.setItem('expiryItems', JSON.stringify(this.items));
    }

    getSampleData() {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + 30);
        const soonDate = new Date(today);
        soonDate.setDate(today.getDate() + 3);
        const expiredDate = new Date(today);
        expiredDate.setDate(today.getDate() - 5);

        return [
            {
                id: 1,
                name: 'นมสดตราหมี',
                category: 'อาหาร',
                expiry: this.formatDate(soonDate),
                quantity: 2,
                note: 'เก็บในตู้เย็น',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'พาราเซตามอล 500mg',
                category: 'ยา',
                expiry: this.formatDate(futureDate),
                quantity: 1,
                note: '',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'ครีมบำรุงผิว',
                category: 'เครื่องสำอาง',
                expiry: this.formatDate(expiredDate),
                quantity: 1,
                note: 'หมดอายุแล้ว ต้องทิ้ง',
                createdAt: new Date().toISOString()
            }
        ];
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Initialize
let manager;
document.addEventListener('DOMContentLoaded', () => {
    manager = new ExpiryManager();
});
