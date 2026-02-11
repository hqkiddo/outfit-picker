/**
 * Outfit Picker – Your Personal Stylist
 * All data stored in localStorage.
 */

const STORAGE_KEY = 'outfit-picker-data';
const DEFAULT_DATA = {
  onboarded: false,
  gender: 'unisex',
  permissionsGranted: false,
  clothes: [],
  settings: {
    laundryReminder: true,
    laundryDays: 3,
    sidebarRight: false
  },
  weather: null
};

let state = { ...DEFAULT_DATA };

const HAIR_BY_STYLE = {
  casual: [
    { name: 'Easy messy bun', search: 'easy messy bun tutorial' },
    { name: 'Simple ponytail', search: 'effortless ponytail tutorial' },
    { name: 'Loose waves', search: 'natural loose waves hair tutorial' }
  ],
  comfy: [
    { name: 'Cozy low bun', search: 'low bun tutorial easy' },
    { name: 'Soft braid', search: 'soft side braid tutorial' },
    { name: 'Relaxed top knot', search: 'relaxed top knot tutorial' }
  ],
  cute: [
    { name: 'Space buns', search: 'space buns tutorial' },
    { name: 'Heart braid', search: 'heart braid hair tutorial' },
    { name: 'Bubble ponytail', search: 'bubble ponytail tutorial' }
  ],
  school: [
    { name: 'Neat low ponytail', search: 'neat low ponytail tutorial' },
    { name: 'Half-up half-down', search: 'half up half down tutorial' },
    { name: 'Classic braid', search: 'classic three strand braid tutorial' }
  ],
  fancy: [
    { name: 'Elegant updo', search: 'elegant updo tutorial' },
    { name: 'Sleek low bun', search: 'sleek low bun tutorial' },
    { name: 'Twisted chignon', search: 'twisted chignon tutorial' }
  ],
  party: [
    { name: 'Voluminous curls', search: 'party curls tutorial' },
    { name: 'Glitter hair', search: 'festival hair glitter tutorial' },
    { name: 'High ponytail', search: 'high ponytail party tutorial' }
  ],
  sports: [
    { name: 'Secure ponytail', search: 'sports ponytail no slip' },
    { name: 'Braided ponytail', search: 'braided ponytail for workout' },
    { name: 'Low bun for sports', search: 'low bun workout hair' }
  ]
};

function init() {
  loadState();
  if (!state.onboarded) {
    showScreen('screen-welcome');
    setupOnboarding();
  } else {
    showScreen('screen-main');
    setupMainApp();
  }
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = { ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_DATA.settings, ...parsed?.settings } };
    }
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function setupOnboarding() {
  document.querySelector('[data-next="screen-gender"]')?.addEventListener('click', () => showScreen('screen-gender'));

  document.querySelectorAll('.option-btn[data-gender]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.option-btn[data-gender]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.gender = btn.dataset.gender;
      showScreen('screen-permissions');
    });
  });

  document.getElementById('btn-allow-permissions')?.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      state.permissionsGranted = true;
    } catch (e) {
      console.warn('Camera access denied:', e);
      state.permissionsGranted = false;
    }
    state.onboarded = true;
    saveState();
    showScreen('screen-main');
    setupMainApp();
    fetchWeather();
  });

  document.querySelector('[data-next="screen-welcome"]')?.addEventListener('click', () => showScreen('screen-welcome'));
  document.querySelector('#screen-permissions [data-next="screen-gender"]')?.addEventListener('click', () => showScreen('screen-gender'));
}

function setupMainApp() {
  setupNavTabs();
  setupCloset();
  setupAddItem();
  setupOutfit();
  setupSettings();
  renderCloset();
  fetchWeather();
}

function setupNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
}

let selectedIds = new Set();
let isSelectMode = false;
let currentFilter = 'all';

function setupCloset() {
  document.querySelectorAll('.sidebar-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCloset();
    });
  });
  document.getElementById('btn-batch-clean')?.addEventListener('click', () => batchUpdate('clean'));
  document.getElementById('btn-batch-laundry')?.addEventListener('click', () => batchUpdate('laundry'));
  document.getElementById('btn-select-mode')?.addEventListener('click', () => {
    isSelectMode = true;
    selectedIds = new Set();
    document.getElementById('sidebar-select-prompt').style.display = 'none';
    document.getElementById('sidebar-batch').style.display = 'flex';
    renderCloset();
  });
  document.getElementById('btn-cancel-select')?.addEventListener('click', () => {
    isSelectMode = false;
    selectedIds.clear();
    document.getElementById('sidebar-batch').style.display = 'none';
    document.getElementById('sidebar-select-prompt').style.display = 'flex';
    updateBatchButtons();
    renderCloset();
  });
  document.getElementById('btn-sidebar-position')?.addEventListener('click', () => {
    state.settings.sidebarRight = !state.settings.sidebarRight;
    saveState();
    document.getElementById('closet-layout').classList.toggle('sidebar-right', state.settings.sidebarRight);
  });
  document.getElementById('closet-layout')?.classList.toggle('sidebar-right', state.settings.sidebarRight);
}

