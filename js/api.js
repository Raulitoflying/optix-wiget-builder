// ══════════════════════════════════════════════════════════════════════════════
// API Module - Handles all API configuration and data loading
// ══════════════════════════════════════════════════════════════════════════════

// ── GraphQL Helper ─────────────────────────────────────────────────────────────
async function gqlQuery(endpoint, token, query, variables = {}) {
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new Error(`Network error: ${e.message || 'Request failed'}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    throw new Error('Invalid JSON response from API');
  }

  if (payload?.errors?.length) {
    const message = payload.errors.map(err => err.message).filter(Boolean).join('; ') || 'GraphQL error';
    throw new Error(message);
  }

  return payload;
}

function getLoadErrorMeta(error, emptyMessage) {
  if (!error && emptyMessage) {
    return {
      className: 'alert alert-info',
      message: `<span class="material-icons" style="font-size:16px">info</span> No data found: ${escapeHtml(emptyMessage)}`,
    };
  }

  const raw = (error?.message || '').toLowerCase();

  const isPermissionIssue =
    raw.includes('http 401') ||
    raw.includes('http 403') ||
    raw.includes('unauthorized') ||
    raw.includes('forbidden') ||
    raw.includes('permission') ||
    raw.includes('not authorized') ||
    raw.includes('invalid token') ||
    raw.includes('authentication');

  if (isPermissionIssue) {
    return {
      className: 'alert alert-error',
      message: `<span class="material-icons" style="font-size:16px">lock</span> Permission issue: Token is invalid or lacks required permissions.`,
    };
  }

  const isConnectionIssue =
    raw.includes('network error') ||
    raw.includes('failed to fetch') ||
    raw.includes('http 5') ||
    raw.includes('timeout') ||
    raw.includes('invalid json');

  if (isConnectionIssue) {
    return {
      className: 'alert alert-error',
      message: `<span class="material-icons" style="font-size:16px">cloud_off</span> Connection issue: Unable to reach Optix API. Please check your network or endpoint.`,
    };
  }

  return {
    className: 'alert alert-error',
    message: `<span class="material-icons" style="font-size:16px">error</span> Failed to load data: ${escapeHtml(error?.message || 'Unknown error')}`,
  };
}

// ── API Connection Management ──────────────────────────────────────────────────
async function connectAPI() {
  const endpoint = document.getElementById('cfgEndpoint').value.trim();
  const tokenInput = document.getElementById('cfgToken');
  const enteredToken = tokenInput.value.trim();
  const rawToken = tokenInput.dataset.rawToken || '';
  const token = rawToken && enteredToken === maskToken(rawToken) ? rawToken : enteredToken;
  const errEl = document.getElementById('cfgError');

  if (!endpoint || !token) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.style.display = 'flex';
    return;
  }

  const btn = document.getElementById('cfgConnect');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Connecting...';
  errEl.style.display = 'none';

  try {
    // Query organization info to auto-detect venue subdomain
    const res = await gqlQuery(endpoint, token, `{
      me {
        organization {
          organization_id
          name
          subdomain
        }
      }
    }`);
    const org = res.data?.me?.organization;
    const venue = org?.subdomain || '';
    const orgName = org?.name || venue;

    if (!venue) {
      throw new Error('Could not detect venue subdomain from token. Please check your token.');
    }

    apiConfig = { endpoint, token, venue };
    apiModalEditMode = false;

    // Save to sessionStorage (cleared when browser session ends)
    sessionStorage.setItem('optix_token', token);
    sessionStorage.setItem('optix_endpoint', endpoint);

    updateApiStatus('connected', orgName);
    document.getElementById('mainContent').classList.remove('disabled');
    document.getElementById('venueBase').value = `https://${venue}.optixapp.com`;
    hideApiModal();
    showToast(`Connected to ${orgName}`);
    refreshData();
  } catch (e) {
    errEl.innerHTML = `<span class="material-icons" style="font-size:16px">error</span> Connection failed: ${escapeHtml(e.message)}`;
    errEl.style.display = 'flex';
    updateApiStatus('error', 'Error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons" style="font-size:18px">login</span> Connect';
  }
}

function confirmDisconnect() {
  if (confirm('Are you sure you want to disconnect?')) {
    disconnectAPI();
  }
}

function disconnectAPI() {
  sessionStorage.removeItem('optix_token');
  sessionStorage.removeItem('optix_endpoint');
  apiConfig = { endpoint: '', token: '', venue: '' };
  plans = [];
  products = [];
  resources = [];
  locations = [];
  selectedItems = [];
  hasManuallyReordered = false;
  updateApiStatus('error', 'Disconnected');
  document.getElementById('mainContent').classList.add('disabled');
  document.getElementById('venueBase').value = '';
  showToast('Disconnected');
  showApiModal();
}

// ── Data Loading ───────────────────────────────────────────────────────────────
async function loadSignupData() {
  const listEl = document.getElementById('planPassList');
  const loadingEl = document.getElementById('planPassLoading');
  const errorEl = document.getElementById('planPassError');
  const locationLoadingEl = document.getElementById('signupLocationLoading');
  const locationContentEl = document.getElementById('signupLocationContent');
  const locationSelectEl = document.getElementById('signupLocation');
  const userFlowLoadingEl = document.getElementById('signupUserFlowLoading');
  const userFlowContentEl = document.getElementById('signupUserFlowContent');

  if (locationLoadingEl) locationLoadingEl.style.display = 'flex';
  if (locationContentEl) locationContentEl.style.display = 'none';
  if (locationSelectEl) locationSelectEl.disabled = true;
  if (userFlowLoadingEl) userFlowLoadingEl.style.display = 'flex';
  if (userFlowContentEl) userFlowContentEl.style.display = 'none';
  loadingEl.style.display = 'flex';
  listEl.style.display = 'none';
  errorEl.style.display = 'none';

  try {
    const [planRes, productRes, locRes] = await Promise.all([
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        planTemplates(limit: 100) {
          data {
            plan_template_id
            name
            price
            price_frequency
            order
            onboarding_enabled
            image { url }
            locations { location_id name }
          }
        }
      }`),
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        products(limit: 100, type: [PASS]) {
          data {
            product_id
            name
            unit_amount
            onboarding_enabled
            order
            image { url }
            prices { price unit { name } }
          }
        }
      }`),
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        locations {
          data {
            location_id
            name
          }
        }
      }`),
    ]);

    // Optional: fetch signup user flow configuration from org settings.
    let choosePlanFirst;
    try {
      const orgRes = await gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        me {
          organization {
            signup_widget {
              choose_plan_first
            }
          }
        }
      }`);
      choosePlanFirst = orgRes.data?.me?.organization?.signup_widget?.choose_plan_first;
    } catch (flowErr) {
      choosePlanFirst = undefined;
    }

    plans = planRes.data?.planTemplates?.data || [];
    products = productRes.data?.products?.data || [];
    locations = locRes.data?.locations?.data || [];

    const userFlowDisplayEl = document.getElementById('signupUserFlowDisplay');
    if (choosePlanFirst === true) {
      userFlowDisplayEl.value = 'Plan/Pass first, then user info';
    } else if (choosePlanFirst === false) {
      userFlowDisplayEl.value = 'User info first, then Plan/Pass';
    } else {
      userFlowDisplayEl.value = 'Not configured';
    }

    if (plans.length === 0 && products.length === 0) {
      const meta = getLoadErrorMeta(null, 'No plans or passes are available for this organization.');
      listEl.style.display = 'none';
      loadingEl.style.display = 'none';
      errorEl.className = meta.className;
      errorEl.innerHTML = meta.message;
      errorEl.style.display = 'flex';
      return;
    }

    // Populate signup location dropdown
    const signupLocSelect = document.getElementById('signupLocation');
    signupLocSelect.innerHTML = '<option value="">No location pre-selected (user chooses)</option>';
    locations.forEach(l => {
      signupLocSelect.innerHTML += `<option value="${l.location_id}">${escapeHtml(l.name)}</option>`;
    });

    renderPlanPassList();
    loadingEl.style.display = 'none';
    listEl.style.display = 'flex';
  } catch (e) {
    loadingEl.style.display = 'none';
    const meta = getLoadErrorMeta(e);
    errorEl.className = meta.className;
    errorEl.innerHTML = meta.message;
    errorEl.style.display = 'flex';
    const userFlowDisplayEl = document.getElementById('signupUserFlowDisplay');
    if (userFlowDisplayEl) {
      userFlowDisplayEl.value = 'Failed to load';
    }
  } finally {
    if (locationLoadingEl) locationLoadingEl.style.display = 'none';
    if (locationContentEl) locationContentEl.style.display = 'block';
    if (locationSelectEl) locationSelectEl.disabled = false;
    if (userFlowLoadingEl) userFlowLoadingEl.style.display = 'none';
    if (userFlowContentEl) userFlowContentEl.style.display = 'block';
  }
}

