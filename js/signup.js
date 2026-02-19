// ══════════════════════════════════════════════════════════════════════════════
// Signup Module - Handles all signup widget functionality
// ══════════════════════════════════════════════════════════════════════════════

// ── Signup State Variables ────────────────────────────────────────────────────
let selectedItems = []; // {id, name, type:'plan'|'product'}
let hasManuallyReordered = false; // Track if user has explicitly reordered items
let sortableInstance = null;

// ── Render Plan/Pass List ──────────────────────────────────────────────────────
function renderPlanPassList() {
  const listEl = document.getElementById('planPassList');
  let html = '';

  // Separate available and hidden items
  const availablePlans = plans.filter(p => p.onboarding_enabled);
  const hiddenPlans = plans.filter(p => !p.onboarding_enabled);
  const availableProducts = products.filter(p => p.onboarding_enabled);
  const hiddenProducts = products.filter(p => !p.onboarding_enabled);

  // ── Available Items (can be used in widget) ──
  if (availablePlans.length > 0 || availableProducts.length > 0) {
    html += '<div class="section-label"><span class="material-icons" style="font-size:16px;vertical-align:middle;color:#34c759;">check_circle</span> Available for Widget</div>';

    if (availablePlans.length > 0) {
      html += '<div class="subsection-label">Plans</div>';
      availablePlans.forEach(p => {
        const checked = selectedItems.some(s => s.id === p.plan_template_id) ? 'checked' : '';
        const price = p.price ? `$${p.price}${p.price_frequency ? '/' + p.price_frequency : ''}` : 'Free';
        html += `
          <div class="item-row">
            <input type="checkbox" ${checked} onchange="toggleItem('${p.plan_template_id}', '${escapeHtml(p.name)}', 'plan', this.checked)">
            <div class="item-info">
              <div class="item-name">${escapeHtml(p.name)}</div>
              <div class="item-meta">${price} &middot; ID: ${p.plan_template_id}</div>
            </div>
            <span class="item-badge badge-plan">Plan</span>
          </div>`;
      });
    }

    if (availableProducts.length > 0) {
      html += '<div class="subsection-label">Passes</div>';
      availableProducts.forEach(p => {
        const checked = selectedItems.some(s => s.id === p.product_id) ? 'checked' : '';
        const price = p.unit_amount ? `$${p.unit_amount}` : (p.prices?.[0]?.price ? `$${p.prices[0].price}` : 'Free');
        html += `
          <div class="item-row">
            <input type="checkbox" ${checked} onchange="toggleItem('${p.product_id}', '${escapeHtml(p.name)}', 'product', this.checked)">
            <div class="item-info">
              <div class="item-name">${escapeHtml(p.name)}</div>
              <div class="item-meta">${price} &middot; ID: ${p.product_id}</div>
            </div>
            <span class="item-badge badge-pass">Pass</span>
          </div>`;
      });
    }
  }

  // ── Hidden Items (not visible to new users) ──
  if (hiddenPlans.length > 0 || hiddenProducts.length > 0) {
    html += '<div class="section-label" style="margin-top:20px;"><span class="material-icons" style="font-size:16px;vertical-align:middle;color:#ff9800;">visibility_off</span> Hidden (Not Available in Widget)</div>';
    html += '<div class="hint" style="margin-bottom:12px;color:#999;">These plans/passes are not visible to new users.</div>';

    if (hiddenPlans.length > 0) {
      html += '<div class="subsection-label">Plans</div>';
      hiddenPlans.forEach(p => {
        const price = p.price ? `$${p.price}${p.price_frequency ? '/' + p.price_frequency : ''}` : 'Free';
        html += `
          <div class="item-row item-row-disabled">
            <input type="checkbox" disabled title="Not visible to new users">
            <div class="item-info">
              <div class="item-name">${escapeHtml(p.name)}</div>
              <div class="item-meta">${price} &middot; ID: ${p.plan_template_id}</div>
            </div>
            <span class="item-badge badge-plan" style="opacity:0.5;">Plan</span>
          </div>`;
      });
    }

    if (hiddenProducts.length > 0) {
      html += '<div class="subsection-label">Passes</div>';
      hiddenProducts.forEach(p => {
        const price = p.unit_amount ? `$${p.unit_amount}` : (p.prices?.[0]?.price ? `$${p.prices[0].price}` : 'Free');
        html += `
          <div class="item-row item-row-disabled">
            <input type="checkbox" disabled title="Not visible to new users">
            <div class="item-info">
              <div class="item-name">${escapeHtml(p.name)}</div>
              <div class="item-meta">${price} &middot; ID: ${p.product_id}</div>
            </div>
            <span class="item-badge badge-pass" style="opacity:0.5;">Pass</span>
          </div>`;
      });
    }
  }

  if (plans.length === 0 && products.length === 0) {
    html = '<div class="empty-state">No plans or passes found.</div>';
  }

  listEl.innerHTML = html;
}