function batchUpdate(status) {
  selectedIds.forEach(id => {
    const item = state.clothes.find(c => c.id === id);
    if (item) {
      item.status = status;
      item.laundrySince = status === 'laundry' ? new Date().toISOString() : null;
    }
  });
  selectedIds.clear();
  isSelectMode = false;
  document.getElementById('sidebar-batch').style.display = 'none';
  document.getElementById('sidebar-select-prompt').style.display = 'flex';
  saveState();
  renderCloset();
  updateBatchButtons();
}

function updateBatchButtons() {
  const hasSelection = selectedIds.size > 0;
  document.getElementById('btn-batch-clean').disabled = !hasSelection;
  document.getElementById('btn-batch-laundry').disabled = !hasSelection;
}

function renderCloset() {
  const grid = document.getElementById('closet-grid');
  if (!grid) return;

  let items = state.clothes;
  if (currentFilter === 'clean') items = items.filter(c => c.status === 'clean');
  else if (currentFilter === 'laundry') items = items.filter(c => c.status === 'laundry');
  else if (currentFilter === 'favorites') items = items.filter(c => c.favorite);

  grid.innerHTML = items.length
    ? items.map(item => renderClosetItem(item)).join('')
    : '<p class="placeholder-text" style="grid-column:1/-1;">No clothes yet. Add your first item!</p>';

  grid.querySelectorAll('.closet-item').forEach(el => {
    const id = el.dataset.id;
    el.addEventListener('click', (e) => {
      if (el.querySelector('.item-favorite')?.contains(e.target)) return;
      if (isSelectMode) toggleSelect(id);
      else openItemDetail(id);
    });
  });

  grid.querySelectorAll('.item-favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.closest('.closet-item').dataset.id;
      const item = state.clothes.find(c => c.id === id);
      if (item) {
        item.favorite = !item.favorite;
        saveState();
        renderCloset();
      }
    });
  });
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  saveState();
  renderCloset();
  updateBatchButtons();
}

