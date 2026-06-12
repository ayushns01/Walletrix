# Walletrix Landing Page

Static landing page — no build step, no Node, no bundler required.

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry point — rename/deploy as-is |
| `lib.jsx` | Icons, mock data, shared helpers |
| `landing4-bg.jsx` | Generative aurora canvas background |
| `landing4-sections.jsx` | All sections: Hero, Chains, Agent, Security, Console, Footer |
| `landing4-app.jsx` | App root + Tweaks panel wiring |
| `tweaks-panel.jsx` | In-design tweak controls (design-time only, optional) |

All files must live in the **same directory** — they load each other via relative paths.

## Deployment

### Vercel / Netlify / GitHub Pages
1. Drop the folder into your repo (or upload directly).
2. Set `index.html` as the root / entry point — most hosts do this automatically.
3. Done. No build command needed.

### Traditional hosting (Apache / Nginx / any web server)
Copy the folder to your public directory. The files are served as-is.

> ⚠️ **Do not open `index.html` directly via `file://` in a browser** — browsers block cross-origin script loading for local files. Use a local web server instead (`npx serve .` or VS Code Live Server).

## Connecting to your dashboard

Open `landing4-app.jsx` and edit the `APP_URL` constant at the top of the file:

```js
// landing4-app.jsx  (line ~4 in the landing4-sections module)
const APP_URL = '/app';           // ← your dashboard route
// or:
const APP_URL = 'https://app.walletrix.xyz';
```

The "Launch app" nav button and hero CTA both use this value.

## Quick local test

```bash
cd walletrix-landing
npx serve .
# open http://localhost:3000
```

## Tweaks panel

Press the **Tweaks** button in the toolbar (design environment only) to adjust:
- **Accent color** — 4 presets; the gradient, glow, and button all update live
- **Background motion intensity** — 0 % (static) → 250 % (max drift)
- **Wave lines** — toggle the flowing wave overlay on/off

Tweaks are design-time only and have no effect in production.
