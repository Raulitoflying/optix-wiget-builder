// ══════════════════════════════════════════════════════════════════════════════
// Main Module - Initialization and shared utilities
// ══════════════════════════════════════════════════════════════════════════════

// ── Global State Variables ─────────────────────────────────────────────────────
let apiConfig = { endpoint: '', token: '', venue: '' };
let plans = [];
let products = [];
let resources = [];
let locations = [];
let currentTab = 'signup';
let apiModalEditMode = false;
const TAB_STORAGE_KEY = 'optix_current_tab';

// ── API Config Modal ───────────────────────────────────────────────────────────
function showApiModal() {
  const isConnected = !!apiConfig.token;
  document.getElementById('cfgEndpoint').value = apiConfig.endpoint || 'https://api.optixapp.com/graphql';
  const tokenInput = document.getElementById('cfgToken');
  if (isConnected) {
    tokenInput.value = maskToken(apiConfig.token);
    tokenInput.dataset.rawToken = apiConfig.token;
    apiModalEditMode = false;
    setTokenEditable(false);
    setConnectButtonMode('edit');
  } else {
    tokenInput.value = '';
    delete tokenInput.dataset.rawToken;
    apiModalEditMode = true;
    setTokenEditable(true);
    setConnectButtonMode('connect');
  }
  document.getElementById('cfgError').style.display = 'none';
  // Show disconnect and cancel buttons only if already connected
  document.getElementById('cfgDisconnect').style.display = isConnected ? 'inline-flex' : 'none';
  document.getElementById('cfgCancel').style.display = isConnected ? 'inline-flex' : 'none';
  document.getElementById('apiOverlay').classList.remove('hidden');
}

function hideApiModal() {
  document.getElementById('apiOverlay').classList.add('hidden');
}

function cancelModal() {
  // Only allow cancel if already connected
  if (apiConfig.token) {
    hideApiModal();
  }
}

function updateApiStatus(status, text) {
  const el = document.getElementById('apiStatus');
  el.className = 'api-status ' + status;
  document.getElementById('apiStatusText').textContent = text;
}

function toggleCardCollapse(cardId, triggerEl) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const isCollapsed = card.classList.toggle('collapsed');
  const header = card.querySelector('.card-header.is-collapsible');
  const btn = card.querySelector('.btn-collapse');
  const icon = btn?.querySelector('.material-icons');
  if (icon) {
    icon.textContent = isCollapsed ? 'expand_more' : 'expand_less';
  }
  if (btn) {
    btn.setAttribute('aria-expanded', String(!isCollapsed));
  }
  if (header) {
    header.setAttribute('aria-expanded', String(!isCollapsed));
  }
}

function handleCardHeaderKeydown(cardId, headerEl, event) {
  if (!event) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleCardCollapse(cardId, headerEl);
  }
}

function setConnectButtonMode(mode) {
  const btn = document.getElementById('cfgConnect');
  if (mode === 'edit') {
    btn.innerHTML = '<span class="material-icons" style="font-size:18px">edit</span> Edit';
    return;
  }
  btn.innerHTML = '<span class="material-icons" style="font-size:18px">login</span> Connect';
}

function setTokenEditable(editable) {
  const tokenInput = document.getElementById('cfgToken');
  tokenInput.readOnly = !editable;
  tokenInput.classList.toggle('token-locked', !editable);
}

function handleConnectAction() {
  const isConnected = !!apiConfig.token;
  if (isConnected && !apiModalEditMode) {
    apiModalEditMode = true;
    setTokenEditable(true);
    setConnectButtonMode('connect');

    const tokenInput = document.getElementById('cfgToken');
    if (tokenInput.dataset.rawToken) {
      tokenInput.value = tokenInput.dataset.rawToken;
    }
    tokenInput.focus();
    tokenInput.setSelectionRange(tokenInput.value.length, tokenInput.value.length);
    return;
  }
  connectAPI();
}

// ── Data Loading Dispatcher ────────────────────────────────────────────────────
async function loadData() {
  if (currentTab === 'signup') {
    await loadSignupData();
  } else if (currentTab === 'dropin') {
    await loadDropinData();
  }
}

