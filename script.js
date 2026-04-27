const API = "https://afplgis.com/api/employees";

const input = document.getElementById("searchInput");
const results = document.getElementById("results");

const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const resultCount = document.getElementById("resultCount");
const loader = document.getElementById("loader");

let timer;
let cache = {};
let allData = [];

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

  // ✅ SHOW ALL DATA ONLY FOR ###
  if (q === "###") {
    render(allData);
    return;
  }

  // ❌ EMPTY INPUT → CLEAR SCREEN
  if (!q) {
    results.innerHTML = "";
    resultCount.innerText = "Start searching...";
    return;
  }

  // ❌ LESS THAN 3 CHARS → MESSAGE ONLY
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
function render(data) {

  const safeData = Array.isArray(data) ? data : [];

  results.innerHTML = "";

  if (safeData.length === 0) {
    resultCount.innerText = "No results found";
    return;
  }

  safeData.forEach(emp => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${emp.name || "-"}</h3>
      <p><b>ID:</b> ${emp.employee_id}</p>
      <p><b>State:</b> ${emp.state}</p>
      <p><b>Zone:</b> ${emp.zone}</p>
      <p><b>Branch:</b> ${emp.branch_name}</p>
      <span class="badge">${emp.status}</span>
    `;

    results.appendChild(div);
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