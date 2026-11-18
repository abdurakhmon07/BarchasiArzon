import { Bot, type Context, GrammyError, InlineKeyboard } from "grammy";
import type { Env } from "../env";
import { getDb } from "../db";
import type { UserRow } from "../db/schema";
import UserService from "../services/User.service";
import CategoryService from "../services/Category.service";
import ProductService from "../services/Product.service";
import { Language, UserRole } from "../libs/enums/user.enum";
import { formatPrice, localized, statusText, t, type TextKey } from "../libs/i18n";
import type { Product } from "../libs/types/product";
import { adminIds, BOT_PAGE_SIZE, LOGIN_TOKEN_TTL_MINUTES, miniAppUrl, publicUrl } from "../libs/config";
import { categoriesKeyboard, languageKeyboard, mainMenu, productListKeyboard } from "./keyboards";

/**
 * The Telegram bot (customer menus + admin login link). On Workers it runs in webhook mode:
 * Telegram POSTs each update to /bot and we answer it (see routes/bot.ts).
 */

const LANGS = Object.values(Language);
const lang = (u: UserRow) => u.language as Language;

/** All three translations of a menu button, so the menu works whatever language it was built in. */
function menuLabels(key: TextKey): string[] {
  return LANGS.map((l) => t(l, key));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function productCaption(p: Product, l: Language): string {
  const lines = [
    `<b>${escapeHtml(localized(p, "name", l))}</b>`,
    p.isSpecial ? t(l, "specialTitle") : "",
    p.discountPercent > 0 && p.oldPrice
      ? `${t(l, "price")}: <b>${formatPrice(p.price, l)}</b> <s>${formatPrice(p.oldPrice, l)}</s> −${p.discountPercent}%`
      : `${t(l, "price")}: <b>${formatPrice(p.price, l)}</b>`,
    statusText(l, p.status as never),
  ].filter(Boolean);
  const desc = localized(p, "description", l);
  let caption = lines.join("\n");
  if (desc) caption += `\n\n${escapeHtml(desc)}`;
  return caption.length > 1024 ? caption.slice(0, 1020) + "…" : caption; // Telegram caption limit
}

function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN, { client: { apiRoot: env.TELEGRAM_API_ROOT || undefined } });
  const db = getDb(env.DB);
  const users = new UserService(db);
  const categories = new CategoryService(db);
  const products = new ProductService(db);
  const shopUrl = () => miniAppUrl(env);

  /** Loads the user, creating them if they skipped /start. */
  async function currentUser(ctx: Context): Promise<UserRow> {
    const from = ctx.from!;
    return (
      (await users.getUser(from.id)) ??
      (await users.upsertFromTelegram({ telegramId: from.id, firstName: from.first_name, username: from.username }, adminIds(env)))
        .user
    );
  }

  /** Product card (photo + caption). With `withShopButton`, adds a button that opens it in the Mini App. */
  async function sendProductCard(ctx: Context, product: Product, l: Language, withShopButton: boolean) {
    const caption = productCaption(product, l);
    const url = shopUrl();
    const reply_markup =
      withShopButton && url ? new InlineKeyboard().webApp(t(l, "openShop"), `${url}/?product=${product.id}`) : undefined;
    if (product.photoFileId) {
      // A photo from an old bot (or deleted on Telegram) fails: fall back to text so the user still sees the product.
      await ctx.replyWithPhoto(product.photoFileId, { caption, parse_mode: "HTML", reply_markup }).catch(() =>
        ctx.reply(caption, { parse_mode: "HTML", reply_markup })
      );
    } else {
      await ctx.reply(caption, { parse_mode: "HTML", reply_markup });
    }
  }

  async function showMainMenu(ctx: Context, user: UserRow) {
    const l = lang(user);
    await ctx.reply(t(l, "welcome"), { reply_markup: mainMenu(l, user.role === UserRole.ADMIN) });

    const url = shopUrl();
    if (!url) return;
    // Inline button (not a reply-keyboard button): only these pass the user's initData to the Mini App.
    await ctx.reply(t(l, "openShopHint"), { reply_markup: new InlineKeyboard().webApp(t(l, "openShop"), url) });
    // The "menu" button next to the message box, in this user's language.
    await ctx.api
      .setChatMenuButton({ chat_id: ctx.chat!.id, menu_button: { type: "web_app", text: t(l, "menuButton"), web_app: { url } } })
      .catch((err) => console.log("Error, setChatMenuButton:", err.message));
  }

  async function renderCategories(ctx: Context, user: UserRow, edit: boolean) {
    const l = lang(user);
    const list = await categories.getAll();
    const text = list.length ? t(l, "chooseCategory") : t(l, "noCategories");
    const reply_markup = categoriesKeyboard(list, l);
    if (edit) await ctx.editMessageText(text, { reply_markup });
    else await ctx.reply(text, { reply_markup });
  }

  async function renderProductList(
    ctx: Context,
    user: UserRow,
    opts: { categoryId?: number; isSpecial: boolean; page: number; edit: boolean }
  ) {
    const l = lang(user);
    const { items, total } = await products.getVisibleProducts({
      categoryId: opts.categoryId,
      isSpecial: opts.isSpecial,
      page: opts.page,
      limit: BOT_PAGE_SIZE,
    });

    let title = t(l, "specialTitle");
    if (!opts.isSpecial && opts.categoryId) {
      const category = await categories.getById(opts.categoryId).catch(() => null);
      if (category) title = `📂 ${category.icon ? category.icon + " " : ""}${localized(category, "name", l)}`;
    }
    const text = items.length ? title : `${title}\n\n${t(l, "noProducts")}`;
    const prefix = opts.isSpecial ? "spec" : `cat:${opts.categoryId}`;
    const reply_markup = productListKeyboard(items, l, opts.page, total, prefix, !opts.isSpecial);

    if (opts.edit) await ctx.editMessageText(text, { reply_markup });
    else await ctx.reply(text, { reply_markup });
  }

  async function sendAdminLink(ctx: Context, user: UserRow) {
    if (user.role !== UserRole.ADMIN) {
      await ctx.reply(t(lang(user), "notAdmin"));
      return;
    }
    const token = await users.createLoginToken(user.telegramId);
    const url = `${publicUrl(env)}/admin/auth?token=${token}`;
    // Sent as plain text: Telegram rejects localhost URLs in buttons (local development).
    await ctx.reply(`${t(lang(user), "adminLink", { min: LOGIN_TOKEN_TTL_MINUTES })}\n\n${url}`, {
      link_preview_options: { is_disabled: true },
    });
  }

  bot.command("start", async (ctx) => {
    const from = ctx.from!;
    const { user, isNew } = await users.upsertFromTelegram(
      { telegramId: from.id, firstName: from.first_name, username: from.username },
      adminIds(env)
    );

    // Shared product link: t.me/<bot>?start=p_<productId>
    const shared = /^p_(\d+)$/.exec(ctx.match);
    if (shared) {
      const product = await products.getVisibleProduct(Number(shared[1]));
      if (product) await sendProductCard(ctx, product, lang(user), true);
      else await ctx.reply(t(lang(user), "productGone"));
    }

    if (isNew) await ctx.reply(t(Language.UZ, "chooseLanguage"), { reply_markup: languageKeyboard() });
    else if (!shared) await showMainMenu(ctx, user);
  });

  bot.command("admin", async (ctx) => sendAdminLink(ctx, await currentUser(ctx)));

  bot.hears(menuLabels("menuLanguage"), async (ctx) => {
    const user = await currentUser(ctx);
    await ctx.reply(t(lang(user), "chooseLanguage"), { reply_markup: languageKeyboard() });
  });

  bot.hears(menuLabels("menuCatalog"), async (ctx) => renderCategories(ctx, await currentUser(ctx), false));

  bot.hears(menuLabels("menuSpecial"), async (ctx) =>
    renderProductList(ctx, await currentUser(ctx), { isSpecial: true, page: 1, edit: false })
  );

  bot.hears(menuLabels("menuAdmin"), async (ctx) => sendAdminLink(ctx, await currentUser(ctx)));

  bot.callbackQuery(/^lang:(uz|ru|en)$/, async (ctx) => {
    const user = await users.setLanguage(ctx.from.id, ctx.match[1] as Language);
    await ctx.answerCallbackQuery(t(lang(user), "languageSaved"));
    await ctx.deleteMessage().catch(() => undefined);
    await showMainMenu(ctx, user);
  });

  bot.callbackQuery("cats", async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderCategories(ctx, await currentUser(ctx), true);
  });

  bot.callbackQuery(/^cat:(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderProductList(ctx, await currentUser(ctx), {
      categoryId: Number(ctx.match[1]),
      isSpecial: false,
      page: Number(ctx.match[2]),
      edit: true,
    });
  });

  bot.callbackQuery(/^spec:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderProductList(ctx, await currentUser(ctx), { isSpecial: true, page: Number(ctx.match[1]), edit: true });
  });

  bot.callbackQuery(/^prod:(\d+)$/, async (ctx) => {
    const user = await currentUser(ctx);
    const product = await products.getVisibleProduct(Number(ctx.match[1]));
    if (!product) {
      await ctx.answerCallbackQuery({ text: t(lang(user), "productGone"), show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await sendProductCard(ctx, product, lang(user), false);
  });

  bot.callbackQuery("noop", (ctx) => ctx.answerCallbackQuery());

  bot.catch((err) => {
    const e = err.error;
    // "message is not modified" happens when a user taps the same button twice — harmless.
    if (e instanceof GrammyError && e.description.includes("message is not modified")) return;
    console.error("Error, bot:", e);
  });

  return bot;
}

// One bot per Worker instance (its handlers are reused for every update).
let cached: { token: string; bot: Bot } | null = null;

export function getBot(env: Env): Bot {
  if (!cached || cached.token !== env.BOT_TOKEN) cached = { token: env.BOT_TOKEN, bot: createBot(env) };
  return cached.bot;
}

/**
 * One-time setup after deploying (GET /bot/setup?key=WEBHOOK_SECRET):
 * tells Telegram where to send updates, sets the command list and the "Do'kon" menu button.
 */
export async function setupTelegram(env: Env) {
  const api = getBot(env).api;
  const webhook = `${publicUrl(env)}/bot`;
  await api.setWebhook(webhook, {
    secret_token: env.WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  await api.setMyCommands([
    { command: "start", description: "Menu / Меню" },
    { command: "admin", description: "Admin panel" },
  ]);
  const url = miniAppUrl(env);
  if (url) await api.setChatMenuButton({ menu_button: { type: "web_app", text: "Do'kon", web_app: { url } } });
  const me = await api.getMe();
  return { bot: `@${me.username}`, webhook, miniApp: url ?? "(PUBLIC_URL is not https: no shop button)" };
}
