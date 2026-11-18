import { Api } from "grammy";
import type { Env } from "../env";

const DEFAULT_ROOT = "https://api.telegram.org";

/** Telegram Bot API client (sending photos, menu buttons…). Tests point it at a fake server. */
export function telegramApi(env: Env): Api {
  return new Api(env.BOT_TOKEN, { apiRoot: env.TELEGRAM_API_ROOT || DEFAULT_ROOT });
}

/** Download address of a file on Telegram's servers (contains the bot token: never send it to browsers). */
export function telegramFileUrl(env: Env, filePath: string): string {
  return `${env.TELEGRAM_API_ROOT || DEFAULT_ROOT}/file/bot${env.BOT_TOKEN}/${filePath}`;
}

let usernameCache: { token: string; username: Promise<string | null> } | null = null;

/** The bot's @username (for share links), asked from Telegram once per Worker instance. */
export function botUsername(env: Env): Promise<string | null> {
  if (!usernameCache || usernameCache.token !== env.BOT_TOKEN) {
    usernameCache = {
      token: env.BOT_TOKEN,
      username: telegramApi(env)
        .getMe()
        .then((me) => me.username)
        .catch(() => {
          usernameCache = null; // try again next time
          return null;
        }),
    };
  }
  return usernameCache.username;
}
