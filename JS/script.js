const searchBar = document.getElementById("searchBar");
const suggestionsBox = document.getElementById("suggestionsBox");

let searchEngine = "DEF";

const engineButtons = document.querySelectorAll(".searchEngines .engine");
const saveEngineBtn = document.getElementById("saveEngineBtn");

const ENGINE_KEY = "preferredEngine";
const SAVE_KEY = "saveEngineEnabled";

let isEngineSaveEnabled = localStorage.getItem(SAVE_KEY) === "true";

function updateSaveEngineBtnUI() {
  if (!saveEngineBtn) return;
  saveEngineBtn.classList.toggle("active", isEngineSaveEnabled);
  saveEngineBtn.setAttribute("aria-pressed", isEngineSaveEnabled);
  const label = saveEngineBtn.querySelector(".save-btn-label");
  if (label) {
    label.textContent = isEngineSaveEnabled ? "Engine Saved" : "Save Engine";
  }
  saveEngineBtn.title = isEngineSaveEnabled
    ? "Auto-saving search engine (click to disable)"
    : "Click to save selected search engine as default";
}

(function initEngine() {
  updateSaveEngineBtnUI();

  if (isEngineSaveEnabled) {
    const saved = localStorage.getItem(ENGINE_KEY);
    if (saved) {
      setEngine(saved);
      return;
    }
  }

  setEngine("DEF");
})();

engineButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setEngine(btn.id);
    if (isEngineSaveEnabled) {
      localStorage.setItem(ENGINE_KEY, btn.id);
    }
  });
});

function setEngine(id) {
  searchEngine = id;
  engineButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.id === id);
  });
}

function hasSpace(text) {
  return /\s/.test(text);
}

function looksLikeURL(text) {
  const q = text.toLowerCase().trim();

  // Space → always search
  if (hasSpace(q)) return false;

  // Protocol already exists
  if (q.startsWith("http://") || q.startsWith("https://")) return true;

  // localhost
  if (q.startsWith("localhost")) return true;

  // IP address (with optional port)
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(q)) return true;

  // Domain pattern (ANY extension)
  // example: abc.xyz, site.technology, my-site.dev, test.ai
  const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i;

  return domainRegex.test(q);
}

function normalizeURL(text) {
  if (!text.startsWith("http://") && !text.startsWith("https://")) {
    return "https://" + text;
  }
  return text;
}

saveEngineBtn?.addEventListener("click", () => {
  isEngineSaveEnabled = !isEngineSaveEnabled;
  localStorage.setItem(SAVE_KEY, isEngineSaveEnabled);
  if (isEngineSaveEnabled) {
    localStorage.setItem(ENGINE_KEY, searchEngine);
  } else {
    localStorage.removeItem(ENGINE_KEY);
  }
  updateSaveEngineBtnUI();
});

window.handleSuggestions = function (data) {
  let suggestions = [];
  
  // Parse DuckDuckGo's format
  if (Array.isArray(data) && data.length > 0 && data[0].phrase) {
    suggestions = data.map(item => item.phrase);
  } 
  // Google Suggest / OpenSearch formats
  else if (data && Array.isArray(data[1])) {
    suggestions = data[1].map(item => Array.isArray(item) ? item[0] : item);
  }
  
  suggestionsBox.innerHTML = "";
  if (suggestions.length) {
    suggestionsBox.style.display = "flex";
    suggestions.slice(0, 6).forEach((s) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = s;
      div.onclick = () => {
        searchBar.value = s;
        searchBar.dispatchEvent(new Event("input"));
        suggestionsBox.style.display = "none";
      };
      suggestionsBox.appendChild(div);
    });
  } else {
    suggestionsBox.style.display = "none";
  }
};

let suggestionDebounceTimer;
searchBar.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (!q) {
    suggestionsBox.style.display = "none";
    return;
  }

  clearTimeout(suggestionDebounceTimer);
  suggestionDebounceTimer = setTimeout(() => {
    // Remove any previously pending JSONP scripts
    const oldScript = document.getElementById("jsonp-suggestion-script");
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement("script");
    script.id = "jsonp-suggestion-script";
    
    // Google Suggest API
    script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}&callback=handleSuggestions`;
    
    document.body.appendChild(script);
    
    script.onload = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, 300); // 300ms debounce
});

searchBar.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    search(searchEngine);
  }
});

//Engine Selection Logic
const engines = document.querySelectorAll(".engine");
engines.forEach((engine) => {
  engine.addEventListener("click", () => {
    engines.forEach((e) => {
      e.classList.remove("active");
    });

    engine.classList.add("active");
  });
});

// Toast Notification Helper
function showDashboardToast(message, iconSvg = null) {
  let toast = document.getElementById("dashboardToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "dashboardToast";
    toast.className = "dashboard-toast";
    document.body.appendChild(toast);
  }

  const defaultIcon = iconSvg || `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      <path d="m9 14 2 2 4-4"></path>
    </svg>
  `;

  toast.innerHTML = `
    <div class="dashboard-toast-icon">${defaultIcon}</div>
    <div class="dashboard-toast-content">${message}</div>
  `;

  toast.classList.add("show");

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}

//Main Search Function
function search() {
  const query = document.getElementById("searchBar").value.trim();
  if (!query) return;

  const encodedQuery = encodeURIComponent(query);
  const activeEngine = document.querySelector(".engine.active").id;

  // 🌐 SMART DIRECT OPEN (ANY EXTENSION)
  if (looksLikeURL(query)) {
    const finalURL = normalizeURL(query);
    window.open(finalURL, "_blank", "noopener,noreferrer");
    return;
  }

  // 🔎 SEARCH ENGINE FLOW
  let url = "";

  const copyAndOpen = (targetUrl, serviceName = "Gemini") => {
    const isMac = navigator.userAgent.includes("Mac") || (navigator.platform && navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    const keyCombo = isMac ? "<kbd>⌘</kbd> + <kbd>V</kbd>" : "<kbd>Ctrl</kbd> + <kbd>V</kbd>";

    showDashboardToast(`Prompt copied! Press ${keyCombo} to paste in ${serviceName} (Opening in 2s...)`);

    navigator.clipboard
      .writeText(query)
      .catch(() => {});

    setTimeout(() => {
      window.open(targetUrl, "_blank");
    }, 2000);
  };

  switch (activeEngine) {
    case "GPT":
      url = `https://chatgpt.com/?prompt=${encodedQuery}`;
      break;

    case "PERP":
      url = `https://www.perplexity.ai/search?q=${encodedQuery}`;
      break;

    case "GEM":
      copyAndOpen("https://gemini.google.com/app", "Gemini");
      return;

    case "CLAUDE":
      copyAndOpen("https://claude.ai/new", "Claude");
      return;

    case "yt":
      url = `https://www.youtube.com/results?search_query=${encodedQuery}`;
      break;

    case "WKP":
      url = `https://en.wikipedia.org/wiki/${encodedQuery}`;
      break;

    case "MDN":
      url = `https://developer.mozilla.org/en-US/search?q=${encodedQuery}`;
      break;

    case "DEF":
    default:
      url = `https://www.google.com/search?q=${encodedQuery}`;
      break;
  }

  window.open(url, "_blank");
}

//Enter Key Event Listener
document.getElementById("searchBar").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    search();
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper"))
    suggestionsBox.style.display = "none";
});

// Placeholder Typing Effect
const placeholderTexts = [
  "> Enter command",
  "Search the Grid",
  "Execute search",
  "Type to find anything",
];

let pIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimeout = null;

const typingSpeed = 80;
const deletingSpeed = 50;
const pauseAfterType = 1200;
const pauseAfterDelete = 400;

function typePlaceholder() {
  const userTyping =
    searchBar === document.activeElement && searchBar.value !== "";

  const currentText = placeholderTexts[pIndex];

  if (!userTyping) {
    if (!isDeleting) {
      searchBar.placeholder = currentText.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex === currentText.length) {
        setTimeout(() => (isDeleting = true), pauseAfterType);
      }
    } else {
      searchBar.placeholder = currentText.slice(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        pIndex = (pIndex + 1) % placeholderTexts.length;
        setTimeout(() => {}, pauseAfterDelete);
      }
    }
  }

  typingTimeout = setTimeout(
    typePlaceholder,
    isDeleting ? deletingSpeed : typingSpeed,
  );
}

// Restart animation when input is cleared
searchBar.addEventListener("input", () => {
  if (searchBar.value === "") {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(typePlaceholder, 300);
  }
});

typePlaceholder();

// Clock & Quotes
const clockTimeEl = document.getElementById("clockTime");
const clockDateEl = document.getElementById("clockDate");

function updateClock() {
  if (typeof activeWidgets !== "undefined" && !activeWidgets.includes(".widget-clock")) return;
  const now = new Date();
  if (clockTimeEl) clockTimeEl.textContent = now.toLocaleTimeString();
  if (clockDateEl) clockDateEl.textContent = now.toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" },
  );
}
setInterval(updateClock, 1000);
updateClock();

const motivText = document.getElementById("motivQuote");
const quotes = [
  "Dream Big",
  "Stay Focused",
  "Never Quit",
  "Keep Going",
  "Be Brave",
  "Believe Yourself",
];
setInterval(() => {
  if (typeof activeWidgets !== "undefined" && !activeWidgets.includes(".widget-quote")) return;
  if (motivText) motivText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}, 10000);

// =========================================================================
// QUICK NOTES
// =========================================================================
const notesArea = document.getElementById("quickNotes");
if (notesArea) {
  notesArea.value = localStorage.getItem("dashboard_notes") || "";
  notesArea.addEventListener("input", () => {
    localStorage.setItem("dashboard_notes", notesArea.value);
  });
}

// =========================================================================
// TASBEEH COUNTER
// =========================================================================
const tasbeehCount = document.getElementById("tasbeehCount");
const tasbeehBtn = document.getElementById("tasbeehBtn");
const tasbeehReset = document.getElementById("tasbeehReset");

let currentTasbeeh = parseInt(localStorage.getItem("dashboard_tasbeeh") || "0");
if (tasbeehCount) tasbeehCount.innerText = currentTasbeeh;

if (tasbeehBtn) {
  tasbeehBtn.addEventListener("click", () => {
    currentTasbeeh++;
    tasbeehCount.innerText = currentTasbeeh;
    localStorage.setItem("dashboard_tasbeeh", currentTasbeeh);
  });
}

if (tasbeehReset) {
  tasbeehReset.addEventListener("click", () => {
    currentTasbeeh = 0;
    tasbeehCount.innerText = currentTasbeeh;
    localStorage.setItem("dashboard_tasbeeh", currentTasbeeh);
  });
}

// =========================================================================
// PRAYER TIMES TRACKER
// =========================================================================
const defaultPrayers = {
  Fajr: "05:15",
  Dohr: "13:30",
  Asr: "17:15",
  Maghrib: "18:32",
  Isha: "20:30",
};
let prayerTimes =
  JSON.parse(localStorage.getItem("dashboard_prayers")) || defaultPrayers;
const pNames = ["Fajr", "Dohr", "Asr", "Maghrib", "Isha"];

function initPrayerTimes() {
  pNames.forEach((p) => {
    const timeDisplay = document.getElementById(`time-${p}`);
    if (timeDisplay) {
      const parts = prayerTimes[p].split(":");
      let h = parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? "pm" : "am";
      h = h % 12 || 12;
      timeDisplay.innerText = `${h}:${m} ${ampm}`;
    }
    const setInput = document.getElementById(`set${p}`);
    if (setInput) setInput.value = prayerTimes[p];
  });
}

const savePrayersBtn = document.getElementById("savePrayersBtn");
if (savePrayersBtn) {
  savePrayersBtn.addEventListener("click", () => {
    pNames.forEach((p) => {
      const v = document.getElementById(`set${p}`).value;
      if (v) prayerTimes[p] = v;
    });
    localStorage.setItem("dashboard_prayers", JSON.stringify(prayerTimes));
    initPrayerTimes();
    updatePrayerTracker();
  });
}

// Cache DOM elements for Prayer Tracker
const prayerNodes = {
  Fajr: document.getElementById("node-Fajr"),
  Dohr: document.getElementById("node-Dohr"),
  Asr: document.getElementById("node-Asr"),
  Maghrib: document.getElementById("node-Maghrib"),
  Isha: document.getElementById("node-Isha")
};
const countdownEl = document.getElementById("prayerCountdownTime");
const widgetPrayer = document.querySelector(".widget-prayer");
const prayerProgressEl = document.getElementById("prayerProgress");

