/**
 * One-time copy of the old MongoDB (Atlas) data into D1.
 *
 *   npm run import:mongo                       → writes import-<date>.sql (reads MONGO_URL from .env)
 *   npx wrangler d1 execute DB --local  --file import-<date>.sql    (try it locally first)
 *   npx wrangler d1 execute DB --remote --file import-<date>.sql    (production)
 *
 * MongoDB ids (24 characters) become numbers 1, 2, 3…; links between tables are translated.
 * The SQL file first empties the tables, so running it twice gives the same result.
 */
import { writeFileSync } from "node:fs";
import { MongoClient, type Document, type ObjectId } from "mongodb";
import { buildSearchText } from "../src/libs/search.ts";

process.loadEnvFile(".env");
const url = process.env.MONGO_URL;
if (!url) throw new Error("MONGO_URL is missing in .env");

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.trunc(v)) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return String(v.getTime());
  return `'${String(v).replace(/'/g, "''")}'`;
};
const ms = (d: unknown) => (d instanceof Date ? d.getTime() : Date.now());

const client = new MongoClient(url, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db();
const all = (name: string) => db.collection(name).find().toArray() as Promise<Document[]>;

const [users, categories, products, favorites, cartItems] = await Promise.all([
  all("users"),
  all("categories"),
  all("products"),
  all("favorites"),
  all("cartitems"),
]);

const sql: string[] = [
  "-- Barchasi Arzon: data copied from MongoDB on " + new Date().toISOString(),
  "DELETE FROM cart_items;",
  "DELETE FROM favorites;",
  "DELETE FROM product_photos;",
  "DELETE FROM login_tokens;",
  "DELETE FROM products;",
  "DELETE FROM categories;",
  "DELETE FROM users;",
];

// users: the Telegram ID was already the _id
const userIds = new Set<number>();
for (const u of users) {
  userIds.add(u._id);
  sql.push(
    `INSERT INTO users (telegram_id, first_name, username, role, language, created_at, updated_at) VALUES (${q(u._id)}, ${q(u.firstName ?? "User")}, ${q(u.username)}, ${q(u.role === "admin" ? "admin" : "customer")}, ${q(["uz", "ru", "en"].includes(u.language) ? u.language : "uz")}, ${ms(u.createdAt)}, ${ms(u.updatedAt)});`
  );
}

// categories: ObjectId → 1, 2, 3…
const categoryId = new Map<string, number>();
categories
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  .forEach((c, i) => {
    categoryId.set(String(c._id), i + 1);
    sql.push(
      `INSERT INTO categories (id, name_uz, name_ru, name_en, icon, sort_order, created_at, updated_at) VALUES (${i + 1}, ${q(c.nameUz)}, ${q(c.nameRu)}, ${q(c.nameEn)}, ${q(c.icon)}, ${q(c.sortOrder ?? 0)}, ${ms(c.createdAt)}, ${ms(c.updatedAt)});`
    );
  });

// products (+ gallery photos)
const productId = new Map<string, number>();
let photoCount = 0;
let skipped = 0;
products
  .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
  .forEach((p) => {
    const cat = categoryId.get(String(p.categoryId as ObjectId));
    if (!cat) {
      skipped++;
      return;
    }
    const id = productId.size + 1;
    productId.set(String(p._id), id);
    const oldPrice = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : null;
    const discount = oldPrice ? Math.round(((oldPrice - p.price) / oldPrice) * 100) : 0;
    const status = ["in_stock", "low_stock", "out_of_stock"].includes(p.status) ? p.status : "in_stock";
    sql.push(
      `INSERT INTO products (id, category_id, name_uz, name_ru, name_en, description_uz, description_ru, description_en, price, old_price, discount_percent, status, is_special, is_visible, photo_file_id, search_text, updated_by, created_at, updated_at) VALUES (${id}, ${cat}, ${q(p.nameUz)}, ${q(p.nameRu)}, ${q(p.nameEn)}, ${q(p.descriptionUz)}, ${q(p.descriptionRu)}, ${q(p.descriptionEn)}, ${q(p.price)}, ${q(oldPrice)}, ${discount}, ${q(status)}, ${q(Boolean(p.isSpecial))}, ${q(p.isVisible !== false)}, ${q(p.photoFileId)}, ${q(buildSearchText([p.nameUz, p.nameRu, p.nameEn]))}, ${userIds.has(p.updatedBy) ? q(p.updatedBy) : "NULL"}, ${ms(p.createdAt)}, ${ms(p.updatedAt)});`
    );
    (p.galleryFileIds ?? []).forEach((fileId: string, position: number) => {
      photoCount++;
      sql.push(`INSERT INTO product_photos (product_id, file_id, position) VALUES (${id}, ${q(fileId)}, ${position});`);
    });
  });

// favorites + cart: only rows whose user and product were copied
let favCount = 0;
for (const f of favorites) {
  const pid = productId.get(String(f.productId));
  if (!pid || !userIds.has(f.userId)) continue;
  favCount++;
  sql.push(`INSERT OR IGNORE INTO favorites (user_id, product_id, created_at) VALUES (${q(f.userId)}, ${pid}, ${ms(f.createdAt)});`);
}
let cartCount = 0;
for (const c of cartItems) {
  const pid = productId.get(String(c.productId));
  if (!pid || !userIds.has(c.userId) || !(c.quantity >= 1 && c.quantity <= 99)) continue;
  cartCount++;
  sql.push(
    `INSERT OR IGNORE INTO cart_items (user_id, product_id, quantity, created_at, updated_at) VALUES (${q(c.userId)}, ${pid}, ${q(c.quantity)}, ${ms(c.createdAt)}, ${ms(c.updatedAt)});`
  );
}

await client.close();
const file = `import-${new Date().toISOString().slice(0, 10)}.sql`;
writeFileSync(file, sql.join("\n") + "\n");
console.log(
  `Wrote ${file}: ${userIds.size} users, ${categoryId.size} categories, ${productId.size} products` +
    ` (${photoCount} gallery photos, ${skipped} skipped without category), ${favCount} favorites, ${cartCount} cart lines.`
);
