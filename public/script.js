/* ============================================
   SkyLens Weather App — Main Script
   ============================================ */
const BACKEND_URL = 'https://weather-skylens.onrender.com';
// ============ CONFIGURATION ============
const API_BASE = BACKEND_URL + '/api/weather';
const AUTH_BASE = BACKEND_URL + '/api/auth';
const HISTORY_BASE = BACKEND_URL + '/api/history';
const OWM_ICON_URL = 'https://openweathermap.org/img/wn/';
const OWM_TILE_URL = 'https://tile.openweathermap.org/map';

// ============ APPLICATION STATE ============
const state = {
  currentWeather: null,
  forecastData: null,
  aqiData: null,
  unit: localStorage.getItem('skylens_unit') || 'metric',
  theme: localStorage.getItem('skylens_theme') || 'light',
  favorites: JSON.parse(localStorage.getItem('skylens_favorites') || '[]'),
  recentSearches: JSON.parse(localStorage.getItem('skylens_recent') || '[]'),
  user: null,
  token: localStorage.getItem('skylens_token') || null,
  map: null,
  mapLayers: {},
  activeMapLayer: 'temp',
  timeInterval: null,
  lightningInterval: null,
};

// ============ DOM REFERENCES ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  cityInput: $('#cityInput'),
  searchBtn: $('#searchBtn'),
  locationBtn: $('#locationBtn'),
  unitToggle: $('#unitToggle'),
  themeToggle: $('#themeToggle'),
  notifBtn: $('#notifBtn'),
  authBtn: $('#authBtn'),
  welcomeState: $('#welcomeState'),
  loadingSkeleton: $('#loadingSkeleton'),
  weatherContent: $('#weatherContent'),
  weatherIcon: $('#weatherIcon'),
  cityName: $('#cityName'),
  countryBadge: $('#countryBadge'),
  tempValue: $('#tempValue'),
  tempUnit: $('#tempUnit'),
  feelsLike: $('#feelsLike'),
  weatherDesc: $('#weatherDesc'),
  localDate: $('#localDate'),
  localTime: $('#localTime'),
  favBtn: $('#favBtn'),
  detailGrid: $('#detailGrid'),
  tempChart: $('#tempChart'),
  aqiValue: $('#aqiValue'),
  aqiBadge: $('#aqiBadge'),
  aqiBar: $('#aqiBar'),
  aqiPollutants: $('#aqiPollutants'),
  forecastScroll: $('#forecastScroll'),
  mapContainer: $('#mapContainer'),
  favoritesList: $('#favoritesList'),
  favoritesSection: $('#favoritesSection'),
  recentDropdown: $('#recentDropdown'),
  toastContainer: $('#toastContainer'),
  authModal: $('#authModal'),
  loginForm: $('#loginForm'),
  registerForm: $('#registerForm'),
  loginFormEl: $('#loginFormEl'),
  registerFormEl: $('#registerFormEl'),
  loginError: $('#loginError'),
  registerError: $('#registerError'),
  modalClose: $('#modalClose'),
  showRegister: $('#showRegister'),
  showLogin: $('#showLogin'),
  bgLayer: $('#bgLayer'),
  rainLayer: $('#rainLayer'),
  snowLayer: $('#snowLayer'),
  lightningOverlay: $('#lightningOverlay'),
};

// ============ UTILITIES ============
function celsiusToFahrenheit(c) {
  return (c * 9 / 5) + 32;
}

function formatTemp(temp) {
  const val = state.unit === 'imperial' ? celsiusToFahrenheit(temp) : temp;
  return Math.round(val);
}

function getUnitSymbol() {
  return state.unit === 'imperial' ? '°F' : '°C';
}

function formatTime(unix, timezoneOffset) {
  const date = new Date((unix + timezoneOffset) * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
    hour12: true, timeZone: 'UTC',
  });
}

