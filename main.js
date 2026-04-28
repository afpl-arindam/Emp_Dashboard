const API = "https://afplgis.com/api/employees";

const input = document.getElementById("searchInput");
const results = document.getElementById("results");

const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const resultCount = document.getElementById("resultCount");
const loader = document.getElementById("loader");

const hierarchy = ["SH", "ZM", "AM", "UM", "BM"];

let timer;
let cache = {};
let allData = [];
let currentEditEmp = null;

/* ---------------- TOAST ---------------- */
function toast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

/* ---------------- LOADER ---------------- */
function showLoader() { loader.style.display = "block"; }
function hideLoader() { loader.style.display = "none"; }

/* ---------------- INIT ---------------- */
async function init() {
  try {
    showLoader();

    const res = await fetch(API);
    const data = await res.json();

    allData = Array.isArray(data) ? data : [];

    updateStats();
    results.innerHTML = "";
    resultCount.innerText = "Start searching...";

  } catch {
    toast("Failed to load data");
  } finally {
    hideLoader();
  }
}

init();

/* ---------------- SEARCH ---------------- */
input.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => handleSearch(input.value), 300);
});

async function handleSearch(q) {
  q = q.trim();

  if (q === "###") return render(allData);

  if (!q) {
    results.innerHTML = "";
    resultCount.innerText = "Start searching...";
    return;
  }

  if (q.length < 3) {
    results.innerHTML = "";
    resultCount.innerText = "Type at least 3 characters...";
    return;
  }

  const url = `${API}?search=${encodeURIComponent(q)}`;

  if (cache[url]) return render(cache[url]);

  try {
    showLoader();

    const res = await fetch(url);
    const data = await res.json();

    cache[url] = Array.isArray(data) ? data : [];
    render(cache[url]);

  } catch {
    toast("API error");
  } finally {
    hideLoader();
  }
}

/* ---------------- RENDER ---------------- */
function render(data) {
  results.innerHTML = "";

  const safeData = Array.isArray(data) ? data : [];

  if (!safeData.length) {
    resultCount.innerText = "No results found";
    return;
  }

  safeData.forEach(emp => {
    const card = document.createElement("div");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "card-top";

    const left = document.createElement("div");
    left.className = "left";

    left.appendChild(createStatusDot(emp.status));

    const right = document.createElement("div");
    right.className = "actions";

    const edit = document.createElement("button");
    edit.textContent = "✏️";
    edit.onclick = () => openEditModal(emp);

    const del = document.createElement("button");
    del.textContent = "🗑";
    del.onclick = () => confirmDelete(emp);

    right.append(edit, del);
    top.append(left, right);

    card.appendChild(top);

    card.appendChild(createGrid([
      ["Name", emp.name],
      ["ID", emp.employee_id],
      ["Designation", emp.designation],
      ["Super", emp.super_name],
      ["Super ID", emp.super_id],
      ["Super Role", emp.super_designation],
      ["Branch", emp.branch_name],
      ["Zone", emp.zone],
      ["State", emp.state],
    ]));

    results.appendChild(card);
  });

  resultCount.innerText = `Showing ${safeData.length} results`;
}

/* ---------------- STATS ---------------- */
function updateStats() {
  totalCount.innerText = allData.length;
  activeCount.innerText = allData.filter(x => x.status === "active").length;
}

/* ---------------- STATUS DOT ---------------- */
function createStatusDot(status) {
  const dot = document.createElement("span");
  const val = (status || "inactive").toLowerCase();

  dot.className = "status-dot " + (val === "active" ? "green" : "red");
  dot.title = val;

  return dot;
}

/* ---------------- GRID ---------------- */
function createGrid(fields) {
  const grid = document.createElement("div");
  grid.className = "info-grid";

  fields.forEach(([label, value]) => {
    const item = document.createElement("div");

    item.innerHTML = `
      <span class="label">${label}:</span>
      <span class="value">${value ?? "-"}</span>
    `;

    grid.appendChild(item);
  });

  return grid;
}

/* ---------------- EDIT MODAL ---------------- */
function openEditModal(emp) {
  currentEditEmp = emp;

  document.getElementById("editModal").classList.remove("hidden");

  document.getElementById("editEmpIdLabel").innerText = "ID: " + emp.employee_id;

  document.getElementById("editName").value = emp.name || "";
  document.getElementById("editState").value = emp.state || "";
  document.getElementById("editZone").value = emp.zone || "";
  document.getElementById("editBranchId").value = emp.branch_id || "";
  document.getElementById("editBranch").value = emp.branch_name || "";
  document.getElementById("editSuperId").value = emp.super_id || "";
  document.getElementById("editSuperName").value = emp.super_name || "";

  document.getElementById("editStatus").value =
    (emp.status || "active").toLowerCase();

  fillEditDropdowns(emp);

  document.getElementById("cancelEdit").onclick = closeModal;
  document.getElementById("saveEdit").onclick = saveEdit;
}

function closeModal() {
  document.getElementById("editModal").classList.add("hidden");
}

/* ---------------- SAVE EDIT ---------------- */
async function saveEdit() {
  try {
    const payload = {
      name: editName.value,
      designation: editDesig.value,
      state: editState.value,
      zone: editZone.value,
      branch_id: editBranchId.value,
      branch_name: editBranch.value,
      super_id: editSuperId.value,
      super_name: editSuperName.value,
      super_designation: editSuperDesig.value,
      status: editStatus.value
    };

    const res = await fetch(`${API}/${currentEditEmp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();

    toast("Updated successfully");
    closeModal();
    init();

  } catch {
    toast("Update failed");
  }
}

/* ---------------- DROPDOWNS ---------------- */
function fillEditDropdowns(emp) {
  const empSel = editDesig;
  const superSel = editSuperDesig;

  empSel.innerHTML = hierarchy.map(r => `<option>${r}</option>`).join("");
  empSel.value = emp.designation;

  filterSuperRoles("editDesig", "editSuperDesig");

  if ([...superSel.options].some(o => o.value === emp.super_designation)) {
    superSel.value = emp.super_designation;
  }

  empSel.onchange = () =>
    filterSuperRoles("editDesig", "editSuperDesig");
}

function filterSuperRoles(empId, superId) {
  const empIndex = hierarchy.indexOf(document.getElementById(empId).value);
  const superSel = document.getElementById(superId);

  superSel.innerHTML = "";

  hierarchy.forEach((r, i) => {
    if (i < empIndex) {
      superSel.innerHTML += `<option value="${r}">${r}</option>`;
    }
  });

  if (!superSel.innerHTML)
    superSel.innerHTML = `<option value="">No superior</option>`;
}

/* ---------------- DELETE ---------------- */
function confirmDelete(emp) {
  const box = document.createElement("div");
  box.className = "modal";

  box.innerHTML = `
    <div class="modal-box delete-box">
      <h3>Delete Employee</h3>
      <p>Delete <b>${emp.name}</b>?</p>
      <div class="modal-actions">
        <button id="no">Cancel</button>
        <button id="yes" class="danger-btn">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(box);

  box.querySelector("#no").onclick = () => box.remove();

  box.querySelector("#yes").onclick = async () => {
    try {
      const res = await fetch(`${API}/emp/${emp.employee_id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error();

      toast("Deleted");
      box.remove();
      init();

    } catch {
      toast("Delete failed");
    }
  };
}