// ── Toggle Selection ───────────────────────────────────────────────────────────
function toggleItem(id, name, type, checked) {
  if (checked) {
    if (!selectedItems.some(s => s.id === id)) {
      selectedItems.push({ id, name, type });
    }
  } else {
    selectedItems = selectedItems.filter(s => s.id !== id);
  }
  hasManuallyReordered = false; // Reset on selection change
  updateSortableList();
  updateSignupUrls();
}

function removeItem(id) {
  selectedItems = selectedItems.filter(s => s.id !== id);
  hasManuallyReordered = false; // Reset on removal
  renderPlanPassList();
  updateSortableList();
  updateSignupUrls();
}

// ── Sortable List ──────────────────────────────────────────────────────────────
function updateSortableList() {
  const listEl = document.getElementById('sortableList');
  const emptyEl = document.getElementById('orderEmpty');
  const orderCard = document.getElementById('orderCard');
  const urlCard = document.getElementById('urlCard');

  if (selectedItems.length === 0) {
    orderCard.style.display = 'none';
    urlCard.style.display = 'none';
    return;
  }

  orderCard.style.display = 'block';
  urlCard.style.display = 'block';
  emptyEl.style.display = 'none';

  listEl.innerHTML = selectedItems.map(item => `
    <div class="sort-item" data-id="${item.id}">
      <span class="material-icons drag-handle">drag_indicator</span>
      <span class="sort-name">${escapeHtml(item.name)}</span>
      <span class="item-badge ${item.type === 'plan' ? 'badge-plan' : 'badge-pass'}">${item.type === 'plan' ? 'Plan' : 'Pass'}</span>
      <span class="material-icons sort-remove" onclick="removeItem('${item.id}')">close</span>
    </div>
  `).join('');

  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new Sortable(listEl, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: () => {
      // Reorder selectedItems based on DOM order
      const newOrder = [];
      listEl.querySelectorAll('.sort-item').forEach(el => {
        const id = el.dataset.id;
        const item = selectedItems.find(s => s.id === id);
        if (item) newOrder.push(item);
      });
      selectedItems = newOrder;
      hasManuallyReordered = true; // User has manually reordered
      updateSignupUrls();
    },
  });
}