async function loadDropinData() {
  // Set min date to today so past dates cannot be selected
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('diDate').setAttribute('min', today);

  const loadingEl = document.getElementById('dropinLoading');
  const paramsEl = document.getElementById('dropinParams');
  loadingEl.style.display = 'flex';
  paramsEl.style.display = 'none';

  try {
    const [resRes, locRes, typesRes, orgRes] = await Promise.all([
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        resources(limit: 100, order: IS_DROPIN_BOOKABLE_DESC) {
          data {
            resource_id
            name
            type { name }
            location { location_id name }
            is_dropin_bookable
            booking_policy {
              is_bookable
              is_bookable_by_admins_only
            }
          }
        }
      }`),
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        locations {
          data {
            location_id
            name
          }
        }
      }`),
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        resourceTypes(limit: 100) {
          data {
            resource_type_id
            name
          }
        }
      }`),
      gqlQuery(apiConfig.endpoint, apiConfig.token, `{
        me {
          organization {
            organization_id
            dropin_booking_widget {
              within_service_hours
            }
          }
        }
      }`),
    ]);

    resources = resRes.data?.resources?.data || [];
    locations = locRes.data?.locations?.data || [];
    const resourceTypes = typesRes.data?.resourceTypes?.data || [];
    const withinServiceHours = orgRes.data?.me?.organization?.dropin_booking_widget?.within_service_hours;

    if (resources.length === 0) {
      const meta = getLoadErrorMeta(null, 'No drop-in resources are available for this organization.');
      loadingEl.innerHTML = `<div class="${meta.className}">${meta.message}</div>`;
      return;
    }

    // Populate location dropdown
    const locSelect = document.getElementById('diLocation');
    locSelect.innerHTML = '<option value="">All locations</option>';
    locations.forEach(l => {
      locSelect.innerHTML += `<option value="${l.location_id}">${escapeHtml(l.name)}</option>`;
    });

    // Populate resource type dropdown (from resourceTypes query)
    const typeSelect = document.getElementById('diType');
    typeSelect.innerHTML = '<option value="">All types</option>';
    resourceTypes.forEach(type => {
      typeSelect.innerHTML += `<option value="${escapeHtml(type.name)}">${escapeHtml(type.name)}</option>`;
    });

    // Populate resource dropdown (only show drop-in bookable resources)
    const resSelect = document.getElementById('diResource');
    resSelect.innerHTML = '<option value="">None (show all)</option>';
    const dropinBookableResources = resources.filter(r => r.is_dropin_bookable);
    dropinBookableResources.forEach(r => {
      const locName = r.location?.name ? ` (${r.location.name})` : '';
      resSelect.innerHTML += `<option value="${r.resource_id}">${escapeHtml(r.name)}${escapeHtml(locName)}</option>`;
    });

    // Update Resource Availability display
    const availabilityDisplayEl = document.getElementById('availabilityDisplay');
    if (withinServiceHours === true) {
      availabilityDisplayEl.value = 'Follow location service hours';
    } else if (withinServiceHours === false) {
      availabilityDisplayEl.value = 'Follow availability of each resource';
    } else {
      // If undefined/null, show unknown
      availabilityDisplayEl.value = 'Not configured';
    }

    loadingEl.style.display = 'none';
    paramsEl.style.display = 'block';
    document.getElementById('dropinUrlCard').style.display = 'none';

    // Initialize material time picker
    initTimePicker();

    updateDropinUrls();
  } catch (e) {
    const meta = getLoadErrorMeta(e);
    loadingEl.innerHTML = `<div class="${meta.className}">${meta.message}</div>`;
  }
}
