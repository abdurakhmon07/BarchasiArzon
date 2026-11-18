import type { Language, ProductStatus } from "./types";

const texts = {
  catalog: { uz: "Katalog", ru: "Каталог", en: "Catalog" },
  special: { uz: "🔥 Maxsus narxlar", ru: "🔥 Спеццены", en: "🔥 Special prices" },
  all: { uz: "Barchasi", ru: "Все", en: "All" },
  empty: { uz: "Bu yerda hozircha mahsulot yo'q.", ru: "Здесь пока нет товаров.", en: "No products here yet." },
  loading: { uz: "Yuklanmoqda…", ru: "Загрузка…", en: "Loading…" },
  retry: { uz: "Qayta urinish", ru: "Повторить", en: "Try again" },
  error: { uz: "Xatolik yuz berdi.", ru: "Что-то пошло не так.", en: "Something went wrong." },
  openInTelegram: {
    uz: "Bu ilovani Telegram'dagi Barchasi Arzon boti orqali oching.",
    ru: "Откройте это приложение через бота Barchasi Arzon в Telegram.",
    en: "Open this app from the Barchasi Arzon bot in Telegram.",
  },
  description: { uz: "Tavsif", ru: "Описание", en: "Description" },
  close: { uz: "Yopish", ru: "Закрыть", en: "Close" },
  search: { uz: "Qidirish…", ru: "Поиск…", en: "Search…" },
  noResults: { uz: "Hech narsa topilmadi.", ru: "Ничего не найдено.", en: "Nothing found." },
  sortDefault: { uz: "Tartib: odatiy", ru: "Порядок: обычный", en: "Sort: default" },
  sortName: { uz: "Nomi bo'yicha", ru: "По названию", en: "By name" },
  sortPriceAsc: { uz: "Arzonroq avval", ru: "Сначала дешевле", en: "Price: low to high" },
  sortPriceDesc: { uz: "Qimmatroq avval", ru: "Сначала дороже", en: "Price: high to low" },
  sortNewest: { uz: "Yangilari avval", ru: "Сначала новые", en: "Newest first" },
  inStockOnly: { uz: "Faqat mavjud", ru: "Только в наличии", en: "In stock only" },
  recent: { uz: "Yaqinda ko'rilgan", ru: "Вы смотрели", en: "Recently viewed" },
  share: { uz: "Ulashish", ru: "Поделиться", en: "Share" },
  linkCopied: { uz: "Havola nusxalandi", ru: "Ссылка скопирована", en: "Link copied" },
} as const;

export type TextKey = keyof typeof texts;

export function t(lang: Language, key: TextKey): string {
  return texts[key][lang];
}

const statuses: Record<ProductStatus, Record<Language, string>> = {
  in_stock: { uz: "Mavjud", ru: "В наличии", en: "In stock" },
  low_stock: { uz: "Kam qoldi", ru: "Мало осталось", en: "Low stock" },
  out_of_stock: { uz: "Tugagan", ru: "Нет в наличии", en: "Out of stock" },
};

export function statusText(lang: Language, status: ProductStatus): string {
  return statuses[status][lang];
}

/** 125000 -> "125 000 so'm" (prices are whole so'm). */
export function formatPrice(price: number, lang: Language): string {
  const grouped = String(price).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} ${{ uz: "so'm", ru: "сум", en: "UZS" }[lang]}`;
}

/** Best guess before the backend tells us the saved language. */
export function guessLanguage(code?: string): Language {
  if (code?.startsWith("ru")) return "ru";
  if (code?.startsWith("en")) return "en";
  return "uz";
}
