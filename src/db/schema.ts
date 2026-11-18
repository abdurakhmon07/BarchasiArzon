import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Database tables (Cloudflare D1 = SQLite), following the ER model PDF.
 * Change this file, then run `npm run db:generate` to create a migration in migrations/.
 */

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

/** USERS — everyone who opens the bot or the Mini App. No passwords: Telegram identifies them. */
export const users = sqliteTable(
  "users",
  {
    telegramId: integer("telegram_id").primaryKey(),
    firstName: text("first_name").notNull(),
    username: text("username"),
    role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
    language: text("language", { enum: ["uz", "ru", "en"] }).notNull().default("uz"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("users_role_check", sql`${t.role} IN ('customer', 'admin')`),
    check("users_language_check", sql`${t.language} IN ('uz', 'ru', 'en')`),
  ]
);

/** CATEGORIES — e.g. cleaning supplies, kitchen, bathroom. */
export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nameUz: text("name_uz").notNull(),
    nameRu: text("name_ru"),
    nameEn: text("name_en"),
    icon: text("icon"), // an emoji, e.g. 🧽
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("categories_sort_idx").on(t.sortOrder, t.nameUz)]
);

/**
 * PRODUCTS — the central table. The catalog (is_special = 0) and the deals section
 * (is_special = 1) are filtered views of it.
 */
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // RESTRICT: a category that still has products can't be deleted.
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    nameUz: text("name_uz").notNull(),
    nameRu: text("name_ru"),
    nameEn: text("name_en"),
    descriptionUz: text("description_uz"),
    descriptionRu: text("description_ru"),
    descriptionEn: text("description_en"),
    price: integer("price").notNull(), // whole so'm
    oldPrice: integer("old_price"), // before the discount; must be higher than price
    discountPercent: integer("discount_percent").notNull().default(0), // calculated on save
    status: text("status", { enum: ["in_stock", "low_stock", "out_of_stock"] }).notNull().default("in_stock"),
    isSpecial: integer("is_special", { mode: "boolean" }).notNull().default(false),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    photoFileId: text("photo_file_id"), // Telegram file_id of the main photo
    // All names in lower case, filled by our code: SQLite's own lower() only handles Latin letters.
    searchText: text("search_text").notNull().default(""),
    updatedBy: integer("updated_by").references(() => users.telegramId, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("products_price_check", sql`${t.price} >= 0`),
    check("products_old_price_check", sql`${t.oldPrice} IS NULL OR ${t.oldPrice} >= 0`),
    check("products_discount_check", sql`${t.discountPercent} BETWEEN 0 AND 100`),
    check("products_status_check", sql`${t.status} IN ('in_stock', 'low_stock', 'out_of_stock')`),
    index("products_section_idx").on(t.isVisible, t.isSpecial, t.categoryId),
    index("products_discount_idx").on(t.isVisible, t.isSpecial, t.discountPercent),
    index("products_created_idx").on(t.isVisible, t.createdAt),
  ]
);

/** Extra photos of a product (gallery), in order. Deleted together with the product. */
export const productPhotos = sqliteTable(
  "product_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    fileId: text("file_id").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_photos_product_idx").on(t.productId, t.position), index("product_photos_file_idx").on(t.fileId)]
);

/** ❤️ favorites. A deleted product disappears from everyone's favorites (CASCADE). */
export const favorites = sqliteTable(
  "favorites",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.telegramId, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] }), index("favorites_user_idx").on(t.userId, t.createdAt)]
);

/** CART_ITEMS — from the ER model's planned extensions. */
export const cartItems = sqliteTable(
  "cart_items",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.telegramId, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    check("cart_items_quantity_check", sql`${t.quantity} BETWEEN 1 AND 99`),
  ]
);

/** One-time admin login links sent by the bot. Expired ones are removed by the nightly cron. */
export const loginTokens = sqliteTable("login_tokens", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.telegramId, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type CartItemRow = typeof cartItems.$inferSelect;