function updatePrayerTracker() {
  if (typeof activeWidgets !== "undefined" && !activeWidgets.includes(".widget-prayer")) return;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSecondsTotal = currentMinutes * 60 + now.getSeconds();

  let nextPrayer = null;
  let nextPrayerSeconds = 0;

  for (let i = 0; i < pNames.length; i++) {
    const p = pNames[i];
    const parts = prayerTimes[p].split(":");
    const pSecsTotal = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 60;

    const node = prayerNodes[p];
    
    // Only update classes if they changed to avoid Layout Thrashing
    let desiredClass = "t-node";

    if (pSecsTotal > currentSecondsTotal && !nextPrayer) {
      nextPrayer = p;
      nextPrayerSeconds = pSecsTotal;
      desiredClass = "t-node active";
    } else if (pSecsTotal <= currentSecondsTotal) {
      desiredClass = "t-node passed";
    }
    
    if (node && node.className !== desiredClass) {
      node.className = desiredClass;
    }
  }

  if (!nextPrayer) {
    nextPrayer = "Fajr";
    const parts = prayerTimes["Fajr"].split(":");
    nextPrayerSeconds =
      24 * 3600 + (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 60;
    const node = prayerNodes["Fajr"];
    if (node && node.className !== "t-node active") {
      node.className = "t-node active";
    }
  }

  const diff = nextPrayerSeconds - currentSecondsTotal;
  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");

  if (countdownEl) {
    countdownEl.innerText = `${h} : ${m} : ${s}`;

    const isAlert = diff <= 1200 && diff > 0;
    if (isAlert) {
      if (!countdownEl.classList.contains("prayer-alert-text")) countdownEl.classList.add("prayer-alert-text");
      if (widgetPrayer && !widgetPrayer.classList.contains("prayer-alert-glow")) widgetPrayer.classList.add("prayer-alert-glow");
    } else {
      if (countdownEl.classList.contains("prayer-alert-text")) countdownEl.classList.remove("prayer-alert-text");
      if (widgetPrayer && widgetPrayer.classList.contains("prayer-alert-glow")) widgetPrayer.classList.remove("prayer-alert-glow");
    }
  }

  const activeIdx = pNames.indexOf(nextPrayer);
  let pct = 0;
  if (activeIdx === 0) pct = 5;
  else if (activeIdx === 1) pct = 28;
  else if (activeIdx === 2) pct = 50;
  else if (activeIdx === 3) pct = 73;
  else if (activeIdx === 4) pct = 95;

  if (
    currentSecondsTotal >
    (parseInt(prayerTimes["Isha"].split(":")[0]) * 60 +
      parseInt(prayerTimes["Isha"].split(":")[1])) *
      60
  ) {
    pct = 100;
  }

  if (prayerProgressEl) prayerProgressEl.style.width = pct + "%";
}

setInterval(updatePrayerTracker, 1000);
initPrayerTimes();
updatePrayerTracker();

// Stopwatch
const STOPWATCH_KEY = "hud_stopwatch_state";
let stopwatchInterval = null;
let stopwatchSeconds = 0;
let stopwatchRunning = false;

const spinnerRing = document.querySelector(".spinner-ring");
const swStartBtn = document.getElementById("swStart");
const swResetBtn = document.getElementById("swReset");

const stopwatchTimeEl = document.getElementById("stopwatchTime");

function updateStopwatchDisplay() {
  if (typeof activeWidgets !== "undefined" && !activeWidgets.includes(".widget-stopwatch")) return;
  
  const h = String(Math.floor(stopwatchSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((stopwatchSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(stopwatchSeconds % 60).padStart(2, "0");
  if (stopwatchTimeEl) stopwatchTimeEl.textContent = `${h}:${m}:${s}`;
}

function updateStartButtonText() {
  if (stopwatchRunning) swStartBtn.textContent = "Pause";
  else if (stopwatchSeconds > 0) swStartBtn.textContent = "Resume";
  else swStartBtn.textContent = "Start";
}

function saveStopwatchState() {
  localStorage.setItem(
    STOPWATCH_KEY,
    JSON.stringify({
      seconds: stopwatchSeconds,
      running: stopwatchRunning,
    }),
  );
}

function loadStopwatchState() {
  const saved = localStorage.getItem(STOPWATCH_KEY);
  if (!saved) {
    updateStopwatchDisplay();
    updateStartButtonText();
    return;
  }
  const data = JSON.parse(saved);
  stopwatchSeconds = data.seconds || 0;
  stopwatchRunning = false;
  updateStopwatchDisplay();
  updateStartButtonText();
}

function startTimer() {
  stopwatchRunning = true;
  spinnerRing.classList.add("running");
  stopwatchInterval = setInterval(() => {
    stopwatchSeconds++;
    updateStopwatchDisplay();
    saveStopwatchState();
  }, 1000);
  updateStartButtonText();
}

function pauseTimer() {
  stopwatchRunning = false;
  clearInterval(stopwatchInterval);
  spinnerRing.classList.remove("running");
  saveStopwatchState();
  updateStartButtonText();
}

function resetTimer() {
  clearInterval(stopwatchInterval);
  stopwatchSeconds = 0;
  stopwatchRunning = false;
  spinnerRing.classList.remove("running");
  updateStopwatchDisplay();
  updateStartButtonText();
  localStorage.removeItem(STOPWATCH_KEY);
}

swStartBtn.addEventListener("click", () => {
  stopwatchRunning ? pauseTimer() : startTimer();
});
swResetBtn.addEventListener("click", resetTimer);

loadStopwatchState();

// =========================================================================
// SALAH DAILY TRACKER — GitHub-style heatmap
// =========================================================================
(function initSalahTracker() {
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const STORAGE_KEY = "dashboard_salah_history"; // { "2026-03-27": { Fajr:true, ... } }
  const DAYS_SHOWN = 28; // 4 weeks back

  // ---- Helpers ----
  function dateKey(d) {
    // "YYYY-MM-DD"
    return d.toISOString().slice(0, 10);
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveHistory(h) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  }

  let history = loadHistory();

  // ---- Migrate old format if present ----
  const legacyRaw = localStorage.getItem("dashboard_salah");
  if (legacyRaw && !history[todayKey()]) {
    try {
      const legacy = JSON.parse(legacyRaw);
      const legKey = dateKey(new Date(legacy.date));
      if (legacy.done && Object.keys(legacy.done).length > 0) {
        history[legKey] = legacy.done;
        saveHistory(history);
      }
      localStorage.removeItem("dashboard_salah");
    } catch (e) {}
  }

  // ---- Today's state (live) ----
  function todayDone() {
    return history[todayKey()] || {};
  }

  function setTodayPrayer(prayer, val) {
    if (!history[todayKey()]) history[todayKey()] = {};
    history[todayKey()][prayer] = val;
    saveHistory(history);
    document.dispatchEvent(new CustomEvent("salahStateChanged"));
  }

  // ---- Render Heatmap ----
  function renderHeatmap() {
    const grid = document.getElementById("salahHeatmapGrid");
    if (!grid) return;
    grid.innerHTML = "";

    // Build list of last DAYS_SHOWN days (oldest → newest)
    const days = [];
    for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(dateKey(d));
    }

    // Grid: 5 rows (one per prayer) × DAYS_SHOWN columns
    // We render column-by-column (day by day), each column is a flex column of 5 cells
    days.forEach((dk) => {
      const col = document.createElement("div");
      col.className = "salah-heatmap-col";

      const dayData = history[dk] || {};
      const isToday = dk === todayKey();

      prayers.forEach((p) => {
        const cell = document.createElement("div");
        cell.className = "salah-heatmap-cell";
        const done = !!dayData[p];
        if (done) cell.classList.add("done");
        if (isToday) cell.classList.add("today");

        // Tooltip
        const dateLabel = new Date(dk + "T12:00:00").toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        );
        cell.title = `${p} · ${dateLabel} · ${done ? "✓ Prayed" : "✗ Missed"}`;

        col.appendChild(cell);
      });

      grid.appendChild(col);
    });
  }

  // ---- Apply Checklist UI for today ----
  function applyChecklistUI() {
    const done = todayDone();
    prayers.forEach((p) => {
      const btn = document.getElementById("salah-" + p);
      const item = btn?.closest(".salah-item");
      if (!item) return;
      item.classList.toggle("done", !!done[p]);
    });
  }

  // ---- Wire prayer check buttons ----
  prayers.forEach((p) => {
    const btn = document.getElementById("salah-" + p);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const cur = !!todayDone()[p];
      setTodayPrayer(p, !cur);
      applyChecklistUI();
      renderHeatmap();
    });
  });

  // ---- Reset today ----
  const salahResetBtn = document.getElementById("salahResetBtn");
  if (salahResetBtn) {
    salahResetBtn.addEventListener("click", () => {
      history[todayKey()] = {};
      saveHistory(history);
      applyChecklistUI();
      renderHeatmap();
      document.dispatchEvent(new CustomEvent("salahStateChanged"));
    });
  }

  document.addEventListener("salahStateChanged", () => {
    history = loadHistory();
    applyChecklistUI();
    renderHeatmap();
  });

  // ---- Initial render ----
  applyChecklistUI();
  renderHeatmap();
})();

// =========================================================================
// DAILY TASKS LIST EDITOR (Settings)
// =========================================================================
(function initDailyTasksEditor() {
  const BUILTIN_DEFAULT_TASKS = [
    {
      text: "Read Quran (Translation)",
      desc: "Read and learn Quran with Urdu translation from the physical book.",
    },
    {
      text: "Do BCA Learning",
      desc: "Read from the NotebookLM AI summaries, review topics for upcoming exams.",
    },
    {
      text: "Explore More (Coding)",
      desc: "Try to explore more in the coding journey — discover new tools, articles, or concepts.",
    },
    {
      text: "Learn New Concept",
      desc: "Learn a new concept in the current learning language or phase of the project.",
    },
    {
      text: "Improve a Project",
      desc: "Try to refactor, fix, or enhance the current project you are working on.",
    },
    {
      text: "Drink Water (7 Glasses)",
      desc: "Drink up to 7 glasses of water throughout the day (skip if fasting).",
    },
    {
      text: "Read Quran (Arabic Tilawah)",
      desc: "Read Quran in Arabic to improve your tilawah and pronunciation.",
    },
  ];

  function loadEditorList() {
    const raw = localStorage.getItem("dashboard_default_tasks");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return BUILTIN_DEFAULT_TASKS;
  }

  let editorList = loadEditorList();

  const container = document.getElementById("dailyTaskEditList");
  const newInput = document.getElementById("newDailyTaskInput");
  const addBtn = document.getElementById("addDailyTaskBtn");
  const saveBtn = document.getElementById("saveDailyTasksBtn");
  const applyBtn = document.getElementById("applyDailyTasksBtn");

  function renderEditor() {
    if (!container) return;
    container.innerHTML = "";
    editorList.forEach((task, i) => {
      const row = document.createElement("div");
      row.className = "daily-task-edit-item";
      row.innerHTML = `
        <span class="dt-title" title="${task.desc || ""}">${task.text}</span>
        <button class="dt-remove" title="Remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      `;
      row.querySelector(".dt-remove").addEventListener("click", () => {
        editorList.splice(i, 1);
        renderEditor();
      });
      container.appendChild(row);
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const val = newInput?.value.trim();
      if (!val) return;
      editorList.push({ text: val, desc: "" });
      newInput.value = "";
      renderEditor();
    });
    newInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addBtn.click();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      localStorage.setItem(
        "dashboard_default_tasks",
        JSON.stringify(editorList),
      );
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => (saveBtn.textContent = "Save My Daily List"), 1800);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      if (
        !confirm(
          "This will replace your current task list with your daily defaults. Continue?",
        )
      )
        return;
      const freshTasks = editorList.map((t) => ({
        text: t.text,
        desc: t.desc || "",
        startTime: "",
        endTime: "",
        completed: false,
      }));
      localStorage.setItem("todos", JSON.stringify(freshTasks));
      // Reload page to re-init
      location.reload();
    });
  }

  // Render when settings modal opens (lazy)
  document.getElementById("openSettingsBtn")?.addEventListener("click", () => {
    editorList = loadEditorList();
    renderEditor();
  });

  renderEditor();
})();

//Shortcuts

