import type { Env } from "../env";

/** How long a one-time admin login link from the bot stays valid. */
export const LOGIN_TOKEN_TTL_MINUTES = 10;

/** How long an admin stays logged in (30 days). The admin role is still re-checked on every page. */
export const ADMIN_SESSION_HOURS = 24 * 30;

/** How many products the bot lists per page. */
export const BOT_PAGE_SIZE = 8;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** Largest quantity of one product in the cart. */
export const MAX_CART_QUANTITY = 99;

/** Extra photos per product, besides the main one. */
export const MAX_GALLERY_PHOTOS = 5;

/** Mini App initData older than this is rejected (Telegram re-signs it each time the app opens). */
export const INIT_DATA_MAX_AGE_SECONDS = 24 * 3600;

/** How many products the Mini App loads per request. */
export const API_PAGE_SIZE = 20;

/** The Worker's public address without a trailing slash, e.g. https://barchasiarzon.<you>.workers.dev */
export function publicUrl(env: Env): string {
  return String(env.PUBLIC_URL ?? "").trim().replace(/\/$/, "");
}

/** Mini App address for Telegram buttons, or null when not https (Telegram only accepts https). */
export function miniAppUrl(env: Env): string | null {
  const url = publicUrl(env);
  return url.startsWith("https://") ? url : null;
}

/** Telegram IDs listed in ADMIN_IDS become admins when they press /start. */
export function adminIds(env: Env): number[] {
  return String(env.ADMIN_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isSafeInteger(n) && n > 0);
}
