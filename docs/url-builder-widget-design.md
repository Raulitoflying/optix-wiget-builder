# URL Builder Widget - Design Document

## 1. Requirements Overview

### Problem

Today, Optix admins who need custom widget URLs with Plan/Pass filters (for example `/signup?plans=123,456`) must:

1. Contact `support@optixapp.com` to get Plan/Pass IDs
2. Manually compose URL query parameters
3. Work without clear control of Plan/Pass display order

This creates unnecessary friction for non-technical users.

### Goals

Add a **URL Builder** component to Sign-up Widget and Drop-in Bookings settings so admins can:

- Select which Plans/Passes to show (multi-select)
- Reorder selected items via drag-and-drop
- Generate single-item links
- Generate one combined link containing all selected items
- Copy generated links with one click

### No Backend Changes Required

This feature is primarily frontend URL composition. Existing widgets already parse `?plans=` and `?products=`.

---

## 2. Technical Approach

### Approach: Admin Dashboard Canvas (Optix Developer Platform App)

Build a standalone hosted web app and embed it in the Admin Dashboard using Canvas.

#### How it works

1. Register a Canvas in Optix App Settings with type `ADMIN_MAIN_MENU`
2. Canvas loads in an iframe; Optix appends `?token=xxx` automatically
3. Canvas uses the token to query GraphQL for Plans/Passes
4. User selects and orders items in UI; frontend generates final URL

#### Canvas registration

```json
{
  "canvases": [
    {
      "type": "ADMIN_MAIN_MENU",
      "url": "https://your-domain.com/url-builder",
      "title": "Widget URL Builder",
      "icon": "link",
      "menu_parent": "settings",
      "admin_role": "MANAGER"
    }
  ]
}
```

Alternative registration (App Settings canvas):

```json
{
  "canvases": [
    {
      "type": "ADMIN_APP_SETTINGS",
      "url": "https://your-domain.com/url-builder",
      "title": "Widget URL Builder"
    }
  ]
}
```

#### Recommended stack

| Component | Recommendation | Why |
| --- | --- | --- |
| Frontend framework | Vue 3 (or plain HTML + Optix UI Kit) | Lightweight and aligned with Optix patterns |
| Drag-and-drop | SortableJS / vuedraggable | Stable and production-proven |
| UI library | Optix UI Kit (CDN) | Visual consistency |
| API client | `fetch` + GraphQL | Standard and simple |
| Hosting | Vercel / Netlify / static hosting | Fast deployment |

---

## 3. Core Feature Design

### 3.1 Data fetching

When Canvas loads, read `token` from URL and query GraphQL.

#### Plan Templates (Plans)

```graphql
query planTemplates($organizationId: ID!) {
  planTemplates(
    organization_id: $organizationId
    limit: 100
    onboarding_enabled: true
  ) {
    total
    data {
      plan_template_id
      name
      description
      price
      price_frequency
      order
      onboarding_enabled
      image {
        url
      }
      locations {
        location_id
        name
      }
    }
  }
}
```

#### Products (Passes)

```graphql
query products($organizationId: ID!) {
  products(
    organization_id: $organizationId
    limit: 100
    onboarding_enabled: true
  ) {
    total
    data {
      product_id
      name
      description
      price
      onboarding_enabled
      locations {
        location_id
        name
      }
    }
  }
}
```

#### Resources (for Drop-in)

```graphql
query resources($organizationId: ID!) {
  resources(organization_id: $organizationId, limit: 200) {
    total
    data {
      resource_id
      name
      type
      capacity
      location {
        location_id
        name
      }
      is_dropin_bookable
    }
  }
}
```

#### Locations

```graphql
query locations($organizationId: ID!) {
  locations(organization_id: $organizationId, limit: 100) {
    total
    data {
      location_id
      name
    }
  }
}
```

### 3.2 Authentication flow

1. Canvas receives `token` in URL
2. Decode/parse token claims (org context)
3. Call Optix GraphQL using token as Bearer auth
4. Scope all data to current org
5. Reject or warn on cross-org values

---

## 4. UI Design

### 4.1 Layout

Suggested page layout:

1. Widget type selector (`Signup`, `Drop-in`, `Inquiry`, `Tour`)
2. Base URL input (read-only or editable with validation)
3. Selectors for Plans/Passes/Resources/Locations
4. Sortable selected list
5. URL preview area
6. Validation panel (`error`/`warning`)
7. Actions (`Generate`, `Copy`, `Open`)

### 4.2 Drop-in mode UI

Drop-in mode should expose:

- Location filter
- Resource type filter
- Capacity and duration defaults
- Date/time defaults
- Optional direct resource link (`/book/resource/{id}`)
- Optional picker deep link (`/book/resource/{id}/pick`)

---

## 5. URL Generation Logic

### 5.1 Signup URL generation

Rules:

