import { InlineKeyboard, Keyboard } from "grammy";
import { Language } from "../libs/enums/user.enum";
import { ProductStatus } from "../libs/enums/product.enum";
import { formatPrice, localized, t } from "../libs/i18n";
import { Category } from "../libs/types/category";
import { Product } from "../libs/types/product";
import { BOT_PAGE_SIZE } from "../libs/config";

export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🇺🇿 O'zbekcha", "lang:uz")
    .text("🇷🇺 Русский", "lang:ru")
    .text("🇬🇧 English", "lang:en");
}

export function mainMenu(lang: Language, isAdmin: boolean): Keyboard {
  const kb = new Keyboard()
    .text(t(lang, "menuCatalog"))
    .text(t(lang, "menuSpecial"))
    .row()
    .text(t(lang, "menuLanguage"));
  if (isAdmin) kb.text(t(lang, "menuAdmin"));
  return kb.resized().persistent();
}

export function categoriesKeyboard(categories: Category[], lang: Language): InlineKeyboard {
  const kb = new InlineKeyboard();
  categories.forEach((c, i) => {
    kb.text(localized(c, "name", lang), `cat:${c._id}:1`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

/**
 * One button per product plus paging. `pagePrefix` is "cat:<id>" or "spec";
 * the page number is appended to it.
 */
export function productListKeyboard(
  products: Product[],
  lang: Language,
  page: number,
  total: number,
  pagePrefix: string,
  showBack: boolean
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const p of products) {
    const mark = p.status === ProductStatus.OUT_OF_STOCK ? "🔴 " : "";
    kb.text(`${mark}${localized(p, "name", lang)} — ${formatPrice(p.price, lang)}`, `prod:${p._id}`).row();
  }

  const pages = Math.max(1, Math.ceil(total / BOT_PAGE_SIZE));
  if (pages > 1) {
    if (page > 1) kb.text(t(lang, "prev"), `${pagePrefix}:${page - 1}`);
    kb.text(`${page}/${pages}`, "noop");
    if (page < pages) kb.text(t(lang, "next"), `${pagePrefix}:${page + 1}`);
    kb.row();
  }
  if (showBack) kb.text(t(lang, "back"), "cats");
  return kb;
}
