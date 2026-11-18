# Barchasi Arzon

Telegram shop for household products (Uzbekistan), running entirely on **Cloudflare's free plan**.

- **Customers** use the **Mini App** (React, `telegram-app/`) or the bot's menus: deals first, catalog, search, favorites, cart with savings, in Uzbek / Russian / English.
- **Admins** use the panel at `/admin`: products (old price → discount, photos, gallery), categories (with icons), hide/show, special-price section. Login is a one-time link from the bot.

## Stack

| Part | Technology |
|---|---|
| Server | **Cloudflare Workers** + **Hono** (routes, middleware, JSX pages) |
| Database | **Cloudflare D1** (SQLite) + **Drizzle ORM** (typed queries, migrations) |
| Bot | **grammY** in webhook mode (Telegram calls `/bot`) |
| Mini App | React + Vite (served as static files by the same Worker) |
| Photos | stored on Telegram (`file_id`), shown through `/api/photo` and `/admin/photo` |

One Worker answers everything:

```
https://barchasiarzon.<you>.workers.dev
  /            Mini App (telegram-app/dist)
  /api/*       JSON API for the Mini App   (src/routes/api.ts)
  /admin/*     admin panel                 (src/routes/admin.ts)
  /bot         Telegram webhook            (src/routes/bot.ts)
  cron 03:00   deletes expired admin login links
```

## Structure

```
src/
  index.ts              Hono app: mounts /api, /admin, /bot, static Mini App; cron handler
  env.ts                types of the Worker's bindings and secrets
  db/schema.ts          tables (from the ER model) → `npm run db:generate` → migrations/
  routes/               api.ts · admin.ts · bot.ts
  controllers/          shop (Mini App API) · admin (login, photos) · product · category
  services/             User · Category · Product · Favorite · Cart · Photo (all database work)
  bot/                  bot handlers + keyboards
  views/                admin pages (Hono JSX) + admin.css
  libs/                 Errors · config · i18n · telegramAuth · search · enums · types
migrations/             SQL files applied to D1
scripts/import-from-mongo.ts   one-time copy of the old MongoDB data
telegram-app/           the Mini App (see its README)
```

## Database (D1)

Tables follow the ER model: `users`, `categories`, `products`, `product_photos` (gallery), `favorites`, `cart_items`, `login_tokens`.

- Integer ids and real foreign keys. Deleting a product removes its photos, favorites and cart lines (**CASCADE**); a category with products can't be deleted (**RESTRICT**).
- `products.discount_percent` is calculated from `old_price` and `price` on every save, and stored so lists can sort by it.
- `products.search_text` holds all names in lower case. SQLite only lower-cases A–Z, so this is what makes Cyrillic search case-insensitive.

To change the schema: edit `src/db/schema.ts`, run `npm run db:generate` (creates a new file in `migrations/`), then apply it with `npm run db:migrate:local`, `:dev` or `:prod`.

## Local development

```bash
cp .dev.vars.example .dev.vars        # fill in a TEST bot token etc.
npm install
npm run db:migrate:local              # creates the local database (.wrangler/)
npm run build                         # builds the Mini App once
npm run dev                           # Worker on http://localhost:8787 (API, admin, Mini App)
npm run dev:app                       # optional: Mini App with live reload on :5173 (proxies /api to :8787)
```

The admin panel works at http://localhost:8787/admin. Telegram can't reach your laptop, so to test the **bot** use the dev deployment below.

## Deploying

There are two copies, each with its own bot and database:

| | Worker | Bot | Database |
|---|---|---|---|
| **dev** (testing) | barchasiarzon-dev | your test bot | barchasi-arzon-dev |
| **production** | barchasiarzon | the real bot | barchasi-arzon |

### First time (per copy; add `--env dev` for the dev copy, `--env=""` for production)

1. Create the database: `npx wrangler d1 create barchasi-arzon-dev` (or `barchasi-arzon`), then copy the printed `database_id` into `wrangler.jsonc`.
2. Set the secrets:
   ```bash
   npx wrangler secret put BOT_TOKEN --env dev        # token from @BotFather
   npx wrangler secret put SESSION_SECRET --env dev   # any long random text
   npx wrangler secret put WEBHOOK_SECRET --env dev   # random letters and digits only
   ```
3. Create the tables: `npm run db:migrate:dev` (or `db:migrate:prod`).
4. Deploy: `npm run deploy:dev` (or `npm run deploy`).
5. Connect the bot: open `https://<worker address>/bot/setup?key=<WEBHOOK_SECRET>` in a browser. It sets the webhook, the commands and the "Do'kon" menu button.

### Copying the old MongoDB data (once, production)

```bash
npm run import:mongo                                              # reads MONGO_URL from .env → import-<date>.sql
npx wrangler d1 execute DB --remote --env="" --file import-<date>.sql
```

Product photos uploaded through a different bot must be uploaded again in the admin panel, because a Telegram `file_id` only works for the bot that uploaded it.

### Updating later

`npm run deploy` (or push, if Cloudflare's Git builds are connected with root directory `/`, build command `npm run build` and deploy command `npx wrangler deploy --env=""`).

## Mini App API

Every request except photos must send `Authorization: tma <initData>` (Telegram's signed launch data). The Worker checks the signature with `BOT_TOKEN` and rejects data older than 24 hours.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/me` | the user (created if new) and the bot's username (for share links) |
| PATCH | `/api/me/language` | body `{ "language": "uz" \| "ru" \| "en" }` |
| GET | `/api/home` | top deals (biggest discount first), `dealCount`, `maxDiscount`, `totalSaving` |
| GET | `/api/categories` | categories in the user's language, with `icon` and `dealCount` |
| GET | `/api/products?section=general&categoryId=…&page=1` | visible regular products (20 per page) |
| GET | `/api/products?section=special&page=1` | visible special-price products |
| GET | `/api/products?section=all` | both (home feed and search) |
| | …plus optional `&q=text`, `&sort=name\|price_asc\|price_desc\|newest\|discount`, `&inStock=1`, `&minDiscount=30` | |
| GET | `/api/products?ids=3,1,7` | those products in that order (recently viewed) |
| GET | `/api/products/:id` | one visible product |
| GET | `/api/favorites` · PUT/DELETE `/api/favorites/:id` | ❤️ list · add · remove |
| GET | `/api/cart` · PUT `/api/cart/:id` `{ "quantity": 0..99 }` · DELETE `/api/cart` | cart with totals and savings |
| GET | `/api/photo/:fileId` | photo of a visible product (public, cached) |

## Business rules

- Only admins (Telegram IDs in `ADMIN_IDS`) can edit; the role is refreshed on every `/start`.
- Customers only see visible products. The special section shows `is_special = 1`, the catalog shows the rest, and the home feed and search show both.
- Prices are whole so'm. The old price is optional and must be higher than the price.
- The cart counts only available products, at current prices. Unavailable lines stay in the cart, marked.
- Hide discontinued products rather than deleting them.
