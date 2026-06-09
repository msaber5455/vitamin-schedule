// ============================================================
//  SCHEDULE DATA
// ============================================================
const SCHEDULE = {
  phase12: {  // Month 1 & 2 – Activation Phase
    breakfast: [
      { name: "Limitless Man", type: "قرص" },
      { name: "Limitless B-Complex ODF", type: "شريط" },
      { name: "Vantirect", type: "قرص" },
      { name: "Korean Red Ginseng", type: "كبسولة" },
      { name: "Ginkgo Biloba", type: "كبسولة" },
    ],
    lunch: [
      { name: "Omega 3", type: "كبسولة" },
      { name: "Ossofortin D3", type: "كبسولة", altDay: true },
      { name: "Maca 1000", type: "كبسولة" },
    ],
    sleep: [
      { name: "Ashwagandha 600", type: "كبسولة" },
    ],
  },
  phase3: {   // Month 3 – Stabilization Phase
    breakfast: [
      { name: "Limitless Man", type: "قرص" },
      { name: "Limitless B-Complex", type: "شريط" },
      { name: "Limitless Power Max", type: "" },
      { name: "Tongkat Ali", type: "كبسولتين – صباحاً فقط" },
      { name: "Omega 3", type: "كبسولة" },
    ],
    lunch: [
      { name: "Ossofortin D3", type: "كبسولة", altDay: true },
      { name: "Netalopalm", type: "" },
      { name: "Tribxon", type: "اكسفورزيم" },
    ],
    sleep: [
      { name: "Ashwagandha 600", type: "اختياري لو حبيت" },
    ],
  },
};

const TIMINGS = [
  { key: "breakfast", label: "☀️ بعد الفطار", cls: "timing-breakfast" },
  { key: "lunch", label: "🍽️ بعد الغداء", cls: "timing-lunch" },
  { key: "sleep", label: "🌙 قبل النوم", cls: "timing-sleep" },
];

// ============================================================
//  STATE
// ============================================================
let state = {
  startDate: null,   // ISO string YYYY-MM-DD
  records: {},       // { "YYYY-MM-DD": { "breakfast:PillName": true/false, ... } }
  viewDate: null,    // ISO string YYYY-MM-DD currently being viewed
};

// ============================================================
//  INIT
// ============================================================
window.onload = () => {
  loadState();

  if (state.startDate) {
    document.getElementById("setupCard").classList.add("hidden");
    state.viewDate = todayISO();
    renderTracker();
  } else {
    // Pre-fill date input with today
    document.getElementById("startDate").value = todayISO();
  }
};

// ============================================================
//  HELPERS
// ============================================================
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(iso1, iso2) {
  return Math.round((isoToDate(iso2) - isoToDate(iso1)) / 86400000);
}

