/**
 * Outfit Picker – Your Personal Stylist
 * Data stored in localStorage; syncs to cloud when signed in.
 */

// ─── State ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'outfit-picker-data';
const DEFAULT_DATA = {
  onboarded: false,
  gender: 'unisex',
  permissionsGranted: false,
  clothes: [],
  settings: {
    laundryReminder: true,
    laundryDays: 3,
    sidebarRight: false,
    tryOnPhoto: null, // base64 portrait for try-on
    tryOnUseMannequin: true // false = use tryOnPhoto as base
  },
  weather: null // { tempC, condition, location, updatedAt }
};

let state = { ...DEFAULT_DATA };

// Hair tutorials: style -> { name, youtubeSearch }
const CATEGORY_ICONS = { top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥', shoes: '👟', accessory: '⌚' };

const MANNEQUIN_SVG = `<svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="mg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#e8ddd8"/><stop offset="100%" style="stop-color:#cfc4bf"/></linearGradient></defs><ellipse cx="50" cy="26" rx="20" ry="23" fill="url(#mg)"/><path d="M50 48 L28 60 L22 108 L34 112 L38 78 L42 128 L24 198 L38 204 L50 142 L62 204 L76 198 L58 128 L62 78 L66 112 L78 108 L72 60 Z" fill="url(#mg)" stroke="#c5bab5" stroke-width="0.5"/></svg>`;

const MANUAL_SLOT_ORDER = ['dress', 'top', 'bottom', 'outerwear', 'shoes', 'accessory'];

let outfitMode = 'auto'; // 'auto' | 'manual'
let manualPicks = { dress: -1, top: -1, bottom: -1, outerwear: -1, shoes: -1, accessory: -1 };

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

// ─── Sync ──────────────────────────────────────────────────────────────
let syncDebounceTimer = null;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
  // Debounced cloud sync when logged in
  if (window.OutfitAuth?.isConfigured?.()) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      const session = await window.OutfitAuth?.getSession?.();
      if (session?.user && window.OutfitSync) {
        await window.OutfitSync.saveCloset(state);
      }
    }, 500);
  }
}

async function loadFromCloud() {
  if (!window.OutfitSync) return null;
  return window.OutfitSync.fetchCloset();
}

// ─── Init ──────────────────────────────────────────────────────────────
function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = { ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_DATA.settings, ...parsed?.settings } };
    }
  } catch (_) {}
}

async function init() {
  loadState();
  if (!state.onboarded) {
    showScreen('screen-welcome');
    setupOnboarding();
  } else {
    showScreen('screen-main');
    setupMainApp();
    setupAuth();
    // If logged in, fetch cloud and merge
    if (window.OutfitAuth?.isConfigured?.()) {
      const session = await window.OutfitAuth.getSession();
      if (session?.user) {
        const cloudData = await loadFromCloud();
        if (cloudData && Object.keys(cloudData).length > 0) {
          state = { ...DEFAULT_DATA, ...cloudData, settings: { ...DEFAULT_DATA.settings, ...cloudData?.settings } };
          saveState();
          if (typeof renderCloset === 'function') renderCloset();
        } else {
          saveState(); // Upload local to cloud
        }
      }
    }
  }
}

// ─── Screens ───────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ─── Onboarding ────────────────────────────────────────────────────────
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
    fetchWeather(); // Start loading weather
  });

  document.querySelector('[data-next="screen-welcome"]')?.addEventListener('click', () => showScreen('screen-welcome'));
  document.querySelector('#screen-permissions [data-next="screen-gender"]')?.addEventListener('click', () => showScreen('screen-gender'));
}

// ─── Main App ──────────────────────────────────────────────────────────
function setupMainApp() {
  setupNavTabs();
  setupCloset();
  setupAddItem();
  setupOutfit();
  setupSettings();
  renderCloset();
  fetchWeather(); // Load weather for outfit suggestions
}

function setupNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
      if (tab.dataset.tab === 'outfit' && outfitMode === 'manual') renderManualOutfit();
    });
  });
}

