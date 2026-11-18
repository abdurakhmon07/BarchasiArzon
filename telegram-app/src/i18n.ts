import type { Language, ProductStatus } from "./types";

const texts = {
  // bottom navigation
  navHome: { uz: "Bosh sahifa", ru: "Главная", en: "Home" },
  navCatalog: { uz: "Katalog", ru: "Каталог", en: "Catalog" },
  navDeals: { uz: "Aksiyalar", ru: "Акции", en: "Deals" },
  navFavorites: { uz: "Sevimli", ru: "Избранное", en: "Saved" },
  navCart: { uz: "Savat", ru: "Корзина", en: "Cart" },

  // home
  todayDeals: { uz: "Bugungi aksiyalar", ru: "Акции дня", en: "Today's deals" },
  seeAll: { uz: "Hammasi →", ru: "Все →", en: "See all →" },
  see: { uz: "Ko'rish →", ru: "Смотреть →", en: "View →" },
  canSaveToday: { uz: "Bugun {n} tejash mumkin", ru: "Сегодня можно сэкономить {n}", en: "Save up to {n} today" },
  canSaveHint: { uz: "barcha aksiyalarni birga olsangiz", ru: "если взять все акции", en: "if you take every deal" },
  categories: { uz: "Kategoriyalar", ru: "Категории", en: "Categories" },
  dealsInCategory: { uz: "{n} aksiya", ru: "{n} акций", en: "{n} deals" },
  recent: { uz: "Yaqinda ko'rilgan", ru: "Вы смотрели", en: "Recently viewed" },
  searchAll: { uz: "Aksiya va mahsulot qidirish…", ru: "Поиск акций и товаров…", en: "Search deals and products…" },
  searchResults: { uz: "Qidiruv natijalari", ru: "Результаты поиска", en: "Search results" },

  // deals screen
  dealsTitle: { uz: "Aksiyalar", ru: "Акции", en: "Deals" },
  dealsSubtitle: { uz: "{n} ta mahsulot · {p}% gacha chegirma", ru: "{n} товаров · скидки до {p}%", en: "{n} products · up to {p}% off" },
  searchDeals: { uz: "Aksiyadan qidirish…", ru: "Поиск по акциям…", en: "Search deals…" },
  all: { uz: "Barchasi", ru: "Все", en: "All" },

  // catalog
  catalogTitle: { uz: "Katalog", ru: "Каталог", en: "Catalog" },
  searchCatalog: { uz: "Katalogdan qidirish…", ru: "Поиск по каталогу…", en: "Search the catalog…" },

  // lists
  productsCount: { uz: "{n} ta mahsulot", ru: "{n} товаров", en: "{n} products" },
  sortBy: { uz: "Saralash", ru: "Сортировка", en: "Sort" },
  sortDefault: { uz: "Odatiy", ru: "Обычная", en: "Default" },
  sortDiscount: { uz: "Eng katta chegirma", ru: "Самая большая скидка", en: "Biggest discount" },
  sortName: { uz: "Nomi bo'yicha", ru: "По названию", en: "By name" },
  sortPriceAsc: { uz: "Arzonroq avval", ru: "Сначала дешевле", en: "Price: low to high" },
  sortPriceDesc: { uz: "Qimmatroq avval", ru: "Сначала дороже", en: "Price: high to low" },
  sortNewest: { uz: "Yangilari avval", ru: "Сначала новые", en: "Newest first" },
  inStockOnly: { uz: "Faqat mavjud", ru: "Только в наличии", en: "In stock only" },
  filters: { uz: "Saralash va filtr", ru: "Сортировка и фильтр", en: "Sort & filter" },
  done: { uz: "Tayyor", ru: "Готово", en: "Done" },
  empty: { uz: "Bu yerda hozircha mahsulot yo'q.", ru: "Здесь пока нет товаров.", en: "No products here yet." },
  noResults: { uz: "Hech narsa topilmadi.", ru: "Ничего не найдено.", en: "Nothing found." },
  loading: { uz: "Yuklanmoqda…", ru: "Загрузка…", en: "Loading…" },
  retry: { uz: "Qayta urinish", ru: "Повторить", en: "Try again" },
  error: { uz: "Xatolik yuz berdi.", ru: "Что-то пошло не так.", en: "Something went wrong." },

  // product
  save: { uz: "{n} tejang", ru: "−{n}", en: "Save {n}" },
  youSave: { uz: "Siz {n} tejaysiz", ru: "Вы экономите {n}", en: "You save {n}" },
  cheaperBy: { uz: "Oddiy narxdan {p}% arzon", ru: "На {p}% дешевле обычной цены", en: "{p}% below the regular price" },
  dealChip: { uz: "🔥 Aksiya", ru: "🔥 Акция", en: "🔥 Deal" },
  dealPrice: { uz: "Aksiya narxi", ru: "Цена по акции", en: "Deal price" },
  price: { uz: "Narxi", ru: "Цена", en: "Price" },
  description: { uz: "Tavsif", ru: "Описание", en: "Description" },
  addToCart: { uz: "Savatga qo'shish", ru: "В корзину", en: "Add to cart" },
  inCart: { uz: "Savatda · {n}", ru: "В корзине · {n}", en: "In cart · {n}" },
  soldOut: { uz: "Tugagan", ru: "Нет в наличии", en: "Out of stock" },
  share: { uz: "Ulashish", ru: "Поделиться", en: "Share" },
  linkCopied: { uz: "Havola nusxalandi", ru: "Ссылка скопирована", en: "Link copied" },
  close: { uz: "Yopish", ru: "Закрыть", en: "Close" },
  unavailable: {
    uz: "Bu mahsulot hozir mavjud emas.",
    ru: "Этого товара сейчас нет в наличии.",
    en: "This product isn't available right now.",
  },

  // favorites
  favoritesTitle: { uz: "Sevimlilar", ru: "Избранное", en: "Saved" },
  noFavorites: {
    uz: "Sevimlilar hozircha bo'sh. Mahsulotdagi 🤍 belgisini bosing.",
    ru: "В избранном пока пусто. Нажмите 🤍 на товаре.",
    en: "Nothing saved yet. Tap 🤍 on a product.",
  },

  // cart
  cart: { uz: "Savat", ru: "Корзина", en: "Cart" },
  cartEmpty: { uz: "Savat bo'sh", ru: "Корзина пуста", en: "Your cart is empty" },
  cartEmptyHint: { uz: "Aksiyalardan boshlang — eng arzonlari o'sha yerda.", ru: "Начните с акций — там самое выгодное.", en: "Start with the deals — that's where the savings are." },
  goDeals: { uz: "🔥 Aksiyalarga o'tish", ru: "🔥 К акциям", en: "🔥 Go to deals" },
  clearCart: { uz: "Tozalash", ru: "Очистить", en: "Clear" },
  clearCartConfirm: { uz: "Savatni tozalaysizmi?", ru: "Очистить корзину?", en: "Empty the cart?" },
  savedTotal: { uz: "Siz {n} tejadingiz", ru: "Вы сэкономили {n}", en: "You saved {n}" },
  thanksToDeals: { uz: "aksiya narxlari tufayli", ru: "благодаря акциям", en: "thanks to deal prices" },
  regularPrice: { uz: "Oddiy narxda", ru: "По обычной цене", en: "At regular prices" },
  dealDiscount: { uz: "Aksiya chegirmasi", ru: "Скидка по акции", en: "Deal discount" },
  products: { uz: "Mahsulotlar ({n} ta)", ru: "Товары ({n} шт.)", en: "Products ({n} pcs)" },
  total: { uz: "Jami", ru: "Итого", en: "Total" },
  notAvailable: {
    uz: "Hozir mavjud emas — jamiga qo'shilmagan",
    ru: "Сейчас нет в наличии — не входит в итог",
    en: "Not available now — not in the total",
  },
  pricesNote: {
    uz: "Narxlar hozirgi holatda hisoblangan. Buyurtma berish keyingi versiyada qo'shiladi.",
    ru: "Цены посчитаны по текущим данным. Оформление заказа появится в следующей версии.",
    en: "Prices are calculated as of now. Ordering comes in the next version.",
  },
  pcs: { uz: "ta", ru: "шт.", en: "pcs" },

  openInTelegram: {
    uz: "Bu ilovani Telegram'dagi Barchasi Arzon boti orqali oching.",
    ru: "Откройте это приложение через бота Barchasi Arzon в Telegram.",
    en: "Open this app from the Barchasi Arzon bot in Telegram.",
  },
} as const;

