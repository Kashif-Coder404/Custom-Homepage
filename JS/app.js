// Clock
function updateClock() {
  const now = new Date();
  document.getElementById("clockTime").textContent = now.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  );
  document.getElementById("clockDate").textContent = now.toLocaleDateString();
}
setInterval(updateClock, 1000);
updateClock();

// Search
const searchBar = document.getElementById("searchBar");
searchBar.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const q = encodeURIComponent(searchBar.value.trim());
    if (q) window.open("https://www.google.com/search?q=" + q, "_blank");
    searchBar.value = "";
  }
});

function openSite(url) {
  window.open(url, "_blank");
}
let motivText = document.getElementById("motivQuote");
const quotes = [
  "Dream Big",
  "Stay Focused",
  "Never Quit",
  "Keep Going",
  "Be Brave",
  "Rise Strong",
  "Push Forward",
  "Stay Positive",
  "Chase Goals",
  "Believe Yourself",
];
let quoteInterval = setInterval(() => {
  let quoteIndex = Math.floor(Math.random() * quotes.length);
  let quoteElement = quotes[quoteIndex];
  motivText.innerHTML = quoteElement;
}, 10000);

// Weather
let cityName = document.getElementById("city");
let description = document.getElementById("description");
let temprature = document.getElementById("Temprature");
let windSpeed = document.getElementById("windSpeed");

const apikey = "dd35574ca84c015a1ec4acd1de4a5dd3";
const city = "dehradun";
const apiUrl = `https://api.openweathermap.org/data/2.5/weather?&units=metric&q=${city}&appid=${apikey}`;

async function fetchWeather() {
  //Api call
  const response = await fetch(apiUrl);
  const data = await response.json();

  //showing weather on a page
  cityName.innerText = data.name;
  description.innerText = data.weather[0].description;
  let temp = data.main.temp;
  temprature.innerText = temp + " °C";
  windSpeed.innerText = data.wind.speed + " m/s";

  //Temprature color

  let tempColor = "";
  if (temp <= 0) {
    tempColor = "#0000FF";
  } else if (temp <= 5) {
    tempColor = "#3399FF";
  } else if (temp <= 15) {
    tempColor = "#00ffcc";
  } else if (temp <= 25) {
    tempColor = "#00ff00";
  } else if (temp <= 30) {
    tempColor = "#ffff00";
  } else if (temp <= 35) {
    tempColor = "#ff9900";
  } else {
    tempColor = "#ff0000";
  }
  temprature.style.color = tempColor;
  console.log(data);
}
fetchWeather();