async function refreshData() {
  plans = [];
  products = [];
  resources = [];
  locations = [];
  selectedItems = [];
  hasManuallyReordered = false;

  // Reset parameters based on current tab
  if (currentTab === 'signup' && typeof resetSignupParams === 'function') {
    resetSignupParams();
  } else if (currentTab === 'dropin' && typeof resetDropinParams === 'function') {
    resetDropinParams();
  }

  // Clear error messages
  const timeError = document.getElementById('diTimeError');
  if (timeError) {
    timeError.classList.remove('show');
  }

  // Keep generated output panels hidden until the user provides inputs again.
  const signupUrlCard = document.getElementById('urlCard');
  if (signupUrlCard) signupUrlCard.style.display = 'none';
  const signupOrderCard = document.getElementById('orderCard');
  if (signupOrderCard) signupOrderCard.style.display = 'none';
  const dropinUrlCard = document.getElementById('dropinUrlCard');
  if (dropinUrlCard) dropinUrlCard.style.display = 'none';

  await loadData();
}

// ── Tab Switching ──────────────────────────────────────────────────────────────
function switchTab(type) {
  currentTab = type;
  if (type === 'signup' || type === 'dropin') {
    sessionStorage.setItem(TAB_STORAGE_KEY, type);
  }
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));

  document.getElementById('section-signup').style.display = type === 'signup' ? 'block' : 'none';
  document.getElementById('section-dropin').style.display = type === 'dropin' ? 'block' : 'none';

  if (type === 'signup' && plans.length === 0 && products.length === 0 && apiConfig.token) {
    loadSignupData();
  }
  if (type === 'dropin' && resources.length === 0 && apiConfig.token) {
    loadDropinData();
  }

  if (selectedItems.length > 0) {
    updateSignupUrls();
  }
}

// ── Utility Functions ──────────────────────────────────────────────────────────
function copyUrl(inputId, btn) {
  const el = document.getElementById(inputId);
  const text = el.value || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = '<span class="material-icons" style="font-size:18px">check</span>';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<span class="material-icons" style="font-size:18px">content_copy</span>';
      }, 1500);
    }
    showToast('Copied to clipboard');
  }).catch(() => {
    showToast('Copy failed. Please copy manually.');
  });
}

function openUrl(inputId) {
  const el = document.getElementById(inputId);
  const text = (el?.value || el?.textContent || '').trim();

  if (!text) {
    showToast('No URL to open');
    return;
  }

  try {
    const url = new URL(text);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    showToast('Invalid URL');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return '*'.repeat(token.length);
  const start = token.slice(0, 6);
  const end = token.slice(-4);
  const middleMaskLength = Math.max(4, token.length - 10);
  return `${start}${'*'.repeat(middleMaskLength)}${end}`;
}

// ── Initialization ─────────────────────────────────────────────────────────────
function init() {
  // Restore last selected tab for this browser session.
  const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);
  if (savedTab === 'signup' || savedTab === 'dropin') {
    switchTab(savedTab);
  } else {
    switchTab('signup');
  }

  // Check for token in URL (Canvas mode): supports both query (?token=)
  // and hash (#token=) forms.
  const queryParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const urlToken =
    queryParams.get('token') ||
    hashParams.get('token') ||
    queryParams.get('access_token') ||
    hashParams.get('access_token');

  // Clean up old localStorage credentials from previous versions
  localStorage.removeItem('optix_token');
  localStorage.removeItem('optix_endpoint');

  // Try to restore from sessionStorage
  const savedToken = sessionStorage.getItem('optix_token');
  const savedEndpoint = sessionStorage.getItem('optix_endpoint') || 'https://api.optixapp.com/graphql';

  if (urlToken) {
    showApiModal();
    document.getElementById('cfgEndpoint').value = savedEndpoint;
    document.getElementById('cfgToken').value = urlToken;
    connectAPI();
  } else if (savedToken) {
    // Auto-reconnect with saved credentials
    document.getElementById('cfgEndpoint').value = savedEndpoint;
    document.getElementById('cfgToken').value = savedToken;
    connectAPI();
  } else {
    // Show modal if no saved credentials
    showApiModal();
  }

  // Initial state: keep generated result cards hidden.
  const signupUrlCard = document.getElementById('urlCard');
  if (signupUrlCard) signupUrlCard.style.display = 'none';
  const signupOrderCard = document.getElementById('orderCard');
  if (signupOrderCard) signupOrderCard.style.display = 'none';
  const dropinUrlCard = document.getElementById('dropinUrlCard');
  if (dropinUrlCard) dropinUrlCard.style.display = 'none';

  const tokenInput = document.getElementById('cfgToken');
  tokenInput.addEventListener('input', () => {
    // Once user edits token field, stop treating it as masked persisted value.
    delete tokenInput.dataset.rawToken;
    if (apiConfig.token) {
      apiModalEditMode = true;
      setConnectButtonMode('connect');
      setTokenEditable(true);
    }
  });
}

// ── DOMContentLoaded Event Listener ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
