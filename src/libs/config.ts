export const MORGAN_FORMAT = `:method :url :response-time [:status] \n`;

/** How long a one-time admin login link from the bot stays valid. */
export const LOGIN_TOKEN_TTL_MINUTES = 10;

/** How many products the bot lists per page. */
export const BOT_PAGE_SIZE = 8;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** Extra photos per product, besides the main one. */
export const MAX_GALLERY_PHOTOS = 5;

/** Mini App initData older than this is rejected (Telegram re-signs it each time the app opens). */
export const INIT_DATA_MAX_AGE_SECONDS = 24 * 3600;

/** How many products the Mini App loads per request. */
export const API_PAGE_SIZE = 20;

/** https URL of the Mini App, or null if not configured (Telegram only accepts https). */
export function getMiniAppUrl(): string | null {
  const url = String(process.env.MINI_APP_URL ?? "").trim();
  return url.startsWith("https://") ? url.replace(/\/$/, "") : null;
}

/** Telegram IDs listed in ADMIN_IDS become admins when they press /start. */
export function getAdminIds(): number[] {
  return String(process.env.ADMIN_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isSafeInteger(n) && n > 0);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}
