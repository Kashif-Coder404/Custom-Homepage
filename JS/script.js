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
  const domainRegex =
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i;

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
  const suggestions = data[1];
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

searchBar.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (!q) {
    suggestionsBox.style.display = "none";
    return;
  }
  const script = document.createElement("script");
  script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(
    q
  )}&callback=handleSuggestions`;
  document.body.appendChild(script);
  script.onload = () => document.body.removeChild(script);
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
    isDeleting ? deletingSpeed : typingSpeed
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
  document.getElementById("clockDate").textContent =
    "> " + now.toLocaleDateString().toUpperCase();
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

// Notes
// const notesArea = document.getElementById("quickNotes");
// notesArea.value = localStorage.getItem("cyberNotes") || "";
// notesArea.addEventListener("input", () => {
//   localStorage.setItem("cyberNotes", notesArea.value);
// });

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
    })
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
      "VELOCITY: " + data.wind.speed + " M/S";

    const tempElem = document.getElementById("Temprature");
    if (temp <= 15) tempElem.style.color = "#00d4ff";
    else if (temp <= 30) tempElem.style.color = "#00ff9d";
    else tempElem.style.color = "#ff4d4d";
  } catch (err) {
    console.error("Weather offline");
  }
}
fetchWeather();

// APP INIT
document.addEventListener("DOMContentLoaded", () => {
  // TODO LIST – MISSION PROTOCOLS

  const todoInput = document.getElementById("todoInput");
  const addTodoBtn = document.getElementById("addTodoBtn");
  const todoList = document.getElementById("todoList");

  let todos = [];

  try {
    const saved = localStorage.getItem("todos");
    todos = saved ? JSON.parse(saved) : [];
  } catch (e) {
    localStorage.removeItem("todos");
    todos = [];
  }

  // RENDER TODOS
  function renderTodos() {
    todoList.innerHTML = "";

    todos.forEach((todo, index) => {
      const li = document.createElement("li");
      li.className = "todo-item";
      if (todo.completed) li.classList.add("completed");

      li.innerHTML = `
  <span class="todo-text">${todo.text}</span>
  <button class="delete-btn">✕</button>
`;

      li.querySelector("span").addEventListener("click", () => {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
      });

      li.querySelector(".delete-btn").addEventListener("click", () => {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
      });

      todoList.appendChild(li);
    });
  }

  // SAVE TODOS
  function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  // ADD TODO
  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    todos.push({ text, completed: false });
    todoInput.value = "";
    saveTodos();
    renderTodos();
  }

  // EVENTS
  addTodoBtn.addEventListener("click", addTodo);
  todoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTodo();
  });

  // INIT
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