// ─── Closet ────────────────────────────────────────────────────────────
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

  if (outfitMode === 'manual' && document.querySelector('.nav-tab[data-tab="outfit"]')?.classList.contains('active')) {
    renderManualOutfit();
  }
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
        : `<div class="closet-item-placeholder">${CATEGORY_ICONS[item.category] || '👕'}</div>`}
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
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button class="btn-small" id="btn-mark-worn">Mark as worn today</button>
        <button class="btn-small" id="btn-edit-item">Edit</button>
      </div>
      <div id="item-edit-section" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
        <label style="display:block;margin-bottom:8px;font-weight:600;">Category</label>
        <select id="edit-item-category" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px;">
          <option value="top" ${item.category === 'top' ? 'selected' : ''}>Top</option>
          <option value="bottom" ${item.category === 'bottom' ? 'selected' : ''}>Bottom</option>
          <option value="dress" ${item.category === 'dress' ? 'selected' : ''}>Dress / Jumpsuit</option>
          <option value="outerwear" ${item.category === 'outerwear' ? 'selected' : ''}>Outerwear</option>
          <option value="shoes" ${item.category === 'shoes' ? 'selected' : ''}>Shoes</option>
          <option value="accessory" ${item.category === 'accessory' ? 'selected' : ''}>Accessory</option>
        </select>
        <label style="display:block;margin-bottom:8px;font-weight:600;">Status</label>
        <select id="edit-item-status" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px;">
          <option value="clean" ${item.status === 'clean' ? 'selected' : ''}>Clean</option>
          <option value="laundry" ${item.status === 'laundry' ? 'selected' : ''}>In laundry</option>
        </select>
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <input type="checkbox" id="edit-item-favorite" ${item.favorite ? 'checked' : ''}>
          <span>Favorite</span>
        </label>
        <label style="display:block;margin-bottom:8px;font-weight:600;">Change photo</label>
        <input type="file" id="edit-item-photo" accept="image/*" style="margin-bottom:12px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-small" id="btn-save-edit">Save changes</button>
          <button class="btn-small" id="btn-delete-item" style="border-color:#c94a4a;color:#c94a4a;">Delete item</button>
        </div>
      </div>
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

  content.querySelector('#btn-edit-item')?.addEventListener('click', () => {
    const editSection = content.querySelector('#item-edit-section');
    editSection.style.display = editSection.style.display === 'none' ? 'block' : 'none';
  });

  content.querySelector('#edit-item-photo')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => { item.imageData = reader.result; };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  });

  content.querySelector('#btn-save-edit')?.addEventListener('click', () => {
    item.category = content.querySelector('#edit-item-category').value;
    item.status = content.querySelector('#edit-item-status').value;
    item.favorite = content.querySelector('#edit-item-favorite').checked;
    if (item.status === 'laundry') item.laundrySince = item.laundrySince || new Date().toISOString();
    else item.laundrySince = null;
    saveState();
    renderCloset();
    document.getElementById('modal-item-detail').classList.remove('active');
  });

  content.querySelector('#btn-delete-item')?.addEventListener('click', () => {
    if (confirm('Delete this item? This cannot be undone.')) {
      state.clothes = state.clothes.filter(c => c.id !== item.id);
      saveState();
      renderCloset();
      document.getElementById('modal-item-detail').classList.remove('active');
    }
  });
}

document.getElementById('btn-close-detail')?.addEventListener('click', () => {
  document.getElementById('modal-item-detail').classList.remove('active');
});

// ─── Add Item ──────────────────────────────────────────────────────────
let currentImageData = null;
let cameraStream = null;

function setupAddItem() {
  document.getElementById('btn-add-item')?.addEventListener('click', openAddModal);
  document.getElementById('btn-cancel-add')?.addEventListener('click', closeAddModal);
  document.getElementById('btn-save-item')?.addEventListener('click', saveItem);
  document.getElementById('btn-capture')?.addEventListener('click', startCamera);
  document.getElementById('btn-upload')?.addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input')?.addEventListener('change', handleFileSelect);
  document.getElementById('btn-add-manual')?.addEventListener('click', startManualAdd);
  document.getElementById('btn-remove-bg')?.addEventListener('click', removeBackground);
}

