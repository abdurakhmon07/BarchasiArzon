import { asc, count, eq } from "drizzle-orm";
import type { DB } from "../db";
import { categories, products, type CategoryRow } from "../db/schema";
import Errors, { HttpCode, Message } from "../libs/Errors";

export interface CategoryInput {
  nameUz: string;
  nameRu?: string | null;
  nameEn?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

class CategoryService {
  constructor(private readonly db: DB) {}

  public async getAll(): Promise<CategoryRow[]> {
    return this.db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameUz)).all();
  }

  public async getById(id: number): Promise<CategoryRow> {
    const category = Number.isSafeInteger(id)
      ? await this.db.select().from(categories).where(eq(categories.id, id)).get()
      : undefined;
    if (!category) throw new Errors(HttpCode.NOT_FOUND, Message.NO_CATEGORY);
    return category;
  }

  /** Product count per category id, for the admin page. */
  public async countProducts(): Promise<Record<number, number>> {
    const rows = await this.db
      .select({ categoryId: products.categoryId, n: count() })
      .from(products)
      .groupBy(products.categoryId)
      .all();
    return Object.fromEntries(rows.map((r) => [r.categoryId, r.n]));
  }

  public async create(input: CategoryInput): Promise<CategoryRow> {
    if (!input.nameUz) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    const [row] = await this.db.insert(categories).values(input).returning();
    return row;
  }

  public async update(id: number, input: CategoryInput): Promise<CategoryRow> {
    await this.getById(id);
    if (!input.nameUz) throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    const [row] = await this.db
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return row;
  }

  /** The database refuses too (ON DELETE RESTRICT); checking first gives a friendly message. */
  public async delete(id: number): Promise<void> {
    await this.getById(id);
    const used = await this.db.select({ id: products.id }).from(products).where(eq(products.categoryId, id)).limit(1).get();
    if (used) throw new Errors(HttpCode.BAD_REQUEST, Message.CATEGORY_HAS_PRODUCTS);
    await this.db.delete(categories).where(eq(categories.id, id));
  }
}

export default CategoryService;
