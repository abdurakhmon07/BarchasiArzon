# Barchasi Arzon — Telegram Mini App

The customer catalog that opens inside Telegram: categories, product photos, prices, stock status, a special-price section, and Uzbek / Russian / English.

React + TypeScript + Vite. Talks to the backend in `~/Desktop/barchasi-arzon` (`/api/...`).

## How it fits together

```
Telegram ──opens──▶ Mini App (this project, https URL)
                        │  every request sends:  Authorization: tma <initData>
                        ▼
                  barchasi-arzon  /api/*   ── checks Telegram's signature, reads MongoDB
```

`initData` is signed by Telegram with your bot token, so the backend knows exactly which Telegram user is calling. No passwords.

## Run it in development

Telegram only opens Mini Apps over **https**, so your laptop needs a temporary public https address (a "tunnel").

1. Start the backend (in `~/Desktop/barchasi-arzon`): `npm run start:dev`
2. Start this app: `npm install` (first time only), then `npm run dev`. It runs on http://localhost:5173 and forwards `/api` to the backend on port 3005.
3. Open a tunnel to port 5173 in a third terminal:
   ```
   npx cloudflared tunnel --url http://localhost:5173
   ```
   It prints an address like `https://something-random.trycloudflare.com`.
4. Put that address in the backend's `.env`:
   ```
   MINI_APP_URL=https://something-random.trycloudflare.com
   ```
   Then restart the backend (Ctrl+C, then `npm run start:dev`).
5. In Telegram, send `/start` to the bot. You'll see a **🛒 Open the shop** button and a **Do'kon** menu button next to the message box.

The free tunnel address changes every time you restart cloudflared, so repeat steps 4–5 when it does.

Opening http://localhost:5173 in a normal browser only shows "Open this app from the bot": without Telegram there is no signed `initData`.

## Deploy on Cloudflare Workers

`wrangler.jsonc` + `worker/index.ts` make Cloudflare serve the built app and forward `/api/*` to the backend:

```
Telegram → https://barchasiarzon.<you>.workers.dev
             ├─ /api/*  → BACKEND_URL (your backend, e.g. a cloudflared tunnel to localhost:3005)
             └─ else    → dist/ (the React app)
```

Cloudflare dashboard → your Worker → **Settings**:

- **Build**: Root directory `telegram-app`, Build command `npm run build`, Deploy command `npx wrangler deploy`
- **Variables and Secrets**: `BACKEND_URL` = the backend's https address (no `/` at the end)

In the backend's `.env`, `MINI_APP_URL` = the workers.dev address. Leave `VITE_API_URL` empty: the app and `/api` share one address.

Check: opening `https://…workers.dev/api/me` in a browser should show `{"code":401,"message":"Open this app from the Telegram bot."}`. That means Cloudflare reached your backend.

## Files

```
src/
  main.tsx               starts React, tells Telegram the app is ready
  App.tsx                header + language switch, tabs, category chips, product grid
  components/
    ProductCard.tsx      one product tile (photo, name, price, status)
    ProductSheet.tsx     full product view (uses Telegram's Back button)
  useProducts.ts         loads products page by page (infinite scroll)
  api.ts                 calls the backend with initData
  i18n.ts                uz / ru / en texts, price format
  telegram.ts            access to window.Telegram.WebApp
  styles.css             uses Telegram's theme colors (light/dark follow the user's Telegram)
```
