import { Context, GrammyError, InlineKeyboard } from "grammy";
import { getBot } from "../libs/telegram";
import UserService from "../models/User.service";
import CategoryService from "../models/Category.service";
import ProductService from "../models/Product.service";
import { Language, UserRole } from "../libs/enums/user.enum";
import { formatPrice, localized, statusText, t, TextKey } from "../libs/i18n";
import { User } from "../libs/types/user";
import { Product } from "../libs/types/product";
import { BOT_PAGE_SIZE, getMiniAppUrl, LOGIN_TOKEN_TTL_MINUTES, requireEnv } from "../libs/config";
import { categoriesKeyboard, languageKeyboard, mainMenu, productListKeyboard } from "./keyboards";

const userService = new UserService();
const categoryService = new CategoryService();
const productService = new ProductService();

const LANGS = Object.values(Language);

/** Loads the user, creating them if they skipped /start. */
async function currentUser(ctx: Context): Promise<User> {
  const from = ctx.from!;
  const existing = await userService.getUser(from.id);
  if (existing) return existing;
  const { user } = await userService.upsertFromTelegram({
    telegramId: from.id,
    firstName: from.first_name,
    username: from.username,
  });
  return user;
}

/** All three translations of a menu button, so the menu works whatever language it was built in. */
function menuLabels(key: TextKey): string[] {
  return LANGS.map((l) => t(l, key));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function productCaption(p: Product, lang: Language): string {
  const lines = [
    `<b>${escapeHtml(localized(p, "name", lang))}</b>`,
    p.isSpecial ? t(lang, "specialTitle") : "",
    `${t(lang, "price")}: <b>${formatPrice(p.price, lang)}</b>`,
    statusText(lang, p.status),
  ].filter(Boolean);
  const desc = localized(p, "description", lang);
  let caption = lines.join("\n");
  if (desc) caption += `\n\n${escapeHtml(desc)}`;
  return caption.length > 1024 ? caption.slice(0, 1020) + "…" : caption; // Telegram caption limit
}

/** Product card (photo + caption). With `withShopButton`, adds a button that opens it in the Mini App. */
async function sendProductCard(ctx: Context, product: Product, lang: Language, withShopButton: boolean) {
  const caption = productCaption(product, lang);
  const url = getMiniAppUrl();
  const reply_markup =
    withShopButton && url
      ? new InlineKeyboard().webApp(t(lang, "openShop"), `${url}/?product=${product._id}`)
      : undefined;
  if (product.photoFileId) {
    await ctx.replyWithPhoto(product.photoFileId, { caption, parse_mode: "HTML", reply_markup });
  } else {
    await ctx.reply(caption, { parse_mode: "HTML", reply_markup });
  }
}

async function showMainMenu(ctx: Context, user: User) {
  await ctx.reply(t(user.language, "welcome"), {
    reply_markup: mainMenu(user.language, user.role === UserRole.ADMIN),
  });

  const url = getMiniAppUrl();
  if (!url) return;
  // Inline button (not a reply-keyboard button): only these pass the user's initData to the Mini App.
  await ctx.reply(t(user.language, "openShopHint"), {
    reply_markup: new InlineKeyboard().webApp(t(user.language, "openShop"), url),
  });
  // The "menu" button next to the message box, in this user's language.
  await ctx.api
    .setChatMenuButton({
      chat_id: ctx.chat!.id,
      menu_button: { type: "web_app", text: t(user.language, "menuButton"), web_app: { url } },
    })
    .catch((err) => console.log("Error, setChatMenuButton:", err.message));
}

async function renderCategories(ctx: Context, user: User, edit: boolean) {
  const categories = await categoryService.getAll();
  const text = categories.length ? t(user.language, "chooseCategory") : t(user.language, "noCategories");
  const reply_markup = categoriesKeyboard(categories, user.language);
  if (edit) await ctx.editMessageText(text, { reply_markup });
  else await ctx.reply(text, { reply_markup });
}

async function renderProductList(
  ctx: Context,
  user: User,
  opts: { categoryId?: string; isSpecial: boolean; page: number; edit: boolean }
) {
  const lang = user.language;
  const { items, total } = await productService.getVisibleProducts({
    categoryId: opts.categoryId,
    isSpecial: opts.isSpecial,
    page: opts.page,
    limit: BOT_PAGE_SIZE,
  });

  let title = t(lang, "specialTitle");
  if (!opts.isSpecial && opts.categoryId) {
    const category = await categoryService.getById(opts.categoryId).catch(() => null);
    if (category) title = `📂 ${localized(category, "name", lang)}`;
  }
  const text = items.length ? title : `${title}\n\n${t(lang, "noProducts")}`;
  const prefix = opts.isSpecial ? "spec" : `cat:${opts.categoryId}`;
  const reply_markup = productListKeyboard(items, lang, opts.page, total, prefix, !opts.isSpecial);

  if (opts.edit) await ctx.editMessageText(text, { reply_markup });
  else await ctx.reply(text, { reply_markup });
}

async function sendAdminLink(ctx: Context, user: User) {
  if (user.role !== UserRole.ADMIN) {
    await ctx.reply(t(user.language, "notAdmin"));
    return;
  }
  const token = await userService.createLoginToken(user._id);
  const url = `${requireEnv("BASE_URL").replace(/\/$/, "")}/admin/auth?token=${token}`;
  // Sent as plain text: Telegram rejects localhost URLs in buttons.
  await ctx.reply(`${t(user.language, "adminLink", { min: LOGIN_TOKEN_TTL_MINUTES })}\n\n${url}`, {
    link_preview_options: { is_disabled: true },
  });
}

export function setupBot() {
  const bot = getBot();

  bot.command("start", async (ctx) => {
    const from = ctx.from!;
    const { user, isNew } = await userService.upsertFromTelegram({
      telegramId: from.id,
      firstName: from.first_name,
      username: from.username,
    });

    // Shared product link: t.me/<bot>?start=p_<productId>
    const shared = /^p_([a-f0-9]{24})$/.exec(ctx.match);
    if (shared) {
      const product = await productService.getVisibleProduct(shared[1]);
      if (product) await sendProductCard(ctx, product, user.language, true);
      else await ctx.reply(t(user.language, "productGone"));
    }

    if (isNew) await ctx.reply(t(Language.UZ, "chooseLanguage"), { reply_markup: languageKeyboard() });
    else if (!shared) await showMainMenu(ctx, user);
  });

  bot.command("admin", async (ctx) => sendAdminLink(ctx, await currentUser(ctx)));

  bot.hears(menuLabels("menuLanguage"), async (ctx) => {
    const user = await currentUser(ctx);
    await ctx.reply(t(user.language, "chooseLanguage"), { reply_markup: languageKeyboard() });
  });

  bot.hears(menuLabels("menuCatalog"), async (ctx) => renderCategories(ctx, await currentUser(ctx), false));

  bot.hears(menuLabels("menuSpecial"), async (ctx) =>
    renderProductList(ctx, await currentUser(ctx), { isSpecial: true, page: 1, edit: false })
  );

  bot.hears(menuLabels("menuAdmin"), async (ctx) => sendAdminLink(ctx, await currentUser(ctx)));

  bot.callbackQuery(/^lang:(uz|ru|en)$/, async (ctx) => {
    const user = await userService.setLanguage(ctx.from.id, ctx.match[1] as Language);
    await ctx.answerCallbackQuery(t(user.language, "languageSaved"));
    await ctx.deleteMessage().catch(() => undefined);
    await showMainMenu(ctx, user);
  });

  bot.callbackQuery("cats", async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderCategories(ctx, await currentUser(ctx), true);
  });

  bot.callbackQuery(/^cat:([a-f0-9]{24}):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderProductList(ctx, await currentUser(ctx), {
      categoryId: ctx.match[1],
      isSpecial: false,
      page: Number(ctx.match[2]),
      edit: true,
    });
  });

  bot.callbackQuery(/^spec:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderProductList(ctx, await currentUser(ctx), {
      isSpecial: true,
      page: Number(ctx.match[1]),
      edit: true,
    });
  });

  bot.callbackQuery(/^prod:([a-f0-9]{24})$/, async (ctx) => {
    const user = await currentUser(ctx);
    const product = await productService.getVisibleProduct(ctx.match[1]);
    if (!product) {
      await ctx.answerCallbackQuery({ text: t(user.language, "productGone"), show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await sendProductCard(ctx, product, user.language, false);
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

export async function startBot() {
  const bot = setupBot();
  await bot.api.setMyCommands([
    { command: "start", description: "Menu / Меню" },
    { command: "admin", description: "Admin panel" },
  ]);
  const url = getMiniAppUrl();
  if (url) {
    await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: "Do'kon", web_app: { url } } });
    console.info(`Mini App: ${url}`);
  } else {
    console.info("Mini App: MINI_APP_URL is not set (or not https), so the shop button is hidden.");
  }
  bot.start({ onStart: (me) => console.info(`Telegram bot @${me.username} is running`) });
}
