# CLAUDE.md — Optix Form Builder (url-demo)

## Project Overview

A lightweight, static-site admin tool that helps Optix workspace operators generate widget URLs and embed code for two use cases:

- **Sign-up Widget** (`/signup`) — select plans/passes, set location, configure display order
- **Drop-in Bookings Widget** (`/book`) — configure resource, duration, date/time, capacity, picker mode

The tool connects to the Optix GraphQL API via a bearer token, loads live org data, and generates ready-to-use links and HTML embed snippets.

## Tech Stack

- **Vanilla JavaScript (ES6+)** — no framework, no build step, no npm
- **HTML5 / CSS3** — custom properties, Flexbox/Grid, Material Icons
- **External libraries (CDN only):**
  - SortableJS v1.15.6 — drag-and-drop plan ordering
  - jQuery 3.7.1 + bootstrap-clockpicker v0.0.7 — time picker UI
  - Material Icons (Google Fonts)
  - Graphik font (api.optixapp.com)
- **GraphQL API** — `https://api.optixapp.com/graphql` (bearer token auth)

## Project Structure

```
url-demo/
├── index.html          # Full UI: modals, tabs, form groups, output cards
├── css/styles.css      # All styles; CSS variables, utility classes
├── js/
│   ├── main.js         # App init, global state, tab switching, shared utilities
│   ├── api.js          # GraphQL client, connection logic, data loading
│   ├── signup.js       # Sign-up widget: selection, sorting, URL generation
│   └── dropin.js       # Drop-in widget: parameter handling, URL/embed generation
├── assets/Optix.png    # Logo / favicon
├── docs/               # Design specs, API reference, roadmap (read-only reference)
└── README.md
```

## Architecture

**Modules and responsibilities:**

| File | Role |
|------|------|
| `js/main.js` | App bootstrap, global state (`apiConfig`, shared data arrays), `showToast()`, `copyToClipboard()`, `escapeHtml()` |
| `js/api.js` | `connectApi()`, `loadSignupData()`, `loadDropinData()`, all GraphQL queries |
| `js/signup.js` | `toggleItem()`, `updateSignupUrls()`, SortableJS integration |
| `js/dropin.js` | Field state management, time validation, `updateDropinUrls()` |

**Global state** lives on `window` (no module bundler):
- `apiConfig` — endpoint, token, venue subdomain
- `isCanvasMode` — `true` when token was detected from URL (Canvas iframe); controls settings gear visibility
- `plans`, `products`, `resources`, `locations` — loaded from API
- `selectedItems` — current sign-up selections

**Event model:** form inputs immediately call `updateSignupUrls()` or `updateDropinUrls()` — no submit step.

## Key Behaviors

**Token handling:**
- Accepted from URL hash `#token=` or query `?token=` (Canvas iframe mode) or manual entry
- Stored in `sessionStorage` (cleared on browser close, never `localStorage`)
- Masked in UI: first 6 + last 4 chars shown
- Token suffix: `o` = org token, `p` = personal token

**Canvas mode detection & settings gear:**
- `isCanvasMode = true` is set when a token is found in the URL on load
- The settings gear (top-right) is hidden when `isCanvasMode && connected` — no need for manual config in Canvas
- If connection fails or the user disconnects, the gear reappears so they can retry
- Visibility is synced every time `updateApiStatus()` is called, not just on init

**Auto-connect:** if a token is in the URL on load, the API modal is skipped entirely.

**Sign-up URL generation rules:**
- Base: `https://{subdomain}.optixapp.com/signup/`
- Params: `plans=`, `products=`, `location=`, `order=` (only appended when user has manually reordered via drag-and-drop)
- Produces: combined link, individual item links, embed code, popup code

**Drop-in URL generation rules:**
- Direct link modes: `/book/`, `/book/resource/{id}`, `/book/resource/{id}/pick`
- Embed mode: `<div class="optix-booking-widget" optix-venue="..." optix-args-*="...">` attributes
- Some params (duration, capacity, time, location, type) only work in embed mode — the UI warns when a direct-link user sets embed-only params
- Selecting a specific resource disables location, type, and capacity fields

**Copy-to-clipboard:** uses the Clipboard API with a `document.execCommand` fallback for iframe/Canvas environments where clipboard permissions may be restricted.

## Local Development

No build step. Serve statically:

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

Any static file server works (VS Code Live Server, `npx serve`, etc.).

For Canvas/iframe testing, deploy to HTTPS and pass the token via URL hash:
```
https://your-deployed-url/#token=YOUR_ORG_TOKEN
```

## Coding Conventions

- **Function names:** camelCase (`showApiModal`, `toggleItem`, `updateDropinUrls`)
- **CSS classes:** kebab-case (`.card-header`, `.item-badge`, `.form-group`)
- **CSS variables:** `--bg-soft`, `--accent`, `--text-muted` (defined in `:root`)
- **Data attributes:** `data-id`, `data-type` on list items and interactive elements
- **HTML escaping:** always use `escapeHtml()` before inserting user-derived strings into innerHTML
- **Error messages:** parsed from GraphQL `errors[]` array; keywords like "permission" or "unauthorized" trigger a specific user hint

## What to Avoid

- Do not introduce a build step or npm dependency without discussion — the intentional design is zero-toolchain
- Do not use `localStorage` for tokens — `sessionStorage` only
- Do not add analytics, tracking, or external service calls beyond the Optix GraphQL endpoint
- Do not use `innerHTML` with unescaped user input (use `escapeHtml()`)
- The `order=` param in sign-up URLs must only be added when `hasManuallyReordered === true`

## Docs Reference

| File | Contents |
|------|----------|
| `docs/web-widgets-reference.md` | Complete parameter reference for all 4 Optix widget types |
| `docs/url-builder-widget-design.md` | Design requirements, GraphQL queries, UI layout rules |
| `docs/url-builder-roadmap.md` | P0/P1/P2 feature roadmap and known risks |

## Deployment

Static files only. Deploy `index.html`, `css/`, `js/`, `assets/`, `docs/` to any static host (Cloudflare Pages, Vercel, Netlify, S3+CDN). HTTPS is required. Register the deployed URL as a Canvas entry in Optix App Settings.
