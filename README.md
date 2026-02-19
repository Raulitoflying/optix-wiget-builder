# Optix Widget Builder

A lightweight web tool to generate Optix Sign-up and Drop-in widget links/embed code.

## Features

- Sign-up URL builder (`plans`, `products`, `order`, `location`)
- Drop-in URL/embed builder (resource, location, type, date/time, capacity, duration)
- Read-only org settings display (for example User Flow / Resource Availability)
- Copy/Open actions for generated links
- Collapsible configuration sections

## Project Structure

- `index.html` - Main UI
- `css/styles.css` - Styling
- `js/main.js` - Shared app logic
- `js/api.js` - GraphQL connection/data loading
- `js/signup.js` - Sign-up builder logic
- `js/dropin.js` - Drop-in builder logic
- `docs/` - Design, roadmap, and reference docs
- `assets/` - Static assets (logo, icons)

## Local Run

Because this is a static frontend, you can run it with any static server.

Example:

```bash
cd /Users/rauloptix/OptixHelp/url-demo
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

## Deployment

Deploy as a static site (Cloudflare Pages, Vercel, Netlify, S3 + CDN, etc.).

Requirements:

- HTTPS enabled
- `index.html` as entry page

## Optix Canvas Integration

Add a canvas in Optix App `Settings file`, for example:

```json
{
  "canvases": [
    {
      "type": "ADMIN_MAIN_MENU",
      "title": "Widget Builder",
      "icon": "link",
      "menu_parent": "settings",
      "admin_role": "MANAGER",
      "url": "https://your-domain.com/index.html#token={token}"
    }
  ]
}
```

Notes:

- Use your deployed domain in `url`
- `#token={token}` is recommended for token handling in browser-only apps

## Security Notes

- API token is stored in `sessionStorage` (cleared when browser session ends)
- Do not commit real production tokens
- Rotate any token that was exposed in screenshots or shared logs
