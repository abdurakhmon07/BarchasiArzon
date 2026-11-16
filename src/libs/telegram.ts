import { Bot } from "grammy";
import { requireEnv } from "./config";

let bot: Bot | null = null;

/** Single shared bot instance, created on first use (after dotenv has loaded). */
export function getBot(): Bot {
  if (!bot) bot = new Bot(requireEnv("BOT_TOKEN"));
  return bot;
}
