# Barchasi Arzon — Telegram Mini App

The customer catalog that opens inside Telegram: categories, product photos, prices, stock status, a special-price section, and Uzbek / Russian / English.

React + TypeScript + Vite. Served by the Worker in the project root, which also provides the API (`/api/...`).

## How it fits together

```
Telegram ──opens──▶ https://barchasiarzon.<you>.workers.dev   (the Worker in the project root)
                        ├─ /        this app (built into telegram-app/dist)
                        └─ /api/*   the API — every request sends  Authorization: tma <initData>
```

`initData` is signed by Telegram with the bot token, so the Worker knows exactly which Telegram user is calling. No passwords.

The app is **not deployed on its own**: `npm run deploy` in the project root builds it and uploads it together with the Worker.

## Run it in development

From the project root:

```bash
npm run dev       # Worker + local database on http://localhost:8787
npm run dev:app   # this app with live reload on http://localhost:5173 (forwards /api to :8787)
```

In a normal browser the app only shows "Open this app from the bot" (there is no signed `initData` outside Telegram). To try it inside Telegram, use the dev deployment (`npm run deploy:dev` in the root, see the root README).

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