function openSite(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function getWeatherConfig() {
  const lsKey = localStorage.getItem("dashboard_weather_api_key");
  const lsCity = localStorage.getItem("dashboard_weather_city");
  
  const envObj = window.ENV || {};
  return {
    apikey: lsKey || envObj.WEATHER_API_KEY || "",
    city: lsCity || envObj.WEATHER_DEFAULT_CITY || "London"
  };
}

// Weather
async function fetchWeather() {
  try {
    const config = getWeatherConfig();
    if (!config.apikey) {
      const cityEl = document.getElementById("city");
      if (cityEl) cityEl.innerText = "API Key Required";
      const tempEl = document.getElementById("Temprature");
      if (tempEl) tempEl.innerText = "--°";
      return;
    }
    
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?&units=metric&q=${config.city}&appid=${config.apikey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.cod === "401") {
      document.getElementById("city").innerText = "Invalid API Key";
      document.getElementById("Temprature").innerText = "--°";
      return;
    }
    
    if (data.cod === "404") {
      document.getElementById("city").innerText = "City Not Found";
      document.getElementById("Temprature").innerText = "--°";
      return;
    }

    document.getElementById("city").innerText = data.name.toUpperCase();
    document.getElementById("description").innerText =
      data.weather[0].description.toUpperCase();
    let temp = data.main.temp;
    document.getElementById("Temprature").innerText = temp + " °C";
    document.getElementById("windSpeed").innerText =
      "Wind: " + data.wind.speed + " m/s";

    const tempElem = document.getElementById("Temprature");
    if (temp <= 15) tempElem.style.color = "#06b6d4";
    else if (temp <= 30) tempElem.style.color = "#10b981";
    else tempElem.style.color = "#f43f5e";
  } catch (err) {
    console.error("Weather offline");
  }
}
fetchWeather();

// Shared task state/event bridge (widget <-> full panel sync)
const TASKS_CHANGED_EVENT = "dashboardTasksChanged";
let appTodos = [];
let appRenderTodos = null;
let appSaveTodos = null;
let appOpenTaskModal = null;
let appOpenTaskViewPanel = null;
let appFmt12 = null;

// APP INIT
document.addEventListener("DOMContentLoaded", () => {
  // TODO LIST – MISSION PROTOCOLS

  const addTodoBtn = document.getElementById("addTodoBtn");
  const todoList = document.getElementById("todoList");

  // ---- Task Modal Elements ----
  const taskModal = document.getElementById("taskModal");
  const closeTaskModalBtn = document.getElementById("closeTaskModalBtn");
  const cancelTaskBtn = document.getElementById("cancelTaskBtn");
  const saveTaskBtn = document.getElementById("saveTaskBtn");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescInput = document.getElementById("taskDescInput");
  const taskStartTimeValue = document.getElementById("taskStartTimeValue");
  const taskEndTimeInput = document.getElementById("taskEndTimeInput");

  let todos = [];

  // ---- Builtin default daily tasks (used on first load & reset) ----
  const BUILTIN_DEFAULT_TASKS = [
    {
      text: "Read Quran (Translation)",
      desc: "Read and learn Quran with Urdu translation from the physical book.",
      startTime: "",
      endTime: "",
      completed: false,
    },
    {
      text: "Do BCA Learning",
      desc: "Read from the NotebookLM AI summaries, review topics for upcoming exams.",
      startTime: "",
      endTime: "",
      completed: false,
    },
    {
      text: "Explore More (Coding)",
      desc: "Try to explore more in the coding journey — discover new tools, articles, or concepts.",
      startTime: "",
      endTime: "",
      completed: false,
    },
    {
      text: "Learn New Concept",
      desc: "Learn a new concept in the current learning language or phase of the project.",
      startTime: "",
      endTime: "",
      completed: false,
    },
    {
      text: "Improve a Project",
      desc: "Try to refactor, fix, or enhance the current project you are working on.",
      startTime: "",
      endTime: "",
      completed: false,
    },
    {
      text: "Drink Water (7 Glasses)",
      desc: "Drink up to 7 glasses of water throughout the day (skip if fasting).",
      startTime: "",
      endTime: "",
      completed: false,
    },
    {
      text: "Read Quran (Arabic Tilawah)",
      desc: "Read Quran in Arabic to improve your tilawah and pronunciation.",
      startTime: "",
      endTime: "",
      completed: false,
    },
  ];

  // Load user-saved default list (from settings), fall back to builtin
  function getDefaultTasks() {
    const saved = localStorage.getItem("dashboard_default_tasks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return BUILTIN_DEFAULT_TASKS;
  }

  try {
    const saved = localStorage.getItem("todos");
    todos = saved ? JSON.parse(saved) : [];
  } catch (e) {
    localStorage.removeItem("todos");
    todos = [];
  }

  // Auto-populate with daily defaults on very first load
  if (todos.length === 0) {
    todos = getDefaultTasks().map((t) => ({ ...t }));
    localStorage.setItem("todos", JSON.stringify(todos));
  }
  appTodos = todos;

  // ---- Helper: format time 24hr → 12hr ----
  function fmt12(hhmm) {
    if (!hhmm) return "";
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  // ---- Open Modal ----
  function openTaskModal() {
    // Stamp current system time as start
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const hhmm = `${hh}:${mm}`;
    taskStartTimeValue.textContent = fmt12(hhmm);
    taskStartTimeValue.dataset.raw = hhmm;

    // Reset fields
    taskTitleInput.value = "";
    taskDescInput.value = "";
    taskEndTimeInput.value = "";

    taskModal.style.display = "flex";
    setTimeout(() => taskTitleInput.focus(), 80);
  }

  // ---- Close Modal ----
  function closeTaskModal() {
    taskModal.style.display = "none";
  }

  // ---- Add Salah to Tasks button handler ----
  document.addEventListener("addSalahToTasks", () => {
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    let added = 0;
    prayers.forEach((p) => {
      const alreadyExists = todos.some(
        (t) =>
          t.text.toLowerCase() === p.toLowerCase() + " (salah)" ||
          t.text.toLowerCase() === p.toLowerCase(),
      );
      if (!alreadyExists) {
        todos.push({
          text: p + " (Salah)",
          desc: "Daily obligatory prayer.",
          startTime: "",
          endTime: "",
          completed: false,
        });
        added++;
      }
    });
    if (added > 0) {
      saveTodos();
      renderTodos();
    } else {
      alert("All 5 prayers are already in your task list!");
    }
  });

  addTodoBtn.addEventListener("click", openTaskModal);
  closeTaskModalBtn.addEventListener("click", closeTaskModal);
  cancelTaskBtn.addEventListener("click", closeTaskModal);

  // Close on backdrop click
  taskModal.addEventListener("click", (e) => {
    if (e.target === taskModal) closeTaskModal();
  });

  // Save on Enter in title (Shift+Enter in description allowed)
  taskTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTask();
    }
  });

  saveTaskBtn.addEventListener("click", saveTask);

  function saveTask() {
    const title = taskTitleInput.value.trim();
    if (!title) {
      taskTitleInput.focus();
      taskTitleInput.style.borderColor = "var(--accent-rose)";
      setTimeout(() => (taskTitleInput.style.borderColor = ""), 1200);
      return;
    }

    const startRaw = taskStartTimeValue.dataset.raw || "";
    const endRaw = taskEndTimeInput.value || "";

    todos.push({
      text: title,
      desc: taskDescInput.value.trim(),
      startTime: startRaw,
      endTime: endRaw,
      completed: false,
    });

    saveTodos();
    renderTodos();
    closeTaskModal();
  }

  // RENDER TODOS
  function renderTodos() {
    todoList.innerHTML = "";

    todos.forEach((todo, index) => {
      const li = document.createElement("li");
      li.className = "todo-item";
      if (todo.completed) li.classList.add("completed");

      // Build time tag
      let timeTag = "";
      if (todo.startTime || todo.endTime) {
        const s = todo.startTime ? fmt12(todo.startTime) : "";
        const e = todo.endTime ? fmt12(todo.endTime) : "";
        const range = s && e ? `${s} → ${e}` : s || e;
        timeTag = `<span class="todo-time-tag">${range}</span>`;
      }

      // Description line
      const descLine = todo.desc
        ? `<span class="todo-desc">${todo.desc}</span>`
        : "";

      li.innerHTML = `
  <div class="todo-main">
    <div class="todo-content">
      <span class="todo-text">${todo.text}</span>
      ${descLine}
      ${timeTag}
    </div>
    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
      <button class="view-task-btn" title="View Details">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <button class="delete-btn" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>
`;

      li.querySelector(".todo-text").addEventListener("click", () => {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
      });

      li.querySelector(".todo-desc")?.addEventListener("click", () => {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
      });

      li.querySelector(".view-task-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openTaskViewPanel(index);
      });

      li.querySelector(".delete-btn").addEventListener("click", () => {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
      });

      todoList.appendChild(li);
    });

    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const taskPercentEl = document.getElementById("taskPercent");
    if (taskPercentEl) taskPercentEl.innerText = percent + "%";

    const taskCountEl = document.getElementById("taskCount");
    if (taskCountEl) taskCountEl.innerText = completed + "/" + total;

    const circle = document.querySelector(".progress-ring__circle");
    if (circle) {
      const radius = circle.r.baseVal.value;
      const circumference = radius * 2 * Math.PI;
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - (percent / 100) * circumference;
      circle.style.strokeDashoffset = offset;

      let color = "var(--primary-color)";
      if (percent === 100 && total > 0) color = "var(--accent-green)";
      else if (percent > 0) color = "#f59e0b";
      circle.style.stroke = color;
    }
  }

  // SAVE TODOS
  function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
    document.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT));
  }

  // ---- Task View Panel ----
  const taskViewPanel = document.getElementById("taskViewPanel");
  const taskViewBackdrop = document.getElementById("taskViewBackdrop");
  const tvpTitle = document.getElementById("tvpTitle");
  const tvpDesc = document.getElementById("tvpDesc");
  const tvpStart = document.getElementById("tvpStart");
  const tvpEnd = document.getElementById("tvpEnd");
  const tvpTimeRow = document.getElementById("tvpTimeRow");
  const tvpStatusBadge = document.getElementById("tvpStatusBadge");
  const tvpToggleComplete = document.getElementById("tvpToggleComplete");
  const tvpDeleteBtn = document.getElementById("tvpDeleteBtn");
  const closeTaskViewBtn = document.getElementById("closeTaskViewBtn");

  let currentViewIndex = -1;

  function openTaskViewPanel(index) {
    currentViewIndex = index;
    const todo = todos[index];

    tvpTitle.textContent = todo.text;
    tvpDesc.textContent = todo.desc || "No description provided.";

    if (todo.startTime || todo.endTime) {
      tvpTimeRow.style.display = "flex";
      tvpStart.textContent = todo.startTime ? fmt12(todo.startTime) : "--";
      tvpEnd.textContent = todo.endTime ? fmt12(todo.endTime) : "--";
    } else {
      tvpTimeRow.style.display = "none";
    }

    if (todo.completed) {
      tvpStatusBadge.textContent = "Completed";
      tvpStatusBadge.className = "tvp-status-badge completed";
      tvpToggleComplete.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="12 6 12 12 16 14"/></svg> Mark Incomplete`;
    } else {
      tvpStatusBadge.textContent = "In Progress";
      tvpStatusBadge.className = "tvp-status-badge";
      tvpToggleComplete.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Mark Complete`;
    }

    taskViewPanel.classList.add("open");
    taskViewBackdrop.classList.add("open");
  }

  function closeTaskViewPanel() {
    taskViewPanel.classList.remove("open");
    taskViewBackdrop.classList.remove("open");
    currentViewIndex = -1;
  }

  closeTaskViewBtn.addEventListener("click", closeTaskViewPanel);
  taskViewBackdrop.addEventListener("click", closeTaskViewPanel);

  tvpToggleComplete.addEventListener("click", () => {
    if (currentViewIndex < 0) return;
    todos[currentViewIndex].completed = !todos[currentViewIndex].completed;
    saveTodos();
    renderTodos();
    openTaskViewPanel(currentViewIndex); // refresh panel state
  });

  tvpDeleteBtn.addEventListener("click", () => {
    if (currentViewIndex < 0) return;
    todos.splice(currentViewIndex, 1);
    saveTodos();
    renderTodos();
    closeTaskViewPanel();
  });

  // INIT
  appRenderTodos = renderTodos;
  appSaveTodos = saveTodos;
  appOpenTaskModal = openTaskModal;
  appOpenTaskViewPanel = openTaskViewPanel;
  appFmt12 = fmt12;
  renderTodos();
});

// Dua Suggestions

const duasNUM = [
  "dua1",
  "dua2",
  "dua3",
  "dua4",
  "dua5",
  "dua6",
  "dua7",
  "dua8",
  "dua9",
  "dua10",
];

const duas = {
  dua1: {
    DUA: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    TRANSCRIPTION:
      "Rabbana ātinā fid-dunyā ḥasanah wa fil-ākhirati ḥasanah waqinā ‘adhāban-nār.",
    MEANING:
      "Ae hamare Rab! Hamein duniya mein bhi bhalai ata farma aur aakhirat mein bhi bhalai ata farma aur humein aag ke azaab se bacha le.",
  },

  dua2: {
    DUA: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    TRANSCRIPTION:
      "Rabbi ighfir lī wa tub ‘alayya innaka anta at-Tawwābu ar-Raḥīm.",
    MEANING:
      "Ae mere Rab! Mujhe baksh de aur meri tauba qubool farma. Beshak Tu hi tauba qubool karne wala aur nihayat meharban hai.",
  },

  dua3: {
    DUA: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ العَفْوَ فَاعْفُ عَنِّي",
    TRANSCRIPTION: "Allāhumma innaka ‘afuwwun tuḥibbul-‘afwa fa‘fu ‘annī.",
    MEANING:
      "Ae Allah! Tu maaf karne wala hai aur maafi ko pasand karta hai, isliye mujhe bhi maaf farma.",
  },

  dua4: {
    DUA: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    TRANSCRIPTION:
      "Rabbana ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā lanakūnanna minal-khāsirīn.",
    MEANING:
      "Ae hamare Rab! Humne apni jaanon par zulm kiya. Agar Tu na bakhshe aur reham na farma to hum nuksan uthane walon mein se ho jayenge.",
  },

  dua5: {
    DUA: "اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي",
    TRANSCRIPTION: "Allāhumma ihdinī wa saddidnī.",
    MEANING: "Ae Allah! Mujhe hidayat de aur seedha rah bata.",
  },

  dua6: {
    DUA: "رَبِّ زِدْنِي عِلْمًا",
    TRANSCRIPTION: "Rabbi zidnī ‘ilmā.",
    MEANING: "Ae mere Rab! Mujhe ilm mein izafa farma.",
  },

  dua7: {
    DUA: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    TRANSCRIPTION: "Ḥasbunallāhu wa ni‘mal-wakīl.",
    MEANING: "Allah humein kaafi hai, aur Wahi behtareen kaafil hai.",
  },

  dua8: {
    DUA: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    TRANSCRIPTION: "Rabbi shraḥ lī ṣadrī wa yassir lī amrī.",
    MEANING: "Ae mere Rab! Mera seena khol de aur mera kaam aasaan farma.",
  },

  dua9: {
    DUA: "اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ",
    TRANSCRIPTION: "Allāhumma ighfir lī wa li-wālidayya.",
    MEANING: "Ae Allah! Mujhe aur mere walidain ko baksh de.",
  },

  dua10: {
    DUA: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    TRANSCRIPTION: "Rabbi rḥamhumā kamā rabbayānī ṣaghīrā.",
    MEANING:
      "Ae mere Rab! Mere walidain par reham farma jaise unhon ne bachpan mein meri parwarish ki.",
  },
};

const duaDiv = document.getElementById("dua");
const transDiv = document.getElementById("transcription");
const urduMeaningDiv = document.getElementById("meaning");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const currentDuaDiv = document.getElementById("currentDUA");
const totalDua = document.getElementById("totalDua");

let duaIndex = 0;
const saved = localStorage.getItem("dua");
if (saved) {
  const i = duasNUM.indexOf(saved);
  if (i !== -1) duaIndex = i;
}

/* DISPLAY FUNCTION */
function duaSelect() {
  const key = duasNUM[duaIndex];
  duaDiv.innerText = duas[key].DUA;
  transDiv.innerText = duas[key].TRANSCRIPTION;
  urduMeaningDiv.innerText = duas[key].MEANING;
  currentDuaDiv.innerText = duaIndex + 1;
  totalDua.innerText = duasNUM.length;
  localStorage.setItem("dua", key);
}

/* BUTTONS */
nextBtn.addEventListener("click", () => {
  duaIndex++;
  if (duaIndex >= duasNUM.length) duaIndex = 0;
  duaSelect();
});

prevBtn.addEventListener("click", () => {
  duaIndex--;
  if (duaIndex < 0) duaIndex = duasNUM.length - 1;
  duaSelect();
});

/* INITIAL LOAD */
duaSelect();

// =========================================================================
// SETTINGS
// =========================================================================

// --- MODAL TOGGLE ---
const settingsModal = document.getElementById("settingsModal");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

openSettingsBtn.addEventListener("click", () => {
  settingsModal.style.display = "flex";
});
closeSettingsBtn.addEventListener("click", () => {
  settingsModal.style.display = "none";
});
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.style.display = "none";
});