function openAddModal() {
  currentImageData = null;
  document.getElementById('captured-image').style.display = 'none';
  document.getElementById('captured-image').src = '';
  document.getElementById('camera-placeholder').style.display = 'block';
  document.getElementById('camera-placeholder').innerHTML = '<span>📷</span><p>Take a photo or choose a file</p>';
  document.getElementById('camera-video').style.display = 'none';
  document.getElementById('btn-save-item').disabled = true;
  document.getElementById('remove-bg-row').style.display = 'none';
  document.getElementById('btn-capture').style.display = 'inline-block';
  document.getElementById('btn-capture-now').style.display = 'none';
  document.getElementById('modal-add').classList.add('active');
  stopCamera();
}

function startManualAdd() {
  currentImageData = null;
  document.getElementById('captured-image').style.display = 'none';
  document.getElementById('captured-image').src = '';
  document.getElementById('camera-placeholder').style.display = 'block';
  document.getElementById('camera-placeholder').innerHTML = '<span>👕</span><p>Adding without photo – pick category below</p>';
  document.getElementById('camera-video').style.display = 'none';
  document.getElementById('remove-bg-row').style.display = 'none';
  document.getElementById('btn-save-item').disabled = false;
  document.getElementById('btn-capture').style.display = 'inline-block';
  document.getElementById('btn-capture-now').style.display = 'none';
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

function showImageWithRemoveBg() {
  document.getElementById('remove-bg-row').style.display = 'flex';
  document.getElementById('remove-bg-status').textContent = '';
}

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
  showImageWithRemoveBg();
  stopCamera();
  void runAutoRemoveBgAfterCapture();
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
    showImageWithRemoveBg();
    stopCamera();
    void runAutoRemoveBgAfterCapture();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function applyRemoveBackgroundFromDataUrl(dataUrl) {
  const removeBg = (await import('https://esm.sh/@imgly/background-removal')).default;
  const blob = await removeBg(dataUrl);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function runAutoRemoveBgAfterCapture() {
  if (!currentImageData) return;
  const status = document.getElementById('remove-bg-status');
  const btn = document.getElementById('btn-remove-bg');
  document.getElementById('remove-bg-row').style.display = 'flex';
  btn.disabled = true;
  status.textContent = 'Removing background… (first time can take a minute)';
  try {
    const result = await applyRemoveBackgroundFromDataUrl(currentImageData);
    currentImageData = result;
    document.getElementById('captured-image').src = currentImageData;
    status.textContent = 'Background removed automatically.';
  } catch (e) {
    console.warn('Auto background removal failed:', e);
    status.textContent = 'Could not remove background. Use Retry or save as-is.';
  } finally {
    btn.disabled = false;
  }
}

async function removeBackground() {
  if (!currentImageData) return;
  const btn = document.getElementById('btn-remove-bg');
  const status = document.getElementById('remove-bg-status');
  btn.disabled = true;
  status.textContent = 'Removing…';
  try {
    const result = await applyRemoveBackgroundFromDataUrl(currentImageData);
    currentImageData = result;
    document.getElementById('captured-image').src = currentImageData;
    status.textContent = 'Done.';
  } catch (e) {
    console.warn('Background removal failed:', e);
    status.textContent = 'Failed – save as-is or try again.';
  } finally {
    btn.disabled = false;
  }
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

// ─── Weather ───────────────────────────────────────────────────────────
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

// ─── Outfit Generator ──────────────────────────────────────────────────
function setupOutfit() {
  setupWeatherRefresh();
  document.getElementById('btn-generate')?.addEventListener('click', generateOutfit);
  document.getElementById('btn-regenerate')?.addEventListener('click', generateOutfit);
  document.querySelector('.nav-tab[data-tab="outfit"]')?.addEventListener('click', () => {
    fetchWeather();
    if (outfitMode === 'manual') renderManualOutfit();
  });

  document.querySelectorAll('.outfit-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.outfitMode;
      document.querySelectorAll('.outfit-mode-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.outfitMode === mode);
        b.setAttribute('aria-selected', b.dataset.outfitMode === mode ? 'true' : 'false');
      });
      outfitMode = mode;
      document.getElementById('outfit-auto-panel').style.display = mode === 'auto' ? 'block' : 'none';
      document.getElementById('outfit-manual-panel').style.display = mode === 'manual' ? 'block' : 'none';
      if (mode === 'manual') renderManualOutfit();
    });
  });

  document.getElementById('btn-tryon-mannequin')?.addEventListener('click', () => {
    state.settings.tryOnUseMannequin = true;
    saveState();
    updateTryonModeButtons();
    renderMannequinLayers();
  });
  document.getElementById('btn-tryon-photo')?.addEventListener('click', () => {
    if (!state.settings.tryOnPhoto) {
      document.getElementById('tryon-photo-input')?.click();
      return;
    }
    state.settings.tryOnUseMannequin = false;
    saveState();
    updateTryonModeButtons();
    renderMannequinLayers();
  });
  document.getElementById('btn-tryon-upload-photo')?.addEventListener('click', () => document.getElementById('tryon-photo-input')?.click());
  document.getElementById('tryon-photo-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.settings.tryOnPhoto = reader.result;
      state.settings.tryOnUseMannequin = false;
      saveState();
      updateTryonModeButtons();
      renderMannequinLayers();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  document.getElementById('btn-tryon-clear-photo')?.addEventListener('click', () => {
    state.settings.tryOnPhoto = null;
    state.settings.tryOnUseMannequin = true;
    saveState();
    updateTryonModeButtons();
    renderMannequinLayers();
  });
}

