// ══════════════════════════════════════════════════════════════════════════════
// Drop-in Module - Handles all drop-in booking functionality
// ══════════════════════════════════════════════════════════════════════════════

// ── Validate Time Format ──────────────────────────────────────────────────────
function validateTimeFormat(timeValue) {
  if (!timeValue) return true; // Empty is valid (optional field)

  // Check format: HH:MM
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeValue);
}

// ── Validate Duration Input ───────────────────────────────────────────────────
function validateDurationInput(inputEl, max) {
  let value = parseInt(inputEl.value);

  // If empty or NaN, clear the field
  if (isNaN(value) || inputEl.value === '') {
    return;
  }

  // Limit to min/max and normalize (remove leading zeros)
  if (value < 0) {
    value = 0;
  } else if (value > max) {
    value = max;
  }

  // Set normalized value (removes leading zeros)
  inputEl.value = value;

  // Special case: if hours = 24, minutes must be 0 and disabled
  const hoursInput = document.getElementById('diDurationHours');
  const minutesInput = document.getElementById('diDurationMinutes');
  const hours = parseInt(hoursInput.value) || 0;

  if (hours === 24) {
    minutesInput.value = 0;
    minutesInput.disabled = true;
  } else {
    minutesInput.disabled = false;
  }
}

// ── Initialize Time Picker ────────────────────────────────────────────────────
function initTimePicker() {
  const timeInput = $('#diTime');
  const timeBtn = $('#diTimeBtn');

  // Check if jQuery and clockpicker are loaded
  if (typeof jQuery === 'undefined' || typeof jQuery.fn.clockpicker === 'undefined') {
    console.error('jQuery or clockpicker library not loaded');
    // Fallback: make the input type="time" instead
    const input = document.getElementById('diTime');
    input.type = 'time';
    input.addEventListener('change', updateDropinUrls);
    return;
  }

  try {
    // Initialize clockpicker on the wrapper div (bootstrap-clockpicker requires a container)
    console.log('Initializing clockpicker...');
    const wrapper = timeInput.closest('.input-with-icon');
    wrapper.clockpicker({
      placement: 'top',
      align: 'left',
      donetext: 'Done',
      autoclose: true,
      'default': 'now',
      beforeShow: function() {
        console.log('Clockpicker showing...');
      },
      afterDone: function() {
        console.log('Time selected:', timeInput.val());
        updateDropinUrls();
      }
    });

    // Bind clock button to show the picker
    timeBtn.on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      wrapper.clockpicker('show');
    });

    // Auto-format time input as user types (HH:MM)
    let previousLength = 0;
    timeInput.on('input', function(e) {
      let raw = this.value.replace(/[^0-9]/g, ''); // Remove non-digits
      const currentLength = raw.length;
      const isDeleting = currentLength < previousLength;

      // Format the value
      let formatted = raw;
      if (raw.length > 2) {
        formatted = raw.slice(0, 2) + ':' + raw.slice(2, 4);
      }

      this.value = formatted;
      previousLength = currentLength;
    });

    // Handle manual input changes (when user finishes typing)
    timeInput.on('change', function() {
      const timeValue = this.value.trim();
      const errorEl = document.getElementById('diTimeError');

      if (timeValue && !validateTimeFormat(timeValue)) {
        // Show error
        errorEl.classList.add('show');
      } else {
        // Hide error
        errorEl.classList.remove('show');
      }

      updateDropinUrls();
    });

    console.log('clockpicker initialized successfully');
  } catch (error) {
    console.error('Error initializing clockpicker:', error);
    // Fallback: make the input type="time" instead
    const input = document.getElementById('diTime');
    input.type = 'time';
    input.addEventListener('change', updateDropinUrls);
  }
}

// ── Reset Parameters ──────────────────────────────────────────────────────────
function resetDropinParams() {
  document.getElementById('diLocation').value = '';
  document.getElementById('diType').value = '';
  document.getElementById('diResource').value = '';
  document.getElementById('diDurationHours').value = '';
  document.getElementById('diDurationMinutes').value = '';
  document.getElementById('diDurationMinutes').disabled = false;
  document.getElementById('diCapacity').value = '';
  document.getElementById('diDate').value = '';
  document.getElementById('diTime').value = '';
  document.getElementById('diPicker').value = '';

  // Clear error messages
  document.getElementById('diTimeError').classList.remove('show');

  updateDropinUrls();
}

