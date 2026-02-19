# Optix Web Widgets Technical Documentation

## Table of Contents

- [1. Overview](#1-overview)
- [2. Widget Types](#2-widget-types)
- [3. Embedding Modes](#3-embedding-modes)
- [4. Advanced Custom Parameters](#4-advanced-custom-parameters)
  - [4.1 Drop-in Bookings Widget](#41-drop-in-bookings-widget)
  - [4.2 Signup Widget](#42-signup-widget)
  - [4.3 Inquiry Widget](#43-inquiry-widget)
  - [4.4 Tour Bookings Widget](#44-tour-bookings-widget)
- [5. Theme Customization System](#5-theme-customization-system)
- [6. Admin Configuration by Widget](#6-admin-configuration-by-widget)
- [7. Technical Architecture](#7-technical-architecture)
- [8. Key File Index](#8-key-file-index)

---

## 1. Overview

Optix Web Widgets are embeddable SPA components for customer websites, covering space booking, member signup, inquiries, and tour bookings.

**URL structure:**
- Production: `https://{subdomain}.optixapp.com/{path}/`
- Staging: `https://staging.optixdev.com/{path}/`
- Local: `http://optixapp.local/{path}/`

**Web plugin script:**
- Production: `https://{subdomain}.optixapp.com/web-plugin/optix.v1.js`
- Staging: `https://staging.optixdev.com/web-plugin/optix.v1.js`

---

## 2. Widget Types

| Widget | CSS Class | Public Path | Feature Flag |
| --- | --- | --- | --- |
| Drop-in Bookings | `optix-booking-widget` | `/book/` | `enable_web_bookings` |
| Signup | `optix-member-widget` | `/signup/` | `enable_web_onboarding` |
| Inquiry | `optix-inquiry-widget` | `/inquiry/` | `enable_inquiry` |
| Tour Bookings | `optix-tour-widget` | `/book/tour/` | Tour-related settings |

---

## 3. Embedding Modes

Each widget supports 3 embedding modes.

### 3.1 Pop-up Mode

Click to open widget in a modal:

```html
<!-- Drop-in Booking -->
<a class="optix-booking-widget" optix-venue="raulzhou" optix-mode="popup">Book</a>

<!-- Signup -->
<a class="optix-member-widget" optix-venue="raulzhou" optix-mode="popup">Sign-up</a>

<!-- Inquiry -->
<a class="optix-inquiry-widget" optix-venue="raulzhou" optix-mode="popup">Inquiry</a>

<!-- Tour -->
<a class="optix-tour-widget" optix-venue="raulzhou" optix-mode="popup">Book a tour</a>
```

### 3.2 Embed Mode

Render directly inside the page:

```html
<!-- Drop-in Booking -->
<div class="optix-booking-widget" optix-venue="raulzhou" optix-mode="embed"></div>

<!-- Signup -->
<div class="optix-member-widget" optix-venue="raulzhou" optix-mode="embed"></div>

<!-- Inquiry -->
<div class="optix-inquiry-widget" optix-venue="raulzhou" optix-mode="embed"></div>

<!-- Tour -->
<div class="optix-tour-widget" optix-venue="raulzhou" optix-mode="embed"></div>
```

### 3.3 Link Mode

Direct links to standalone pages:

```text
https://raulzhou.optixapp.com/book/
https://raulzhou.optixapp.com/signup/
https://raulzhou.optixapp.com/inquiry/
https://raulzhou.optixapp.com/book/tour/
```

### Shared Script Loader

All Pop-up and Embed modes require the web plugin script:

```html
<script>
(function(o, p, t, i, x) {
  x = p.createElement(t);
  var m = p.getElementsByTagName(t)[0];
  x.async = 1;
  x.src = i;
  m.parentNode.insertBefore(x, m);
})(window, document, 'script', 'https://raulzhou.optixapp.com/web-plugin/optix.v1.js');
</script>
```

---

## 4. Advanced Custom Parameters

### 4.1 Drop-in Bookings Widget

#### HTML attributes (Pop-up / Embed)

Add these attributes on `optix-booking-widget`:

| Attribute | Value | Description | Example |
| --- | --- | --- | --- |
| `optix-venue` | subdomain | Organization identifier | `optix-venue="raulzhou"` |
| `optix-mode` | `popup` / `embed` | Display mode | `optix-mode="embed"` |
| `optix-args-locations` | Comma-separated location IDs | Show resources only at specific locations | `optix-args-locations="26470"` |
| `optix-args-duration` | Seconds | Default booking duration (editable by user) | `optix-args-duration="3600"` |
| `optix-args-capacity` | Number | Minimum capacity filter (editable by user) | `optix-args-capacity="3"` |
| `optix-args-date` | ISO date | Default booking date (editable by user) | `optix-args-date="2024-03-30"` |
| `optix-args-time` | 24h `HH:MM` | Default start time (editable by user) | `optix-args-time="14:30"` |
| `optix-args-resource` | Resource ID | Skip resource list and open a specific resource | `optix-args-resource="12345"` |
| `optix-args-picker` | `"true"` | Skip resource detail and open picker directly | `optix-args-picker="true"` |
| `optix-args-types` | Comma-separated type names | Filter by resource type (case-sensitive) | `optix-args-types="Meeting Room"` |

**Supported resource types:** `Hot Desk`, `Dedicated Desk`, `Conference Room`, `Meeting Room`, `Private Office`

**Complete example:**

```html
<div class="optix-booking-widget"
     optix-venue="raulzhou"
     optix-mode="embed"
     optix-args-locations="26470"
     optix-args-types="Meeting Room"
     optix-args-duration="3600"
     optix-args-capacity="4">
</div>
```

#### URL parameters (Link mode)

| URL format | Description |
| --- | --- |
| `/book?date=2024-03-20` | Set default booking date |
| `/book/resource/{ID}` | Deep link to resource detail |
| `/book/resource/{ID}/pick` | Open date/time picker for resource |

**Get Resource ID:** Admin -> Settings -> Web widgets -> Drop-in bookings -> resource list -> menu -> `Copy ID to clipboard`

**Get Location ID:** Contact `support@optixapp.com`

---

### 4.2 Signup Widget

#### URL parameters (Link mode): Plan/Pass filter and ordering

| Parameter | Description | Example |
| --- | --- | --- |
| `?plans={id1},{id2}` | Show only selected plans | `/signup?plans=123,456` |
| `?products={id1},{id2}` | Show only selected passes/products | `/signup?products=789,012` |
| `?order={id1},{id2}` | Control display order | `/signup?plans=123,456&order=456,123` |
| `?plans={}&products={}` | Filter both plans and passes | `/signup?plans=123,456&products=789` |

**Complete examples:**

```text
# Plans only
https://raulzhou.optixapp.com/signup?plans=123,465,786

# Passes only
https://raulzhou.optixapp.com/signup?products=123,465,786

# Plans + Passes
https://raulzhou.optixapp.com/signup?plans=123,465&products=786,901

# Filter + custom order (verified)
https://kinship.optixapp.com/signup/?plans=56581,56624,56625,56582,56626,56658&order=56581,56624,56625,56582,56626,56658
```

**Notes:**
- Plan/Pass must be marked `Visible to new users` to appear
- IDs can be obtained from `support@optixapp.com` or GraphQL queries (`planTemplates` / `products`)
- Use comma-separated IDs without spaces
- `order` sequence controls visual order in the widget

#### HTML attributes (Pop-up / Embed)

For the Signup widget tag (`optix-member-widget`), the following advanced args are supported:

| Attribute | Description | Example |
| --- | --- | --- |
| `optix-args-plans` | Show only selected plans | `optix-args-plans="123,456"` |
| `optix-args-products` | Show only selected passes/products | `optix-args-products="789,901"` |
| `optix-args-order` | Control display order (when plans/products are specified) | `optix-args-order="456,123,901"` |
| `optix-args-location` | Pre-select signup location | `optix-args-location="26780"` |

```html
<div class="optix-member-widget"
     optix-venue="optixheadquarters"
     optix-mode="embed"
     optix-args-products="49668,40335,49582"
     optix-args-location="26780">
</div>
```

Verified in this project environment: `optix-args-location` works for Signup embed/pop-up generation.

#### Admin flow configuration

Controlled by `widgetOptions.onboarding.choosePlanFirst`:

- `0`: Collect user details first, then show Plan/Pass
- `1`: Choose Plan/Pass first, then collect user details

---

### 4.3 Inquiry Widget

Inquiry shares controller logic with Signup (`editVenueSettingsOnboardingCtrl`) and is distinguished via `mode=inquiry`.

#### Configurable options

| Setting | Description |
| --- | --- |
| `widgetOptions.inquiry.welcomeMessage` | Welcome message |
| `widgetOptions.inquiry.thankyouMessage` | Thank-you message |
| `widgetOptions.inquiry.hidePlansAndPasses` | `0` = show Plan/Pass step, `1` = hide this step |

> Note: The docs do not explicitly confirm Signup-style `?plans=` / `?products=` support for Inquiry. Validate behavior before relying on it.

---

### 4.4 Tour Bookings Widget

#### URL format

```text
https://raulzhou.optixapp.com/book/tour/
```

#### Configurable options

| Setting | Description |
| --- | --- |
| `tour_max_advance_sec` | Maximum advance booking window in seconds (`0` = unlimited) |
| `tour_min_advance_sec` | Minimum advance booking window in seconds (`0` = unlimited) |
| Google Calendar integration | Sync tour availability with Google Calendar |
| Location calendars | Calendar settings per location |

---

## 5. Theme Customization System

All widgets share theme settings stored in the `web_plugin` object.

### Customizable properties

| Property | Default | Description |
| --- | --- | --- |
| `backgroundColor` | `#FFFFFF` | Page background |
| `darkMode` | `false` | Dark mode toggle |
| `accentColor` | `#007AFF` | Accent color (buttons, links) |
| `colorOnAccent` | `light` | Text color on accent (`light` / `dark`) |
| `navBarColor` | `#ffffff` | Navigation bar color |
| `colorOnNavBar` | `dark` | Text color on nav bar (`light` / `dark`) |
| `navBarShadow` | `4` | Nav bar shadow (`0` / `2` / `4` / `6`) |
| `fontFamily` | `Roboto` | Font family (supports 800+ Google Fonts) |
| `formInputStyle` | `regular` | Input style (`regular`=Line / `solo`=Raised / `box`=Fill / `outline`=Outline) |
| `buttonCornerRadius` | `18px` | Button radius (`0px` to `18px`) |
| `raisedButtons` | `1` | Button shadow (`1`=on / `0`=off) |

### Preset themes

| Theme | Background | Accent | Font | Input | Style |
| --- | --- | --- | --- | --- | --- |
| Theme 1 | `#FFFFFF` | `#007AFF` (Blue) | Roboto | Line | Bright modern |
| Theme 2 | `#F8F8F8` | `#3a3a3a` (Dark gray) | Open Sans | Fill | Clean business |
| Theme 3 | `#FFFCF4` | `#5C7358` (Green) | Lora | Line | Warm elegant |
| Theme 4 | `#222222` | `#FFF27D` (Yellow) | Nunito | Outline | Dark energetic |

---

## 6. Admin Configuration by Widget

### Signup Widget

| Feature | Description |
| --- | --- |
| Enable/disable | `enable_web_onboarding` |
| Image gallery | Display images on the right side of form |
| Welcome message | `widgetOptions.onboarding.welcomeMessage` |
| Thank-you message | `widgetOptions.onboarding.thankyouMessage` |
| User flow | `choosePlanFirst`: `0` info first, `1` plan first |
| Embedding mode | Pop-up / Embed / Link |
| Custom fields | Controlled via User Properties |

### Drop-in Bookings Widget

| Feature | Description |
| --- | --- |
| Enable/disable | `enable_web_bookings` |
| Custom title | `dropin_title` (default `Find a space`) |
| Cancellation policy | `dropin_cancellation_policy` |
| Manual payment options | `dropin_show_allowed_payment_methods` (Stripe: Apple Pay, iDEAL, etc.) |
| Availability logic | `dropin_within_service_hours`: `1` business hours, `0` resource availability |
| Resource visibility | Per-resource `is_dropin_bookable` |
| Embedding mode | Pop-up / Embed / Link |

### Inquiry Widget

| Feature | Description |
| --- | --- |
| Enable/disable | `enable_inquiry` |
| Welcome message | `widgetOptions.inquiry.welcomeMessage` |
| Thank-you message | `widgetOptions.inquiry.thankyouMessage` |
| Plan/Pass visibility | `hidePlansAndPasses`: `0` show, `1` hide |

### Tour Bookings Widget

| Feature | Description |
| --- | --- |
| Booking window (max) | `tour_max_advance_sec` (seconds, `0` unlimited) |
| Booking window (min) | `tour_min_advance_sec` (seconds, `0` unlimited) |
| Google Calendar integration | Sync availability |

---

## 7. Technical Architecture

### Frontend stack

| Layer | Technology |
| --- | --- |
| Admin Dashboard | AngularJS 1.x + UI-Router |
| UI Components (sidebar) | Vue.js 2.7 + Vuetify 2.6 + Vuex |
| Widget frontend (public pages) | SPA rendered through `optix.v1.js` |
| API backend | v1 (PHP) + v2 (Laravel), GraphQL |

### Widget rendering flow

1. Customer site loads `optix.v1.js`
2. Script scans DOM for `optix-*-widget` elements
3. Reads attributes such as `optix-venue`, `optix-mode`, `optix-args-*`
4. Creates iframe or popup and loads the target SPA page
5. SPA fetches API data and renders UI

### Canvas communication in admin

Widget configuration pages use Canvas command messaging between AngularJS host app and Vue sidebar:

```javascript
// Navigate to widget settings
this.$optix.canvas.canvasRawCommand("RouteToState", {
  state: "settings.venueSettings.dropIn",
  params: { id: organization_id }
});
```

### Environment configuration

| Environment | SITE_URL | API v1 | API v2 |
| --- | --- | --- | --- |
| Production | `https://www.optixapp.com` | - | `https://api.optixapp.com` |
| Staging | `https://staging.optixdev.com` | `https://staging.catalufa.net/api` | `https://api.catalufa.net` |
| Local | `http://optixapp.local` | `http://sharedesk.local/api` | `http://api.sharedesk.local` |

---

## 8. Key File Index

### Widget config controllers

| File | Purpose |
| --- | --- |
| `optix-admin-dashboard/sharedesk/httpdocs/app/venue/controllers/editVenueSettingsOnboardingCtrl.js` | Signup/Inquiry config, embed code generation, theme management |
| `optix-admin-dashboard/sharedesk/httpdocs/app/venue/controllers/editVenueSettingsDropinBookingCtrl.js` | Drop-in config and embed code generation |
| `optix-admin-dashboard/sharedesk/httpdocs/app/venue/controllers/editVenueSettingsDropinBookingSpacesCtrl.js` | Drop-in resource visibility management |
| `optix-admin-dashboard/sharedesk/httpdocs/app/venue/controllers/editVenueSettingsTour.js` | Tour booking configuration |

### Widget template files

| File | Purpose |
| --- | --- |
| `optix-admin-dashboard/.../app/venue/edit.onboarding.general.html` | Shared Signup/Inquiry settings page |
| `optix-admin-dashboard/.../app/venue/edit.onboarding.widget.html` | Theme customization page (settings + preview) |
| `optix-admin-dashboard/.../app/venue/edit.settings.dropinBookings.html` | Drop-in basic settings |
| `optix-admin-dashboard/.../app/venue/edit.settings.dropinBookings.spaces.html` | Drop-in resource selection |
| `optix-admin-dashboard/.../app/venue/edit.settings.dropinBookings.advanced.html` | Drop-in resource availability settings |
| `optix-admin-dashboard/.../app/venue/edit.settings.tour.html` | Tour settings page |
| `optix-admin-dashboard/.../app/venue/modal.onboardingEmbedCode.html` | Embed code modal |

### Vue components (UI components)

| File | Purpose |
| --- | --- |
| `ui-components/src/views/settings/WidgetOverview.vue` | Widget overview page |

### Route configuration

| File | Purpose |
| --- | --- |
| `optix-admin-dashboard/.../app/settings/settingsV2.js` | Admin routes (`settings.widgets`, `venueSettings.*`) |
| `optix-admin-dashboard/.../app/venue/venue.js` | Venue edit routes (`editVenue.widget`, `editVenue.settings.*`) |
| `ui-components/src/router/adminRoutes.js` | Vue-side routes |

### Configuration files

| File | Purpose |
| --- | --- |
| `optix-admin-dashboard/sharedesk/httpdocs/config/production.js` | Production config (`APPCONFIG`) |
| `optix-admin-dashboard/sharedesk/httpdocs/config/staging.js` | Staging config |
| `ui-components/src/utils/Environment.js` | Environment config for Vue side |

---

## Appendix: Reference Links

- [Quick Guide to Web Widgets](https://support.optixapp.com/en/articles/6236780-quick-guide-to-web-widgets)
- [Advanced Embed Options (Drop-in)](https://support.optixapp.com/en/articles/3952452-how-do-i-use-advanced-embed-options-in-my-drop-in-bookings-widget)
- [Sign-up Widget](https://support.optixapp.com/en/articles/2347791-how-do-i-enable-leads-to-sign-up-for-a-plan-or-pass-on-my-website)
- [Enable Bookings on Website](https://support.optixapp.com/en/articles/3948766-how-do-i-enable-bookings-on-my-marketing-website)
- [Web Widget Theme Design](https://support.optixapp.com/en/articles/3948826-how-do-i-change-the-design-of-my-web-widgets)