function formatDate(unix, timezoneOffset) {
  const date = new Date((unix + timezoneOffset) * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDay(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { weekday: 'short' });
}

function getWindDirection(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getAQILevel(aqi) {
  const levels = [
    { label: 'Good', color: '#68D391', bg: 'rgba(104,211,145,0.15)' },
    { label: 'Fair', color: '#F6E05E', bg: 'rgba(246,224,94,0.15)' },
    { label: 'Moderate', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' },
    { label: 'Poor', color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
    { label: 'Very Poor', color: '#E53E3E', bg: 'rgba(229,62,62,0.15)' },
  ];
  return levels[Math.min(aqi - 1, 4)] || levels[0];
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function animateValue(element, start, end, duration = 600) {
  const startTime = performance.now();
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * eased);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ============ TOAST SYSTEM ============
function showToast(message, type = 'info', duration = 4000) {
  const icons = { error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============ API LAYER ============
async function apiRequest(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function fetchCurrentWeather(city) {
  return apiRequest(`${API_BASE}/current?city=${encodeURIComponent(city)}&units=metric`);
}

async function fetchWeatherByCoords(lat, lon) {
  return apiRequest(`${API_BASE}/current?lat=${lat}&lon=${lon}&units=metric`);
}

async function fetchForecast(city) {
  return apiRequest(`${API_BASE}/forecast?city=${encodeURIComponent(city)}&units=metric`);
}

async function fetchForecastByCoords(lat, lon) {
  return apiRequest(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=metric`);
}

async function fetchAQI(lat, lon) {
  return apiRequest(`${API_BASE}/aqi?lat=${lat}&lon=${lon}`);
}

// ============ WEATHER BACKGROUNDS ============
const weatherThemes = {
  Clear: { start: '#FFF9E6', mid: '#FFE4B5', end: '#87CEEB' },
  Clouds: { start: '#E8ECF0', mid: '#CBD5E0', end: '#A0AEC0' },
  Rain: { start: '#D6E4F0', mid: '#B0C4DE', end: '#7E9BB8' },
  Drizzle: { start: '#D6E4F0', mid: '#B0C4DE', end: '#7E9BB8' },
  Thunderstorm: { start: '#C4B5D0', mid: '#9B8EC0', end: '#7B6FA0' },
  Snow: { start: '#F0F4F8', mid: '#E2E8F0', end: '#CBD5E0' },
  Mist: { start: '#EDF2F7', mid: '#E2E8F0', end: '#CBD5E0' },
  Fog: { start: '#EDF2F7', mid: '#E2E8F0', end: '#CBD5E0' },
  Haze: { start: '#EDF2F7', mid: '#E2E8F0', end: '#CBD5E0' },
  Smoke: { start: '#E8ECF0', mid: '#CBD5E0', end: '#A0AEC0' },
};

function updateBackground(condition) {
  const theme = weatherThemes[condition] || weatherThemes.Clear;
  if (state.theme === 'dark') return; // Dark mode uses its own palette

  document.documentElement.style.setProperty('--sky-start', theme.start);
  document.documentElement.style.setProperty('--sky-mid', theme.mid);
  document.documentElement.style.setProperty('--sky-end', theme.end);

  // Toggle weather effects
  DOM.rainLayer.classList.toggle('active',
    ['Rain', 'Drizzle', 'Thunderstorm'].includes(condition));
  DOM.snowLayer.classList.toggle('active', condition === 'Snow');

  // Lightning effect for thunderstorms
  if (state.lightningInterval) clearInterval(state.lightningInterval);
  if (condition === 'Thunderstorm') {
    state.lightningInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        DOM.lightningOverlay.classList.add('flash');
        setTimeout(() => DOM.lightningOverlay.classList.remove('flash'), 300);
      }
    }, 3000);
  }
}

// ============ UI RENDERERS ============

function showLoading() {
  DOM.welcomeState.classList.add('hidden');
  DOM.weatherContent.classList.add('hidden');
  DOM.loadingSkeleton.classList.remove('hidden');
}

function hideLoading() {
  DOM.loadingSkeleton.classList.add('hidden');
}

function showWeather() {
  hideLoading();
  DOM.welcomeState.classList.add('hidden');
  DOM.weatherContent.classList.remove('hidden');
}

// --- Current Weather ---
function renderCurrentWeather(data) {
  state.currentWeather = data;
  const { name, sys, main, weather, wind, visibility, clouds, dt, timezone } = data;
  const condition = weather[0].main;
  const icon = weather[0].icon;

  DOM.cityName.textContent = name;
  DOM.countryBadge.textContent = sys.country;
  DOM.weatherIcon.src = `${OWM_ICON_URL}${icon}@4x.png`;
  DOM.weatherIcon.alt = weather[0].description;

  const tempVal = formatTemp(main.temp);
  animateValue(DOM.tempValue, 0, tempVal);
  DOM.tempUnit.textContent = getUnitSymbol();
  DOM.feelsLike.textContent = formatTemp(main.feels_like);
  DOM.weatherDesc.textContent = weather[0].description;
  DOM.localDate.textContent = formatDate(dt, timezone);

  // Live clock
  updateLocalTime(timezone);
  if (state.timeInterval) clearInterval(state.timeInterval);
  state.timeInterval = setInterval(() => updateLocalTime(timezone), 30000);

  // Favorite button state
  updateFavBtnState(name);

  // Background
  updateBackground(condition);

  // Check for extreme weather alerts
  checkWeatherAlerts(data);

  showWeather();
}

function updateLocalTime(timezone) {
  const now = Math.floor(Date.now() / 1000);
  DOM.localTime.textContent = formatTime(now, timezone);
}

// --- Detail Cards ---
function renderDetailCards(data) {
  const { main, wind, visibility, clouds, sys } = data;
  const tz = data.timezone;
  const rainChance = state.forecastData?.list?.[0]?.pop;

  const cards = [
    { icon: '💧', label: 'Humidity', value: `${main.humidity}%` },
    { icon: '🌬️', label: 'Wind', value: `${main.wind_speed || wind.speed} m/s ${getWindDirection(wind.deg)}` },
    { icon: '👁️', label: 'Visibility', value: `${(visibility / 1000).toFixed(1)} km` },
    { icon: '🔽', label: 'Pressure', value: `${main.pressure} hPa` },
    { icon: '🌅', label: 'Sunrise', value: formatTime(sys.sunrise, tz) },
    { icon: '🌇', label: 'Sunset', value: formatTime(sys.sunset, tz) },
    { icon: '☁️', label: 'Clouds', value: `${clouds.all}%` },
    { icon: '🌧️', label: 'Rain Prob.', value: rainChance != null ? `${Math.round(rainChance * 100)}%` : 'N/A' },
  ];

  DOM.detailGrid.innerHTML = cards.map((c) => `
    <div class="detail-card">
      <div class="detail-icon">${c.icon}</div>
      <div class="detail-label">${c.label}</div>
      <div class="detail-value">${c.value}</div>
    </div>
  `).join('');
}

// --- 5-Day Forecast ---
function renderForecast(data) {
  state.forecastData = data;
  const dailyMap = {};

  data.list.forEach((item) => {
    const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!dailyMap[day]) {
      dailyMap[day] = { temps: [], icon: item.weather[0].icon, pop: [], desc: item.weather[0].description, dt: item.dt };
    }
    dailyMap[day].temps.push(item.main.temp);
    dailyMap[day].pop.push(item.pop || 0);
  });

  const days = Object.entries(dailyMap).slice(0, 5);
  DOM.forecastScroll.innerHTML = days.map(([day, info]) => {
    const high = formatTemp(Math.max(...info.temps));
    const low = formatTemp(Math.min(...info.temps));
    const rainPct = Math.round(Math.max(...info.pop) * 100);
    return `
      <div class="forecast-card">
        <div class="forecast-day">${day}</div>
        <div class="forecast-icon"><img src="${OWM_ICON_URL}${info.icon}@2x.png" alt="${info.desc}"></div>
        <div class="forecast-temps">
          <span class="forecast-high">${high}°</span>
          <span class="forecast-low">${low}°</span>
        </div>
        ${rainPct > 0 ? `<div class="forecast-rain">🌧️ ${rainPct}%</div>` : ''}
      </div>
    `;
  }).join('');
}

// --- AQI ---
function renderAQI(data) {
  state.aqiData = data;
  if (!data.list || !data.list[0]) return;

  const aqi = data.list[0].main.aqi;
  const level = getAQILevel(aqi);
  const comp = data.list[0].components;

  DOM.aqiValue.textContent = `AQI: ${aqi}`;
  DOM.aqiBadge.textContent = level.label;
  DOM.aqiBadge.style.background = level.bg;
  DOM.aqiBadge.style.color = level.color;

  // Animate bar
  setTimeout(() => {
    DOM.aqiBar.style.width = `${(aqi / 5) * 100}%`;
    DOM.aqiBar.style.background = level.color;
  }, 100);

  const pollutants = [
    { name: 'PM2.5', val: comp.pm2_5?.toFixed(1) },
    { name: 'PM10', val: comp.pm10?.toFixed(1) },
    { name: 'O₃', val: comp.o3?.toFixed(1) },
    { name: 'CO', val: comp.co?.toFixed(0) },
    { name: 'NO₂', val: comp.no2?.toFixed(1) },
    { name: 'SO₂', val: comp.so2?.toFixed(1) },
  ];

  DOM.aqiPollutants.innerHTML = pollutants.map((p) =>
    `<span>${p.name}: <span class="pollutant-val">${p.val || '-'}</span></span>`
  ).join('');
}

// --- Temperature Chart (Canvas) ---
function renderTempChart(forecastData) {
  const canvas = DOM.tempChart;
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  // High DPI
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const W = container.clientWidth;
  const H = container.clientHeight;
  const pad = { top: 30, right: 20, bottom: 30, left: 40 };

  // Get next 8 data points (24 hours, 3-hr intervals)
  const points = forecastData.list.slice(0, 8);
  const temps = points.map((p) => formatTemp(p.main.temp));
  const times = points.map((p) => {
    const d = new Date(p.dt * 1000);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  });

  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const getX = (i) => pad.left + (i / (points.length - 1)) * chartW;
  const getY = (t) => pad.top + (1 - (t - minT) / (maxT - minT)) * chartH;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0, state.theme === 'dark' ? 'rgba(99,179,237,0.3)' : 'rgba(99,179,237,0.2)');
  grad.addColorStop(1, 'rgba(99,179,237,0)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(temps[0]));
  for (let i = 1; i < temps.length; i++) {
    const cx = (getX(i - 1) + getX(i)) / 2;
    ctx.bezierCurveTo(cx, getY(temps[i - 1]), cx, getY(temps[i]), getX(i), getY(temps[i]));
  }
  ctx.lineTo(getX(temps.length - 1), H - pad.bottom);
  ctx.lineTo(getX(0), H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(temps[0]));
  for (let i = 1; i < temps.length; i++) {
    const cx = (getX(i - 1) + getX(i)) / 2;
    ctx.bezierCurveTo(cx, getY(temps[i - 1]), cx, getY(temps[i]), getX(i), getY(temps[i]));
  }
  ctx.strokeStyle = '#63B3ED';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Dots & labels
  const textColor = state.theme === 'dark' ? '#A0AEC0' : '#5A6B7F';
  ctx.fillStyle = textColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';

  temps.forEach((t, i) => {
    const x = getX(i); const y = getY(t);
    // Dot
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#63B3ED'; ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
    // Temp label
    ctx.fillStyle = textColor;
    ctx.fillText(`${t}°`, x, y - 12);
    // Time label
    ctx.fillText(times[i], x, H - pad.bottom + 18);
  });

  // Y-axis labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(minT + (4 - i) / 4 * (maxT - minT));
    const y = pad.top + (i / 4) * chartH;
    ctx.fillText(`${val}°`, pad.left - 8, y + 4);
  }
}

// --- Weather Map (Leaflet) ---
function initMap(lat, lon) {
  // Fix Leaflet's default icon path issues when loaded from CDN
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  if (state.map) {
    state.map.flyTo([lat, lon], 8, { duration: 1.5 });
    updateMapMarker(lat, lon);
    return;
  }

  state.map = L.map(DOM.mapContainer, {
    center: [lat, lon], zoom: 8,
    zoomControl: true, attributionControl: true,
  });

  // Base tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(state.map);

  updateMapMarker(lat, lon);

  // Load the active layer if set, or default to temp
  const defaultLayer = state.activeMapLayer || 'temp';
  state.activeMapLayer = null; // Reset temporarily to force toggle
  toggleMapLayer(defaultLayer);

  // Invalidate size after animation and layer load
  setTimeout(() => {
    state.map.invalidateSize();
  }, 600);
}

function updateMapMarker(lat, lon) {
  if (state.mapMarker) state.map.removeLayer(state.mapMarker);
  const data = state.currentWeather;
  const temp = data ? `${formatTemp(data.main.temp)}${getUnitSymbol()}` : '';
  const name = data?.name || '';

  state.mapMarker = L.marker([lat, lon])
    .addTo(state.map)
    .bindPopup(`<b>${name}</b><br>${temp}`)
    .openPopup();
}

// --- Weather Alerts ---
function checkWeatherAlerts(data) {
  const temp = data.main.temp;
  const condition = data.weather[0].main;

  if (temp > 40) {
    showToast(`🔥 Extreme heat warning: ${Math.round(temp)}°C in ${data.name}`, 'warning', 6000);
    sendNotification('Extreme Heat', `${Math.round(temp)}°C in ${data.name}. Stay hydrated!`);
  } else if (temp < -10) {
    showToast(`🥶 Extreme cold warning: ${Math.round(temp)}°C in ${data.name}`, 'warning', 6000);
    sendNotification('Extreme Cold', `${Math.round(temp)}°C in ${data.name}. Stay warm!`);
  }

  if (['Thunderstorm'].includes(condition)) {
    showToast(`⛈️ Thunderstorm alert in ${data.name}`, 'warning', 5000);
    sendNotification('Thunderstorm Alert', `Severe weather in ${data.name}`);
  }
}

function sendNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(`SkyLens: ${title}`, { body, icon: 'assets/favicon.svg' });
  }
}

// ============ FAVORITES & RECENT SEARCHES ============

function renderFavorites() {
  if (state.favorites.length === 0) {
    DOM.favoritesSection.classList.add('hidden');
    return;
  }

  DOM.favoritesSection.classList.remove('hidden');
  DOM.favoritesList.innerHTML = state.favorites.map((fav) => `
    <div class="fav-chip" onclick="handleCitySearch('${fav}')">
      <span>${fav}</span>
      <div class="fav-remove" onclick="event.stopPropagation(); toggleFavorite('${fav}')">&times;</div>
    </div>
  `).join('');
}

function updateFavBtnState(city) {
  const isFav = state.favorites.some((f) => f.toLowerCase() === city.toLowerCase());
  DOM.favBtn.classList.toggle('is-fav', isFav);
  DOM.favBtn.innerHTML = isFav ? '⭐ Saved' : '⭐ Add to Favorites';
  DOM.favBtn.onclick = () => toggleFavorite(city);
}

async function toggleFavorite(city) {
  const cityLower = city.toLowerCase();
  const isFav = state.favorites.some((f) => f.toLowerCase() === cityLower);

  if (state.token) {
    try {
      const res = await apiRequest(`${AUTH_BASE}/favorites`, {
        method: 'PUT',
        body: JSON.stringify({ city, action: isFav ? 'remove' : 'add' }),
      });
      state.favorites = res.favorites;
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  } else {
    if (isFav) {
      state.favorites = state.favorites.filter((f) => f.toLowerCase() !== cityLower);
    } else {
      if (state.favorites.length >= 10) return showToast('Maximum 10 favorites allowed', 'warning');
      state.favorites.push(city);
    }
    localStorage.setItem('skylens_favorites', JSON.stringify(state.favorites));
  }

  renderFavorites();
  if (state.currentWeather && state.currentWeather.name.toLowerCase() === cityLower) {
    updateFavBtnState(state.currentWeather.name);
  }
}

function updateRecentSearches(city) {
  state.recentSearches = state.recentSearches.filter((c) => c.toLowerCase() !== city.toLowerCase());
  state.recentSearches.unshift(city);
  if (state.recentSearches.length > 5) state.recentSearches.pop();
  localStorage.setItem('skylens_recent', JSON.stringify(state.recentSearches));
}

function renderRecentDropdown() {
  if (state.recentSearches.length === 0) {
    DOM.recentDropdown.classList.remove('show');
    return;
  }

  DOM.recentDropdown.innerHTML = state.recentSearches.map((city) => `
    <div class="recent-item" onclick="handleCitySearch('${city}')">
      <span class="recent-icon">🕒</span> ${city}
    </div>
  `).join('');
  DOM.recentDropdown.classList.add('show');
}

// ============ AUTHENTICATION ============

function updateAuthUI() {
  if (state.user) {
    DOM.authBtn.innerHTML = '<span class="auth-label">Logout</span>';
    DOM.authBtn.onclick = handleLogout;
  } else {
    DOM.authBtn.innerHTML = '<span class="auth-label">Login</span>';
    DOM.authBtn.onclick = () => DOM.authModal.classList.add('show');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $('#loginEmail').value;
  const password = $('#loginPassword').value;

  try {
    const res = await apiRequest(`${AUTH_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthUser(res);
    DOM.authModal.classList.remove('show');
    showToast(`Welcome back, ${res.name}!`, 'success');
  } catch (err) {
    DOM.loginError.textContent = err.message;
    DOM.loginError.classList.add('show');
    setTimeout(() => DOM.loginError.classList.remove('show'), 3000);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = $('#registerName').value;
  const email = $('#registerEmail').value;
  const password = $('#registerPassword').value;

  try {
    const res = await apiRequest(`${AUTH_BASE}/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setAuthUser(res);
    DOM.authModal.classList.remove('show');
    showToast(`Account created, welcome ${res.name}!`, 'success');
  } catch (err) {
    DOM.registerError.textContent = err.message;
    DOM.registerError.classList.add('show');
    setTimeout(() => DOM.registerError.classList.remove('show'), 3000);
  }
}

function setAuthUser(data) {
  state.user = data;
  state.token = data.token;
  state.favorites = data.favorites || [];
  localStorage.setItem('skylens_token', data.token);

  if (data.theme) {
    state.theme = data.theme;
    localStorage.setItem('skylens_theme', data.theme);
    applyTheme();
  }
  if (data.unit) {
    state.unit = data.unit;
    localStorage.setItem('skylens_unit', data.unit);
    applyUnit();
  }

  updateAuthUI();
  renderFavorites();
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('skylens_token');
  updateAuthUI();
  showToast('Logged out successfully', 'info');
}

async function fetchProfile() {
  if (!state.token) return;
  try {
    const res = await apiRequest(`${AUTH_BASE}/profile`);
    state.user = res;
    state.favorites = res.favorites || [];
    if (res.theme) {
      state.theme = res.theme;
      localStorage.setItem('skylens_theme', res.theme);
      applyTheme();
    }
    if (res.unit) {
      state.unit = res.unit;
      localStorage.setItem('skylens_unit', res.unit);
      applyUnit();
    }
    updateAuthUI();
    renderFavorites();
  } catch (err) {
    handleLogout(); // Token invalid
  }
}

// ============ EVENT HANDLERS & LOGIC ============

async function fetchAllWeatherData(fetchFnCurrent, fetchFnForecast, fetchFnAQI) {
  showLoading();
  DOM.recentDropdown.classList.remove('show');

  try {
    const [current, forecast] = await Promise.all([
      fetchFnCurrent(),
      fetchFnForecast()
    ]);

    const { coord } = current;
    const aqi = await fetchFnAQI(coord.lat, coord.lon);

    renderCurrentWeather(current);
    renderDetailCards(current);
    renderForecast(forecast);
    renderTempChart(forecast);
    renderAQI(aqi);
    initMap(coord.lat, coord.lon);

    updateRecentSearches(current.name);

  } catch (err) {
    hideLoading();
    showToast(err.message, 'error', 5000);
    console.error(err);
  }
}

function handleCitySearch(city) {
  if (!city) return;
  DOM.cityInput.value = city;
  fetchAllWeatherData(
    () => fetchCurrentWeather(city),
    () => fetchForecast(city),
    (lat, lon) => fetchAQI(lat, lon)
  );
}

function handleGeoLocation() {
  if (!navigator.geolocation) {
    return showToast('Geolocation is not supported by your browser', 'error');
  }

  showToast('Fetching location...', 'info', 2000);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      fetchAllWeatherData(
        () => fetchWeatherByCoords(latitude, longitude),
        () => fetchForecastByCoords(latitude, longitude),
        () => fetchAQI(latitude, longitude)
      );
    },
    (err) => {
      showToast('Location access denied or failed.', 'error');
    }
  );
}

// Map Layers
function toggleMapLayer(layerType) {
  if (!state.map) return;

  // Toggle buttons visually
  $$('.map-layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === layerType));

  // Remove existing weather layer if any
  if (state.mapLayers.current) {
    state.map.removeLayer(state.mapLayers.current);
    state.mapLayers.current = null;
  }

  // If clicking the currently active layer, just remove it and return (toggle off)
  if (state.activeMapLayer === layerType) {
    state.activeMapLayer = null;
    $$('.map-layer-btn').forEach(b => b.classList.remove('active'));
    showToast(`Removed map layer`, 'info', 2000);
    return;
  }

  state.activeMapLayer = layerType;

  // Map our UI layer names to OpenWeatherMap layer names
  const owmLayerNames = {
    'temp': 'temp_new',
    'clouds': 'clouds_new',
    'precipitation': 'precipitation_new'
  };

  const owmName = owmLayerNames[layerType];

  if (owmName) {
    // We use the proxy route on our backend to avoid exposing the API key
    const tileUrl = `${API_BASE}/tile/${owmName}/{z}/{x}/{y}.png`;
    state.mapLayers.current = L.tileLayer(tileUrl, {
      opacity: 0.65,
      maxZoom: 18,
      attribution: '&copy; OpenWeatherMap'
    }).addTo(state.map);
  }

  showToast(`Switched map layer to ${layerType}`, 'info', 2000);
}

// Theme
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  DOM.themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  if (state.currentWeather) {
    updateBackground(state.currentWeather.weather[0].main);
    if (state.forecastData) renderTempChart(state.forecastData);
  }
}

// Unit
function applyUnit() {
  DOM.unitToggle.textContent = state.unit === 'imperial' ? '°C' : '°F';
  if (state.currentWeather) {
    // Re-render UI with new unit (without refetching)
    renderCurrentWeather(state.currentWeather);
    renderDetailCards(state.currentWeather);
    if (state.forecastData) {
      renderForecast(state.forecastData);
      renderTempChart(state.forecastData);
    }
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  DOM.searchBtn.addEventListener('click', () => handleCitySearch(DOM.cityInput.value.trim()));
  DOM.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCitySearch(DOM.cityInput.value.trim());
  });
  DOM.cityInput.addEventListener('focus', renderRecentDropdown);

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      DOM.recentDropdown.classList.remove('show');
    }
  });

  // Location
  DOM.locationBtn.addEventListener('click', handleGeoLocation);

  // Toggles
  DOM.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('skylens_theme', state.theme);
    applyTheme();
    if (state.token) {
      apiRequest(`${AUTH_BASE}/profile`, {
        method: 'PUT',
        body: JSON.stringify({ theme: state.theme })
      }).catch(console.error);
    }
  });

  DOM.unitToggle.addEventListener('click', () => {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('skylens_unit', state.unit);
    applyUnit();
    if (state.token) {
      apiRequest(`${AUTH_BASE}/profile`, {
        method: 'PUT',
        body: JSON.stringify({ unit: state.unit })
      }).catch(console.error);
    }
  });

  // Notifications
  DOM.notifBtn.addEventListener('click', () => {
    if (!('Notification' in window)) {
      return showToast('Notifications not supported', 'error');
    }
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast('Notifications enabled!', 'success');
      } else {
        showToast('Notification permission denied', 'warning');
      }
    });
  });

  // Map Layers
  $$('.map-layer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => toggleMapLayer(e.target.dataset.layer));
  });

  // Window Resize (Redraw Chart)
  window.addEventListener('resize', debounce(() => {
    if (state.forecastData) renderTempChart(state.forecastData);
  }, 250));

  // Auth Modal
  DOM.modalClose.addEventListener('click', () => DOM.authModal.classList.remove('show'));
  DOM.showRegister.addEventListener('click', () => {
    DOM.loginForm.classList.add('hidden');
    DOM.registerForm.classList.remove('hidden');
  });
  DOM.showLogin.addEventListener('click', () => {
    DOM.registerForm.classList.add('hidden');
    DOM.loginForm.classList.remove('hidden');
  });
  DOM.loginFormEl.addEventListener('submit', handleLogin);
  DOM.registerFormEl.addEventListener('submit', handleRegister);
}

// ============ INITIALIZATION ============

async function init() {
  applyTheme();
  applyUnit();
  renderFavorites();
  updateAuthUI();
  setupEventListeners();

  if (state.token) {
    await fetchProfile();
  }

  // Load initial data (Geolocation or default)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchAllWeatherData(
          () => fetchWeatherByCoords(latitude, longitude),
          () => fetchForecastByCoords(latitude, longitude),
          () => fetchAQI(latitude, longitude)
        );
      },
      () => {
        handleCitySearch('Lahore'); // Default fallback
      },
      { timeout: 5000 }
    );
  } else {
    handleCitySearch('Lahore');
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}