// --- SETTINGS TABS LOGIC ---
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    tabContents.forEach((content) => {
      content.classList.remove("active");
      content.style.display = "none";
    });

    const targetContent = document.getElementById(btn.dataset.target);
    if (targetContent) {
      targetContent.classList.add("active");
      targetContent.style.display = "block";
    }
  });
});

// --- API SETTINGS LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
  const weatherApiInput = document.getElementById("weatherApiInput");
  const weatherCityInput = document.getElementById("weatherCityInput");
  const saveApiSettingsBtn = document.getElementById("saveApiSettingsBtn");
  
  if (weatherApiInput && weatherCityInput) {
    const config = getWeatherConfig();
    weatherApiInput.value = localStorage.getItem("dashboard_weather_api_key") || config.apikey || "";
    weatherCityInput.value = localStorage.getItem("dashboard_weather_city") || config.city || "";
    
    if (saveApiSettingsBtn) {
      saveApiSettingsBtn.addEventListener("click", () => {
        localStorage.setItem("dashboard_weather_api_key", weatherApiInput.value.trim());
        localStorage.setItem("dashboard_weather_city", weatherCityInput.value.trim());
        alert("API Settings saved!");
        fetchWeather();
      });
    }
  } 
});

  // --- THEME COLOR ---
  const themeOpts = document.querySelectorAll(".themeOpt");
  
  function setTheme(color) {
    document.documentElement.style.setProperty("--primary-color", color);
    document.documentElement.style.setProperty("--primary-hover", color);
    localStorage.setItem("dashboard_theme", color);
  
    themeOpts.forEach((opt) => opt.classList.remove("active"));
    themeOpts.forEach((opt) => {
      if (opt.dataset.theme === color) opt.classList.add("active");
    });
  }
  
  const savedTheme = localStorage.getItem("dashboard_theme");
  if (savedTheme) setTheme(savedTheme);
  
  themeOpts.forEach((opt) => {
    opt.addEventListener("click", () => setTheme(opt.dataset.theme));
  });

  // --- COMPLETE THEMES ---
  const themePresetBtns = document.querySelectorAll(".theme-preset-btn");
  
  function setCompleteTheme(presetName) {
    document.body.dataset.theme = presetName;
    localStorage.setItem("dashboard_preset_theme", presetName);

    themePresetBtns.forEach(btn => btn.classList.remove("active"));
    const activeBtn = Array.from(themePresetBtns).find(btn => btn.dataset.preset === presetName);
    if (activeBtn) activeBtn.classList.add("active");
  }

  const savedPresetTheme = localStorage.getItem("dashboard_preset_theme") || "default";
  setCompleteTheme(savedPresetTheme);

  themePresetBtns.forEach(btn => {
    btn.addEventListener("click", () => setCompleteTheme(btn.dataset.preset));
  });

  // --- GLASS MODE TOGGLE ---
  const glassModeToggle = document.getElementById("glassModeToggle");

  function setGlassMode(isGlassEnabled) {
    if (isGlassEnabled) {
      document.body.classList.remove("glass-disabled");
    } else {
      document.body.classList.add("glass-disabled");
    }
    if (glassModeToggle) glassModeToggle.checked = isGlassEnabled;
    localStorage.setItem("dashboard_glass_mode", isGlassEnabled ? "true" : "false");
  }

  const savedGlassMode = localStorage.getItem("dashboard_glass_mode");
  const isGlass = savedGlassMode !== null ? savedGlassMode === "true" : true;
  setGlassMode(isGlass);

  if (glassModeToggle) {
    glassModeToggle.addEventListener("change", (e) => {
      setGlassMode(e.target.checked);
    });
  }

  // --- BACKGROUND BLUR ---
  const bgBlurSlider = document.getElementById("bgBlurSlider");

  function setBgBlur(value) {
    document.documentElement.style.setProperty("--bg-blur", `${value}px`);
    if (bgBlurSlider) bgBlurSlider.value = value;
    localStorage.setItem("dashboard_bg_blur", value);
  }

  const savedBgBlur = localStorage.getItem("dashboard_bg_blur") || "0";
  setBgBlur(savedBgBlur);

  if (bgBlurSlider) {
    bgBlurSlider.addEventListener("input", (e) => {
      setBgBlur(e.target.value);
    });
  }

  // --- BACKGROUNDS (Static & Video) ---

const videos = {};
const imageWallpapersCont = document.querySelector(".imageWallpapersCont");
const liveWallpapersCont = document.querySelector(".liveWallpapersCont");

// Inject Live Videos
Object.values(videos).forEach((url) => {
  const div = document.createElement("div");
  div.className = "videoOpt";
  div.dataset.val = url;
  const video = document.createElement("video");
  video.src = `${url}#t=0.1`;
  video.muted = true;
  video.playsInline = true;
  video.preload = "none";
  div.appendChild(video);
  liveWallpapersCont.appendChild(div);
});

const bgVideoFrame = document.getElementById("bgVideoFrame");
let videoOpts = document.querySelectorAll(".videoOpt");
let staticOpts = document.querySelectorAll(".staticOpt");

// --- IndexedDB for Uploaded Images ---
const IMAGE_DB_NAME = "LiveImageDB";
const IMAGE_STORE_NAME = "images";
const uploadedImagesMap = {};

function openImageDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveImageToDB(id, file) {
  try {
    const db = await openImageDB();
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    tx.objectStore(IMAGE_STORE_NAME).put({ id, file });
    return new Promise((r) => (tx.oncomplete = r));
  } catch (err) { console.error(err); }
}

async function deleteImageFromDB(id) {
  try {
    const db = await openImageDB();
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    tx.objectStore(IMAGE_STORE_NAME).delete(id);
    return new Promise((r) => (tx.oncomplete = r));
  } catch (err) { console.error(err); }
}

async function loadImagesFromDB() {
  try {
    const db = await openImageDB();
    const tx = db.transaction(IMAGE_STORE_NAME, "readonly");
    const req = tx.objectStore(IMAGE_STORE_NAME).getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result);
    });
  } catch (err) { return []; }
}

// --- Add Upload Image Feature ---
const uploadImageDiv = document.createElement("div");
uploadImageDiv.className = "staticOpt upload-image-btn";
uploadImageDiv.style.display = "flex";
uploadImageDiv.style.alignItems = "center";
uploadImageDiv.style.justifyContent = "center";
uploadImageDiv.style.border = "2px dashed rgba(255, 255, 255, 0.4)";
uploadImageDiv.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
uploadImageDiv.style.cursor = "pointer";
uploadImageDiv.style.color = "white";
uploadImageDiv.style.fontSize = "14px";
uploadImageDiv.style.fontWeight = "bold";
uploadImageDiv.style.minHeight = "80px";
uploadImageDiv.style.boxSizing = "border-box";
uploadImageDiv.innerHTML = "<span>+ Add Photos</span>";

const imageFileInput = document.createElement("input");
imageFileInput.type = "file";
imageFileInput.accept = "image/*";
imageFileInput.multiple = true;
imageFileInput.style.display = "none";

uploadImageDiv.appendChild(imageFileInput);
imageWallpapersCont.appendChild(uploadImageDiv);

uploadImageDiv.addEventListener("click", () => {
  imageFileInput.click();
});

function addUploadedImageToUI(id, url) {
  const div = document.createElement("div");
  div.className = "staticOpt";
  div.dataset.bgType = "image";
  div.dataset.val = id;
  div.style.position = "relative";
  const img = document.createElement("img");
  img.src = url;
  img.loading = "lazy";
  div.appendChild(img);
  
  const removeBtn = document.createElement("button");
  removeBtn.innerHTML = "&times;";
  removeBtn.className = "remove-media-btn";
  removeBtn.onclick = async (e) => {
    e.stopPropagation();
    if (confirm("Remove this photo?")) {
      await deleteImageFromDB(id);
      delete uploadedImagesMap[id];
      div.remove();
      const saved = localStorage.getItem("dashboard_bg_static");
      if (saved && JSON.parse(saved).val === id) {
        localStorage.removeItem("dashboard_bg_static");
      }
    }
  };
  div.appendChild(removeBtn);

  imageWallpapersCont.insertBefore(div, uploadImageDiv);
  
  div.addEventListener("click", () => {
    setStaticBackground("image", id);
  });
  staticOpts = document.querySelectorAll(".staticOpt");
}

imageFileInput.addEventListener("change", async (e) => {
  const files = e.target.files;
  for (let file of files) {
    if (file.type.startsWith("image/")) {
      const id = "uploaded_image_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      await saveImageToDB(id, file);
      const url = URL.createObjectURL(file);
      uploadedImagesMap[id] = url;
      addUploadedImageToUI(id, url);
    }
  }
});

// --- IndexedDB for Uploaded Videos ---
const DB_NAME = "LiveWallpaperDB";
const STORE_NAME = "videos";
const uploadedVideosMap = {};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideoToDB(id, file) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, file });
    return new Promise((r) => (tx.oncomplete = r));
  } catch (err) { console.error(err); }
}

async function deleteVideoFromDB(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise((r) => (tx.oncomplete = r));
  } catch (err) { console.error(err); }
}

async function loadVideosFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result);
    });
  } catch (err) { return []; }
}
// ------------------------------------

// --- Add Upload Video Feature ---
const uploadVideoDiv = document.createElement("div");
uploadVideoDiv.className = "videoOpt upload-video-btn";
uploadVideoDiv.style.display = "flex";
uploadVideoDiv.style.alignItems = "center";
uploadVideoDiv.style.justifyContent = "center";
uploadVideoDiv.style.border = "2px dashed rgba(255, 255, 255, 0.4)";
uploadVideoDiv.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
uploadVideoDiv.style.cursor = "pointer";
uploadVideoDiv.style.color = "white";
uploadVideoDiv.style.fontSize = "14px";
uploadVideoDiv.style.fontWeight = "bold";
uploadVideoDiv.style.minHeight = "80px"; // Give it some space in case videoOpt relies on child image height
uploadVideoDiv.style.boxSizing = "border-box";
uploadVideoDiv.innerHTML = "<span class='upload-vid-text'>+ Add Videos (0/5)</span>";

const videoFileInput = document.createElement("input");
videoFileInput.type = "file";
videoFileInput.accept = "video/mp4, video/webm, video/ogg";
videoFileInput.multiple = true;
videoFileInput.style.display = "none";

uploadVideoDiv.appendChild(videoFileInput);
liveWallpapersCont.appendChild(uploadVideoDiv);

function updateUploadVideoBtn() {
  const current = Object.keys(uploadedVideosMap).length;
  const textSpan = uploadVideoDiv.querySelector(".upload-vid-text");
  if (textSpan) {
    textSpan.innerText = `+ Add Videos (${current}/5)`;
  }
}

uploadVideoDiv.addEventListener("click", () => {
  const current = Object.keys(uploadedVideosMap).length;
  if (current >= 5) {
    alert("Max limit of 5 uploaded videos reached! Please delete some before adding more.");
    return;
  }
  videoFileInput.click();
});

function addUploadedVideoToUI(id, url) {
  const div = document.createElement("div");
  div.className = "videoOpt";
  div.dataset.val = id;
  div.style.position = "relative";
  const video = document.createElement("video");
  video.src = `${url}#t=0.1`;
  video.muted = true;
  video.playsInline = true;
  video.preload = "none";
  div.appendChild(video);
  
  const removeBtn = document.createElement("button");
  removeBtn.innerHTML = "&times;";
  removeBtn.className = "remove-media-btn";
  removeBtn.onclick = async (e) => {
    e.stopPropagation();
    if (confirm("Remove this video?")) {
      await deleteVideoFromDB(id);
      delete uploadedVideosMap[id];
      div.remove();
      updateUploadVideoBtn();
      if (localStorage.getItem("dashboard_bg_video") === id) {
        localStorage.removeItem("dashboard_bg_video");
      }
    }
  };
  div.appendChild(removeBtn);

  liveWallpapersCont.insertBefore(div, uploadVideoDiv);
  
  div.addEventListener("click", () => {
    setVideoBackground(id);
  });
  videoOpts = document.querySelectorAll(".videoOpt");
  updateUploadVideoBtn();
}

videoFileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  const current = Object.keys(uploadedVideosMap).length;
  const allowed = Math.max(0, 5 - current);

  if (files.length > allowed) {
    alert(`You can only upload ${allowed} more video(s). The extra files were ignored.`);
  }

  const filesToProcess = files.slice(0, allowed);
  for (let file of filesToProcess) {
    if (file.type.startsWith("video/")) {
      const id = "uploaded_video_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      await saveVideoToDB(id, file);
      const url = URL.createObjectURL(file);
      uploadedVideosMap[id] = url;
      addUploadedVideoToUI(id, url);
    }
  }
  videoFileInput.value = "";
});
// --------------------------------
const bgLayer = document.querySelector(".bg-layer");
const body = document.body;

function applyLayerVisibility(hasVideo, hasImage) {
  if (hasVideo) {
    bgVideoFrame.style.display = "block";
    bgLayer.style.opacity = "0";
  } else if (hasImage) {
    bgVideoFrame.style.display = "none";
    bgVideoFrame.src = "";
    bgLayer.style.opacity = "1";
  } else {
    bgVideoFrame.style.display = "none";
    bgVideoFrame.src = "";
    bgLayer.style.opacity = "1";
  }
}

function setStaticBackground(type, val) {
  videoOpts.forEach((opt) => opt.classList.remove("active"));
  localStorage.removeItem("dashboard_bg_video");

  staticOpts.forEach((opt) => opt.classList.remove("active"));
  const activeOpt = Array.from(staticOpts).find((o) => o.dataset.val === val);
  if (activeOpt) activeOpt.classList.add("active");

  // Remove any stale background styles on body
  body.style.backgroundImage = "none";
  body.style.backgroundColor = "";

  if (type === "color") {
    bgLayer.style.backgroundImage = "none";
    bgLayer.style.backgroundColor = val;
    applyLayerVisibility(false, false);
  } else if (type === "image") {
    bgLayer.style.backgroundColor = "#000";
    const actualUrl = uploadedImagesMap[val] || val;
    bgLayer.style.backgroundImage = `url('${actualUrl}')`;
    bgLayer.style.backgroundSize = "cover";
    bgLayer.style.backgroundPosition = "center";
    applyLayerVisibility(false, true);
  }

  localStorage.setItem("dashboard_bg_static", JSON.stringify({ type, val }));
}