function renderClosetItem(item) {
  const isSelected = selectedIds.has(item.id);
  return `
    <div class="closet-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
      ${item.favorite ? '<span class="item-favorite">⭐</span>' : '<span class="item-favorite" title="Add to favorites">☆</span>'}
      ${item.imageData
        ? `<img src="${item.imageData}" alt="${item.category}">`
        : '<div class="closet-item-placeholder">👕</div>'}
      <div class="item-info">
        <div class="item-category">${item.category}</div>
        <span class="item-status-badge ${item.status}">${item.status === 'clean' ? 'Clean' : 'In laundry'}</span>
        ${item.lastWorn ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">Last worn: ${formatDate(item.lastWorn)}</div>` : ''}
      </div>
    </div>
  `;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function openItemDetail(id) {
  const item = state.clothes.find(c => c.id === id);
  if (!item) return;

  const content = document.getElementById('item-detail-content');
  content.innerHTML = `
    <div style="margin-bottom:16px;">
      ${item.imageData ? `<img src="${item.imageData}" alt="" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;">` : ''}
      <p><strong>${item.category}</strong></p>
      <p>Status: ${item.status === 'clean' ? 'Clean' : 'In laundry'}</p>
      <p>Favorite: ${item.favorite ? 'Yes' : 'No'}</p>
      ${item.lastWorn ? `<p>Last worn: ${formatDate(item.lastWorn)}</p>` : '<p>Last worn: Never</p>'}
      <button class="btn-small" id="btn-mark-worn" style="margin-top:12px;">Mark as worn today</button>
    </div>
  `;
  document.getElementById('modal-item-detail').classList.add('active');

  content.querySelector('#btn-mark-worn')?.addEventListener('click', () => {
    item.lastWorn = new Date().toISOString();
    item.status = 'laundry';
    item.laundrySince = new Date().toISOString();
    saveState();
    renderCloset();
    document.getElementById('modal-item-detail').classList.remove('active');
  });
}

document.getElementById('btn-close-detail')?.addEventListener('click', () => {
  document.getElementById('modal-item-detail').classList.remove('active');
});

let currentImageData = null;
let cameraStream = null;

function setupAddItem() {
  document.getElementById('btn-add-item')?.addEventListener('click', openAddModal);
  document.getElementById('btn-cancel-add')?.addEventListener('click', closeAddModal);
  document.getElementById('btn-save-item')?.addEventListener('click', saveItem);
  document.getElementById('btn-capture')?.addEventListener('click', startCamera);
  document.getElementById('btn-upload')?.addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input')?.addEventListener('change', handleFileSelect);
}

function openAddModal() {
  currentImageData = null;
  document.getElementById('captured-image').style.display = 'none';
  document.getElementById('captured-image').src = '';
  document.getElementById('camera-placeholder').style.display = 'block';
  document.getElementById('camera-video').style.display = 'none';
  document.getElementById('btn-save-item').disabled = true;
  document.getElementById('modal-add').classList.add('active');
  stopCamera();
}

function closeAddModal() {
  document.getElementById('modal-add').classList.remove('active');
  stopCamera();
}

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('camera-video');
    video.srcObject = cameraStream;
    video.style.display = 'block';
    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('captured-image').style.display = 'none';
    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-capture-now').style.display = 'inline-block';
  } catch (e) {
    alert('Could not access camera. Try uploading an image instead.');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  document.getElementById('camera-video').srcObject = null;
  document.getElementById('camera-video').style.display = 'none';
  document.getElementById('btn-capture').style.display = 'inline-block';
  document.getElementById('btn-capture-now').style.display = 'none';
}

document.getElementById('camera-video')?.addEventListener('click', captureFromVideo);
document.getElementById('btn-capture-now')?.addEventListener('click', captureFromVideo);

function captureFromVideo() {
  const video = document.getElementById('camera-video');
  if (!video.srcObject || !video.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  currentImageData = canvas.toDataURL('image/jpeg', 0.8);
  document.getElementById('captured-image').src = currentImageData;
  document.getElementById('captured-image').style.display = 'block';
  document.getElementById('camera-placeholder').style.display = 'none';
  video.style.display = 'none';
  document.getElementById('btn-save-item').disabled = false;
  stopCamera();
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentImageData = reader.result;
    document.getElementById('captured-image').src = currentImageData;
    document.getElementById('captured-image').style.display = 'block';
    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('camera-video').style.display = 'none';
    document.getElementById('btn-save-item').disabled = false;
    stopCamera();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function saveItem() {
  const category = document.getElementById('item-category')?.value || 'top';
  const status = document.getElementById('item-status')?.value || 'clean';
  const favorite = document.getElementById('item-favorite')?.checked ?? false;

  state.clothes.push({
    id: crypto.randomUUID(),
    imageData: currentImageData,
    category,
    status,
    laundrySince: status === 'laundry' ? new Date().toISOString() : null,
    favorite,
    lastWorn: null
  });
  saveState();
  renderCloset();
  closeAddModal();
}

const WEATHER_CACHE_MINUTES = 30;
const WEATHER_ICONS = {
  clear: '☀️',
  cloudy: '☁️',
  partly: '⛅',
  rain: '🌧️',
  snow: '❄️',
  thunder: '⛈️',
  fog: '🌫️'
};

async function fetchWeather() {
  const updateUI = (loading = false) => {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');
    if (!tempEl || !descEl) return;
    if (loading) {
      tempEl.textContent = '--°';
      descEl.textContent = 'Loading weather…';
      iconEl.textContent = '🌤️';
      return;
    }
    if (!state.weather) {
      tempEl.textContent = '--°';
      descEl.textContent = 'Allow location for weather';
      iconEl.textContent = '📍';
      return;
    }
    const w = state.weather;
    const tempF = Math.round((w.tempC * 9) / 5 + 32);
    tempEl.textContent = `${tempF}°`;
    descEl.textContent = w.condition;
    iconEl.textContent = WEATHER_ICONS[w.icon] || '🌤️';
  };

  const cached = state.weather?.updatedAt;
  if (cached && Date.now() - new Date(cached).getTime() < WEATHER_CACHE_MINUTES * 60 * 1000) {
    updateUI();
    return state.weather;
  }

  updateUI(true);

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 300000 });
    });
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
    );
    const data = await res.json();
    const current = data.current;
    const tempC = current.temperature_2m;
    const code = current.weather_code;

    let condition = 'Clear';
    let icon = 'clear';
    if (code >= 1 && code <= 3) { condition = 'Partly cloudy'; icon = 'partly'; }
    else if (code >= 45 && code <= 48) { condition = 'Foggy'; icon = 'fog'; }
    else if (code >= 51 && code <= 67) { condition = 'Rainy'; icon = 'rain'; }
    else if (code >= 71 && code <= 77) { condition = 'Snowy'; icon = 'snow'; }
    else if (code >= 80 && code <= 99) { condition = 'Rainy'; icon = 'rain'; }
    else if (code >= 95) { condition = 'Stormy'; icon = 'thunder'; }

    state.weather = { tempC, condition, icon, updatedAt: new Date().toISOString() };
    saveState();
    updateUI();
    return state.weather;
  } catch (e) {
    console.warn('Weather fetch failed:', e);
    state.weather = null;
    updateUI();
    return null;
  }
}

function setupWeatherRefresh() {
  document.getElementById('btn-refresh-weather')?.addEventListener('click', () => fetchWeather());
}

function setupOutfit() {
  setupWeatherRefresh();
  document.getElementById('btn-generate')?.addEventListener('click', generateOutfit);
  document.getElementById('btn-regenerate')?.addEventListener('click', generateOutfit);
  document.querySelector('.nav-tab[data-tab="outfit"]')?.addEventListener('click', () => fetchWeather());
}

function generateOutfit() {
  const style = document.getElementById('style-preset')?.value || 'casual';
  const cleanItems = state.clothes.filter(c => c.status === 'clean');

  if (cleanItems.length === 0) {
    document.getElementById('outfit-result').innerHTML = '<p class="placeholder-text">Add clothes and mark some as clean to generate outfits!</p>';
    document.getElementById('btn-regenerate').style.display = 'none';
    return;
  }

  const outfit = pickOutfit(cleanItems, style, state.weather);
  renderOutfit(outfit);
  document.getElementById('btn-regenerate').style.display = 'inline-block';

  const hairs = HAIR_BY_STYLE[style] || HAIR_BY_STYLE.casual;
  const hair = hairs[Math.floor(Math.random() * hairs.length)];
  document.getElementById('hair-result').innerHTML = `<p><strong>${hair.name}</strong></p>`;
  const link = document.getElementById('hair-tutorial-link');
  link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(hair.search)}`;
  link.style.display = 'inline-block';
}

