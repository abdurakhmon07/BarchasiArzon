import { Hono } from "hono";
import { webhookCallback } from "grammy";
import type { AppEnv } from "../env";
import { getBot, setupTelegram } from "../bot";

/** Telegram webhook, mounted at /bot. */
const botRoute = new Hono<AppEnv>();

/**
 * Telegram POSTs every update here. The secret token (set in setWebhook) proves the request
 * really comes from Telegram; anything else gets 401 from grammY.
 */
botRoute.post("/", (c) => webhookCallback(getBot(c.env), "hono", { secretToken: c.env.WEBHOOK_SECRET })(c));

/** Run once after each deploy: GET /bot/setup?key=<WEBHOOK_SECRET> */
botRoute.get("/setup", async (c) => {
  if (!c.env.WEBHOOK_SECRET || c.req.query("key") !== c.env.WEBHOOK_SECRET) return c.json({ ok: false }, 403);
  try {
    return c.json({ ok: true, ...(await setupTelegram(c.env)) });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

export default botRoute;
