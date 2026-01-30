// LINE LIFF Integration
let liff;
let lineProfile = null;
let lineUsers = [];

// Initialize LIFF
async function initLIFF() {
    try {
        await liff.init({ liffId: 'YOUR_LIFF_ID' }); // เปลี่ยน YOUR_LIFF_ID
        
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            lineProfile = await liff.getProfile();
            await loadLineUsers();
        }
    } catch (error) {
        console.error('LIFF initialization failed:', error);
        // ใช้ข้อมูล mock สำหรับ development
        useMockData();
    }
}

function useMockData() {
    // Mock data สำหรับ development
    lineProfile = {
        userId: 'U1234567890',
        displayName: 'Admin User',
        pictureUrl: 'https://via.placeholder.com/150'
    };
    
    lineUsers = [
        {
            userId: 'U001',
            displayName: 'ลูกค้า A',
            pictureUrl: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=A'
        },
        {
            userId: 'U002',
            displayName: 'ลูกค้า B',
            pictureUrl: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=B'
        },
        {
            userId: 'U003',
            displayName: 'ลูกค้า C',
            pictureUrl: 'https://via.placeholder.com/150/95E1D3/FFFFFF?text=C'
        },
        {
            userId: 'U004',
            displayName: 'ลูกค้า D',
            pictureUrl: 'https://via.placeholder.com/150/F38181/FFFFFF?text=D'
        }
    ];
}

async function loadLineUsers() {
    // จริงๆ ควรดึงจาก API หรือ LINE Messaging API
    // สำหรับตอนนี้ใช้ mock data
    lineUsers = [
        {
            userId: 'U001',
            displayName: 'ลูกค้า A',
            pictureUrl: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=A'
        },
        {
            userId: 'U002',
            displayName: 'ลูกค้า B',
            pictureUrl: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=B'
        },
        {
            userId: 'U003',
            displayName: 'ลูกค้า C',
            pictureUrl: 'https://via.placeholder.com/150/95E1D3/FFFFFF?text=C'
        }
    ];
}

// ส่งการแจ้งเตือนผ่าน LINE
async function sendLineNotification(userId, message) {
    try {
        // ควรเรียก Backend API เพื่อส่งข้อความ
        console.log('Sending notification to:', userId, message);
        // await fetch('/api/send-line-message', {
        //     method: 'POST',
        //     body: JSON.stringify({ userId, message })
        // });
        return true;
    } catch (error) {
        console.error('Failed to send notification:', error);
        return false;
    }
}

// ระบบจัดการข้อมูล
class ExpiryManager {
    constructor() {
        this.items = this.loadItems();
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.editingItem = null;
        this.selectedDate = null;
        this.selectedUser = null;
        this.init();
    }