1. `plans` and `products` accept comma-separated IDs
2. `order` controls rendering order when both types are displayed
3. Keep IDs unique and preserve selected order
4. `location` is supported for signup links and embed/pop-up attributes
5. Remove empty parameters

Example outputs:

- `/signup?plans=123,456`
- `/signup?products=789,901`
- `/signup?plans=123,456&products=789`
- `/signup?plans=123,456&products=789&order=456,123,789`
- `/signup?location=26780&products=789,901`

Signup embed/pop-up attributes:

- `optix-args-plans="123,456"`
- `optix-args-products="789,901"`
- `optix-args-order="456,123,901"`
- `optix-args-location="26780"` (verified in this project environment)

### 5.2 Inquiry URL generation

Inquiry does not have confirmed parity with Signup parameters. Treat advanced parameters as optional/experimental and guard with clear warnings.

### 5.3 Drop-in embed code generation

Generate either anchor or div snippets with `optix-args-*` attributes.

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

---

## 6. Implementation Plan

### Phase 1: MVP (Signup URL Builder)

1. Read token and org context
2. Fetch Plans/Passes
3. Support select + order + URL preview
4. Add validation and copy action

### Phase 2: Enhanced (Drag-and-drop + Drop-in)

1. Add Drop-in parameter builder
2. Add embed snippet generation
3. Add location/resource support

### Phase 3: UX polish

1. Templates/presets
2. Richer warnings and inline help
3. Debug snapshot export

---

## 7. Suggested Project Structure

```text
url-builder/
  index.html
  css/
    app.css
  js/
    api.js
    app.js
    urlBuilder.js
    validators.js
```

### Key code examples

#### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Widget URL Builder</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="./js/app.js" type="module"></script>
  </body>
</html>
```

#### `js/api.js`

```javascript
export async function queryGraphQL({ endpoint, token, query, variables = {} }) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(data.errors[0].message || "Unknown GraphQL error");
  }

  return data.data;
}
```

#### `js/app.js`

```javascript
import { buildSignupUrl } from "./urlBuilder.js";

const state = {
  baseUrl: "https://example.optixapp.com/signup",
  selectedPlans: [],
  selectedProducts: [],
  order: []
};

export function generateUrl() {
  return buildSignupUrl(state);
}
```

---

## 8. Confirmed URL Parameters

### Signup Widget (`/signup/`)

| Parameter | Description |
| --- | --- |
| `plans` | Comma-separated plan IDs |
| `products` | Comma-separated pass/product IDs |
| `order` | Display order list for selected IDs |

### Drop-in Bookings (`/book/`)

| Parameter | Description |
| --- | --- |
| `date` | Default booking date |
| `resource` (path) | Direct resource page |
| `pick` (path) | Direct resource picker |

### Drop-in embed attributes

| Attribute | Description |
| --- | --- |
| `optix-args-locations` | Filter by location IDs |
| `optix-args-duration` | Default duration in seconds |
| `optix-args-capacity` | Minimum capacity |
| `optix-args-date` | Default date |
| `optix-args-time` | Default time |
| `optix-args-resource` | Direct resource ID |
| `optix-args-picker` | Open picker directly |
| `optix-args-types` | Filter by resource type |

### Tour Bookings (`/book/tour/`)

Base URL:

- `/book/tour/`

---

## 9. GraphQL Data Model Reference

### PlanTemplate (Plans)

- `plan_template_id`
- `name`
- `description`
- `price`
- `price_frequency`
- `onboarding_enabled`
- `locations[]`

### Product (Passes)

- `product_id`
- `name`
- `description`
- `price`
- `onboarding_enabled`
- `locations[]`

### Resource (Spaces)

- `resource_id`
- `name`
- `type`
- `capacity`
- `location`
- `is_dropin_bookable`

---

## 10. URL Builder Improvements (Non-MCP)

### 10.1 Product UX

- Add guided presets by common use cases
- Show final URL and human-readable parameter summary
- Support one-click open in preview tab

### 10.2 Error prevention and validation

- Validate ID ownership and existence
- Validate date/time formats and ranges
- Block copy on critical errors

### 10.3 Operations efficiency

- Cache frequent org metadata with short TTL
- Support reusable templates for repetitive workflows
- Add bulk link generation for campaigns

### 10.4 Observability and iteration

- Log generation and copy actions
- Capture top validation failures
- Export debug snapshots for support handoff

---

## 11. Risks and Notes

1. Parameter support may differ by widget type and deployment version
2. Cross-org ID leakage must be prevented with strict token scoping
3. Some advanced options need environment-specific verification
4. Keep parameter schema versioned to avoid regressions

---

## 12. Summary

The URL Builder can be delivered as a frontend-only Canvas app. The main value is reducing manual URL composition while improving correctness, safety, and operational speed through validation, ordering, and copy-ready outputs.
