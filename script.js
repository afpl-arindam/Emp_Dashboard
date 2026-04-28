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
    // render(allData);
    results.innerHTML = "";
    resultCount.innerText = "Start searching...";

  } catch (e) {
    toast("Failed to load data");
  } finally {
    hideLoader();
  }
}

init();

/* ---------------- SEARCH INPUT ---------------- */
input.addEventListener("input", () => {
  clearTimeout(timer);

  const q = input.value;

  timer = setTimeout(() => {
    handleSearch(q);
  }, 300);
});

/* ---------------- SEARCH LOGIC ---------------- */
async function handleSearch(q) {

  q = q.trim();

  // SHOW ALL DATA ONLY FOR ###
  if (q === "###") {
    render(allData);
    return;
  }

  // EMPTY INPUT → CLEAR SCREEN
  if (!q) {
    results.innerHTML = "";
    resultCount.innerText = "Start searching...";
    return;
  }

  // LESS THAN 3 CHARS → MESSAGE ONLY
  if (q.length < 3) {
    results.innerHTML = "";
    resultCount.innerText = "Type at least 3 characters...";
    return;
  }

  const url = `${API}?search=${encodeURIComponent(q)}`;

  if (cache[url]) {
    render(cache[url]);
    return;
  }

  try {
    showLoader();

    const res = await fetch(url);
    const data = await res.json();

    cache[url] = Array.isArray(data) ? data : [];

    render(cache[url]);

  } catch (e) {
    toast("API error");
  } finally {
    hideLoader();
  }
}

/* ---------------- RENDER ---------------- */
// function render(data) {

//   const safeData = Array.isArray(data) ? data : [];

//   results.innerHTML = "";

//   if (safeData.length === 0) {
//     resultCount.innerText = "No results found";
//     return;
//   }

//   safeData.forEach(emp => {
//     const div = document.createElement("div");
//     div.className = "card";

//     const name = document.createElement("h3");
//     name.textContent = emp.name || "-";

//     const id = document.createElement("p");
//     id.innerHTML = `<b>ID:</b> ${emp.employee_id ?? "-"}`;

//     const state = document.createElement("p");
//     state.innerHTML = `<b>State:</b> ${emp.state ?? "-"}`;

//     const zone = document.createElement("p");
//     zone.innerHTML = `<b>Zone:</b> ${emp.zone ?? "-"}`;

//     const branch = document.createElement("p");
//     branch.innerHTML = `<b>Branch:</b> ${emp.branch_name ?? "-"}`;

//     const badge = document.createElement("span");
//     badge.className = "badge";
//     badge.textContent = emp.status ?? "-";

//     div.appendChild(name);
//     div.appendChild(id);
//     div.appendChild(state);
//     div.appendChild(zone);
//     div.appendChild(branch);
//     div.appendChild(badge);

//     results.appendChild(div);
//   });

//   resultCount.innerText = `Showing ${safeData.length} results`;
// }
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

  const dot = createStatusDot(emp.status);
  left.appendChild(dot);

  const right = document.createElement("div");
  right.className = "actions";

  const edit = document.createElement("button");
  edit.textContent = "✏️";
  edit.title = "Edit";
  edit.onclick = () => openEditModal(emp);

  const copy = document.createElement("button");
  copy.textContent = "📄";
  copy.title = "Duplicate";
  copy.onclick = () => duplicateEmployee(emp);

  const del = document.createElement("button");
  del.textContent = "🗑";
  del.title = "Delete";
  del.onclick = () => confirmDelete(emp);

  right.appendChild(edit);
  right.appendChild(copy);
  right.appendChild(del);

  top.appendChild(left);
  top.appendChild(right);

  card.appendChild(top);

  card.appendChild(createGrid([
    ["Name", emp.name],
    ["Super", emp.super_name],
    ["Emp ID", emp.employee_id],
    ["Super ID", emp.super_id],
    ["Desig", emp.designation],
    ["Super Desig", emp.super_designation],
    ["Branch ID", emp.branch_id],
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
  activeCount.innerText =
    allData.filter(x => x.status === "active").length;
}

/* ---------------- THEME ---------------- */
const toggle = document.getElementById("themeToggle");

if (toggle) {
  const saved = localStorage.getItem("theme");

  if (saved === "light") {
    document.body.classList.add("light");
    toggle.innerText = "🌞";
  }

  toggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");

    toggle.innerText = isLight ? "🌞" : "🌙";

    localStorage.setItem("theme", isLight ? "light" : "dark");
  });
}

//card
function createSection(title, fields = []) {
  const wrapper = document.createElement("div");

  const h4 = document.createElement("h4");
  h4.textContent = title;
  wrapper.appendChild(h4);

  fields.forEach(([label, value]) => {
    const p = document.createElement("p");

    const strong = document.createElement("b");
    strong.textContent = label + ": ";

    const span = document.createElement("span");

    if (value instanceof HTMLElement) {
      span.appendChild(value);
    } else {
      span.textContent = value ?? "-";
    }

    p.appendChild(strong);
    p.appendChild(span);

    wrapper.appendChild(p);
  });

  return wrapper;
}