function setVideoBackground(val) {
  staticOpts.forEach((opt) => opt.classList.remove("active"));
  localStorage.removeItem("dashboard_bg_static");

  const actualUrl = uploadedVideosMap[val] || val;
  bgVideoFrame.src = actualUrl;
  
  const playPromise = bgVideoFrame.play();
  if (playPromise !== undefined) {
    playPromise.catch((e) => console.log("Video autoplay prevented:", e));
  }
  
  localStorage.setItem("dashboard_bg_video", val);

  videoOpts.forEach((opt) => opt.classList.remove("active"));
  const activeOpt = Array.from(videoOpts).find((o) => o.dataset.val === val);
  if (activeOpt) activeOpt.classList.add("active");

  applyLayerVisibility(true, false);
}

// Bind Events dynamically
staticOpts.forEach((opt) => {
  opt.addEventListener("click", () => {
    setStaticBackground(opt.dataset.bgType, opt.dataset.val);
  });
});

videoOpts.forEach((opt) => {
  opt.addEventListener("click", () => {
    setVideoBackground(opt.dataset.val);
  });
});

// Load saved wallpaper/theme
document.addEventListener("DOMContentLoaded", async () => {
  const dbVideos = await loadVideosFromDB();
  if (dbVideos && dbVideos.length) {
    dbVideos.forEach(item => {
      const url = URL.createObjectURL(item.file);
      uploadedVideosMap[item.id] = url;
      addUploadedVideoToUI(item.id, url);
    });
  }

  const dbImages = await loadImagesFromDB();
  if (dbImages && dbImages.length) {
    dbImages.forEach(item => {
      const url = URL.createObjectURL(item.file);
      uploadedImagesMap[item.id] = url;
      addUploadedImageToUI(item.id, url);
    });
  }

  const savedVideo = localStorage.getItem("dashboard_bg_video");
  const savedStaticRaw = localStorage.getItem("dashboard_bg_static");

  if (savedVideo) {
    setTimeout(() => {
      setVideoBackground(savedVideo);
    }, 3500);
  } else if (savedStaticRaw) {
    const savedStatic = JSON.parse(savedStaticRaw);
    setStaticBackground(savedStatic.type, savedStatic.val);
  }
});

// =========================================================================
// TASKS DROPDOWN LOGIC
// =========================================================================
const tasksDropdownToggle = document.getElementById("tasksDropdownToggle");
const tasksDropdownContent = document.getElementById("tasksDropdownContent");
const tasksChevron = document.getElementById("tasksChevron");
let tasksOpen = localStorage.getItem("dashboard_tasks_open") !== "false";

function applyTasksDropdownState() {
  if (!tasksDropdownContent) return;
  if (tasksOpen) {
    tasksDropdownContent.style.display = "flex";
    if (tasksChevron) tasksChevron.style.transform = "rotate(180deg)";
  } else {
    tasksDropdownContent.style.display = "none";
    if (tasksChevron) tasksChevron.style.transform = "rotate(0deg)";
  }
}

if (tasksDropdownToggle) {
  tasksDropdownToggle.addEventListener("click", () => {
    tasksOpen = !tasksOpen;
    localStorage.setItem("dashboard_tasks_open", tasksOpen);
    applyTasksDropdownState();
  });
  applyTasksDropdownState();
}

// =========================================================================
// WIDGET LAYOUT — fixed columns OR floating draggable panels
// =========================================================================
const widgetToggles = document.querySelectorAll(".widget-toggle");
const leftSidebar = document.getElementById("leftSidebar");
const rightSidebar = document.getElementById("rightSidebar");
const centerSidebar = document.getElementById("centerSidebar");

const FLOATING_MODE_KEY = "dashboard_widgets_floating";
const WIDGET_POS_KEY = "dashboard_widget_positions";

const allWidgetsMap = {};
widgetToggles.forEach((toggle) => {
  const sel = toggle.dataset.widget;
  const el = document.querySelector(sel);
  if (el) allWidgetsMap[sel] = el;
});

var activeWidgets = [];
const MAX_PER_COLUMN = 4;

function isFloatingMode() {
  return localStorage.getItem(FLOATING_MODE_KEY) === "true";
}

function setFloatingMode(on) {
  localStorage.setItem(FLOATING_MODE_KEY, on ? "true" : "false");
}

function loadWidgetPositions() {
  try {
    return JSON.parse(localStorage.getItem(WIDGET_POS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveWidgetPositions(obj) {
  localStorage.setItem(WIDGET_POS_KEY, JSON.stringify(obj));
}

function clearWidgetPositions() {
  localStorage.removeItem(WIDGET_POS_KEY);
}

function getFloatingLayer() {
  let layer = document.getElementById("floatingWidgetsLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "floatingWidgetsLayer";
    layer.className = "floating-widgets-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.insertBefore(layer, document.body.firstChild);
  }
  return layer;
}

function clearInlineLayoutStyles(el) {
  el.style.position = "";
  el.style.left = "";
  el.style.top = "";
  el.style.right = "";
  el.style.bottom = "";
  el.style.width = "";
  el.style.flex = "";
  el.style.minHeight = "";
  el.style.overflow = "";
  el.classList.remove("is-dragging");
}

function clampWidgetToViewport(el) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const rect = el.getBoundingClientRect();
  let l = rect.left;
  let t = rect.top;
  l = Math.max(8, Math.min(l, window.innerWidth - w - 8));
  t = Math.max(8, Math.min(t, window.innerHeight - h - 8));
  el.style.left = `${Math.round(l)}px`;
  el.style.top = `${Math.round(t)}px`;
}

function defaultPositionForIndex(i) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return {
    left: 20 + col * 340,
    top: 72 + row * 56,
    width: 320,
  };
}

let maxZIndex = 100;
const FIXED_LAYOUT_KEY = "dashboard_fixed_layout_state";
const WIDGET_SIZE_KEY = "dashboard_widget_sizes";

function loadFixedLayout() {
  try {
    return JSON.parse(localStorage.getItem(FIXED_LAYOUT_KEY)) || { left: [], center: [], right: [] };
  } catch (e) {
    return { left: [], center: [], right: [] };
  }
}

function saveFixedLayout(layout) {
  localStorage.setItem(FIXED_LAYOUT_KEY, JSON.stringify(layout));
}

function getWidgetSizes() {
  try {
    return JSON.parse(localStorage.getItem(WIDGET_SIZE_KEY)) || [];
  } catch(e) {
    return [];
  }
}

function saveWidgetSizes(sizes) {
  localStorage.setItem(WIDGET_SIZE_KEY, JSON.stringify(sizes));
}

function setupWidgetTools() {
  const sizes = getWidgetSizes();
  Object.entries(allWidgetsMap).forEach(([sel, el]) => {
    if (!el) return;
    
    // Z-Index Management
    if (!el.dataset.zbound) {
      el.addEventListener("pointerdown", () => {
        maxZIndex++;
        el.style.zIndex = maxZIndex;
      });
      el.dataset.zbound = "true";
    }

    // Apply saved size (Removed widget-expanded logic, leaving this block empty or removed entirely)

    if (el.classList.contains("has-tools")) return;
    el.classList.add("has-tools");

    // Close Button
    const closeBtn = document.createElement("button");
    closeBtn.className = "widget-close-btn";
    closeBtn.type = "button";
    closeBtn.title = "Hide widget";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      activeWidgets = activeWidgets.filter((w) => w !== sel);
      renderWidgetsLayout();
    });
    el.appendChild(closeBtn);

    // Drag Handle
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "widget-drag-handle";
    handle.title = "Drag to move";
    handle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
    el.appendChild(handle);

    bindWidgetDrag(el, sel, handle);
  });
}

const dragBindings = new WeakSet();
let currentDraggedWidgetSel = null;
let currentDraggedWidgetHeight = 0;

function bindWidgetDrag(el, sel, handle) {
  if (dragBindings.has(handle)) return;
  dragBindings.add(handle);

  // Floating Mode Pointer Drag
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !isFloatingMode()) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origLeft = rect.left;
    const origTop = rect.top;
    el.classList.add("is-dragging");

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let nl = origLeft + dx;
      let nt = origTop + dy;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      nl = Math.max(8, Math.min(nl, window.innerWidth - w - 8));
      nt = Math.max(8, Math.min(nt, window.innerHeight - h - 8));
      el.style.left = `${Math.round(nl)}px`;
      el.style.top = `${Math.round(nt)}px`;
    };

    const onUp = () => {
      el.classList.remove("is-dragging");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const pos = loadWidgetPositions();
      pos[sel] = {
        left: Math.round(el.getBoundingClientRect().left),
        top: Math.round(el.getBoundingClientRect().top),
        width: Math.round(el.offsetWidth),
      };
      saveWidgetPositions(pos);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  });

  // Fixed Mode HTML5 Drag
  handle.addEventListener("mousedown", () => {
    if (!isFloatingMode()) el.draggable = true;
  });
  handle.addEventListener("mouseup", () => {
    if (!isFloatingMode()) el.draggable = false;
  });
  
  el.addEventListener("dragstart", (e) => {
    if (isFloatingMode()) {
      e.preventDefault();
      return;
    }
    currentDraggedWidgetSel = sel;
    currentDraggedWidgetHeight = el.offsetHeight;
    e.dataTransfer.setData("text/plain", sel);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => el.style.opacity = "0.4", 0);
  });
  el.addEventListener("dragend", () => {
    currentDraggedWidgetSel = null;
    el.draggable = false;
    el.style.opacity = "1";
    document.querySelectorAll(".widget-placeholder").forEach(p => p.remove());
    document.querySelectorAll(".drag-over").forEach(col => col.classList.remove("drag-over"));
  });
}

// Fixed Layout Drop Zones
[leftSidebar, centerSidebar, rightSidebar].forEach(sidebar => {
  if (!sidebar) return;
  sidebar.addEventListener("dragover", (e) => {
    if (isFloatingMode()) return;
    e.preventDefault();
    sidebar.classList.add("drag-over");
    
    const draggedEl = allWidgetsMap[currentDraggedWidgetSel];
    if (!draggedEl) return;

    let placeholder = document.querySelector(".widget-placeholder");
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.className = "widget-placeholder";
    }

    let willFit = true;
    if (sidebar.id !== "centerSidebar") {
      let currentHeight = 0;
      let visibleCount = 0;
      Array.from(sidebar.querySelectorAll(".glass-panel")).forEach(w => {
        if (w !== draggedEl && !w.classList.contains("widget-placeholder")) {
          currentHeight += w.offsetHeight;
          visibleCount++;
        }
      });
      const style = window.getComputedStyle(sidebar);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const gap = parseFloat(style.gap) || 20;
      
      const availableHeight = sidebar.clientHeight - paddingTop - paddingBottom;
      const projectedHeight = currentHeight + currentDraggedWidgetHeight + (visibleCount * gap);

      // Add 60px tolerance to account for zoom scaling rounding errors
      if (projectedHeight > availableHeight + 60) {
        willFit = false;
      }
    }

    if (sidebar.id !== "centerSidebar" && draggedEl.parentNode !== sidebar && sidebar.querySelectorAll(".glass-panel").length >= 3) {
      willFit = false;
    }
    if (sidebar.id === "centerSidebar" && draggedEl.parentNode !== sidebar && sidebar.querySelectorAll(".glass-panel").length >= 2) {
      willFit = false;
    }

    if (!willFit) {
      placeholder.classList.add("placeholder-invalid");
      e.dataTransfer.dropEffect = "none";
    } else {
      placeholder.classList.remove("placeholder-invalid");
      e.dataTransfer.dropEffect = "move";
    }
    
    const afterElement = getDragAfterElement(sidebar, e.clientY);
    if (afterElement == null) {
      sidebar.appendChild(placeholder);
    } else {
      sidebar.insertBefore(placeholder, afterElement);
    }
  });

  sidebar.addEventListener("dragleave", () => {
    sidebar.classList.remove("drag-over");
  });

  sidebar.addEventListener("drop", (e) => {
    if (isFloatingMode()) return;
    e.preventDefault();
    sidebar.classList.remove("drag-over");
    
    const placeholder = document.querySelector(".widget-placeholder");
    if (placeholder && placeholder.classList.contains("placeholder-invalid")) {
      alert("Widget cannot fit in this area due to height limits or max widget limits!");
      placeholder.remove();
      return;
    }

    const sel = e.dataTransfer.getData("text/plain");
    const el = allWidgetsMap[sel];
    if (!el) {
      placeholder?.remove();
      return;
    }

    if (placeholder && placeholder.parentNode === sidebar) {
      sidebar.insertBefore(el, placeholder);
    } else {
      sidebar.appendChild(el);
    }
    placeholder?.remove();

    // Save layout state
    const layout = {
      left: Array.from(leftSidebar.querySelectorAll(".glass-panel")).map(w => w.dataset.widgetSel || Object.keys(allWidgetsMap).find(key => allWidgetsMap[key] === w)),
      center: Array.from(centerSidebar.querySelectorAll(".glass-panel")).map(w => w.dataset.widgetSel || Object.keys(allWidgetsMap).find(key => allWidgetsMap[key] === w)),
      right: Array.from(rightSidebar.querySelectorAll(".glass-panel")).map(w => w.dataset.widgetSel || Object.keys(allWidgetsMap).find(key => allWidgetsMap[key] === w))
    };
    saveFixedLayout(layout);
  });
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".glass-panel:not(.is-dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderFloatingLayout() {
  const layer = getFloatingLayer();
  layer.setAttribute("aria-hidden", "false");

  Object.values(allWidgetsMap).forEach((w) => {
    clearInlineLayoutStyles(w);
    w.remove();
  });

  const positions = loadWidgetPositions();
  let idx = 0;
  activeWidgets.forEach((sel) => {
    const el = allWidgetsMap[sel];
    if (!el) return;
    clearInlineLayoutStyles(el);
    el.style.position = "fixed";
    const saved = positions[sel];
    const def = defaultPositionForIndex(idx);
    const left = saved && typeof saved.left === "number" ? saved.left : def.left;
    const top = saved && typeof saved.top === "number" ? saved.top : def.top;
    const width = saved && typeof saved.width === "number" ? saved.width : def.width;
    el.style.left = `${Math.min(left, window.innerWidth - 40)}px`;
    el.style.top = `${Math.min(top, window.innerHeight - 40)}px`;
    el.style.width = `${Math.min(width, window.innerWidth - 16)}px`;
    layer.appendChild(el);
    clampWidgetToViewport(el);
    idx++;
  });

  document.body.classList.add("widgets-floating");
}

