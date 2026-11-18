import type { DB } from "./db";
import type { UserRow } from "./db/schema";

/** Everything Cloudflare gives the Worker: bindings from wrangler.jsonc + secrets. */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  // vars (wrangler.jsonc)
  PUBLIC_URL: string;
  ADMIN_IDS: string;
  // secrets (`wrangler secret put …`, or .dev.vars locally)
  BOT_TOKEN: string;
  SESSION_SECRET: string;
  WEBHOOK_SECRET: string;
  /** Only for tests: a fake Telegram API server. */
  TELEGRAM_API_ROOT?: string;
}

/** Hono's types for this app: c.env is Env, c.get("db") etc. are set by middleware. */
export interface AppEnv {
  Bindings: Env;
  Variables: {
    db: DB;
    user: UserRow; // Mini App: the Telegram user from initData
    admin: UserRow; // admin panel: the logged-in admin
    flash: Flash | null; // admin panel: one-time message shown on the next page
  };
}

export interface Flash {
  type: "success" | "error";
  text: string;
}