//Status Dot
function createStatusDot(status) {
  const dot = document.createElement("span");
  dot.className = "status-dot " + (status === "active" ? "green" : "red");

  // optional tooltip
  dot.title = status;

  return dot;
}

function createGrid(fields = []) {
  const grid = document.createElement("div");
  grid.className = "info-grid";

  fields.forEach(([label, value]) => {
    const item = document.createElement("div");

    const l = document.createElement("span");
    l.className = "label";
    l.textContent = label + ": ";

    const v = document.createElement("span");
    v.className = "value";
    v.textContent = value ?? "-";

    item.appendChild(l);
    item.appendChild(v);

    grid.appendChild(item);
  });

  return grid;
}

function createItem(label, value) {
  const div = document.createElement("div");

  const l = document.createElement("span");
  l.className = "label";
  l.textContent = label + ": ";

  const v = document.createElement("span");
  v.className = "value";
  v.textContent = value ?? "-";

  div.appendChild(l);
  div.appendChild(v);

  return div;
}


// OpenEdit model
function openEditModal(emp) {
  currentEditEmp = emp;

  const modal = document.getElementById("editModal");

  modal.innerHTML = `
    <div class="modal-box edit-card">

      <div class="edit-header">
        <h3>✏️ Edit Employee</h3>
        <span class="mini-id">ID: ${emp.employee_id}</span>
      </div>

      <div class="edit-grid">

        <div class="field">
          <label>Employee Name</label>
          <input id="editName" value="${emp.name || ""}">
        </div>

        <div class="field">
          <label>Employee Designation</label>
          <select id="editDesig"></select>
        </div>

        <div class="field">
          <label>State</label>
          <input id="editState" value="${emp.state || ""}">
        </div>

        <div class="field">
          <label>Zone</label>
          <input id="editZone" value="${emp.zone || ""}">
        </div>

        <div class="field">
          <label>Branch ID</label>
          <input id="editBranchId" value="${emp.branch_id || ""}">
        </div>

        <div class="field">
          <label>Branch Name</label>
          <input id="editBranch" value="${emp.branch_name || ""}">
        </div>

        <div class="field">
          <label>Super ID</label>
          <input id="editSuperId" value="${emp.super_id || ""}">
        </div>

        <div class="field">
          <label>Super Name</label>
          <input id="editSuperName" value="${emp.super_name || ""}">
        </div>

        <div class="field">
          <label>Super Designation</label>
          <select id="editSuperDesig"></select>
        </div>

        <div class="field">
          <label>Employee Status</label>
          <select id="editStatus">
            <option value="active">Active</option>
            <option value="Deactive">Deactive</option>
          </select>
        </div>

      </div>

      <div class="modal-actions">
        <button id="cancelEdit">Cancel</button>
        <button class="safe-btn" id="saveEdit">Save</button>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
  fillEditDropdowns(emp);

const statusSelect = document.getElementById("editStatus");

const normalizedStatus =
  (emp.status || "active").toLowerCase();

if ([...statusSelect.options].some(o => o.value === normalizedStatus)) {
  statusSelect.value = normalizedStatus;
} else {
  statusSelect.value = "active";
}

  document.getElementById("cancelEdit").onclick = closeModal;
  document.getElementById("saveEdit").onclick = saveEdit;
}

//Close Model
function closeModal() {
  document.getElementById("editModal").classList.add("hidden");
}

//Save Edit
async function saveEdit() {
  try {

    const empDesig = document.getElementById("editDesig").value;
    const superDesig = document.getElementById("editSuperDesig").value;

    if (!validateHierarchy(empDesig, superDesig)) {
      toast("Employee must be LOWER than Super designation");
      return;
    }

    const url = `https://afplgis.com/api/employees/${currentEditEmp.id}`;

    const updated = {
      name: document.getElementById("editName").value,
      designation: empDesig,
      state: document.getElementById("editState").value,
      zone: document.getElementById("editZone").value,
      branch_name: document.getElementById("editBranch").value,
      branch_id: document.getElementById("editBranchId").value,
      super_name: document.getElementById("editSuperName").value,
      super_id: document.getElementById("editSuperId").value,
      super_designation: superDesig,
      status: document.getElementById("editStatus").value,
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });

    if (!res.ok) throw new Error();

    toast("Updated successfully");
    closeModal();
    init();

  } catch {
    toast("Update failed");
  }
}

//Cancle Edit
document.getElementById("cancelEdit").onclick = closeModal;

