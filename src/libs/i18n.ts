import { Language } from "./enums/user.enum";
import { ProductStatus } from "./enums/product.enum";

const texts = {
  chooseLanguage: {
    uz: "Tilni tanlang:",
    ru: "Выберите язык:",
    en: "Choose your language:",
  },
  welcome: {
    uz: "Barchasi Arzon do'koniga xush kelibsiz! Quyidagi menyudan tanlang.",
    ru: "Добро пожаловать в магазин Barchasi Arzon! Выберите пункт меню ниже.",
    en: "Welcome to Barchasi Arzon! Pick an option from the menu below.",
  },
  menuCatalog: { uz: "🛍 Katalog", ru: "🛍 Каталог", en: "🛍 Catalog" },
  openShop: { uz: "🛒 Do'konni ochish", ru: "🛒 Открыть магазин", en: "🛒 Open the shop" },
  openShopHint: {
    uz: "Barcha mahsulotlarni rasmlari bilan ko'rish uchun do'konni oching:",
    ru: "Откройте магазин, чтобы смотреть все товары с фото:",
    en: "Open the shop to browse every product with photos:",
  },
  menuButton: { uz: "Do'kon", ru: "Магазин", en: "Shop" },
  menuSpecial: { uz: "🔥 Maxsus narxlar", ru: "🔥 Спецпредложения", en: "🔥 Special prices" },
  menuLanguage: { uz: "🌐 Til", ru: "🌐 Язык", en: "🌐 Language" },
  menuAdmin: { uz: "⚙️ Admin panel", ru: "⚙️ Админ-панель", en: "⚙️ Admin panel" },
  chooseCategory: { uz: "Kategoriyani tanlang:", ru: "Выберите категорию:", en: "Choose a category:" },
  noCategories: {
    uz: "Hozircha kategoriyalar yo'q.",
    ru: "Пока нет категорий.",
    en: "There are no categories yet.",
  },
  noProducts: {
    uz: "Bu bo'limda hozircha mahsulot yo'q.",
    ru: "В этом разделе пока нет товаров.",
    en: "There are no products here yet.",
  },
  specialTitle: { uz: "🔥 Maxsus narxlar", ru: "🔥 Спецпредложения", en: "🔥 Special prices" },
  back: { uz: "⬅️ Orqaga", ru: "⬅️ Назад", en: "⬅️ Back" },
  prev: { uz: "◀️", ru: "◀️", en: "◀️" },
  next: { uz: "▶️", ru: "▶️", en: "▶️" },
  price: { uz: "Narxi", ru: "Цена", en: "Price" },
  productGone: {
    uz: "Bu mahsulot endi mavjud emas.",
    ru: "Этот товар больше недоступен.",
    en: "This product is no longer available.",
  },
  languageSaved: { uz: "Til saqlandi ✅", ru: "Язык сохранён ✅", en: "Language saved ✅" },
  adminLink: {
    uz: "Admin panelga kirish uchun havola ({min} daqiqa amal qiladi, bir marta ishlatiladi):",
    ru: "Ссылка для входа в админ-панель (действует {min} мин., одноразовая):",
    en: "Your admin panel login link (valid for {min} minutes, single use):",
  },
  notAdmin: {
    uz: "Bu bo'lim faqat adminlar uchun.",
    ru: "Этот раздел только для администраторов.",
    en: "This section is for admins only.",
  },
} as const;

export type TextKey = keyof typeof texts;

export function t(lang: Language, key: TextKey, vars: Record<string, string | number> = {}): string {
  let s: string = texts[key][lang] ?? texts[key].uz;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

const statusTexts: Record<ProductStatus, Record<Language, string>> = {
  [ProductStatus.IN_STOCK]: { uz: "🟢 Mavjud", ru: "🟢 В наличии", en: "🟢 In stock" },
  [ProductStatus.LOW_STOCK]: { uz: "🟡 Kam qoldi", ru: "🟡 Мало осталось", en: "🟡 Low stock" },
  [ProductStatus.OUT_OF_STOCK]: { uz: "🔴 Tugagan", ru: "🔴 Нет в наличии", en: "🔴 Out of stock" },
};

export function statusText(lang: Language, status: ProductStatus): string {
  return statusTexts[status][lang];
}

/** Picks name/description in the user's language, e.g. localized(p, "name", "en") -> p.nameEn. */
export function localized(
  doc: Record<string, any>,
  field: "name" | "description",
  lang: Language
): string {
  const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
  return doc[`${field}${suffix}`] || doc[`${field}Uz`] || "";
}

/** Whole so'm with thin grouping: 125000 -> "125 000 so'm". */
export function formatPrice(price: number, lang: Language): string {
  const grouped = String(price).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const unit = { uz: "so'm", ru: "сум", en: "UZS" }[lang];
  return `${grouped} ${unit}`;
}