function updateTryonModeButtons() {
  const manBtn = document.getElementById('btn-tryon-mannequin');
  const phBtn = document.getElementById('btn-tryon-photo');
  const clearBtn = document.getElementById('btn-tryon-clear-photo');
  const useM = state.settings.tryOnUseMannequin !== false;
  manBtn?.classList.toggle('active', useM);
  phBtn?.classList.toggle('active', !useM && !!state.settings.tryOnPhoto);
  if (clearBtn) clearBtn.style.display = state.settings.tryOnPhoto ? 'inline-block' : 'none';
}

function cleanByCategory(cat) {
  return state.clothes.filter(c => c.status === 'clean' && c.category === cat);
}

function cycleManualPick(cat, delta) {
  if ((cat === 'top' || cat === 'bottom') && manualPicks.dress >= 0) {
    manualPicks.dress = -1;
  }
  if (cat === 'dress' && (manualPicks.top >= 0 || manualPicks.bottom >= 0)) {
    manualPicks.top = -1;
    manualPicks.bottom = -1;
  }

  const items = cleanByCategory(cat);
  const n = items.length;
  if (n === 0) {
    manualPicks[cat] = -1;
    return;
  }
  let pos = manualPicks[cat] < 0 ? 0 : manualPicks[cat] + 1;
  pos = (pos + delta + (n + 1)) % (n + 1);
  manualPicks[cat] = pos === 0 ? -1 : pos - 1;
}

function renderManualOutfit() {
  updateTryonModeButtons();
  const base = document.getElementById('mannequin-base');
  if (base) {
    if (!state.settings.tryOnUseMannequin && state.settings.tryOnPhoto) {
      base.classList.add('has-photo');
      base.style.backgroundImage = `url(${state.settings.tryOnPhoto})`;
      base.innerHTML = '';
    } else {
      base.classList.remove('has-photo');
      base.style.backgroundImage = '';
      base.innerHTML = MANNEQUIN_SVG;
    }
  }
  renderMannequinLayers();
  renderManualSlots();
}