//Duplicate
function duplicateEmployee(emp) {
  // open ADD modal
  document.getElementById("addModal").classList.remove("hidden");
  document.getElementById("addTitle").innerText = "📄 Duplicate Employee";

  // fill dropdowns first
  fillAddDropdowns();

  // fill values (copy from selected employee)
  document.getElementById("addEmpId").value = "";
  document.getElementById("addName").value = emp.name || "";

  document.getElementById("addDesig").value = emp.designation || "BM";

  document.getElementById("addState").value = emp.state || "";
  document.getElementById("addZone").value = emp.zone || "";

  document.getElementById("addBranchId").value = emp.branch_id || "";
  document.getElementById("addBranch").value = emp.branch_name || "";

  document.getElementById("addSuperId").value = emp.super_id || "";
  document.getElementById("addSuperName").value = emp.super_name || "";

  filterSuperRoles("addDesig", "addSuperDesig");

  // set super designation if valid
  const superSelect = document.getElementById("addSuperDesig");
 
  if ([...superSelect.options].some(o => o.value === emp.super_designation)) {
    superSelect.value = emp.super_designation;
  }

  document.getElementById("addStatus").value =
    (emp.status || "active").toLowerCase();

  // clear password ALWAYS
  document.getElementById("addPassword").value = "";
}


//Delete
function confirmDelete(emp) {
  const box = document.createElement("div");
  box.className = "modal";

  box.innerHTML = `
    <div class="modal-box delete-box">
      <h3>⚠️ Delete Employee</h3>

      <p class="danger-text">
        Are you sure you want to delete <b>${emp.name}</b>?
      </p>

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
      const url = `https://afplgis.com/api/employees/emp/${emp.employee_id}`;

      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) throw new Error();

      toast("Deleted successfully");
      box.remove();
      init();

    } catch {
      toast("Delete failed");
    }
  };
}

//Add Button
window.addEventListener("load", () => {
  const addBtn = document.getElementById("addBtn");

  if (!addBtn) {
    return;
  }

  addBtn.onclick = () => {
    console.log("Add button clicked");

    const modal = document.getElementById("addModal");
    if (!modal) {
      return;
    }

    document.getElementById("addTitle").innerText = "➕ Add Employee";
    modal.classList.remove("hidden");
    fillAddDropdowns();
  };

});

//Close Add
function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
  document.querySelectorAll("#addModal input").forEach(i => i.value = "");
  document.querySelectorAll("#addModal select").forEach(s => s.selectedIndex = 0);
}

//SaveADD
document.getElementById("saveAdd").onclick = async () => {
  try {

    const empDesig = document.getElementById("addDesig").value;
    const superDesig = document.getElementById("addSuperDesig").value;

    if (!validateHierarchy(empDesig, superDesig)) {
      toast("Employee must be LOWER than Super designation");
      return;
    }

    const payload = {
      employee_id: document.getElementById("addEmpId").value,
      name: document.getElementById("addName").value,
      designation: empDesig,
      state: document.getElementById("addState").value,
      zone: document.getElementById("addZone").value,
      branch_name: document.getElementById("addBranch").value,
      branch_id: document.getElementById("addBranchId").value,

      super_id: document.getElementById("addSuperId").value,
      super_name: document.getElementById("addSuperName").value,
      super_designation: superDesig,

      status: document.getElementById("addStatus").value,
      password: document.getElementById("addPassword").value
    };

    if (!payload.name || !payload.employee_id) {
      toast("Name & Employee ID required");
      return;
}

    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();

    toast("Employee added successfully");
    closeAddModal();
    init();

  } catch (e) {
    toast("Failed to add employee");
  }
};

// dropdown desig ADD
function fillAddDropdowns() {
  const empSelect = document.getElementById("addDesig");

  empSelect.innerHTML = "";

  hierarchy.forEach(d => {
    empSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });

  empSelect.value = "BM";

  filterSuperRoles("addDesig", "addSuperDesig");

  empSelect.onchange = () => {
    filterSuperRoles("addDesig", "addSuperDesig");
  };
}


//Dropdown desig Edit
function fillEditDropdowns(emp) {
  const empSelect = document.getElementById("editDesig");
  const superSelect = document.getElementById("editSuperDesig");

  empSelect.innerHTML = "";

  hierarchy.forEach(d => {
    empSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });

  // set employee role
  empSelect.value = emp.designation;

  // filter based on employee
  filterSuperRoles("editDesig", "editSuperDesig");

  // set super role ONLY if valid
  const exists = [...superSelect.options].some(
    o => o.value === emp.super_designation
  );

  if (exists) {
    superSelect.value = emp.super_designation;
  }

  // dynamic change
  empSelect.onchange = () => {
    filterSuperRoles("editDesig", "editSuperDesig");
  };
}

function validateHierarchy(empDesig, superDesig) {
  return hierarchy.indexOf(empDesig) > hierarchy.indexOf(superDesig);
}

//filter desig
function filterSuperRoles(empSelectId, superSelectId) {
  const empSelect = document.getElementById(empSelectId);
  const superSelect = document.getElementById(superSelectId);

  const selected = empSelect.value;
  const empIndex = hierarchy.indexOf(selected);

  superSelect.innerHTML = "";

  hierarchy.forEach((role, index) => {
    if (index < empIndex) {
      superSelect.innerHTML += `<option value="${role}">${role}</option>`;
    }
  });

  if (superSelect.innerHTML === "") {
    superSelect.innerHTML = `<option value="">No superior</option>`;
  }
}