    async init() {
        // Initialize LINE
        if (typeof liff !== 'undefined') {
            await initLIFF();
        } else {
            useMockData();
        }
        
        this.renderCalendar();
        this.renderList();
        this.updateStats();
        this.setupEventListeners();
        this.checkAndSendNotifications();
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
            this.saveItem();
        });

        // Filters and Search
        document.getElementById('filterStatus').addEventListener('change', () => {
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

    renderLineUserSelector() {
        const selector = document.getElementById('lineUserSelector');
        
        if (this.selectedUser) {
            selector.innerHTML = `
                <div class="selected-user-display">
                    <img src="${this.selectedUser.pictureUrl}" alt="${this.selectedUser.displayName}" class="line-user-avatar">
                    <div class="line-user-info">
                        <div class="line-user-name">${this.selectedUser.displayName}</div>
                        <div class="line-user-id">${this.selectedUser.userId}</div>
                    </div>
                    <button type="button" class="change-user-btn" onclick="manager.clearSelectedUser()">เปลี่ยน</button>
                </div>
            `;
            document.getElementById('selectedUserId').value = this.selectedUser.userId;
        } else {
            selector.innerHTML = lineUsers.map(user => `
                <div class="line-user-item" onclick="manager.selectUser('${user.userId}')">
                    <img src="${user.pictureUrl}" alt="${user.displayName}" class="line-user-avatar">
                    <div class="line-user-info">
                        <div class="line-user-name">${user.displayName}</div>
                        <div class="line-user-id">${user.userId}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    selectUser(userId) {
        this.selectedUser = lineUsers.find(u => u.userId === userId);
        this.renderLineUserSelector();
    }

    clearSelectedUser() {
        this.selectedUser = null;
        document.getElementById('selectedUserId').value = '';
        this.renderLineUserSelector();
    }

    openModal(item = null, date = null) {
        this.editingItem = item;
        this.selectedDate = date;
        const modal = document.getElementById('modal');
        const form = document.getElementById('itemForm');
        const title = document.getElementById('modalTitle');

        if (item) {
            title.textContent = 'แก้ไขนัดหมาย';
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemExpiry').value = item.expiry;
            document.getElementById('itemNote').value = item.note || '';
            this.selectedUser = lineUsers.find(u => u.userId === item.userId);
        } else {
            title.textContent = 'เพิ่มนัดหมายใหม่';
            form.reset();
            this.selectedUser = null;
            if (date) {
                document.getElementById('itemExpiry').value = date;
            }
        }

        this.renderLineUserSelector();
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.editingItem = null;
        this.selectedDate = null;
        this.selectedUser = null;
        document.getElementById('itemForm').reset();
    }

    async saveItem() {
        const name = document.getElementById('itemName').value;
        const expiry = document.getElementById('itemExpiry').value;
        const note = document.getElementById('itemNote').value;
        const userId = document.getElementById('selectedUserId').value;

        if (!userId) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        const user = lineUsers.find(u => u.userId === userId);

        const item = {
            id: this.editingItem ? this.editingItem.id : Date.now(),
            name,
            expiry,
            note,
            userId: user.userId,
            userName: user.displayName,
            userPicture: user.pictureUrl,
            createdAt: this.editingItem ? this.editingItem.createdAt : new Date().toISOString(),
            notified: this.editingItem ? this.editingItem.notified : false
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
    }

    deleteItem(id) {
        if (confirm('คุณต้องการลบนัดหมายนี้หรือไม่?')) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveItems();
            this.renderCalendar();
            this.renderList();
            this.updateStats();
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

    async checkAndSendNotifications() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const item of this.items) {
            const expiryDate = new Date(item.expiry);
            expiryDate.setHours(0, 0, 0, 0);
            
            const diffTime = expiryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // ส่งการแจ้งเตือน 3 วันก่อนหมดอายุ
            if (diffDays === 3 && !item.notified) {
                const message = `แจ้งเตือน: นัดหมาย "${item.name}" จะถึงกำหนดในอีก 3 วัน\nรายละเอียด: ${item.note || 'ไม่มี'}\nวันที่: ${this.formatThaiDate(item.expiry)}`;
                
                const sent = await sendLineNotification(item.userId, message);
                if (sent) {
                    item.notified = true;
                    this.saveItems();
                }
            }
            
            // ส่งการแจ้งเตือนในวันที่นัดหมาย
            if (diffDays === 0) {
                const message = `วันนี้เป็นวันนัดหมาย "${item.name}"\nรายละเอียด: ${item.note || 'ไม่มี'}`;
                await sendLineNotification(item.userId, message);
            }
        }
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

        // Click to add or view items
        dayDiv.addEventListener('click', () => {
            if (dayItems.length > 0) {
                this.showDayDetails(dateStr, dayItems);
            } else if (!otherMonth) {
                this.openModal(null, dateStr);
            }
        });

        return dayDiv;
    }

    showDayDetails(date, items) {
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
                เพิ่มนัดหมายในวันนี้
            </button>
        ` + items.map(item => {
            const status = this.getItemStatus(item.expiry);
            return `
                <div class="day-item ${status}">
                    <div class="day-item-name">${item.name}</div>
                    <div class="item-user-info" style="margin: 0.5rem 0;">
                        <img src="${item.userPicture}" alt="${item.userName}" class="item-user-avatar">
                        <span class="item-user-name">${item.userName}</span>
                    </div>
                    <div class="day-item-details">
                        สถานะ: ${status === 'expired' ? 'เลยกำหนดแล้ว' : 
                                status === 'soon' ? 'ใกล้ถึงกำหนด' : 'ปกติ'}
                    </div>
                    ${item.note ? `<div class="item-note" style="margin-top: 0.5rem; font-size: 0.9rem;">📝 ${item.note}</div>` : ''}
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button class="icon-btn" onclick="manager.openModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                        </button>
                        <button class="icon-btn delete" onclick="manager.deleteItem(${item.id}); document.getElementById('dayModal').classList.remove('active');">
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

        let filteredItems = this.items.filter(item => {
            const status = this.getItemStatus(item.expiry);
            const matchStatus = statusFilter === 'all' || status === statusFilter;
            const matchSearch = item.name.toLowerCase().includes(searchQuery) ||
                              item.userName.toLowerCase().includes(searchQuery) ||
                              (item.note && item.note.toLowerCase().includes(searchQuery));

            return matchStatus && matchSearch;
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
                    <p style="font-size: 1.2rem;">ไม่พบนัดหมาย</p>
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
                statusText = `เลยกำหนดมาแล้ว ${Math.abs(diffDays)} วัน`;
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
                            <div class="item-user-info">
                                <img src="${item.userPicture}" alt="${item.userName}" class="item-user-avatar">
                                <span class="item-user-name">${item.userName}</span>
                            </div>
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
                            <div class="detail-label">วันนัดหมาย</div>
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
                name: 'CUST-001',
                expiry: this.formatDate(soonDate),
                note: 'ตรวจสุขภาพประจำปี',
                userId: 'U001',
                userName: 'ลูกค้า A',
                userPicture: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=A',
                createdAt: new Date().toISOString(),
                notified: false
            },
            {
                id: 2,
                name: 'CUST-002',
                expiry: this.formatDate(futureDate),
                note: 'ติดตามผลการรักษา',
                userId: 'U002',
                userName: 'ลูกค้า B',
                userPicture: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=B',
                createdAt: new Date().toISOString(),
                notified: false
            },
            {
                id: 3,
                name: 'CUST-003',
                expiry: this.formatDate(expiredDate),
                note: 'ตรวจสอบผลแล็บ',
                userId: 'U003',
                userName: 'ลูกค้า C',
                userPicture: 'https://via.placeholder.com/150/95E1D3/FFFFFF?text=C',
                createdAt: new Date().toISOString(),
                notified: false
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
    
    // Check notifications every hour
    setInterval(() => {
        manager.checkAndSendNotifications();
    }, 3600000); // 1 hour
});