// ── URL Generation: Signup / Inquiry ───────────────────────────────────────────
function updateSignupUrls() {
  const signupLocation = document.getElementById('signupLocation').value;

  // Show URL if location is selected OR if items are selected
  if (!signupLocation && selectedItems.length === 0) {
    // Hide URL cards if nothing is selected
    document.getElementById('orderCard').style.display = 'none';
    document.getElementById('urlCard').style.display = 'none';
    return;
  }

  const base = `https://${apiConfig.venue}.optixapp.com`;
  const path = '/signup/';
  const url = new URL(base + path);

  const planIds = selectedItems.filter(s => s.type === 'plan').map(s => s.id);
  const productIds = selectedItems.filter(s => s.type === 'product').map(s => s.id);
  const allIds = selectedItems.map(s => s.id);

  if (signupLocation) url.searchParams.set('location', signupLocation);
  if (planIds.length > 0) url.searchParams.set('plans', planIds.join(','));
  if (productIds.length > 0) url.searchParams.set('products', productIds.join(','));
  // Only add order parameter if user has explicitly reordered items
  if (hasManuallyReordered && allIds.length > 1) url.searchParams.set('order', allIds.join(','));

  document.getElementById('combinedUrl').value = url.toString();
  document.getElementById('urlCard').style.display = 'block';

  // Embed code for signup
  const embedCodeGroup = document.getElementById('embedCodeGroup');
  const popupCodeGroup = document.getElementById('popupCodeGroup');
  if (currentTab === 'signup') {
    embedCodeGroup.style.display = 'block';
    popupCodeGroup.style.display = 'block';
    const cssClass = 'optix-member-widget';
    const scriptTag = `<script>(function(o,p,t,i,x){x=p.createElement(t);var m=p.getElementsByTagName(t)[0];x.async=1;x.src=i;m.parentNode.insertBefore(x,m);})(window,document,'script','https://${apiConfig.venue}.optixapp.com/web-plugin/optix.v1.js');<\/script>`;
    const embedAttrs = [
      `class="${cssClass}"`,
      `optix-venue="${apiConfig.venue}"`,
      `optix-mode="embed"`,
    ];
    const popupAttrs = [
      `class="${cssClass}"`,
      `optix-venue="${apiConfig.venue}"`,
      `optix-mode="popup"`,
    ];

    if (planIds.length > 0) {
      embedAttrs.push(`optix-args-plans="${planIds.join(',')}"`);
      popupAttrs.push(`optix-args-plans="${planIds.join(',')}"`);
    }
    if (productIds.length > 0) {
      embedAttrs.push(`optix-args-products="${productIds.join(',')}"`);
      popupAttrs.push(`optix-args-products="${productIds.join(',')}"`);
    }
    if (hasManuallyReordered && allIds.length > 1) {
      embedAttrs.push(`optix-args-order="${allIds.join(',')}"`);
      popupAttrs.push(`optix-args-order="${allIds.join(',')}"`);
    }
    if (signupLocation) {
      embedAttrs.push(`optix-args-location="${signupLocation}"`);
      popupAttrs.push(`optix-args-location="${signupLocation}"`);
    }

    // Embed code (inline)
    let embedHtml = `<div ${embedAttrs.join('\n     ')}></div>\n${scriptTag}`;
    document.getElementById('embedCode').value = embedHtml;

    // Pop-up code
    let popupHtml = `<a ${popupAttrs.join('\n   ')}>Join Now</a>\n${scriptTag}`;
    document.getElementById('popupCode').value = popupHtml;

  } else {
    embedCodeGroup.style.display = 'none';
    popupCodeGroup.style.display = 'none';
  }

  // Individual links
  const indivEl = document.getElementById('individualLinks');
  if (selectedItems.length > 0) {
    let indivHtml = '<div class="url-label" style="margin-bottom:8px;">Individual Links</div>';
    selectedItems.forEach(item => {
      const iUrl = new URL(base + path);
      if (signupLocation) iUrl.searchParams.set('location', signupLocation);
      if (item.type === 'plan') {
        iUrl.searchParams.set('plans', item.id);
      } else {
        iUrl.searchParams.set('products', item.id);
      }
      const inputId = 'indiv_' + item.id;
      indivHtml += `
        <div class="indiv-item">
          <div class="indiv-name">${escapeHtml(item.name)}</div>
          <div class="url-box">
            <input type="text" id="${inputId}" value="${iUrl.toString()}" readonly>
            <button class="copy-btn" onclick="copyUrl('${inputId}', this)">
              <span class="material-icons" style="font-size:18px">content_copy</span>
            </button>
          </div>
        </div>`;
    });
    indivEl.innerHTML = indivHtml;
  } else {
    // Only location is selected, no individual links to show
    indivEl.innerHTML = '';
  }
}

// ── Reset Parameters ──────────────────────────────────────────────────────────
function resetSignupParams() {
  // Reset location
  document.getElementById('signupLocation').value = '';

  // Clear selected items
  selectedItems = [];
  hasManuallyReordered = false;

  // Re-render the UI
  renderPlanPassList();
  updateSortableList();
  updateSignupUrls();
}
