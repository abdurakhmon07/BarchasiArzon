import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DB } from "../db";
import { favorites, productPhotos, products } from "../db/schema";
import type { Product } from "../libs/types/product";
import Errors, { HttpCode, Message } from "../libs/Errors";

class FavoriteService {
  constructor(private readonly db: DB) {}

  /**
   * The user's ❤️ products, newest first. Hidden products are left out (not deleted),
   * so they come back if an admin makes them visible again.
   */
  public async getProducts(userId: number): Promise<Product[]> {
    const rows = await this.db
      .select({ product: products })
      .from(favorites)
      .innerJoin(products, eq(products.id, favorites.productId))
      .where(and(eq(favorites.userId, userId), eq(products.isVisible, true)))
      .orderBy(desc(favorites.createdAt))
      .all();
    if (!rows.length) return [];
    const photos = await this.db
      .select({ productId: productPhotos.productId, fileId: productPhotos.fileId })
      .from(productPhotos)
      .where(inArray(productPhotos.productId, rows.map((r) => r.product.id)))
      .orderBy(asc(productPhotos.position))
      .all();
    return rows.map(({ product }) => ({
      ...product,
      galleryFileIds: photos.filter((p) => p.productId === product.id).map((p) => p.fileId),
    }));
  }

  /** Adding twice is fine (nothing changes). Only visible products can be added. */
  public async add(userId: number, productId: number): Promise<void> {
    const visible =
      Number.isSafeInteger(productId) &&
      (await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.isVisible, true)))
        .get());
    if (!visible) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    await this.db.insert(favorites).values({ userId, productId }).onConflictDoNothing();
  }

  public async remove(userId: number, productId: number): Promise<void> {
    if (!Number.isSafeInteger(productId)) return;
    await this.db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
  }
}

export default FavoriteService;