export type TextKey = keyof typeof texts;

/** t("uz", "youSave", { n: "14 000 so'm" }) → "Siz 14 000 so'm tejaysiz" */
export function t(lang: Language, key: TextKey, vars: Record<string, string | number> = {}): string {
  let s: string = texts[key][lang];
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

const statuses: Record<ProductStatus, Record<Language, string>> = {
  in_stock: { uz: "Mavjud", ru: "В наличии", en: "In stock" },
  low_stock: { uz: "Kam qoldi", ru: "Мало осталось", en: "Low stock" },
  out_of_stock: { uz: "Tugagan", ru: "Нет в наличии", en: "Out of stock" },
};

export function statusText(lang: Language, status: ProductStatus): string {
  return statuses[status][lang];
}

/** 125000 → "125 000" */
export function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function currency(lang: Language): string {
  return { uz: "so'm", ru: "сум", en: "UZS" }[lang];
}

/** 125000 → "125 000 so'm" (prices are whole so'm). */
export function formatPrice(price: number, lang: Language): string {
  return `${formatNumber(price)} ${currency(lang)}`;
}

/** Best guess before the backend tells us the saved language. */
export function guessLanguage(code?: string): Language {
  if (code?.startsWith("ru")) return "ru";
  if (code?.startsWith("en")) return "en";
  return "uz";
}
