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
let currentRequest = 0;
let isSubmitting = false;
let suggestionTimer;

/* ---------------- TOAST ---------------- */
function toast(msg, type = "success") {
  const t = document.getElementById("toast");

  t.innerText = msg;

  // remove old type classes
  t.classList.remove("success", "error", "warning");

  // add new type
  t.classList.add(type);

  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2000);
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
    toast("Failed to load data","warning");
  } finally {
    hideLoader();
  }
}

init();

/* ---------------- SEARCH INPUT ---------------- */
input.addEventListener("input", () => {
  clearTimeout(timer);

  const q = input.value;
  showSuggestions(q);

  timer = setTimeout(() => {
    handleSearch(q);
  }, 1000);
});

/* ---------------- SEARCH LOGIC ---------------- */
async function handleSearch(q) {

  q = q.trim();
  const requestId = ++currentRequest;

  // SHOW ALL DATA ONLY FOR ###
  if (q === "###") {
    render(allData);
    return;
  }

  // EMPTY
  if (!q) {
    results.innerHTML = "";
    resultCount.innerText = "Start searching...";
    hideLoader();
    return;
  }

  // Min length
  if (q.length < 3) {
    results.innerHTML = "";
    resultCount.innerText = "Type at least 3 characters...";
    hideLoader();
    return;
  }

  const url = `${API}?search=${encodeURIComponent(q)}`;

  if (cache[url]) {
    const data = cache[url];
    delete cache[url];
    cache[url] = data;

    if (requestId !== currentRequest) return;

    render(data);
    resultCount.innerText = `Showing ${data.length} results`;
    hideLoader();
    return;
  }

  //cache clear
  const keys = Object.keys(cache);
  if (keys.length > 50) {
    delete cache[keys[0]];
  }

  try {
    showLoader();

    const res = await fetch(url);
    const data = await res.json();

    if (requestId !== currentRequest) return;

    cache[url] = Array.isArray(data) ? data : [];

    render(cache[url]);

  } catch (e) {
    toast("API error","warning");
  } finally {
    if (requestId === currentRequest) {
      hideLoader();
    }
  }
}

function isEmpty(val) {
  return !val || val.trim() === "";
}

//must fill all box
function validateAllRequired(ids) {
  for (let id of ids) {
    const el = document.getElementById(id);

    if (!el || isEmpty(el.value)) {
      toast("Please fill all required fields","error");
      if (el) el.focus();
      return false;
    }
  }
  return true;
}

/* ---------------- RENDER ---------------- */
function render(data) {
  results.innerHTML = "";

  const safeData = Array.isArray(data) ? data : [];

  if (!safeData.length) {
    resultCount.innerText = "No results found";
    return;
  }

  const fragment = document.createDocumentFragment();

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

    right.append(edit, copy, del);

    top.append(left, right);

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

    fragment.appendChild(card);
  });

  // results.appendChild(card);
  results.appendChild(fragment);

  resultCount.innerText = `Showing ${safeData.length} results`;
}

