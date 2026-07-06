const searchBar = document.getElementById("searchBar");
const suggestionsBox = document.getElementById("suggestionsBox");

let searchEngine = "DEF";

const engineButtons = document.querySelectorAll(".searchEngines .engine");
const saveToggle = document.getElementById("switch-on-off");

const ENGINE_KEY = "preferredEngine";
const SAVE_KEY = "saveEngineEnabled";

(function initEngine() {
  const saveEnabled = localStorage.getItem(SAVE_KEY) === "true";
  saveToggle.checked = saveEnabled;

  if (saveEnabled) {
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
    if (saveToggle.checked) {
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

saveToggle.addEventListener("change", () => {
  localStorage.setItem(SAVE_KEY, saveToggle.checked);
  if (saveToggle.checked) {
    localStorage.setItem(ENGINE_KEY, searchEngine);
  } else {
    localStorage.removeItem(ENGINE_KEY);
  }
});

window.handleSuggestions = function (data) {
  let suggestions = [];
  if (data && Array.isArray(data[1])) {
    // Extract suggestions: handle both flat string arrays and nested arrays
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
    
    // Use Google's suggest API with client=chrome for valid JSONP
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

  const copyAndOpen = (targetUrl) => {
    navigator.clipboard
      .writeText(query)
      .then(() => window.open(targetUrl, "_blank"))
      .catch(() => window.open(targetUrl, "_blank"));
  };

  switch (activeEngine) {
    case "GPT":
      url = `https://chatgpt.com/?q=${encodedQuery}&hints=search`;
      break;

    case "PERP":
      url = `https://www.perplexity.ai/search?q=${encodedQuery}`;
      break;

    case "GEM":
      copyAndOpen("https://gemini.google.com/app");
      return;

    case "CLAUDE":
      copyAndOpen("https://claude.ai/new");
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
function updateClock() {
  const now = new Date();
  document.getElementById("clockTime").textContent = now.toLocaleTimeString();
  document.getElementById("clockDate").textContent = now.toLocaleDateString(
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
  motivText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
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

function updatePrayerTracker() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSecondsTotal = currentMinutes * 60 + now.getSeconds();

  let nextPrayer = null;
  let nextPrayerSeconds = 0;

  for (let i = 0; i < pNames.length; i++) {
    const p = pNames[i];
    const parts = prayerTimes[p].split(":");
    const pSecsTotal = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 60;

    const node = document.getElementById(`node-${p}`);
    if (node) node.className = "t-node";

    if (pSecsTotal > currentSecondsTotal && !nextPrayer) {
      nextPrayer = p;
      nextPrayerSeconds = pSecsTotal;
      if (node) node.classList.add("active");
    } else if (pSecsTotal <= currentSecondsTotal) {
      if (node) node.classList.add("passed");
    }
  }

  if (!nextPrayer) {
    nextPrayer = "Fajr";
    const parts = prayerTimes["Fajr"].split(":");
    nextPrayerSeconds =
      24 * 3600 + (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 60;
    const node = document.getElementById(`node-Fajr`);
    if (node) {
      node.classList.remove("passed");
      node.classList.add("active");
    }
  }

  const diff = nextPrayerSeconds - currentSecondsTotal;
  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");

  const countdownEl = document.getElementById("prayerCountdownTime");
  const widgetPrayer = document.querySelector(".widget-prayer");

  if (countdownEl) {
    countdownEl.innerText = `${h} : ${m} : ${s}`;

    if (diff <= 1200 && diff > 0) {
      countdownEl.classList.add("prayer-alert-text");
      if (widgetPrayer) widgetPrayer.classList.add("prayer-alert-glow");
    } else {
      countdownEl.classList.remove("prayer-alert-text");
      if (widgetPrayer) widgetPrayer.classList.remove("prayer-alert-glow");
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

  const prog = document.getElementById("prayerProgress");
  if (prog) prog.style.width = pct + "%";
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

function updateStopwatchDisplay() {
  const h = String(Math.floor(stopwatchSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((stopwatchSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(stopwatchSeconds % 60).padStart(2, "0");
  document.getElementById("stopwatchTime").textContent = `${h}:${m}:${s}`;
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
// Weather
const apikey = "dd35574ca84c015a1ec4acd1de4a5dd3";
const city = "dehradun";
const apiUrl = `https://api.openweathermap.org/data/2.5/weather?&units=metric&q=${city}&appid=${apikey}`;

async function fetchWeather() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
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
  video.preload = "metadata";
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
  const img = document.createElement("img");
  img.src = url;
  img.loading = "lazy";
  div.appendChild(img);
  
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
uploadVideoDiv.innerHTML = "<span>+ Add Videos</span>";

const videoFileInput = document.createElement("input");
videoFileInput.type = "file";
videoFileInput.accept = "video/mp4, video/webm, video/ogg";
videoFileInput.multiple = true;
videoFileInput.style.display = "none";

uploadVideoDiv.appendChild(videoFileInput);
liveWallpapersCont.appendChild(uploadVideoDiv);

uploadVideoDiv.addEventListener("click", () => {
  videoFileInput.click();
});

function addUploadedVideoToUI(id, url) {
  const div = document.createElement("div");
  div.className = "videoOpt";
  div.dataset.val = id;
  const video = document.createElement("video");
  video.src = `${url}#t=0.1`;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  div.appendChild(video);
  
  liveWallpapersCont.insertBefore(div, uploadVideoDiv);
  
  div.addEventListener("click", () => {
    setVideoBackground(id);
  });
  videoOpts = document.querySelectorAll(".videoOpt");
}

videoFileInput.addEventListener("change", async (e) => {
  const files = e.target.files;
  for (let file of files) {
    if (file.type.startsWith("video/")) {
      const id = "uploaded_video_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      await saveVideoToDB(id, file);
      const url = URL.createObjectURL(file);
      uploadedVideosMap[id] = url;
      addUploadedVideoToUI(id, url);
    }
  }
});
// --------------------------------
const bgLayer = document.querySelector(".bg-layer");
const body = document.body;

function applyLayerVisibility(hasVideo, hasImage) {
  if (hasVideo) {
    bgVideoFrame.style.display = "block";
    body.style.backgroundImage = "none";
    bgLayer.style.opacity = "0";
  } else if (hasImage) {
    bgVideoFrame.style.display = "none";
    bgVideoFrame.src = "";
    bgLayer.style.opacity = "0";
  } else {
    bgVideoFrame.style.display = "none";
    bgVideoFrame.src = "";
    bgLayer.style.opacity = "1";
    body.style.backgroundImage = "none";
  }
}

function setStaticBackground(type, val) {
  videoOpts.forEach((opt) => opt.classList.remove("active"));
  localStorage.removeItem("dashboard_bg_video");

  staticOpts.forEach((opt) => opt.classList.remove("active"));
  const activeOpt = Array.from(staticOpts).find((o) => o.dataset.val === val);
  if (activeOpt) activeOpt.classList.add("active");

  if (type === "color") {
    body.style.backgroundColor = val;
    applyLayerVisibility(false, false);
  } else if (type === "image") {
    body.style.backgroundColor = "#000";
    const actualUrl = uploadedImagesMap[val] || val;
    body.style.backgroundImage = `url('${actualUrl}')`;
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    applyLayerVisibility(false, true);
  }

  localStorage.setItem("dashboard_bg_static", JSON.stringify({ type, val }));
}

function setVideoBackground(val) {
  staticOpts.forEach((opt) => opt.classList.remove("active"));
  localStorage.removeItem("dashboard_bg_static");

  const actualUrl = uploadedVideosMap[val] || val;
  bgVideoFrame.src = actualUrl;
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
    setVideoBackground(savedVideo);
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

let activeWidgets = [];
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

function ensureWidgetCloseButtons() {
  Object.entries(allWidgetsMap).forEach(([sel, el]) => {
    if (!el) return;
    if (el.querySelector(".widget-close-btn")) return;
    const closeBtn = document.createElement("button");
    closeBtn.className = "widget-close-btn";
    closeBtn.type = "button";
    closeBtn.title = "Hide widget";
    closeBtn.setAttribute("aria-label", "Hide widget");
    closeBtn.dataset.widgetSel = sel;
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      activeWidgets = activeWidgets.filter((w) => w !== sel);
      renderWidgetsLayout();
    });
    el.appendChild(closeBtn);
  });
}

function ensureDragHandle(el, sel) {
  if (!isFloatingMode() || el.querySelector(".widget-drag-handle")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "widget-drag-handle";
  btn.title = "Drag to move";
  btn.setAttribute("aria-label", "Drag to move");
  btn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
  btn.addEventListener("click", (e) => e.preventDefault());
  el.insertBefore(btn, el.firstChild);
  bindWidgetDrag(el, sel, btn);
}

const dragBindings = new WeakSet();

function bindWidgetDrag(el, sel, handle) {
  if (dragBindings.has(handle)) return;
  dragBindings.add(handle);

  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
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
    const left =
      saved && typeof saved.left === "number" ? saved.left : def.left;
    const top = saved && typeof saved.top === "number" ? saved.top : def.top;
    const width =
      saved && typeof saved.width === "number" ? saved.width : def.width;
    el.style.left = `${Math.min(left, window.innerWidth - 40)}px`;
    el.style.top = `${Math.min(top, window.innerHeight - 40)}px`;
    el.style.width = `${Math.min(width, window.innerWidth - 16)}px`;
    layer.appendChild(el);
    ensureDragHandle(el, sel);
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
    const h = w.querySelector(".widget-drag-handle");
    if (h) h.remove();
    w.remove();
  });

  const rightBatch = [];
  const leftBatch = [];
  const centerBatch = [];

  const dynamicMax = Math.ceil(activeWidgets.length / 3);

  activeWidgets.forEach((sel) => {
    const w = allWidgetsMap[sel];
    if (!w) return;
    if (leftBatch.length < dynamicMax) leftBatch.push(w);
    else if (centerBatch.length < dynamicMax) centerBatch.push(w);
    else rightBatch.push(w);
  });

  rightBatch.forEach((w) => rightSidebar.appendChild(w));
  leftBatch.forEach((w) => leftSidebar.appendChild(w));
  centerBatch.forEach((w) => centerSidebar.appendChild(w));

  [...rightBatch, ...leftBatch, ...centerBatch].forEach((w) => {
    w.style.flex = "0 1 auto";
    w.style.minHeight = "0";
    w.style.overflow = "visible";
  });
}

function renderWidgetsLayout() {
  if (!leftSidebar || !rightSidebar || !centerSidebar) return;
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
    } catch (e) {
      activeWidgets = [];
    }
  } else {
    activeWidgets = [
      ".widget-clock",
      ".widget-prayer",
      ".widget-weather",
      ".widget-stopwatch",
      ".widget-tasks",
      ".widget-notes",
      ".widget-tasbeeh",
      ".widget-salah",
      ".widget-dua",
    ];
  }
  ensureWidgetCloseButtons();
  renderWidgetsLayout();
}

widgetToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const sel = toggle.dataset.widget;
    if (toggle.checked) {
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
  setTimeout(() => renderWidgetsLayout(), 500);
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
