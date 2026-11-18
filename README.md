# Barchasi Arzon

Telegram catalog of household products (MVP from the ER model, Nov 2026).

- **Customers** use the **Mini App** (React, in `~/Desktop/telegram-app`, see its README for how to run it) or the bot's menus: categories, product cards with photo, price and stock status, a special-price section, and Uzbek / Russian / English.
- **Admins** use the web panel at `/admin`: add, edit, hide and delete products, change prices and status, move products into or out of the special-price section, and manage categories.

Stack (same as Burak): TypeScript, Express, MongoDB/Mongoose, EJS, express-session stored in MongoDB. Plus grammY for the bot and multer for photo uploads.

## Setup

1. Create a bot with @BotFather and copy its token.
2. Find your Telegram user ID (for example with @userinfobot).
3. Copy `.env.example` to `.env` and fill it in. Put your ID in `ADMIN_IDS`.
4. Run `npm install`, then `npm run start:dev`.
5. In Telegram, send `/start` to your bot and choose a language, then press **⚙️ Admin panel**. Open the link it sends to log in. The link works once and expires after 10 minutes.
6. Add categories first, then products.

## Structure

```
src/
  server.ts            env check, MongoDB connection, starts web server + bot
  app.ts               express, sessions, views, routers
  router.ts            /api routes for the Mini App (me, language, categories, products, photos)
  router-admin.ts      /admin routes (login link, products, categories, photo proxy)
  bot/                 Telegram bot (customer side + admin login link)
  controllers/         admin, product, category (admin panel); shop (Mini App API)
  models/              services: User, Product, Category, Photo
  schema/              Mongoose models: User, Category, Product, LoginToken
  libs/                Errors, config, i18n (uz/ru/en texts, prices), enums, types
  views/               EJS admin pages
  public/              CSS and JS for the admin panel
```

## ER model → MongoDB

| ER model | Here |
|---|---|
| `USERS.telegram_id` (PK) | `users._id` = Telegram ID (number) |
| `CATEGORIES.id`, `PRODUCTS.id` (auto-increment int) | MongoDB `ObjectId` |
| snake_case columns (`name_uz`, `is_special`, …) | camelCase fields (`nameUz`, `isSpecial`, …) |
| `name_uz/ru/en`, `description_uz/ru/en` | the admin form has one Name and one Description, saved in `nameUz` / `descriptionUz`; the `…Ru` / `…En` fields stay empty and the bot falls back to the main text |
| foreign keys | `ref` fields; the services check them, because MongoDB doesn't enforce them |
| `created_at` / `updated_at` | Mongoose `timestamps` |
| — | `logintokens`: one-time admin login links (deleted automatically by a TTL index) |

Business rules enforced in code: only admins can edit; customers only see `isVisible` products; the special section shows `isSpecial` products and the general catalog shows the rest; prices are whole so'm; a category that still has products can't be deleted.

## Mini App API

Every request except photos must send `Authorization: tma <initData>` (Telegram's signed launch data). The server checks the signature with `BOT_TOKEN` and rejects data older than 24 hours.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/me` | the user (creates them if new) and the bot's username (for share links) |
| PATCH | `/api/me/language` | body `{ "language": "uz" \| "ru" \| "en" }` |
| GET | `/api/categories` | categories, names in the user's language |
| GET | `/api/products?section=general&categoryId=…&page=1` | visible, non-special products (20 per page) |
| GET | `/api/products?section=special&page=1` | visible special-price products |
| | …plus optional `&q=text` (search by name), `&sort=name\|price_asc\|price_desc\|newest`, `&inStock=1` | |
| GET | `/api/products?ids=a,b,c` | those products in that order (recently viewed) |
| GET | `/api/products/:id` | one visible product |
| GET | `/api/photo/:fileId` | photo, public, but only for visible products |

## Notes

- Product photos are uploaded through the bot to your own Telegram chat; the bot keeps the `file_id` and deletes that message. The admin panel shows photos through `/admin/photo/:fileId`, so the bot token never reaches the browser.
- Telegram doesn't allow `localhost` links in buttons, so the bot sends the login link as plain text. In production, set `BASE_URL` to your `https://` domain.
- Admin role comes from `ADMIN_IDS` and is refreshed every time the user sends `/start`.
