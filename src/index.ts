import { Hono } from "hono";
import type { AppEnv, Env } from "./env";
import { getDb } from "./db";
import api from "./routes/api";
import botRoute from "./routes/bot";
import admin from "./routes/admin";
import UserService from "./services/User.service";

/**
 * Barchasi Arzon — one Cloudflare Worker:
 *   /api/*    JSON API for the Mini App
 *   /admin/*  admin panel (server-rendered)
 *   /bot      Telegram webhook (the bot)
 *   anything else → the built React Mini App (static files)
 */
const app = new Hono<AppEnv>();

// One Drizzle client per request on top of the D1 binding.
app.use("*", async (c, next) => {
  c.set("db", getDb(c.env.DB));
  await next();
});

app.route("/api", api);
app.route("/bot", botRoute);
app.route("/admin", admin);

// Everything else is the Mini App (static files from telegram-app/dist).
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,

  /** Cron (wrangler.jsonc "triggers"): every night remove admin login links nobody used. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(new UserService(getDb(env.DB)).deleteExpiredTokens());
  },
} satisfies ExportedHandler<Env>;