function renderMannequinLayers() {
  const wrap = document.getElementById('mannequin-layers');
  if (!wrap) return;

  const dressOn = manualPicks.dress >= 0;
  const parts = [];

  const pushLayer = (cls, item) => {
    if (!item?.imageData) return;
    parts.push(`<img class="layer-piece ${cls}" src="${item.imageData}" alt="">`);
  };

  const itemAt = (cat) => {
    const items = cleanByCategory(cat);
    const i = manualPicks[cat];
    return i >= 0 ? items[i] : null;
  };

  pushLayer('layer-shoes', itemAt('shoes'));
  if (dressOn) pushLayer('layer-dress', itemAt('dress'));
  else {
    pushLayer('layer-bottom', itemAt('bottom'));
    pushLayer('layer-top', itemAt('top'));
  }
  pushLayer('layer-outer', itemAt('outerwear'));
  pushLayer('layer-accessory', itemAt('accessory'));

  wrap.innerHTML = parts.join('');
}

function renderManualSlots() {
  const host = document.getElementById('manual-slots');
  if (!host) return;

  host.innerHTML = MANUAL_SLOT_ORDER.map(cat => {
    const items = cleanByCategory(cat);
    const idx = manualPicks[cat];
    const cur = idx >= 0 ? items[idx] : null;

    const preview = cur?.imageData
      ? `<img src="${cur.imageData}" alt="">`
      : `<span class="placeholder-emoji">${CATEGORY_ICONS[cat]}</span>`;

    return `
      <div class="manual-slot-row" data-slot-cat="${cat}">
        <div class="manual-slot-label">${cat}</div>
        <div class="manual-slot-swipe" data-swipe-cat="${cat}">
          <div class="manual-slot-preview">${preview}</div>
          <span class="swipe-hint-side">Swipe or arrows · dress OR top+bottom</span>
        </div>
        <div class="manual-slot-arrows">
          <button type="button" class="btn-small manual-prev" data-cat="${cat}" aria-label="Previous">◀</button>
          <button type="button" class="btn-small manual-next" data-cat="${cat}" aria-label="Next">▶</button>
        </div>
      </div>`;
  }).join('');

  host.querySelectorAll('.manual-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      cycleManualPick(btn.dataset.cat, -1);
      renderManualOutfit();
    });
  });
  host.querySelectorAll('.manual-next').forEach(btn => {
    btn.addEventListener('click', () => {
      cycleManualPick(btn.dataset.cat, 1);
      renderManualOutfit();
    });
  });

  host.querySelectorAll('.manual-slot-swipe').forEach(el => {
    let tx = 0;
    el.addEventListener('touchstart', (e) => { tx = e.changedTouches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) < 40) return;
      cycleManualPick(el.dataset.swipeCat, dx < 0 ? 1 : -1);
      renderManualOutfit();
    }, { passive: true });
  });
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

  // Weather-aware outerwear
  if (byCategory.outerwear.length > 0) {
    if (isCold || (isRainy && isCool)) pick('outerwear'); // always add when cold/rainy
    else if (isCool && Math.random() > 0.4) pick('outerwear'); // likely when cool
    else if (!isWarm && !isHot && Math.random() > 0.7) pick('outerwear'); // sometimes mild
    // skip outerwear when warm or hot
  }

  pick('shoes');
  if (Math.random() > 0.5) pick('accessory');

  return outfit;
}

function renderOutfit(outfit) {
  const html = outfit.length
    ? `<div class="outfit-items">${outfit.map(p => `
        <div class="outfit-piece">
          ${p.imageData ? `<img src="${p.imageData}" alt="${p.category}">` : `<div class="closet-item-placeholder">${CATEGORY_ICONS[p.category] || '👕'}</div>`}
          <div class="piece-label">${p.category}</div>
        </div>
      `).join('')}</div>`
    : '<p class="placeholder-text">Not enough items for this style. Add more clothes!</p>';
  document.getElementById('outfit-result').innerHTML = html;
}

