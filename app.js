const WORKER_URL = "https://expiry-worker.iplusview.workers.dev";

let editingServiceId = null;
let currentCustomerId = null;
let currentCustomer = null;
let selectedItems = new Set();
let draggedEvent = null;
let currentUser = null;
let allCustomers = [];

// ==================== GOOGLE AUTH ====================

function initGoogleAuth() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
        google.accounts.id.initialize({
            client_id: '962763961858-59vepdnpla1p46dsrh4hecpr0np57flu.apps.googleusercontent.com',
            callback: handleGoogleLogin
        });

        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showApp();
        } else {
            showLoginScreen();
        }
    };
}

function showLoginScreen() {
    document.getElementById('loginOverlay').classList.add('active');
    
    document.getElementById('googleLoginBtn').addEventListener('click', () => {
        google.accounts.id.prompt();
    });
}

function handleGoogleLogin(response) {
    try {
        const decoded = parseJwt(response.credential);
        currentUser = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        showToast(`ยินดีต้อนรับ ${currentUser.name}`, 'success');
    } catch (error) {
        document.getElementById('loginError').textContent = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
    }
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function showApp() {
    document.getElementById('loginOverlay').classList.remove('active');
    
    const profile = document.getElementById('userProfile');
    profile.style.display = 'flex';
    document.getElementById('userAvatar').src = currentUser.picture;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    location.reload();
}

// ==================== UTILITY ====================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;
    setTimeout(() => toast.classList.remove('active'), 3000);
}

async function showConfirm(title, message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmDialog');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        dialog.classList.add('active');

        const handleOk = () => {
            dialog.classList.remove('active');
            document.getElementById('confirmOk').removeEventListener('click', handleOk);
            document.getElementById('confirmCancel').removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            dialog.classList.remove('active');
            document.getElementById('confirmOk').removeEventListener('click', handleOk);
            document.getElementById('confirmCancel').removeEventListener('click', handleCancel);
            resolve(false);
        };

        document.getElementById('confirmOk').addEventListener('click', handleOk);
        document.getElementById('confirmCancel').addEventListener('click', handleCancel);
    });
}

// ==================== EXPIRY MANAGER ====================

class ExpiryManager {
    constructor() {
        this.services = [];
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.init();
    }

    async init() {
        await loadCustomers();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupTouchGestures();
    }