// ── UI State Management ───────────────────────────────────────────────────────
function updateDropinFieldStates() {
  const resource = document.getElementById('diResource').value;

  // When a specific resource is selected:
  // - Location, Type, and Capacity have no effect (per documentation)
  // - These fields should be disabled
  const hasSpecificResource = !!resource;

  document.getElementById('diLocation').disabled = hasSpecificResource;
  document.getElementById('diType').disabled = hasSpecificResource;
  document.getElementById('diCapacity').disabled = hasSpecificResource;

  // Picker can only be used with a specific resource
  // Disable and reset picker when no resource is selected
  const pickerEl = document.getElementById('diPicker');
  if (!hasSpecificResource) {
    pickerEl.value = '';
    pickerEl.disabled = true;
  } else {
    pickerEl.disabled = false;
  }
}

// ── URL Generation: Drop-in ────────────────────────────────────────────────────
function updateDropinUrls() {
  // Update field states first
  updateDropinFieldStates();

  const venue = apiConfig.venue;
  const base = `https://${venue}.optixapp.com`;

  const location = document.getElementById('diLocation').value;
  const type = document.getElementById('diType').value;
  const resource = document.getElementById('diResource').value;

  // Calculate duration from hours and minutes inputs
  const hours = parseInt(document.getElementById('diDurationHours').value) || 0;
  const minutes = parseInt(document.getElementById('diDurationMinutes').value) || 0;
  const duration = (hours > 0 || minutes > 0) ? (hours * 3600 + minutes * 60).toString() : '';

  const capacity = document.getElementById('diCapacity').value;
  const date = document.getElementById('diDate').value;
  const timeRaw = document.getElementById('diTime').value.trim();
  const time = validateTimeFormat(timeRaw) ? timeRaw : ''; // Only use if valid
  const picker = document.getElementById('diPicker').value;
  const dropinUrlCard = document.getElementById('dropinUrlCard');

  // Keep output hidden until at least one parameter is set by the user.
  const hasAnyInput = !!(location || type || resource || duration || capacity || date || time || picker);
  if (dropinUrlCard) {
    dropinUrlCard.style.display = hasAnyInput ? 'block' : 'none';
  }

  // Check for configuration conflicts
  const typeInfoEl = document.getElementById('diTypeInfo');
  const typeInfoTextEl = document.getElementById('diTypeInfoText');
  const resourceWarningEl = document.getElementById('diResourceWarning');

  // Helper: Check if resource has booking policy conflict
  function hasBookingConflict(r) {
    if (!r.is_dropin_bookable) return null;
    if (!r.booking_policy?.is_bookable) return 'no_one';
    if (r.booking_policy?.is_bookable_by_admins_only) return 'admins_only';
    return null;
  }

  // Check Specific Resource for conflicts
  if (resource) {
    const selectedResource = resources.find(r => r.resource_id === resource);
    const conflict = selectedResource ? hasBookingConflict(selectedResource) : null;

    if (conflict === 'no_one') {
      resourceWarningEl.querySelector('.warning-text').textContent = 'This resource is set to "No one can book this resource"';
      resourceWarningEl.querySelector('.warning-hint').textContent = 'Drop-in booking is enabled, but no users (including admins) can book this resource. The widget code will still be generated.';
      resourceWarningEl.classList.add('show');
    } else if (conflict === 'admins_only') {
      resourceWarningEl.querySelector('.warning-text').textContent = 'This resource is set to "Only admins can book"';
      resourceWarningEl.querySelector('.warning-hint').textContent = 'Drop-in booking is enabled, but public users won\'t be able to book this resource. The widget code will still be generated.';
      resourceWarningEl.classList.add('show');
    } else {
      resourceWarningEl.classList.remove('show');
    }
  } else {
    resourceWarningEl.classList.remove('show');
  }

  // Show Resource Type info
  if (type && !resource) {
    const allTypeResources = resources.filter(r => r.type?.name === type);
    const dropinEnabledResources = allTypeResources.filter(r => r.is_dropin_bookable);
    const conflictResources = dropinEnabledResources.filter(r => hasBookingConflict(r));

    const total = allTypeResources.length;
    const available = dropinEnabledResources.length;

    // Determine if this should be a warning (yellow) or info (gray)
    const hasIssues = total === 0 || available === 0 || conflictResources.length > 0;

    if (total === 0) {
      typeInfoTextEl.textContent = 'No resources found with this type.';
      typeInfoEl.classList.add('show', 'warning');
    } else {
      let infoText = `${available} of ${total} ${total === 1 ? 'resource is' : 'resources are'} available in drop-in booking`;

      if (conflictResources.length > 0) {
        if (conflictResources.length === available) {
          infoText += ' (all have booking restrictions and won\'t appear for public users)';
        } else {
          infoText += ` (${conflictResources.length} ${conflictResources.length === 1 ? 'has' : 'have'} booking restrictions)`;
        }
      }

      typeInfoTextEl.textContent = infoText;
      typeInfoEl.classList.add('show');

      if (hasIssues) {
        typeInfoEl.classList.add('warning');
      } else {
        typeInfoEl.classList.remove('warning');
      }
    }
  } else {
    typeInfoEl.classList.remove('show', 'warning');
  }

  // Direct link
  let directUrl;
  if (resource && picker) {
    directUrl = `${base}/book/resource/${resource}/pick`;
  } else if (resource) {
    directUrl = `${base}/book/resource/${resource}`;
  } else {
    const u = new URL(`${base}/book/`);
    if (date) u.searchParams.set('date', date);
    directUrl = u.toString();
  }
  document.getElementById('dropinDirectUrl').value = directUrl;

  // Show warning if unsupported parameters are selected for Direct Link
  // Direct Link only supports: date and resource (with optional picker)
  // It does NOT support: location, type, duration, capacity, time
  const hasUnsupportedParams = location || type || duration || capacity || time;
  const warningEl = document.getElementById('directLinkWarning');
  if (hasUnsupportedParams) {
    warningEl.style.display = 'block';
  } else {
    warningEl.style.display = 'none';
  }

  // Web plugin script
  const scriptTag = `<script>(function(o,p,t,i,x){x=p.createElement(t);var m=p.getElementsByTagName(t)[0];x.async=1;x.src=i;m.parentNode.insertBefore(x,m);})(window,document,'script','https://${venue}.optixapp.com/web-plugin/optix.v1.js');<\/script>`;

  // Embed code
  let attrs = [
    `class="optix-booking-widget"`,
    `optix-venue="${venue}"`,
    `optix-mode="embed"`,
  ];

  // When resource is specified, location and capacity have no effect
  // Only include them when no specific resource is selected
  if (resource) {
    // Specific resource mode
    attrs.push(`optix-args-resource="${resource}"`);
    if (picker) attrs.push(`optix-args-picker="true"`);
    // Duration, date, time still work with specific resource
    if (duration) attrs.push(`optix-args-duration="${duration}"`);
    if (date) attrs.push(`optix-args-date="${date}"`);
    if (time) attrs.push(`optix-args-time="${time}"`);
  } else {
    // General filtering mode
    if (location) attrs.push(`optix-args-locations="${location}"`);
    if (type) attrs.push(`optix-args-types="${type}"`);
    if (duration) attrs.push(`optix-args-duration="${duration}"`);
    if (capacity) attrs.push(`optix-args-capacity="${capacity}"`);
    if (date) attrs.push(`optix-args-date="${date}"`);
    if (time) attrs.push(`optix-args-time="${time}"`);
  }

  document.getElementById('dropinEmbedCode').value = `<div ${attrs.join('\n     ')}></div>\n${scriptTag}`;

  // Popup code
  let popupAttrs = [...attrs];
  popupAttrs[2] = `optix-mode="popup"`;
  document.getElementById('dropinPopupCode').value =
    `<a ${popupAttrs.join('\n   ')}>Book a Space</a>\n${scriptTag}`;
}