/* ---------------- STATS ---------------- */
function updateStats() {
  totalCount.innerText = allData.length;

  activeCount.innerText =
    allData.filter(x =>
      (x.status || "").toLowerCase() === "active"
    ).length;
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
  const s = (status || "").toLowerCase();

  const dot = document.createElement("span");
  dot.className = "status-dot " + (s === "active" ? "green" : "red");
  dot.title = s;

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

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// OpenEdit model
function openEditModal(emp) {
  currentEditEmp = emp;

  const modal = document.getElementById("editModal");

  setTimeout(() => {
    allowNumbers(document.getElementById("editBranchId"));
    allowNumbers(document.getElementById("editSuperId"));

    allowAlphabets(document.getElementById("editName"));
    allowAlphabets(document.getElementById("editSuperName"));

    allowAlphaNumeric(document.getElementById("editState"));
    allowAlphaNumeric(document.getElementById("editZone"));
    allowAlphaNumeric(document.getElementById("editBranch"));
  }, 0);

  modal.innerHTML = `
    <div class="modal-box edit-card">

      <div class="edit-header">
        <h3>✏️ Edit Employee</h3>
        <span class="mini-id">ID: ${escapeHTML(emp.employee_id)}</span>
      </div>

      <div class="edit-grid">

        <div class="field">
          <label>Employee Name</label>
          <input id="editName" value="${escapeHTML(emp.name)}">
        </div>

        <div class="field">
          <label>Employee Designation</label>
          <select id="editDesig"></select>
        </div>

        <div class="field">
          <label>State</label>
          <input id="editState" value="${escapeHTML(emp.state || "")}">
        </div>

        <div class="field">
          <label>Zone</label>
          <input id="editZone" value="${escapeHTML(emp.zone || "")}">
        </div>

        <div class="field">
          <label>Branch ID</label>
          <input id="editBranchId" value="${escapeHTML(emp.branch_id || "")}">
        </div>

        <div class="field">
          <label>Branch Name</label>
          <input id="editBranch" value="${escapeHTML(emp.branch_name || "")}">
        </div>

        <div class="field">
          <label>Super ID</label>
          <input id="editSuperId" value="${escapeHTML(emp.super_id || "")}">
        </div>

        <div class="field">
          <label>Super Name</label>
          <input id="editSuperName" value="${escapeHTML(emp.super_name || "")}">
        </div>

        <div class="field">
          <label>Super Designation</label>
          <select id="editSuperDesig"></select>
        </div>

        <div class="field">
          <label>Employee Status</label>
          <select id="editStatus">
            <option value="active">Active</option>
            <option value="deactive">Deactive</option>
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
  const requiredFields = [
    "editName",
    "editDesig",
    "editState",
    "editZone",
    "editBranch",
    "editBranchId",
    "editSuperId",
    "editSuperName"
  ];

  if (!validateAllRequired(requiredFields)) return;

  try {

    const empDesig = document.getElementById("editDesig").value;
    const superDesig = document.getElementById("editSuperDesig").value;

    if (!validateHierarchy(empDesig, superDesig)) {
      toast("Employee must be LOWER than Super designation","warning");
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

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "API error");
    }

    toast("Updated successfully","success");
    closeModal();
    init();

  } catch {
    toast("Update failed","error");
  }
}


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
        Are you sure you want to delete <b>${escapeHTML(emp.name)}</b>?
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

      toast("Deleted successfully","success");
      box.remove();
      init();

    } catch {
      toast("Delete failed","error");
    }
  };
}

//Add Button
document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addBtn");

  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    document.getElementById("addTitle").innerText = "➕ Add Employee";
    document.getElementById("addModal").classList.remove("hidden");
    fillAddDropdowns();
  });
});

//Close Add
function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
  document.querySelectorAll("#addModal input").forEach(i => i.value = "");
  document.querySelectorAll("#addModal select").forEach(s => s.selectedIndex = 0);
}

//SaveADD
const saveAddBtn = document.getElementById("saveAdd");

if (saveAddBtn) {
  saveAddBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const requiredFields = [
      "addEmpId",
      "addName",
      "addDesig",
      "addSuperId",
      "addSuperName",
      "addState",
      "addZone",
      "addBranch",
      "addBranchId",
      "addPassword"
    ];

  if (!validateAllRequired(requiredFields)) return;

    isSubmitting = true;
    saveAddBtn.disabled = true;

    try {
      const empDesig = document.getElementById("addDesig").value;
      const superDesig = document.getElementById("addSuperDesig").value;

      if (!validateHierarchy(empDesig, superDesig)) {
        toast("Employee must be LOWER than Super designation","warning");
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

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();

      toast("Employee added successfully","success");
      closeAddModal();
      init();

    } catch (e) {
      toast("Failed to add employee","error");
    }
    finally {
      isSubmitting = false;
      saveAddBtn.disabled = false;
    }
  });
}

// dropdown desig ADD
function fillAddDropdowns() {
  const empSelect = document.getElementById("addDesig");

  empSelect.innerHTML = "";
  setTimeout(() => {
    allowNumbers(document.getElementById("addEmpId"));
    allowNumbers(document.getElementById("addBranchId"));
    allowNumbers(document.getElementById("addSuperId"));

    allowAlphabets(document.getElementById("addName"));
    allowAlphabets(document.getElementById("addSuperName"));

    allowAlphaNumeric(document.getElementById("addState"));
    allowAlphaNumeric(document.getElementById("addZone"));
    allowAlphaNumeric(document.getElementById("addBranch"));
  }, 0);
  const fragment = document.createDocumentFragment();

    [...hierarchy].reverse().forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    fragment.appendChild(opt);
  });

  empSelect.appendChild(fragment);

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

  const fragment = document.createDocumentFragment();

    [...hierarchy].reverse().forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    fragment.appendChild(opt);
  });

  empSelect.appendChild(fragment);

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

  [...hierarchy]
    .map((role, index) => ({ role, index }))
    .filter(x => x.index < empIndex)
    .reverse()
    .forEach(x => {
      superSelect.innerHTML += `<option value="${x.role}">${x.role}</option>`;
    });

  if (superSelect.innerHTML === "") {
    superSelect.innerHTML = `<option value="">No superior</option>`;
  }
}


// numbers only
function allowNumbers(el) {
  el.addEventListener("input", () => {
    el.value = el.value.replace(/\D/g, "");
  });
}

// alphabets + space only
function allowAlphabets(el) {
  el.addEventListener("input", () => {
    el.value = el.value.replace(/[^a-zA-Z\s]/g, "");
  });
}

// alphanumeric
function allowAlphaNumeric(el) {
  el.addEventListener("input", () => {
    el.value = el.value
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/-+/g, "-");
  });
}


const suggestionsBox = document.getElementById("suggestions");

function showSuggestions(q) {
  const query = q.toLowerCase();

  if (query.length < 2) {
    suggestionsBox.style.display = "none";
    return;
  }

  const matches = allData
    .filter(emp =>
      (emp.name || "").toLowerCase().includes(query) ||
      (emp.employee_id || "").toString().includes(query)
    )
    .slice(0, 6);

  suggestionsBox.innerHTML = "";

  if (!matches.length) {
    suggestionsBox.style.display = "none";
    return;
  }

  matches.forEach(emp => {
    const item = document.createElement("div");
    item.textContent = `${emp.name} (${emp.employee_id})`;

    item.onclick = () => {
      input.value = emp.name;
      suggestionsBox.style.display = "none";
      handleSearch(emp.name);
    };

    suggestionsBox.appendChild(item);
  });

  suggestionsBox.style.display = "block";
}

//suggestion
function showSuggestions(q) {
  clearTimeout(suggestionTimer);

  const query = q.trim();

  if (query.length < 3 || !/^\d+$/.test(query)) {
    suggestionsBox.style.display = "none";
    return;
  }

  const matches = allData
    .filter(emp => (emp.employee_id || "").toString().includes(query))
    .slice(0, 6);

  suggestionsBox.innerHTML = "";

  if (!matches.length) {
    suggestionsBox.style.display = "none";
    return;
  }

  matches.forEach(emp => {
    const item = document.createElement("div");
    item.textContent = `${emp.employee_id} - ${emp.name || "-"}`;

    item.onclick = () => {
      input.value = emp.employee_id;
      suggestionsBox.style.display = "none";
      handleSearch(emp.employee_id);
    };

    suggestionsBox.appendChild(item);
  });

  suggestionsBox.style.display = "block";

  suggestionTimer = setTimeout(() => {
    suggestionsBox.style.display = "none";
  }, 3000);
}