    setupEventListeners() {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                e.target.closest('.toggle-btn').classList.add('active');
                const view = e.target.closest('.toggle-btn').dataset.view;
                document.getElementById(view + 'View').classList.add('active');
            });
        });

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

        document.getElementById('todayBtn').addEventListener('click', () => {
            const today = new Date();
            this.currentMonth = today.getMonth();
            this.currentYear = today.getFullYear();
            this.renderCalendar();
            showToast('กลับสู่วันนี้', 'success');
        });

        document.getElementById('bulkDeleteBtn').addEventListener('click', async () => {
            if (selectedItems.size === 0) return;
            const confirmed = await showConfirm('ลบรายการที่เลือก', `ต้องการลบ ${selectedItems.size} รายการหรือไม่?`);
            if (confirmed) await this.bulkDelete(Array.from(selectedItems));
        });

        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeDayModal').addEventListener('click', () => document.getElementById('dayModal').classList.remove('active'));
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());

        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveService();
        });

        document.getElementById('lineUserId').addEventListener('change', (e) => {
            const userId = e.target.value;
            const preview = document.getElementById('selectedUserPreview');
            
            if (userId) {
                const customer = allCustomers.find(c => c.line_user_id === userId);
                if (customer) {
                    preview.innerHTML = `
                        <img src="${customer.picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}`}">
                        <div>
                            <div style="font-weight: 600;">${customer.name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">จะได้รับการแจ้งเตือนทาง LINE</div>
                        </div>
                    `;
                    preview.classList.add('active');
                }
            } else {
                preview.classList.remove('active');
            }
        });

        document.getElementById('filterStatus').addEventListener('change', () => this.renderList());

        document.getElementById('customerSelected').addEventListener('click', () => {
            document.getElementById('customerDropdown').classList.toggle('hidden');
        });

        document.getElementById('refreshCustomer').addEventListener('click', async () => {
            if (!currentCustomer) return;
            showLoading();
            await fetch(`${WORKER_URL}/api/customers/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: currentCustomer.id })
            });
            await loadCustomers();
            hideLoading();
            showToast('รีเฟรชสำเร็จ', 'success');
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') this.closeModal();
        });
        document.getElementById('dayModal').addEventListener('click', (e) => {
            if (e.target.id === 'dayModal') document.getElementById('dayModal').classList.remove('active');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const typing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
            
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (document.getElementById('modal').classList.contains('active')) {
                    document.getElementById('itemForm').dispatchEvent(new Event('submit'));
                }
            }
            
            if (e.key === 'Escape') {
                this.closeModal();
                document.getElementById('dayModal').classList.remove('active');
                document.getElementById('confirmDialog').classList.remove('active');
            }
            
            if (typing) return;
            
            if (e.key === 'n') document.getElementById('addItemBtn').click();
            if (e.key === 'c') document.querySelector('[data-view="calendar"]').click();
            if (e.key === 'l') document.querySelector('[data-view="list"]').click();
            if (e.key === 't') document.getElementById('todayBtn')?.click();
            if (e.key === 'ArrowLeft' && document.getElementById('calendarView').classList.contains('active')) {
                document.getElementById('prevMonth').click();
            }
            if (e.key === 'ArrowRight' && document.getElementById('calendarView').classList.contains('active')) {
                document.getElementById('nextMonth').click();
            }
        });
    }

    setupTouchGestures() {
        let startX = 0;
        const calendar = document.querySelector('.calendar-grid');
        
        calendar.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        calendar.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    document.getElementById('nextMonth').click();
                } else {
                    document.getElementById('prevMonth').click();
                }
            }
        });
    }

    openModal(service = null, date = null) {
        document.getElementById('dayModal').classList.remove('active');
        editingServiceId = service ? service.id : null;

        const modal = document.getElementById('modal');
        const form = document.getElementById('itemForm');

        // Populate LINE user selector with ALL customers
        this.populateLineUserSelect();

        if (service) {
            document.getElementById('modalTitle').textContent = 'แก้ไขบริการ';
            document.getElementById('serviceName').value = service.service_name;
            document.getElementById('expireDate').value = service.expire_date;
            document.getElementById('lineUserId').value = service.line_user_id || '';
            document.getElementById('lineUserId').dispatchEvent(new Event('change'));
            const messageParts = service.message ? service.message.split('\n') : [];
            document.getElementById('message').value = messageParts.length > 1 ? messageParts.slice(1).join('\n') : '';
        } else {
            document.getElementById('modalTitle').textContent = 'เพิ่มบริการใหม่';
            form.reset();
            document.getElementById('expireDate').value = date || new Date().toISOString().split('T')[0];
        }

        modal.classList.add('active');
        setTimeout(() => document.getElementById('serviceName').focus(), 100);
    }

    populateLineUserSelect() {
        const select = document.getElementById('lineUserId');
        select.innerHTML = '<option value="">-- เลือกผู้รับแจ้งเตือน --</option>';
        
        // แสดงทุกคน ไม่จำกัดเฉพาะลูกค้าปัจจุบัน
        allCustomers.forEach(c => {
            const option = document.createElement('option');
            option.value = c.line_user_id;
            option.textContent = c.name;
            select.appendChild(option);
        });
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        document.getElementById('selectedUserPreview').classList.remove('active');
        editingServiceId = null;
        document.getElementById('itemForm').reset();
    }

    async saveService() {
        const lineUserId = document.getElementById('lineUserId').value;
        if (!lineUserId) {
            showToast('กรุณาเลือกผู้รับแจ้งเตือน', 'warning');
            return;
        }

        showLoading();

        const serviceName = document.getElementById('serviceName').value;
        const expireDate = document.getElementById('expireDate').value;
        const additionalMessage = document.getElementById('message').value;
        const fullMessage = additionalMessage ? `${serviceName}\n${additionalMessage}` : serviceName;

        const targetCustomer = allCustomers.find(c => c.line_user_id === lineUserId);

        const body = {
            customer_id: targetCustomer.id,
            service_name: serviceName,
            expire_date: expireDate,
            message: fullMessage,
            line_user_id: lineUserId,
            created_by: currentUser ? currentUser.email : 'unknown',
            updated_by: currentUser ? currentUser.email : 'unknown'
        };

        const url = editingServiceId
            ? `${WORKER_URL}/api/services/${editingServiceId}`
            : `${WORKER_URL}/api/services`;

        try {
            await fetch(url, {
                method: editingServiceId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            this.closeModal();
            await loadServices();
            hideLoading();
            showToast(editingServiceId ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ', 'success');
        } catch (error) {
            hideLoading();
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    }

    async deleteService(id) {
        const confirmed = await showConfirm('ลบบริการ', 'คุณแน่ใจหรือไม่ที่จะลบบริการนี้?');
        if (!confirmed) return;

        showLoading();
        try {
            await fetch(`${WORKER_URL}/api/services/${id}`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleted_by: currentUser ? currentUser.email : 'unknown' })
            });
            await loadServices();
            hideLoading();
            showToast('ลบสำเร็จ', 'success');
        } catch (error) {
            hideLoading();
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    }

    async bulkDelete(ids) {
        showLoading();
        try {
            for (const id of ids) {
                await fetch(`${WORKER_URL}/api/services/${id}`, { 
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleted_by: currentUser ? currentUser.email : 'unknown' })
                });
            }
            selectedItems.clear();
            await loadServices();
            hideLoading();
            showToast(`ลบ ${ids.length} รายการสำเร็จ`, 'success');
            document.getElementById('bulkDeleteBtn').style.display = 'none';
        } catch (error) {
            hideLoading();
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    }

    async moveService(serviceId, newDate) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        const confirmed = await showConfirm('ยืนยันการย้าย', `ต้องการย้าย "${service.service_name}" ไปยังวันที่ ${newDate} หรือไม่?`);
        if (!confirmed) return;

        showLoading();
        try {
            await fetch(`${WORKER_URL}/api/services/${serviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...service,
                    expire_date: newDate,
                    updated_by: currentUser ? currentUser.email : 'unknown'
                })
            });
            await loadServices();
            hideLoading();
            showToast('ย้ายสำเร็จ', 'success');
        } catch (error) {
            hideLoading();
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    }

    getServiceStatus(expireDate, notifyBefore = 7) {
        const expire = new Date(expireDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expire.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'expired';
        if (diffDays <= notifyBefore) return 'soon';
        return 'active';
    }

    renderCalendar() {
        const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        
        document.getElementById('currentMonth').textContent = `${monthNames[this.currentMonth]} ${this.currentYear + 543}`;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';

        for (let i = firstDay - 1; i >= 0; i--) {
            calendarDays.appendChild(this.createDayElement(daysInPrevMonth - i, true, -1));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            calendarDays.appendChild(this.createDayElement(day, false, 0));
        }

        const totalCells = calendarDays.children.length;
        for (let day = 1; day <= 42 - totalCells; day++) {
            calendarDays.appendChild(this.createDayElement(day, true, 1));
        }

        this.setupDragDrop();
    }

    createDayElement(day, otherMonth, monthOffset) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        let year = this.currentYear;
        let month = this.currentMonth + monthOffset;
        
        if (month < 0) { month = 11; year--; }
        else if (month > 11) { month = 0; year++; }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayDiv.dataset.date = dateStr;
        
        if (otherMonth) dayDiv.style.opacity = '0.5';

        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.style.backgroundColor = 'rgba(0, 217, 255, 0.1)';
            dayDiv.style.border = '2px solid var(--accent-primary)';
        }

        const dayServices = this.services.filter(s => s.expire_date === dateStr);
        
        const eventsHtml = dayServices.slice(0, 3).map(s => {
            const status = this.getServiceStatus(s.expire_date, 7);
            return `<div class="event-item ${status}" data-service-id="${s.id}" draggable="true">${s.service_name || 'ไม่มีชื่อ'}</div>`;
        }).join('');

        const moreHtml = dayServices.length > 3 ? `<div class="more-events">+${dayServices.length - 3} เพิ่มเติม</div>` : '';

        dayDiv.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-events">${eventsHtml}${moreHtml}</div>
        `;

        dayDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('event-item') || e.target.classList.contains('more-events')) {
                if (dayServices.length > 0) this.showDayDetails(dateStr, dayServices);
            } else if (!otherMonth) {
                if (dayServices.length > 0) {
                    this.showDayDetails(dateStr, dayServices);
                } else {
                    this.openModal(null, dateStr);
                }
            }
        });

        dayDiv.addEventListener('dblclick', () => {
            if (!otherMonth) this.openModal(null, dateStr);
        });

        return dayDiv;
    }

    setupDragDrop() {
        document.querySelectorAll('.event-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedEvent = e.target;
                e.target.classList.add('dragging');
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('dragging-over'));
            });
        });

        document.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!day.style.opacity) day.classList.add('dragging-over');
            });

            day.addEventListener('dragleave', () => {
                day.classList.remove('dragging-over');
            });

            day.addEventListener('drop', async (e) => {
                e.preventDefault();
                day.classList.remove('dragging-over');
                
                if (draggedEvent && !day.style.opacity) {
                    const serviceId = parseInt(draggedEvent.dataset.serviceId);
                    const newDate = day.dataset.date;
                    await this.moveService(serviceId, newDate);
                }
            });
        });
    }

    showDayDetails(date, services) {
        const modal = document.getElementById('dayModal');
        document.getElementById('dayModalTitle').textContent = this.formatThaiDate(date);
        
        const sortedServices = [...services].sort((a, b) => b.id - a.id);
        
        document.getElementById('dayItemsList').innerHTML = `
            <button class="btn-primary" style="width: 100%; margin-bottom: 1rem;" onclick="manager.openModal(null, '${date}')">
                + เพิ่มบริการในวันนี้
            </button>
        ` + sortedServices.map(s => {
            const status = this.getServiceStatus(s.expire_date, 7);
            const customerName = allCustomers.find(c => c.id === s.customer_id)?.name || 'ไม่ทราบชื่อ';
            return `
                <div class="day-item ${status}">
                    <div class="day-item-name">${s.service_name}</div>
                    <div class="day-item-details">
                        ส่งไปยัง: ${customerName}<br>
                        สถานะ: ${status === 'expired' ? 'หมดอายุแล้ว' : status === 'soon' ? 'ใกล้หมด' : 'ปกติ'}
                        ${s.created_by ? `<br><small>สร้างโดย: ${s.created_by}</small>` : ''}
                    </div>
                    ${s.message && s.message !== s.service_name ? `<div class="item-note">📝 ${s.message}</div>` : ''}
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button class="icon-btn" onclick="manager.openModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">✏️</button>
                        <button class="icon-btn delete" onclick="manager.deleteService(${s.id}); document.getElementById('dayModal').classList.remove('active');">🗑</button>
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

        let filtered = this.services.filter(s => {
            const status = this.getServiceStatus(s.expire_date, 7);
            return statusFilter === 'all' || status === statusFilter;
        });

        filtered.sort((a, b) => new Date(a.expire_date) - new Date(b.expire_date));

        const list = document.getElementById('itemsList');
        
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    <h3>ไม่พบบริการ</h3>
                    <p>เพิ่มบริการใหม่เพื่อเริ่มต้นใช้งาน</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(s => {
            const status = this.getServiceStatus(s.expire_date, 7);
            const expire = new Date(s.expire_date);
            const today = new Date();
            const diffDays = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));
            const statusText = diffDays < 0 ? `หมดอายุแล้ว ${Math.abs(diffDays)} วัน` : `อีก ${diffDays} วัน`;
            const isSelected = selectedItems.has(s.id);
            const customerName = allCustomers.find(c => c.id === s.customer_id)?.name || 'ไม่ทราบชื่อ';

            return `
                <div class="item-card ${status} ${isSelected ? 'selected' : ''}">
                    <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} onchange="manager.toggleSelect(${s.id}, this.checked)">
                    <div class="item-header">
                        <div class="item-info">
                            <div class="item-name">${s.service_name || 'ไม่มีชื่อ'}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                ส่งไปยัง: ${customerName}
                                ${s.created_by ? ` • สร้างโดย: ${s.created_by}` : ''}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="icon-btn" onclick="manager.openModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">✏️</button>
                            <button class="icon-btn delete" onclick="manager.deleteService(${s.id})">🗑</button>
                        </div>
                    </div>
                    <div class="item-details">
                        <div class="detail-item">
                            <div class="detail-label">วันหมดอายุ</div>
                            <div class="detail-value ${status}">
                                ${expire.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">เหลือเวลา</div>
                            <div class="detail-value ${status}">${statusText}</div>
                        </div>
                    </div>
                    ${s.message && s.message !== s.service_name ? `<div class="item-note">📝 ${s.message}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    toggleSelect(id, checked) {
        if (checked) {
            selectedItems.add(id);
        } else {
            selectedItems.delete(id);
        }
        
        const bulkBtn = document.getElementById('bulkDeleteBtn');
        if (selectedItems.size > 0) {
            bulkBtn.style.display = 'flex';
            bulkBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/>
                </svg>
                ลบที่เลือก (${selectedItems.size})
            `;
        } else {
            bulkBtn.style.display = 'none';
        }
        
        this.renderList();
    }

    updateStats() {
        let expired = 0, soon = 0, active = 0;
        this.services.forEach(s => {
            const status = this.getServiceStatus(s.expire_date, 7);
            if (status === 'expired') expired++;
            else if (status === 'soon') soon++;
            else active++;
        });
        document.getElementById('expiredCount').textContent = expired;
        document.getElementById('soonCount').textContent = soon;
        document.getElementById('activeCount').textContent = active;
        document.getElementById('totalCount').textContent = this.services.length;
    }
}

// ==================== LOAD DATA ====================

async function loadCustomers() {
    try {
        showLoading();
        const res = await fetch(`${WORKER_URL}/api/customers`);
        const customers = await res.json();
        allCustomers = customers;

        const dropdown = document.getElementById('customerDropdown');
        const selected = document.getElementById('customerSelected');
        dropdown.innerHTML = '';

        if (customers.length === 0) {
            selected.innerHTML = '<div class="empty-state-small">ยังไม่มีลูกค้า</div>';
            hideLoading();
            return;
        }

        customers.forEach(c => {
            const div = document.createElement('div');
            div.className = 'customer-item';
            div.innerHTML = `
                <img src="${c.picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`}">
                <div class="customer-info">
                    <strong>${c.name}</strong>
                </div>
            `;

            div.onclick = () => {
                currentCustomer = c;
                currentCustomerId = c.id;
                selected.innerHTML = div.innerHTML;
                dropdown.classList.add('hidden');
                loadServices();
            };

            dropdown.appendChild(div);
        });

        if (customers.length && !currentCustomerId) {
            dropdown.firstChild.click();
        }
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('เกิดข้อผิดพลาดในการโหลดลูกค้า', 'error');
    }
}

async function loadServices() {
    if (!currentCustomerId) return;

    try {
        showLoading();
        const res = await fetch(`${WORKER_URL}/api/services?customer_id=${currentCustomerId}`);
        const services = await res.json();
        manager.services = services;
        manager.renderCalendar();
        manager.renderList();
        manager.updateStats();
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('เกิดข้อผิดพลาดในการโหลดบริการ', 'error');
    }
}

// ==================== INIT ====================

let manager;
document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
    manager = new ExpiryManager();
});