function renderFixedLayout() {
  const layer = document.getElementById("floatingWidgetsLayer");
  if (layer) layer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("widgets-floating");

  Object.values(allWidgetsMap).forEach((w) => {
    clearInlineLayoutStyles(w);
    w.remove();
  });

  const layout = loadFixedLayout();
  layout.left = layout.left.filter(sel => activeWidgets.includes(sel));
  layout.center = layout.center.filter(sel => activeWidgets.includes(sel));
  layout.right = layout.right.filter(sel => activeWidgets.includes(sel));
  
  const inLayout = new Set([...layout.left, ...layout.center, ...layout.right]);
  const missing = activeWidgets.filter(sel => !inLayout.has(sel));
  
  missing.forEach((sel) => {
    if (layout.left.length < 3) layout.left.push(sel);
    else if (layout.right.length < 3) layout.right.push(sel);
    else if (layout.center.length < 2) layout.center.push(sel);
  });
  
  saveFixedLayout(layout);

  layout.right.forEach((sel) => rightSidebar.appendChild(allWidgetsMap[sel]));
  layout.left.forEach((sel) => leftSidebar.appendChild(allWidgetsMap[sel]));
  layout.center.forEach((sel) => centerSidebar.appendChild(allWidgetsMap[sel]));

  [...layout.right, ...layout.left].forEach((sel) => {
    const w = allWidgetsMap[sel];
    if (!w) return;
    w.style.flex = "none";
    w.style.height = "fit-content";
    w.style.maxHeight = "100%";
    w.style.overflowY = "auto";
  });

  layout.center.forEach((sel) => {
    const w = allWidgetsMap[sel];
    if (!w) return;
    w.style.flex = "0 1 auto";
    w.style.height = "fit-content";
    w.style.minHeight = "0";
    w.style.overflow = "auto";
  });
}

function renderWidgetsLayout() {
  if (!leftSidebar || !rightSidebar || !centerSidebar) return;
  setupWidgetTools();
  if (isFloatingMode()) renderFloatingLayout();
  else renderFixedLayout();

  localStorage.setItem(
    "dashboard_active_widgets",
    JSON.stringify(activeWidgets),
  );
  widgetToggles.forEach((toggle) => {
    toggle.checked = activeWidgets.includes(toggle.dataset.widget);
  });
}

function loadWidgetSettings() {
  const saved = localStorage.getItem("dashboard_active_widgets");
  if (saved) {
    try {
      activeWidgets = JSON.parse(saved);
      if (activeWidgets.length === 9 && activeWidgets.includes(".widget-tasbeeh") && !localStorage.getItem("dashboard_migrated_empty")) {
        activeWidgets = [];
        localStorage.setItem("dashboard_migrated_empty", "true");
      }
    } catch (e) {
      activeWidgets = [];
    }
  } else {
    activeWidgets = [];
  }
  renderWidgetsLayout();
}

widgetToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const sel = toggle.dataset.widget;
    if (toggle.checked) {
      if (!isFloatingMode() && activeWidgets.length >= 8) {
        alert("Max widget limit reached. Try turning on Floating widgets!");
        toggle.checked = false;
        return;
      }
      if (!activeWidgets.includes(sel)) activeWidgets.push(sel);
    } else {
      activeWidgets = activeWidgets.filter((w) => w !== sel);
    }
    renderWidgetsLayout();
  });
});

window.addEventListener("resize", () => {
  if (!isFloatingMode()) {
    renderWidgetsLayout();
    return;
  }
  activeWidgets.forEach((sel) => {
    const el = allWidgetsMap[sel];
    if (el && el.parentElement === getFloatingLayer())
      clampWidgetToViewport(el);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleFloating = document.getElementById("toggleFloatingWidgets");
  const resetBtn = document.getElementById("resetWidgetPositionsBtn");
  if (toggleFloating) {
    toggleFloating.checked = isFloatingMode();
    toggleFloating.addEventListener("change", () => {
      setFloatingMode(toggleFloating.checked);
      document.body.classList.toggle(
        "widgets-floating",
        toggleFloating.checked,
      );
      renderWidgetsLayout();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearWidgetPositions();
      renderWidgetsLayout();
    });
  }
  loadWidgetSettings();
  document.body.classList.toggle("widgets-floating", isFloatingMode());
  renderWidgetsLayout();
});

document.addEventListener("DOMContentLoaded", () => {
  if (
    !Array.isArray(appTodos) ||
    !appRenderTodos ||
    !appSaveTodos ||
    !appOpenTaskModal ||
    !appOpenTaskViewPanel ||
    !appFmt12
  )
    return;
  const todos = appTodos;
  const renderTodos = appRenderTodos;
  const saveTodos = appSaveTodos;
  const openTaskModal = appOpenTaskModal;
  const openTaskViewPanel = appOpenTaskViewPanel;
  const fmt12 = appFmt12;

  // =========================================================================
  // FULL TASK PANEL
  // =========================================================================
  const fullTaskPanel = document.getElementById("fullTaskPanel");
  const fullTaskBackdrop = document.getElementById("fullTaskBackdrop");
  const closeFullTasksBtn = document.getElementById("closeFullTasksBtn");
  const openFullTasksBtn = document.getElementById("openFullTasksBtn");
  const ftpTaskList = document.getElementById("ftpTaskList");
  const ftpEmpty = document.getElementById("ftpEmpty");
  const ftpSubtitle = document.getElementById("ftpSubtitle");
  const ftpProgressFill = document.getElementById("ftpProgressFill");
  const ftpProgressLabel = document.getElementById("ftpProgressLabel");
  const ftpSearchInput = document.getElementById("ftpSearchInput");
  const ftpAddBtn = document.getElementById("ftpAddBtn");
  const ftpResetBtn = document.getElementById("ftpResetBtn");

  let ftpFilter = "all";

  function openFullTaskPanel() {
    fullTaskPanel.classList.add("open");
    fullTaskBackdrop.classList.add("open");
    renderFullTaskPanel();
    setTimeout(() => ftpSearchInput?.focus(), 300);
  }

  function closeFullTaskPanel() {
    fullTaskPanel.classList.remove("open");
    fullTaskBackdrop.classList.remove("open");
  }

  function renderFullTaskPanel() {
    const query = (ftpSearchInput?.value || "").trim().toLowerCase();
    const total = todos.length;
    const done = todos.filter((t) => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    if (ftpSubtitle)
      ftpSubtitle.textContent = `${today}  ·  ${done}/${total} done`;
    if (ftpProgressFill) ftpProgressFill.style.width = pct + "%";
    if (ftpProgressLabel)
      ftpProgressLabel.textContent = `${done} / ${total} complete`;

    if (!ftpTaskList) return;
    ftpTaskList.innerHTML = "";

    // Filter + search
    const filtered = todos.filter((t, i) => {
      t._idx = i; // keep original index
      const matchFilter =
        ftpFilter === "all" ||
        (ftpFilter === "completed" && t.completed) ||
        (ftpFilter === "pending" && !t.completed);
      const matchSearch =
        !query ||
        t.text.toLowerCase().includes(query) ||
        (t.desc || "").toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      ftpEmpty.style.display = "flex";
      ftpTaskList.style.display = "none";
      return;
    }
    ftpEmpty.style.display = "none";
    ftpTaskList.style.display = "flex";

    // Section labels
    const pending = filtered.filter((t) => !t.completed);
    const completed = filtered.filter((t) => t.completed);

    function renderSection(label, list) {
      if (list.length === 0) return;
      const hdr = document.createElement("div");
      hdr.className = "ftp-section-header";
      hdr.textContent = `${label} — ${list.length}`;
      ftpTaskList.appendChild(hdr);

      list.forEach((todo) => {
        const idx = todos.indexOf(todo);
        const card = document.createElement("div");
        card.className = "ftp-task-card" + (todo.completed ? " completed" : "");
        card.style.animationDelay = `${list.indexOf(todo) * 0.04}s`;

        let timeMeta = "";
        if (todo.startTime || todo.endTime) {
          const s = todo.startTime ? fmt12(todo.startTime) : "--";
          const e = todo.endTime ? fmt12(todo.endTime) : "--";
          timeMeta = `<div class="ftp-card-time">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${s} → ${e}
          </div>`;
        }

        card.innerHTML = `
          <button class="ftp-card-check" title="Toggle complete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <div class="ftp-card-body">
            <div class="ftp-card-title">${todo.text}</div>
            ${todo.desc ? `<div class="ftp-card-desc">${todo.desc}</div>` : ""}
            <div class="ftp-card-meta">${timeMeta}</div>
          </div>
          <div class="ftp-card-actions">
            <button class="ftp-card-del" title="Delete task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        `;

        // Click card body → open side detail view
        card.querySelector(".ftp-card-body").addEventListener("click", () => {
          openTaskViewPanel(idx);
        });

        // Check button → toggle
        card.querySelector(".ftp-card-check").addEventListener("click", (e) => {
          e.stopPropagation();
          todos[idx].completed = !todos[idx].completed;
          saveTodos();
          renderTodos();
          renderFullTaskPanel();
        });

        // Delete
        card.querySelector(".ftp-card-del").addEventListener("click", (e) => {
          e.stopPropagation();
          card.style.opacity = "0";
          card.style.transform = "translateX(30px)";
          card.style.transition = "0.25s ease";
          setTimeout(() => {
            todos.splice(idx, 1);
            saveTodos();
            renderTodos();
            renderFullTaskPanel();
          }, 240);
        });

        ftpTaskList.appendChild(card);
      });
    }

    renderSection("In Progress", pending);
    renderSection("Completed", completed);
  }

  // Open / Close
  openFullTasksBtn?.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent tasksDropdownToggle from firing
    openFullTaskPanel();
  });
  closeFullTasksBtn?.addEventListener("click", closeFullTaskPanel);
  fullTaskBackdrop?.addEventListener("click", closeFullTaskPanel);

  // New Task from inside panel
  ftpAddBtn?.addEventListener("click", () => {
    closeFullTaskPanel();
    setTimeout(() => openTaskModal(), 200);
  });

  // Daily reset from inside panel
  ftpResetBtn?.addEventListener("click", () => {
    if (!confirm("Replace current tasks with your daily defaults?")) return;
    const saved = localStorage.getItem("dashboard_default_tasks");
    let defaults;
    if (saved) {
      try {
        defaults = JSON.parse(saved);
      } catch (e) {}
    }
    if (!defaults)
      defaults = [
        {
          text: "Read Quran (Translation)",
          desc: "Read and learn Quran with Urdu translation from the physical book.",
        },
        {
          text: "Do BCA Learning",
          desc: "Read from NotebookLM AI, review topics for upcoming exams.",
        },
        {
          text: "Explore More (Coding)",
          desc: "Try to explore more in the coding journey.",
        },
        {
          text: "Learn New Concept",
          desc: "Learn a new concept in the current phase.",
        },
        {
          text: "Improve a Project",
          desc: "Refactor, fix, or enhance the current project.",
        },
        {
          text: "Drink Water (7 Glasses)",
          desc: "Drink up to 7 glasses of water (skip if fasting).",
        },
        {
          text: "Read Quran (Arabic Tilawah)",
          desc: "Read Quran in Arabic to improve tilawah.",
        },
      ];
    todos.length = 0;
    defaults.forEach((d) =>
      todos.push({
        text: d.text,
        desc: d.desc || "",
        startTime: "",
        endTime: "",
        completed: false,
      }),
    );
    saveTodos();
    renderTodos();
    renderFullTaskPanel();
  });

  // Filter buttons
  document.querySelectorAll(".ftp-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".ftp-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ftpFilter = btn.dataset.filter;
      renderFullTaskPanel();
    });
  });

  // Search
  ftpSearchInput?.addEventListener("input", () => renderFullTaskPanel());

  // Live sync whenever task state changes from anywhere
  document.addEventListener(TASKS_CHANGED_EVENT, () => {
    if (fullTaskPanel?.classList.contains("open")) renderFullTaskPanel();
  });
});

