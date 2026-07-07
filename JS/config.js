// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================
// Since raw HTML/JS cannot directly read a .env file without a bundler (like Webpack or Vite),
// you can set your hardcoded keys here. This acts as your client-side .env file.
// These will be used if you haven't set a key inside the Settings UI.

window.ENV = {
  // OpenWeatherMap API Key
  WEATHER_API_KEY: "",
  
  // Default City for weather
  WEATHER_DEFAULT_CITY: ""
};