// ─── Auth ──────────────────────────────────────────────────────────────
let authMode = 'signin'; // 'signin' | 'signup'

function setupAuth() {
  const accountSection = document.getElementById('account-section');
  const loggedOut = document.getElementById('account-logged-out');
  const loggedIn = document.getElementById('account-logged-in');
  const accountEmail = document.getElementById('account-email');

  if (!accountSection) return;

  const updateAccountUI = async () => {
    const configured = window.OutfitAuth?.isConfigured?.();
    accountSection.style.display = configured ? 'block' : 'none';
    if (!configured) return;

    const session = await window.OutfitAuth.getSession();
    if (session?.user) {
      loggedOut.style.display = 'none';
      loggedIn.style.display = 'block';
      accountEmail.textContent = session.user.email;
    } else {
      loggedOut.style.display = 'block';
      loggedIn.style.display = 'none';
    }
  };

  document.getElementById('btn-open-auth')?.addEventListener('click', () => openAuthModal('signin'));
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await window.OutfitAuth?.signOut?.();
    updateAccountUI();
  });

  document.getElementById('btn-settings')?.addEventListener('click', updateAccountUI);

  document.getElementById('btn-close-auth')?.addEventListener('click', () => {
    document.getElementById('modal-auth').classList.remove('active');
  });

  document.getElementById('btn-auth-submit')?.addEventListener('click', handleAuthSubmit);
  document.getElementById('btn-auth-switch')?.addEventListener('click', () => {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    updateAuthModal();
  });

  window.OutfitAuth?.onAuthChange?.(async (event, session) => {
    updateAccountUI();
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && typeof renderCloset === 'function') {
      const cloudData = await loadFromCloud();
      if (cloudData && Object.keys(cloudData).length > 0) {
        state = { ...DEFAULT_DATA, ...cloudData, settings: { ...DEFAULT_DATA.settings, ...cloudData?.settings } };
        saveState();
        renderCloset();
      } else {
        saveState(); // Upload local to cloud
      }
    }
  });

  updateAccountUI();
}

function openAuthModal(mode) {
  authMode = mode || 'signin';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-error').style.display = 'none';
  updateAuthModal();
  document.getElementById('modal-auth').classList.add('active');
}

function updateAuthModal() {
  const title = document.getElementById('auth-modal-title');
  const submitBtn = document.getElementById('btn-auth-submit');
  const switchBtn = document.getElementById('btn-auth-switch');
  if (authMode === 'signup') {
    title.textContent = 'Create account';
    submitBtn.textContent = 'Sign up';
    switchBtn.textContent = 'Already have an account? Sign in';
  } else {
    title.textContent = 'Sign in';
    submitBtn.textContent = 'Sign in';
    switchBtn.textContent = 'Create account';
  }
}

async function handleAuthSubmit() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  const errEl = document.getElementById('auth-error');

  errEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent = 'Please enter email and password.';
    errEl.style.display = 'block';
    return;
  }

  try {
    if (authMode === 'signup') {
      await window.OutfitAuth.signUp(email, password);
      errEl.textContent = 'Check your email to confirm your account, then sign in.';
      errEl.style.display = 'block';
      errEl.style.color = 'var(--success)';
    } else {
      await window.OutfitAuth.signIn(email, password);
      document.getElementById('modal-auth').classList.remove('active');
      const cloudData = await loadFromCloud();
      if (cloudData && Object.keys(cloudData).length > 0) {
        state = { ...DEFAULT_DATA, ...cloudData, settings: { ...DEFAULT_DATA.settings, ...cloudData?.settings } };
      }
      saveState();
      if (typeof renderCloset === 'function') renderCloset();
      setupAuth();
    }
  } catch (e) {
    errEl.textContent = e?.message || 'Something went wrong.';
    errEl.style.display = 'block';
    errEl.style.color = '#c94a4a';
  }
}

// ─── Settings ──────────────────────────────────────────────────────────
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

// ─── Laundry reminders ─────────────────────────────────────────────────
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
