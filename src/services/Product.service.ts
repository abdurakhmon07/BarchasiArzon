import { and, asc, count, desc, eq, gt, gte, inArray, max, ne, sql, type SQL } from "drizzle-orm";
import type { DB } from "../db";
import { categories, productPhotos, products, type ProductRow } from "../db/schema";
import type { DealsSummary, Product, ProductInput, ProductInquiry } from "../libs/types/product";
import { ProductSort, ProductStatus } from "../libs/enums/product.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { buildSearchText, likePattern } from "../libs/search";

/** id as a tie-breaker keeps page 2 from repeating or skipping products with equal values. */
const SORTS: Record<ProductSort, SQL[]> = {
  [ProductSort.NAME]: [asc(products.nameUz), asc(products.id)],
  [ProductSort.PRICE_ASC]: [asc(products.price), asc(products.id)],
  [ProductSort.PRICE_DESC]: [desc(products.price), asc(products.id)],
  [ProductSort.NEWEST]: [desc(products.createdAt), desc(products.id)],
  [ProductSort.DISCOUNT]: [desc(products.discountPercent), asc(products.price), asc(products.id)],
};

/** 40 000 → 26 000 is 35% off. No old price, or not higher than the price, means no discount. */
export function discountOf(price: number, oldPrice?: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

const isAvailable = and(eq(products.isVisible, true), ne(products.status, ProductStatus.OUT_OF_STOCK));

export type AdminProduct = Product & { categoryName: string | null };

class ProductService {
  constructor(private readonly db: DB) {}

  /** Adds each product's gallery (one query for the whole list). */
  private async withGalleries<R extends ProductRow>(rows: R[]): Promise<(R & { galleryFileIds: string[] })[]> {
    if (!rows.length) return [];
    const photos = await this.db
      .select({ productId: productPhotos.productId, fileId: productPhotos.fileId })
      .from(productPhotos)
      .where(inArray(productPhotos.productId, rows.map((r) => r.id)))
      .orderBy(asc(productPhotos.productId), asc(productPhotos.position), asc(productPhotos.id))
      .all();
    const byProduct = new Map<number, string[]>();
    for (const p of photos) byProduct.set(p.productId, [...(byProduct.get(p.productId) ?? []), p.fileId]);
    return rows.map((r) => ({ ...r, galleryFileIds: byProduct.get(r.id) ?? [] }));
  }

  /** CUSTOMER (bot + Mini App) — only visible products **/

  /**
   * Catalog: isSpecial = false. Deals: isSpecial = true. Both (home feed / search): isSpecial undefined.
   * Optional: category, search by name (any language), in stock only, minimum discount, sort.
   */
  public async getVisibleProducts(inquiry: ProductInquiry): Promise<{ items: Product[]; total: number }> {
    const conditions: SQL[] = [eq(products.isVisible, true)];
    if (inquiry.isSpecial !== undefined) conditions.push(eq(products.isSpecial, inquiry.isSpecial));
    if (inquiry.categoryId !== undefined) {
      if (!Number.isSafeInteger(inquiry.categoryId)) return { items: [], total: 0 };
      conditions.push(eq(products.categoryId, inquiry.categoryId));
    }
    if (inquiry.search) conditions.push(sql`${products.searchText} LIKE ${likePattern(inquiry.search)} ESCAPE '\\'`);
    if (inquiry.inStockOnly) conditions.push(ne(products.status, ProductStatus.OUT_OF_STOCK));
    if (inquiry.minDiscount) conditions.push(gte(products.discountPercent, inquiry.minDiscount));
    const where = and(...conditions);

    // Default order: whole shop → newest; deals → recently updated; catalog → by name.
    const order = inquiry.sort
      ? SORTS[inquiry.sort]
      : inquiry.isSpecial === undefined
        ? SORTS[ProductSort.NEWEST]
        : inquiry.isSpecial
          ? [desc(products.updatedAt), asc(products.id)]
          : SORTS[ProductSort.NAME];

    const limit = inquiry.limit ?? 10;
    const page = Math.max(1, inquiry.page ?? 1);
    const [rows, totalRow] = await Promise.all([
      this.db.select().from(products).where(where).orderBy(...order).limit(limit).offset((page - 1) * limit).all(),
      this.db.select({ n: count() }).from(products).where(where).get(),
    ]);
    return { items: await this.withGalleries(rows), total: totalRow?.n ?? 0 };
  }

  public async getVisibleProduct(id: number): Promise<Product | null> {
    if (!Number.isSafeInteger(id)) return null;
    const row = await this.db.select().from(products).where(and(eq(products.id, id), eq(products.isVisible, true))).get();
    return row ? (await this.withGalleries([row]))[0] : null;
  }

  /** Visible products by id, in the order given (for "recently viewed"). Unknown or hidden ids are skipped. */
  public async getVisibleByIds(ids: number[]): Promise<Product[]> {
    const valid = ids.filter((id) => Number.isSafeInteger(id));
    if (!valid.length) return [];
    const rows = await this.db
      .select()
      .from(products)
      .where(and(inArray(products.id, valid), eq(products.isVisible, true)))
      .all();
    const byId = new Map((await this.withGalleries(rows)).map((p) => [p.id, p]));
    return valid.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }

  /** A photo may be shown publicly only if a visible product uses it (main or gallery). */
  public async isPublicPhoto(fileId: string): Promise<boolean> {
    const main = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.isVisible, true), eq(products.photoFileId, fileId)))
      .limit(1)
      .get();
    if (main) return true;
    const gallery = await this.db
      .select({ id: products.id })
      .from(productPhotos)
      .innerJoin(products, eq(products.id, productPhotos.productId))
      .where(and(eq(products.isVisible, true), eq(productPhotos.fileId, fileId)))
      .limit(1)
      .get();
    return Boolean(gallery);
  }

  /** Numbers for the Mini App home screen and the Aksiyalar header. */
  public async getDealsSummary(topLimit: number): Promise<DealsSummary> {
    const deals = and(eq(products.isVisible, true), eq(products.isSpecial, true));
    const available = and(deals, isAvailable);
    const [dealCount, stats, perCategory, topRows] = await Promise.all([
      this.db.select({ n: count() }).from(products).where(deals).get(),
      this.db
        .select({
          maxDiscount: max(products.discountPercent),
          totalSaving: sql<number>`coalesce(sum(${products.oldPrice} - ${products.price}), 0)`,
        })
        .from(products)
        .where(and(available, gt(products.discountPercent, 0)))
        .get(),
      this.db
        .select({ categoryId: products.categoryId, n: count() })
        .from(products)
        .where(deals)
        .groupBy(products.categoryId)
        .all(),
      topLimit > 0
        ? this.db.select().from(products).where(available).orderBy(...SORTS[ProductSort.DISCOUNT]).limit(topLimit).all()
        : Promise.resolve([] as ProductRow[]),
    ]);
    return {
      dealCount: dealCount?.n ?? 0,
      maxDiscount: stats?.maxDiscount ?? 0,
      totalSaving: Number(stats?.totalSaving ?? 0),
      topDeals: await this.withGalleries(topRows),
      dealsByCategory: Object.fromEntries(perCategory.map((c) => [c.categoryId, c.n])),
    };
  }

  /** ADMIN — all products, including hidden ones **/

  public async getAllForAdmin(inquiry: ProductInquiry): Promise<AdminProduct[]> {
    const conditions: SQL[] = [];
    if (inquiry.categoryId !== undefined && Number.isSafeInteger(inquiry.categoryId)) {
      conditions.push(eq(products.categoryId, inquiry.categoryId));
    }
    if (inquiry.isSpecial !== undefined) conditions.push(eq(products.isSpecial, inquiry.isSpecial));
    if (inquiry.search) conditions.push(sql`${products.searchText} LIKE ${likePattern(inquiry.search)} ESCAPE '\\'`);
    const rows = await this.db
      .select({ product: products, categoryName: categories.nameUz })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(products.updatedAt), desc(products.id))
      .all();
    const withPhotos = await this.withGalleries(rows.map((r) => r.product));
    return withPhotos.map((p, i) => ({ ...p, categoryName: rows[i].categoryName }));
  }

  public async getById(id: number): Promise<Product> {
    const row = Number.isSafeInteger(id) ? await this.db.select().from(products).where(eq(products.id, id)).get() : undefined;
    if (!row) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    return (await this.withGalleries([row]))[0];
  }

  public async create(input: ProductInput, adminId: number): Promise<Product> {
    await this.checkInput(input, input);
    const { galleryFileIds = [], ...fields } = input;
    const [row] = await this.db
      .insert(products)
      .values({
        ...fields,
        discountPercent: discountOf(input.price, input.oldPrice),
        searchText: buildSearchText([input.nameUz, input.nameRu, input.nameEn]),
        updatedBy: adminId,
      })
      .returning();
    if (galleryFileIds.length) {
      await this.db.insert(productPhotos).values(galleryFileIds.map((fileId, position) => ({ productId: row.id, fileId, position })));
    }
    return this.getById(row.id);
  }

  public async update(id: number, input: Partial<ProductInput>, adminId: number): Promise<Product> {
    const current = await this.getById(id);
    // Price rules need the final values: what's sent, or else what's already saved.
    const final = {
      price: input.price ?? current.price,
      oldPrice: "oldPrice" in input ? input.oldPrice : current.oldPrice,
    };
    await this.checkInput(input, final);

    const { galleryFileIds, ...fields } = input;
    const names = {
      nameUz: input.nameUz ?? current.nameUz,
      nameRu: "nameRu" in input ? input.nameRu : current.nameRu,
      nameEn: "nameEn" in input ? input.nameEn : current.nameEn,
    };
    const updateRow = this.db
      .update(products)
      .set({
        ...fields,
        discountPercent: discountOf(final.price, final.oldPrice),
        searchText: buildSearchText([names.nameUz, names.nameRu, names.nameEn]),
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    if (galleryFileIds === undefined) {
      await updateRow;
    } else {
      // D1 has no transactions; batch() runs these statements together, all or nothing.
      const replacePhotos = galleryFileIds.map((fileId, position) =>
        this.db.insert(productPhotos).values({ productId: id, fileId, position })
      );
      await this.db.batch([updateRow, this.db.delete(productPhotos).where(eq(productPhotos.productId, id)), ...replacePhotos]);
    }
    return this.getById(id);
  }

  public async setVisibility(id: number, isVisible: boolean, adminId: number) {
    return this.update(id, { isVisible }, adminId);
  }

  public async setSpecial(id: number, isSpecial: boolean, adminId: number) {
    return this.update(id, { isSpecial }, adminId);
  }

  public async setStatus(id: number, status: ProductStatus, adminId: number) {
    return this.update(id, { status }, adminId);
  }

  /** Hiding is preferred; delete is for mistakes. Photos, favorites and cart lines go with it (CASCADE). */
  public async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.db.delete(products).where(eq(products.id, id));
  }

  private async checkInput(input: Partial<ProductInput>, final: { price: number; oldPrice?: number | null }): Promise<void> {
    if (input.price !== undefined && (!Number.isSafeInteger(input.price) || input.price < 0)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PRICE);
    }
    if (input.oldPrice != null && (!Number.isSafeInteger(input.oldPrice) || input.oldPrice < 0)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PRICE);
    }
    if (final.oldPrice != null && final.oldPrice <= final.price) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.OLD_PRICE_TOO_LOW);
    }
    if (input.status !== undefined && !Object.values(ProductStatus).includes(input.status)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    if (input.nameUz !== undefined && !input.nameUz.trim()) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    if (input.categoryId !== undefined) {
      const exists =
        Number.isSafeInteger(input.categoryId) &&
        (await this.db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).get());
      if (!exists) throw new Errors(HttpCode.BAD_REQUEST, Message.NO_CATEGORY);
    }
  }
}

export default ProductService;