// =========================================================================
// DEDICATED SALAH PANEL (bottom slide-up with large checkboxes + heatmap)
// =========================================================================
(function initSalahDedicatedPanel() {
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const STORAGE_KEY = "dashboard_salah_history";
  const DAYS_SHOWN = 28;

  function dateKey(d) {
    return d.toISOString().slice(0, 10);
  }
  function todayKey() {
    return dateKey(new Date());
  }
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveHistory(h) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  }
  function todayDone() {
    return loadHistory()[todayKey()] || {};
  }

  const panel = document.getElementById("salahPanel");
  const backdrop = document.getElementById("salahPanelBackdrop");
  const openBtn = document.getElementById("openSalahPanelBtn");
  const closeBtn = document.getElementById("closeSalahPanelBtn");
  const resetBtn = document.getElementById("salahPanelResetBtn");
  const dateEl = document.getElementById("salahPanelDate");
  const grid = document.getElementById("salahPanelGrid");

  function openPanel() {
    panel.classList.add("open");
    backdrop.classList.add("open");
    syncUI();
    renderPanelHeatmap();
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  }
  function closePanel() {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
  }

  openBtn?.addEventListener("click", openPanel);
  closeBtn?.addEventListener("click", closePanel);
  backdrop?.addEventListener("click", closePanel);
  resetBtn?.addEventListener("click", () => {
    const h = loadHistory();
    h[todayKey()] = {};
    saveHistory(h);
    syncUI();
    renderPanelHeatmap();
    // Also sync the widget heatmap if visible
    document.dispatchEvent(new CustomEvent("salahStateChanged"));
  });

  function syncUI() {
    const done = todayDone();
    prayers.forEach((p) => {
      const item = document.querySelector(
        `#salahPanel .salah-panel-item[data-prayer="${p}"]`,
      );
      if (!item) return;
      item.classList.toggle("done", !!done[p]);
    });
  }

  // Wire each prayer card as a toggle
  prayers.forEach((p) => {
    const item = document.querySelector(
      `#salahPanel .salah-panel-item[data-prayer="${p}"]`,
    );
    if (!item) return;
    item.addEventListener("click", () => {
      const h = loadHistory();
      if (!h[todayKey()]) h[todayKey()] = {};
      h[todayKey()][p] = !h[todayKey()][p];
      saveHistory(h);
      syncUI();
      renderPanelHeatmap();
      // Sync main widget too
      document.dispatchEvent(new CustomEvent("salahStateChanged"));
    });
  });

  function renderPanelHeatmap() {
    if (!grid) return;
    grid.innerHTML = "";
    const history = loadHistory();
    const days = [];
    for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(dateKey(d));
    }
    days.forEach((dk) => {
      const col = document.createElement("div");
      col.className = "salah-panel-heatmap-col";
      const dayData = history[dk] || {};
      const isToday = dk === todayKey();
      prayers.forEach((p) => {
        const cell = document.createElement("div");
        cell.className = "salah-panel-heatmap-cell";
        if (dayData[p]) cell.classList.add("done");
        if (isToday) cell.classList.add("today");
        const dateLabel = new Date(dk + "T12:00:00").toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        );
        cell.title = `${p} · ${dateLabel} · ${dayData[p] ? "✓ Prayed" : "✗ Missed"}`;
        col.appendChild(cell);
      });
      grid.appendChild(col);
    });
  }

  // Listen for salahStateChanged from the mini widget to sync panel state
  document.addEventListener("salahStateChanged", () => {
    syncUI();
    renderPanelHeatmap();
  });
})();

// --- SETTINGS: DANGEROUS TAB DB RESET ---
document.addEventListener("DOMContentLoaded", () => {
  const resetMediaDbBtn = document.getElementById("resetMediaDbBtn");
  if (resetMediaDbBtn) {
    resetMediaDbBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete all uploaded photos and videos? This cannot be undone.")) {
        const req1 = indexedDB.deleteDatabase("LiveImageDB");
        const req2 = indexedDB.deleteDatabase("LiveWallpaperDB");
        
        let done = 0;
        const checkDone = () => {
          done++;
          if (done === 2) {
            alert("Media databases cleared. Reloading page...");
            window.location.reload();
          }
        };
        req1.onsuccess = checkDone;
        req1.onerror = checkDone;
        req2.onsuccess = checkDone;
        req2.onerror = checkDone;
      }
    });
  }
});