function formatArabicDate(iso) {
  return isoToDate(iso).toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

function getPhase(dayNumber) {
  // dayNumber is 1-indexed. Months 1&2 ≈ days 1-60, month 3 ≈ day 61+
  if (dayNumber <= 60) return "phase12";
  return "phase3";
}

function getPhaseLabel(phase) {
  return phase === "phase12"
    ? "الشهر الأول والثاني – مرحلة التنشيط"
    : "الشهر الثالث – مرحلة التثبيت";
}

function pillKey(timing, name) {
  return `${timing}:${name}`;
}

function getPillsForDay(dayNumber) {
  return SCHEDULE[getPhase(dayNumber)];
}

// Returns schedule with altDay pills removed on even days
function getPillsForDayFiltered(dayNumber) {
  const raw = SCHEDULE[getPhase(dayNumber)];
  const isAltDay = dayNumber % 2 === 1;  // odd days = take altDay pills
  const filtered = {};
  TIMINGS.forEach(t => {
    filtered[t.key] = raw[t.key].filter(p => !p.altDay || isAltDay);
  });
  return filtered;
}

function totalPills(pills) {
  return TIMINGS.reduce((acc, t) => acc + pills[t.key].length, 0);
}

// ============================================================
//  STATE PERSISTENCE
// ============================================================
function saveState() {
  localStorage.setItem("vitaminState", JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem("vitaminState");
  if (raw) {
    try { state = JSON.parse(raw); } catch (e) { }
  }
}

// ============================================================
//  ACTIONS
// ============================================================
function startCourse() {
  const val = document.getElementById("startDate").value;
  if (!val) { showToast("❗ اختار تاريخ البداية"); return; }
  state.startDate = val;
  state.records = {};
  state.viewDate = todayISO();
  saveState();
  document.getElementById("setupCard").classList.add("hidden");
  renderTracker();
  showToast("✅ تم البدء! يلا نبدأ!");
}

function resetCourse() {
  if (!confirm("هتمسح كل السجل وتبدأ من أول؟")) return;
  state.startDate = null;
  state.records = {};
  state.viewDate = null;
  saveState();
  document.getElementById("trackerSection").classList.add("hidden");
  document.getElementById("setupCard").classList.remove("hidden");
  document.getElementById("startDate").value = todayISO();
  showToast("🔄 تم إعادة الضبط");
}

function changeDay(delta) {
  const newDate = new Date(isoToDate(state.viewDate));
  newDate.setDate(newDate.getDate() + delta);
  const y = newDate.getFullYear();
  const m = String(newDate.getMonth() + 1).padStart(2, "0");
  const day = String(newDate.getDate()).padStart(2, "0");
  const newISO = `${y}-${m}-${day}`;
  // Don't go before start date
  if (newISO < state.startDate) { showToast("⛔ لا يوجد أيام قبل البداية"); return; }
  state.viewDate = newISO;
  renderTracker();
}

function togglePill(timing, name) {
  const dateKey = state.viewDate;
  if (!state.records[dateKey]) state.records[dateKey] = {};
  const k = pillKey(timing, name);
  state.records[dateKey][k] = !state.records[dateKey][k];
  // Immediate auto-save
  saveState();
  // Re-render pills and progress only
  renderPills();
  renderProgress();
  renderHistory();
}

function saveDay() {
  saveState();
  showToast("💾 تم الحفظ!");
}

// ============================================================
//  RENDER
// ============================================================
function renderTracker() {
  document.getElementById("trackerSection").classList.remove("hidden");
  renderInfoBar();
  renderNavBar();
  renderProgress();
  renderPills();
  renderHistory();
}

function renderInfoBar() {
  const dayNum = diffDays(state.startDate, state.viewDate) + 1;
  const phase = getPhase(dayNum);

  document.getElementById("todayDisplay").textContent = formatArabicDate(todayISO());
  document.getElementById("dayNumber").textContent = `اليوم ${dayNum}`;
  document.getElementById("phaseText").textContent = getPhaseLabel(phase);

  const badge = document.getElementById("phaseBadge");
  badge.className = "info-item phase-badge" + (phase === "phase3" ? " phase3" : "");
}

function renderNavBar() {
  document.getElementById("navDate").textContent = formatArabicDate(state.viewDate);
}

function renderProgress() {
  const dayNum = diffDays(state.startDate, state.viewDate) + 1;
  const pills = getPillsForDayFiltered(dayNum);
  const total = totalPills(pills);
  const rec = state.records[state.viewDate] || {};
  let done = 0;
  TIMINGS.forEach(t => {
    pills[t.key].forEach(p => {
      if (rec[pillKey(t.key, p.name)]) done++;
    });
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("progressText").textContent = `${done} / ${total} مكتمل`;
  document.getElementById("progressPct").textContent = `${pct}%`;
  document.getElementById("progressFill").style.width = pct + "%";
}

function renderPills() {
  const dayNum = diffDays(state.startDate, state.viewDate) + 1;
  const pills = getPillsForDayFiltered(dayNum);
  const rec = state.records[state.viewDate] || {};

  const container = document.getElementById("pillSections");
  container.innerHTML = "";

  TIMINGS.forEach(t => {
    const section = document.createElement("div");
    section.className = "timing-section";

    // Header
    const header = document.createElement("div");
    header.className = `timing-header ${t.cls}`;
    header.innerHTML = `<span>${t.label}</span>`;
    section.appendChild(header);

    // Pills list
    const list = document.createElement("div");
    list.className = "pills-list";

    pills[t.key].forEach(p => {
      const k = pillKey(t.key, p.name);
      const checked = !!rec[k];

      const item = document.createElement("div");
      item.className = "pill-item" + (checked ? " checked" : "");
      item.onclick = () => togglePill(t.key, p.name);

      item.innerHTML = `
        <div class="pill-checkbox">${checked ? "✓" : ""}</div>
        <div class="pill-info">
          <div class="pill-name">${p.name}</div>
          ${p.type ? `<div class="pill-type">${p.type}</div>` : ""}
        </div>
      `;
      list.appendChild(item);
    });

    section.appendChild(list);
    container.appendChild(section);
  });
}

function renderHistory() {
  const grid = document.getElementById("historyGrid");
  grid.innerHTML = "";

  // Show all logged days + today, sorted
  const days = new Set(Object.keys(state.records));
  days.add(todayISO());
  const sorted = [...days].filter(d => d >= state.startDate).sort();

  if (sorted.length === 0) {
    grid.innerHTML = `<p style="color:#9ca3af;font-size:0.85rem;">لا يوجد سجل بعد</p>`;
    return;
  }

  sorted.forEach(iso => {
    const dayNum = diffDays(state.startDate, iso) + 1;
    const pills = getPillsForDayFiltered(dayNum);
    const total = totalPills(pills);
    const rec = state.records[iso] || {};
    let done = 0;
    TIMINGS.forEach(t => {
      pills[t.key].forEach(p => { if (rec[pillKey(t.key, p.name)]) done++; });
    });
    const pct = total ? Math.round((done / total) * 100) : 0;

    let pctCls = "pct-none";
    if (pct === 100) pctCls = "pct-full";
    else if (pct >= 70) pctCls = "pct-high";
    else if (pct >= 40) pctCls = "pct-mid";
    else if (pct > 0) pctCls = "pct-low";

    const isToday = iso === todayISO();
    const isViewing = iso === state.viewDate;

    const el = document.createElement("div");
    el.className = "hist-day" + (isViewing ? " today-hist" : "");
    el.title = formatArabicDate(iso);
    el.onclick = () => { state.viewDate = iso; renderTracker(); };

    const shortDate = isoToDate(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" });

    el.innerHTML = `
      <div class="hist-date-txt">${isToday ? "اليوم" : shortDate}</div>
      <div class="hist-pct ${pctCls}">${pct}%</div>
      <div style="font-size:0.7rem;color:#6b7280">يوم ${dayNum}</div>
    `;
    grid.appendChild(el);
  });
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}