function pickOutfit(items, style, weather) {
  const byCategory = { top: [], bottom: [], dress: [], outerwear: [], shoes: [], accessory: [] };
  items.forEach(item => {
    if (byCategory[item.category]) byCategory[item.category].push(item);
  });

  const outfit = [];
  const pick = (cat) => {
    const arr = byCategory[cat];
    if (arr?.length) outfit.push(arr[Math.floor(Math.random() * arr.length)]);
  };

  const tempF = weather ? Math.round((weather.tempC * 9) / 5 + 32) : 70;
  const isCold = tempF < 50;
  const isCool = tempF >= 50 && tempF < 65;
  const isWarm = tempF >= 75 && tempF < 85;
  const isHot = tempF >= 85;
  const isRainy = weather?.icon === 'rain' || weather?.icon === 'thunder';

  const hasDress = byCategory.dress.length > 0 && Math.random() > 0.5;
  if (hasDress) pick('dress');
  else {
    pick('top');
    pick('bottom');
  }

  if (byCategory.outerwear.length > 0) {
    if (isCold || (isRainy && isCool)) pick('outerwear');
    else if (isCool && Math.random() > 0.4) pick('outerwear');
    else if (!isWarm && !isHot && Math.random() > 0.7) pick('outerwear');
  }

  pick('shoes');
  if (Math.random() > 0.5) pick('accessory');

  return outfit;
}

function renderOutfit(outfit) {
  const html = outfit.length
    ? `<div class="outfit-items">${outfit.map(p => `
        <div class="outfit-piece">
          ${p.imageData ? `<img src="${p.imageData}" alt="${p.category}">` : '<div class="closet-item-placeholder">👕</div>'}
          <div class="piece-label">${p.category}</div>
        </div>
      `).join('')}</div>`
    : '<p class="placeholder-text">Not enough items for this style. Add more clothes!</p>';
  document.getElementById('outfit-result').innerHTML = html;
}

function setupSettings() {
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    document.getElementById('setting-laundry-reminder').checked = state.settings.laundryReminder;
    document.getElementById('setting-laundry-days').value = state.settings.laundryDays;
    document.getElementById('modal-settings').classList.add('active');
  });
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    state.settings.laundryReminder = document.getElementById('setting-laundry-reminder').checked;
    state.settings.laundryDays = Math.max(1, Math.min(14, +document.getElementById('setting-laundry-days').value || 3));
    saveState();
    document.getElementById('modal-settings').classList.remove('active');
  });
}

function checkLaundryReminders() {
  if (!state.settings.laundryReminder || !state.settings.laundryDays) return;
  const days = state.settings.laundryDays;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const inLaundry = state.clothes.filter(c => c.status === 'laundry');
  const old = inLaundry.filter(c => {
    const since = c.laundrySince || c.lastWorn;
    return since && new Date(since) < cutoff;
  });
  if (old.length > 0 && state.onboarded) {
    const msg = `${old.length} item(s) have been in the laundry for ${days}+ days. Want to mark them clean?`;
    if (confirm(msg)) {
      old.forEach(c => { c.status = 'clean'; c.laundrySince = null; });
      saveState();
      renderCloset();
    }
  }
}

init();
checkLaundryReminders();