// =========================================================================
// DYNAMIC CATEGORY NAVIGATION & AUTOMATIC FAVICON BOOKMARKS
// =========================================================================
(() => {
  const STORAGE_KEY = "dashboard_nav_categories";

  const DEFAULT_CATEGORIES = [
    {
      id: "ai-tools",
      name: "AI Tools",
      isCustom: false,
      iconType: "svg",
      iconValue: `<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />`,
      links: [
        { id: "ai-1", title: "ChatGPT", url: "https://chat.openai.com", icon: "https://i.ibb.co/8L2NpgCj/icons8-chatgpt-50.png", invertDark: true },
        { id: "ai-2", title: "Claude", url: "https://claude.ai", icon: "https://i.ibb.co/CKymL1Wv/icons8-claude-48.png" },
        { id: "ai-3", title: "Gemini", url: "https://gemini.google.com", icon: "https://i.ibb.co/bjFT9QRV/icons8-gemini-ai-48.png" },
        { id: "ai-4", title: "NotebookLM", url: "https://notebooklm.google.com", icon: "https://i.ibb.co/3y8KPmCd/notebooklm-icon.png", invertDark: true }
      ]
    },
    {
      id: "developer",
      name: "Developer",
      isCustom: false,
      iconType: "svg",
      iconValue: `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`,
      links: [
        { id: "dev-1", title: "GitHub", url: "https://github.com", icon: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg", invertDark: true },
        { id: "dev-2", title: "MDN Docs", url: "https://developer.mozilla.org", icon: "https://i.ibb.co/1fntyTBY/favicon.png" },
        { id: "dev-3", title: "LeetCode", url: "https://leetcode.com/", icon: "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png", invertDark: true },
        { id: "dev-4", title: "GeeksforGeeks", url: "https://www.geeksforgeeks.org", icon: "https://i.ibb.co/s9f8MrYJ/gfg-favicon.png" }
      ]
    },
    {
      id: "design",
      name: "Design",
      isCustom: false,
      iconType: "svg",
      iconValue: `<path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle>`,
      links: [
        { id: "des-1", title: "Figma", url: "https://www.figma.com", icon: "https://i.ibb.co/CsWt942s/icons8-figma-48.png" },
        { id: "des-2", title: "Dribbble", url: "https://dribbble.com/", icon: "https://i.ibb.co/tP8358HN/dribbble.png" },
        { id: "des-3", title: "Behance", url: "https://behance.net/", icon: "https://i.ibb.co/dsGZZcPk/icons8-behance-48.png" },
        { id: "des-4", title: "Mobbin", url: "https://mobbin.com/", icon: "https://i.ibb.co/5g6xS8SK/mobbin-icon.png", invertDark: true }
      ]
    },
    {
      id: "social",
      name: "Social",
      isCustom: false,
      iconType: "svg",
      iconValue: `<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>`,
      links: [
        { id: "soc-1", title: "YouTube", url: "https://www.youtube.com", icon: "https://i.ibb.co/hR0btBW7/icons8-youtube-48.png" },
        { id: "soc-2", title: "LinkedIn", url: "https://www.linkedin.com", icon: "https://i.ibb.co/cSxZxKQ1/linkedin.png" },
        { id: "soc-3", title: "X.com", url: "https://www.x.com", icon: "https://i.ibb.co/C3gsCdvB/icons8-x-50.png", invertDark: true },
        { id: "soc-4", title: "Gmail", url: "https://mail.google.com/", icon: "https://i.ibb.co/VYPLZfsR/gmail.png" }
      ]
    }
  ];

  const PRESET_ICONS = {
    sparkle: { type: "emoji", value: "✨" },
    globe: { type: "svg", value: `<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>` },
    briefcase: { type: "svg", value: `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>` },
    gamepad: { type: "svg", value: `<line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="6"></rect>` },
    film: { type: "svg", value: `<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line>` },
    music: { type: "svg", value: `<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>` },
    newspaper: { type: "svg", value: `<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path>` },
    shopping: { type: "svg", value: `<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>` },
    book: { type: "svg", value: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>` },
    rocket: { type: "svg", value: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>` },
    zap: { type: "svg", value: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>` },
    heart: { type: "svg", value: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>` }
  };

  function loadCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load custom categories:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  }

  function saveCategories(categories) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error("Failed to save categories:", e);
    }
  }

  function getFaviconCandidates(rawUrl, customIcon) {
    if (customIcon && customIcon.trim()) {
      return [customIcon.trim()];
    }
    if (!rawUrl) return [];
    let url = rawUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try {
      const parsed = new URL(url);
      const origin = parsed.origin;
      const domain = parsed.hostname;
      return [
        `${origin}/favicon.ico`,
        `${origin}/favicon.png`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`
      ];
    } catch (e) {
      return [];
    }
  }

  function getFaviconUrl(rawUrl, customIcon) {
    const list = getFaviconCandidates(rawUrl, customIcon);
    return list.length > 0 ? list[0] : "";
  }

  function suggestTitleFromUrl(rawUrl) {
    if (!rawUrl) return "";
    let url = rawUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try {
      const parsed = new URL(url);
      let host = parsed.hostname.replace(/^www\./, "");
      let parts = host.split(".");
      let name = parts[0] || host;
      if (name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    } catch (e) {}
    return "";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let categories = loadCategories();
  let selectedIconPreset = "sparkle";

  let draggedCategoryId = null;
  let draggedLinkId = null;
  let draggedFromCatId = null;
  let isDraggingLinkActive = false;

  function renderCategoryNav(keepOpenCatId = null) {
    const nav = document.getElementById("categoryNav");
    if (!nav) return;

    nav.classList.remove("is-reordering");
    nav.innerHTML = "";

    categories.forEach((cat) => {
      const group = document.createElement("div");
      group.className = "nav-group";
      group.dataset.categoryId = cat.id;
      group.draggable = true;

      // Keep tab open if requested (e.g. after drag-and-drop or item modification)
      if (keepOpenCatId && cat.id === keepOpenCatId) {
        group.classList.add("is-open");
      }

      // Automatically close tab when cursor leaves the category area
      group.addEventListener("mouseleave", () => {
        group.classList.remove("is-open");
      });

      // Category Pill Drag & Drop
      group.addEventListener("dragstart", (e) => {
        if (e.target.closest(".nav-dropdown")) return;
        draggedCategoryId = cat.id;
        e.dataTransfer.setData("text/plain", cat.id);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => {
          group.classList.add("is-dragging-category");
          nav.classList.add("is-reordering");
        }, 0);
      });

      group.addEventListener("dragend", () => {
        draggedCategoryId = null;
        group.classList.remove("is-dragging-category");
        nav.classList.remove("is-reordering");
        document.querySelectorAll(".nav-group").forEach((g) => {
          g.classList.remove("drag-target-left", "drag-target-right");
        });
      });

      group.addEventListener("dragover", (e) => {
        if (draggedCategoryId && draggedCategoryId !== cat.id) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = group.getBoundingClientRect();
          const isRight = (e.clientX - rect.left) > (rect.width / 2);
          group.classList.toggle("drag-target-left", !isRight);
          group.classList.toggle("drag-target-right", isRight);
        } else if (draggedLinkId && draggedFromCatId !== cat.id) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          trigger.classList.add("drag-target-pill");
        }
      });

      group.addEventListener("dragleave", () => {
        group.classList.remove("drag-target-left", "drag-target-right");
        trigger.classList.remove("drag-target-pill");
      });

      group.addEventListener("drop", (e) => {
        if (draggedCategoryId && draggedCategoryId !== cat.id) {
          e.preventDefault();
          const rect = group.getBoundingClientRect();
          const isRight = (e.clientX - rect.left) > (rect.width / 2);
          const fromIndex = categories.findIndex((c) => c.id === draggedCategoryId);
          const toIndex = categories.findIndex((c) => c.id === cat.id);

          if (fromIndex !== -1 && toIndex !== -1) {
            const [movedCat] = categories.splice(fromIndex, 1);
            const newTargetIndex = categories.findIndex((c) => c.id === cat.id);
            const insertIndex = isRight ? newTargetIndex + 1 : newTargetIndex;
            categories.splice(insertIndex, 0, movedCat);
            saveCategories(categories);
            renderCategoryNav(movedCat.id);
          }
        } else if (draggedLinkId && draggedFromCatId !== cat.id) {
          e.preventDefault();
          e.stopPropagation();
          trigger.classList.remove("drag-target-pill");
          const sourceCat = categories.find((c) => c.id === draggedFromCatId);
          if (sourceCat) {
            const linkIdx = sourceCat.links.findIndex((l) => l.id === draggedLinkId);
            if (linkIdx !== -1) {
              const [movedLink] = sourceCat.links.splice(linkIdx, 1);
              if (!cat.links) cat.links = [];
              cat.links.push(movedLink);
              saveCategories(categories);
              renderCategoryNav(cat.id);
            }
          }
        }
      });

      // Trigger Button
      const trigger = document.createElement("button");
      trigger.className = "nav-trigger";
      trigger.type = "button";

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = group.classList.contains("is-open");
        document.querySelectorAll(".nav-group.is-open").forEach((g) => g.classList.remove("is-open"));
        if (!wasOpen) group.classList.add("is-open");
      });

      let iconHtml = "";
      if (cat.iconType === "emoji") {
        iconHtml = `<span class="nav-trigger-custom-icon">${escapeHtml(cat.iconValue || "✨")}</span>`;
      } else {
        iconHtml = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cat.iconValue}</svg>`;
      }

      trigger.innerHTML = `${iconHtml}<span>${escapeHtml(cat.name)}</span>`;
      group.appendChild(trigger);

      // Dropdown
      const dropdown = document.createElement("div");
      dropdown.className = "nav-dropdown custom-scrollbar";

      // Dropdown Header
      const headerRow = document.createElement("div");
      headerRow.className = "dropdown-cat-header";
      headerRow.innerHTML = `<span class="dropdown-cat-title">${escapeHtml(cat.name)}</span>`;
      if (cat.isCustom) {
        const delCatBtn = document.createElement("button");
        delCatBtn.type = "button";
        delCatBtn.className = "dropdown-cat-del-btn";
        delCatBtn.title = `Delete "${cat.name}" category`;
        delCatBtn.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        `;
        delCatBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(`Delete category "${cat.name}" and all its bookmarks?`)) {
            categories = categories.filter((c) => c.id !== cat.id);
            saveCategories(categories);
            renderCategoryNav();
          }
        });
        headerRow.appendChild(delCatBtn);
      }
      dropdown.appendChild(headerRow);

      // Dropdown Links
      const links = cat.links || [];
      links.forEach((link) => {
        const wrap = document.createElement("div");
        wrap.className = "dropdown-item-wrap";
        wrap.draggable = true;

        // Subtle grip handle
        const grip = document.createElement("span");
        grip.className = "dropdown-drag-grip";
        grip.title = "Drag to reorder";
        grip.innerHTML = `
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2.5" cy="2.5" r="1.2"></circle>
            <circle cx="7.5" cy="2.5" r="1.2"></circle>
            <circle cx="2.5" cy="7" r="1.2"></circle>
            <circle cx="7.5" cy="7" r="1.2"></circle>
            <circle cx="2.5" cy="11.5" r="1.2"></circle>
            <circle cx="7.5" cy="11.5" r="1.2"></circle>
          </svg>
        `;
        wrap.appendChild(grip);

        // Link item Drag & Drop
        wrap.addEventListener("dragstart", (e) => {
          e.stopPropagation();
          draggedLinkId = link.id;
          draggedFromCatId = cat.id;
          isDraggingLinkActive = true;
          e.dataTransfer.setData("application/x-link-id", link.id);
          e.dataTransfer.setData("application/x-cat-id", cat.id);
          e.dataTransfer.effectAllowed = "move";
          setTimeout(() => {
            wrap.classList.add("is-dragging-link");
          }, 0);
        });

        wrap.addEventListener("dragend", () => {
          draggedLinkId = null;
          draggedFromCatId = null;
          wrap.classList.remove("is-dragging-link");
          document.querySelectorAll(".dropdown-item-wrap").forEach((w) => {
            w.classList.remove("drag-target-top", "drag-target-bottom");
          });
          setTimeout(() => {
            isDraggingLinkActive = false;
          }, 120);
        });

        wrap.addEventListener("dragover", (e) => {
          if (!draggedLinkId || draggedLinkId === link.id) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";

          const rect = wrap.getBoundingClientRect();
          const isBelow = (e.clientY - rect.top) > (rect.height / 2);
          wrap.classList.toggle("drag-target-top", !isBelow);
          wrap.classList.toggle("drag-target-bottom", isBelow);
        });

        wrap.addEventListener("dragleave", () => {
          wrap.classList.remove("drag-target-top", "drag-target-bottom");
        });

        wrap.addEventListener("drop", (e) => {
          if (!draggedLinkId || draggedLinkId === link.id) return;
          e.preventDefault();
          e.stopPropagation();

          const rect = wrap.getBoundingClientRect();
          const isBelow = (e.clientY - rect.top) > (rect.height / 2);

          const sourceCat = categories.find((c) => c.id === draggedFromCatId);
          const targetCat = categories.find((c) => c.id === cat.id);

          if (sourceCat && targetCat) {
            const linkIdx = sourceCat.links.findIndex((l) => l.id === draggedLinkId);
            if (linkIdx !== -1) {
              const [movedLink] = sourceCat.links.splice(linkIdx, 1);
              const targetIdx = targetCat.links.findIndex((l) => l.id === link.id);
              const insertIdx = isBelow ? targetIdx + 1 : targetIdx;
              targetCat.links.splice(insertIdx, 0, movedLink);
              saveCategories(categories);
              renderCategoryNav(cat.id);
            }
          }
        });

        const a = document.createElement("a");
        a.href = link.url;
        a.className = "dropdown-item";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.addEventListener("click", (e) => {
          if (isDraggingLinkActive) e.preventDefault();
        });

        const candidates = getFaviconCandidates(link.url, link.icon);
        const firstLetter = (link.title || "W").charAt(0).toUpperCase();

        if (candidates.length > 0) {
          const img = document.createElement("img");
          img.alt = link.title;
          if (link.invertDark) img.classList.add("invert-dark");
          img.dataset.candIndex = "0";
          img.src = candidates[0];

          img.onerror = function () {
            let nextIdx = parseInt(this.dataset.candIndex || "0", 10) + 1;
            if (nextIdx < candidates.length) {
              this.dataset.candIndex = String(nextIdx);
              this.src = candidates[nextIdx];
            } else {
              const badge = document.createElement("span");
              badge.className = "dropdown-item-letter-icon";
              badge.textContent = firstLetter;
              if (this.parentNode) {
                this.parentNode.replaceChild(badge, this);
              }
            }
          };
          a.appendChild(img);
        } else {
          const badge = document.createElement("span");
          badge.className = "dropdown-item-letter-icon";
          badge.textContent = firstLetter;
          a.appendChild(badge);
        }

        const span = document.createElement("span");
        span.textContent = link.title;
        a.appendChild(span);
        wrap.appendChild(a);

        // Actions container for link (Edit + Delete)
        const actions = document.createElement("div");
        actions.className = "dropdown-item-actions";

        // Edit button for link
        const editLinkBtn = document.createElement("button");
        editLinkBtn.type = "button";
        editLinkBtn.className = "dropdown-item-action-btn edit-btn";
        editLinkBtn.title = `Edit "${link.title}"`;
        editLinkBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        `;
        editLinkBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          openLinkModal(cat.id, cat.name, link);
        });
        actions.appendChild(editLinkBtn);

        // Delete button for link
        const delLinkBtn = document.createElement("button");
        delLinkBtn.type = "button";
        delLinkBtn.className = "dropdown-item-action-btn delete-btn";
        delLinkBtn.title = `Remove "${link.title}"`;
        delLinkBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        delLinkBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          cat.links = cat.links.filter((l) => l.id !== link.id);
          saveCategories(categories);
          renderCategoryNav(cat.id);
        });
        actions.appendChild(delLinkBtn);

        wrap.appendChild(actions);

        dropdown.appendChild(wrap);
      });

      // "+ Add Website" Button
      const addLinkBtn = document.createElement("button");
      addLinkBtn.type = "button";
      addLinkBtn.className = "dropdown-add-btn";
      addLinkBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Website
      `;
      addLinkBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openLinkModal(cat.id, cat.name);
      });
      dropdown.appendChild(addLinkBtn);

      group.appendChild(dropdown);
      nav.appendChild(group);
    });

    // "+ Add Category" Button at end of Nav
    const addCatBtn = document.createElement("button");
    addCatBtn.type = "button";
    addCatBtn.id = "addCategoryBtn";
    addCatBtn.className = "nav-add-category-btn";
    addCatBtn.title = "Add New Category";
    addCatBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    addCatBtn.addEventListener("click", openCategoryModal);
    nav.appendChild(addCatBtn);
  }

  // --- CATEGORY MODAL LOGIC ---
  const catModal = document.getElementById("categoryModal");
  const closeCatBtn = document.getElementById("closeCategoryModalBtn");
  const cancelCatBtn = document.getElementById("cancelCategoryBtn");
  const saveCatBtn = document.getElementById("saveCategoryBtn");
  const catNameInput = document.getElementById("categoryNameInput");
  const catEmojiInput = document.getElementById("categoryCustomEmojiInput");
  const presetChips = document.querySelectorAll("#categoryIconPresets .icon-preset-chip");

  function openCategoryModal() {
    if (!catModal) return;
    catNameInput.value = "";
    catEmojiInput.value = "";
    selectedIconPreset = "sparkle";
    presetChips.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.icon === selectedIconPreset);
    });
    catModal.style.display = "flex";
    setTimeout(() => catNameInput.focus(), 50);
  }

  function closeCategoryModal() {
    if (!catModal) return;
    catModal.style.display = "none";
  }

  closeCatBtn?.addEventListener("click", closeCategoryModal);
  cancelCatBtn?.addEventListener("click", closeCategoryModal);
  catModal?.addEventListener("click", (e) => {
    if (e.target === catModal) closeCategoryModal();
  });

  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      presetChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedIconPreset = chip.dataset.icon;
      catEmojiInput.value = "";
    });
  });

  catEmojiInput?.addEventListener("input", () => {
    if (catEmojiInput.value.trim()) {
      presetChips.forEach((c) => c.classList.remove("active"));
    }
  });

  saveCatBtn?.addEventListener("click", () => {
    const name = catNameInput.value.trim();
    if (!name) {
      catNameInput.focus();
      catNameInput.style.borderColor = "var(--accent-rose, #ef4444)";
      setTimeout(() => (catNameInput.style.borderColor = ""), 1500);
      return;
    }

    const customEmoji = catEmojiInput.value.trim();
    let iconType = "svg";
    let iconValue = "";

    if (customEmoji) {
      iconType = "emoji";
      iconValue = customEmoji;
    } else {
      const preset = PRESET_ICONS[selectedIconPreset] || PRESET_ICONS.sparkle;
      iconType = preset.type;
      iconValue = preset.value;
    }

    const newCat = {
      id: "cat-" + Date.now(),
      name: name,
      isCustom: true,
      iconType: iconType,
      iconValue: iconValue,
      links: []
    };

    categories.push(newCat);
    saveCategories(categories);
    renderCategoryNav();
    closeCategoryModal();
  });

  catNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveCatBtn.click();
    }
  });

  // --- WEBSITE / LINK MODAL LOGIC ---
  const linkModal = document.getElementById("linkModal");
  const closeLinkBtn = document.getElementById("closeLinkModalBtn");
  const cancelLinkBtn = document.getElementById("cancelLinkBtn");
  const saveLinkBtn = document.getElementById("saveLinkBtn");
  const saveLinkBtnText = document.getElementById("saveLinkBtnText");
  const targetCatInput = document.getElementById("targetCategoryId");
  const editingLinkId = document.getElementById("editingLinkId");
  const linkModalTitle = document.getElementById("linkModalTitle");
  const linkUrlInput = document.getElementById("linkUrlInput");
  const linkTitleInput = document.getElementById("linkTitleInput");
  const linkIconInput = document.getElementById("linkIconInput");
  const previewImg = document.getElementById("linkFaviconPreview");
  const fallbackSvg = document.getElementById("linkFaviconFallback");

  let urlDebounceTimer = null;

  function updateFaviconPreview(rawUrl, customIcon) {
    const candidates = getFaviconCandidates(rawUrl, customIcon);
    if (!candidates || candidates.length === 0) {
      previewImg.style.display = "none";
      fallbackSvg.style.display = "block";
      return;
    }

    let candIdx = 0;
    function tryNext() {
      if (candIdx >= candidates.length) {
        previewImg.style.display = "none";
        fallbackSvg.style.display = "block";
        return;
      }
      previewImg.src = candidates[candIdx];
    }

    previewImg.onload = () => {
      previewImg.style.display = "block";
      fallbackSvg.style.display = "none";
    };

    previewImg.onerror = () => {
      candIdx++;
      tryNext();
    };

    tryNext();
  }

  function openLinkModal(categoryId, categoryName, linkToEdit = null) {
    if (!linkModal) return;
    targetCatInput.value = categoryId;
    if (editingLinkId) editingLinkId.value = linkToEdit ? linkToEdit.id : "";

    if (linkToEdit) {
      linkModalTitle.textContent = `Edit "${linkToEdit.title}"`;
      linkUrlInput.value = linkToEdit.url || "";
      linkTitleInput.value = linkToEdit.title || "";
      if (linkIconInput) linkIconInput.value = linkToEdit.icon || "";
      if (saveLinkBtnText) saveLinkBtnText.textContent = "Save Changes";
      updateFaviconPreview(linkToEdit.url, linkToEdit.icon);
    } else {
      linkModalTitle.textContent = `Add Website to "${categoryName}"`;
      linkUrlInput.value = "";
      linkTitleInput.value = "";
      if (linkIconInput) linkIconInput.value = "";
      if (saveLinkBtnText) saveLinkBtnText.textContent = "Add Website";
      previewImg.style.display = "none";
      fallbackSvg.style.display = "block";
    }

    linkModal.style.display = "flex";
    setTimeout(() => linkUrlInput.focus(), 50);
  }

  function closeLinkModal() {
    if (!linkModal) return;
    linkModal.style.display = "none";
  }

  closeLinkBtn?.addEventListener("click", closeLinkModal);
  cancelLinkBtn?.addEventListener("click", closeLinkModal);
  linkModal?.addEventListener("click", (e) => {
    if (e.target === linkModal) closeLinkModal();
  });

  function handleLinkModalInputs() {
    clearTimeout(urlDebounceTimer);
    urlDebounceTimer = setTimeout(() => {
      const val = linkUrlInput ? linkUrlInput.value.trim() : "";
      const customIcon = linkIconInput ? linkIconInput.value.trim() : "";
      updateFaviconPreview(val, customIcon);
      if (!linkTitleInput.value.trim() && val) {
        const suggested = suggestTitleFromUrl(val);
        if (suggested) linkTitleInput.value = suggested;
      }
    }, 200);
  }

  linkUrlInput?.addEventListener("input", handleLinkModalInputs);
  linkIconInput?.addEventListener("input", handleLinkModalInputs);

  saveLinkBtn?.addEventListener("click", () => {
    const catId = targetCatInput.value;
    const editId = editingLinkId ? editingLinkId.value : "";
    let url = linkUrlInput.value.trim();
    if (!url) {
      linkUrlInput.focus();
      linkUrlInput.style.borderColor = "var(--accent-rose, #ef4444)";
      setTimeout(() => (linkUrlInput.style.borderColor = ""), 1500);
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    let title = linkTitleInput.value.trim();
    if (!title) {
      title = suggestTitleFromUrl(url) || "Website";
    }

    const customIcon = linkIconInput ? linkIconInput.value.trim() : "";

    const cat = categories.find((c) => c.id === catId);
    if (!cat) {
      closeLinkModal();
      return;
    }

    if (!cat.links) cat.links = [];

    if (editId) {
      const existing = cat.links.find((l) => l.id === editId);
      if (existing) {
        existing.title = title;
        existing.url = url;
        existing.icon = customIcon;
      }
    } else {
      cat.links.push({
        id: "link-" + Date.now(),
        title: title,
        url: url,
        icon: customIcon
      });
    }

    saveCategories(categories);
    renderCategoryNav(cat.id);
    closeLinkModal();
  });

  [linkUrlInput, linkTitleInput, linkIconInput].forEach((input) => {
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveLinkBtn.click();
      }
    });
  });

  // Dismiss any pinned open tabs when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-group") && !e.target.closest(".modal-overlay")) {
      document.querySelectorAll(".nav-group.is-open").forEach((g) => g.classList.remove("is-open"));
    }
  });

  // Initial render when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderCategoryNav());
  } else {
    renderCategoryNav();
  }
})();

