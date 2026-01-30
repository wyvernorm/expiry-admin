const WORKER_URL = "https://expiry-worker.iplusview.workers.dev";

let editingServiceId = null;
let currentCustomerId = null;
let currentCustomer = null;

async function loadCustomers() {
  const res = await fetch(`${WORKER_URL}/api/customers`);
  const customers = await res.json();

  const dropdown = document.getElementById("customerDropdown");
  const selected = document.getElementById("customerSelected");
  dropdown.innerHTML = "";

  customers.forEach(c => {
    const div = document.createElement("div");
    div.className = "customer-item";
    div.innerHTML = `
      <img src="${c.picture_url || `https://ui-avatars.com/api/?name=${c.name}`}">
      <strong>${c.name}</strong>
      <span class="badge ${c.status}">
        ${c.status === "ok" ? "ปกติ" : c.status === "warning" ? "ใกล้หมด" : "หมดแล้ว"}
      </span>
    `;

    div.onclick = () => {
      currentCustomer = c;

      selected.innerHTML = `
        <img src="${c.picture_url || `https://ui-avatars.com/api/?name=${c.name}`}">
        <strong>${c.name}</strong>
        <span class="badge ${c.status}">
          ${c.status === "ok" ? "ปกติ" : c.status === "warning" ? "ใกล้หมด" : "หมดแล้ว"}
        </span>
      `;

      dropdown.classList.add("hidden");
      loadServices();
    };

    dropdown.appendChild(div);
  });

  if (customers.length) dropdown.firstChild.click();
}

/* =======================
   LOAD SERVICES
======================= */
async function loadServices() {
  if (!currentCustomerId) return;

  const res = await fetch(
    `${WORKER_URL}/api/services?customer_id=${currentCustomerId}`
  );
  const services = await res.json();

  const list = document.getElementById("serviceList");
  list.innerHTML = "";

  const today = new Date();

  services.forEach(s => {
    const expire = new Date(s.expire_date);
    const diff = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));

    let cls = "ok";
    let status = "ปกติ";

    if (diff <= s.notify_before) {
      cls = "warn";
      status = "ใกล้หมดอายุ";
    }

    const li = document.createElement("li");
    li.className = `service ${cls}`;
    li.innerHTML = `
      <div>
        <strong>${s.service_name}</strong><br>
        หมดอายุ: ${s.expire_date}<br>
        แจ้งล่วงหน้า: ${s.notify_before} วัน<br>
        <small>${status}</small>
      </div>
      <div class="actions">
        <button onclick="editService(${s.id})">✏️</button>
        <button onclick="deleteService(${s.id})">🗑</button>
      </div>
    `;
    list.appendChild(li);
  });
}

/* =======================
   ADD / EDIT SERVICE
======================= */
async function addService() {
  if (!currentCustomerId) {
    alert("กรุณาเลือกลูกค้าก่อน");
    return;
  }

  const body = {
    customer_id: currentCustomerId,
    service_name: document.getElementById("serviceName").value,
    expire_date: document.getElementById("expireDate").value,
    notify_before: document.getElementById("notifyBefore").value,
    message: document.getElementById("message").value
  };

  const url = editingServiceId
    ? `${WORKER_URL}/api/services/${editingServiceId}`
    : `${WORKER_URL}/api/services`;

  await fetch(url, {
    method: editingServiceId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  editingServiceId = null;
  document.querySelector(".primary").textContent = "บันทึกบริการ";

  document.getElementById("serviceName").value = "";
  document.getElementById("expireDate").value = "";
  document.getElementById("notifyBefore").value = 1;
  document.getElementById("message").value = "";

  loadServices();
}

/* =======================
   DELETE SERVICE
======================= */
async function deleteService(id) {
  if (!confirm("ลบบริการนี้?")) return;

  await fetch(`${WORKER_URL}/api/services/${id}`, {
    method: "DELETE"
  });

  loadServices();
}

/* =======================
   EDIT SERVICE
======================= */
async function editService(id) {
  editingServiceId = id;

  const res = await fetch(
    `${WORKER_URL}/api/services?customer_id=${currentCustomerId}`
  );
  const services = await res.json();

  const s = services.find(x => x.id === id);
  if (!s) return;

  document.getElementById("serviceName").value = s.service_name;
  document.getElementById("expireDate").value = s.expire_date;
  document.getElementById("notifyBefore").value = s.notify_before;
  document.getElementById("message").value = s.message || "";

  document.querySelector(".primary").textContent = "บันทึกการแก้ไข";
}

/* =======================
   DROPDOWN TOGGLE
======================= */
document.getElementById("customerSelected").onclick = () => {
  document.getElementById("customerDropdown").classList.toggle("hidden");
};

/* =======================
   INIT
======================= */
loadCustomers();

document.getElementById("customerSearch").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".customer-item").forEach(el => {
    el.style.display = el.innerText.toLowerCase().includes(q)
      ? "flex"
      : "none";
  });
});

document.getElementById("refreshCustomer").onclick = async () => {
  if (!currentCustomer) return;

  await fetch(`${WORKER_URL}/api/customers/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_id: currentCustomer.id })
  });

  loadCustomers();
};

