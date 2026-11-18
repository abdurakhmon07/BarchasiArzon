import { and, asc, eq } from "drizzle-orm";
import type { DB } from "../db";
import { cartItems, products, type ProductRow } from "../db/schema";
import type { CartLine, CartSummary } from "../libs/types/cart";
import { ProductStatus } from "../libs/enums/product.enum";
import { MAX_CART_QUANTITY } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";

/** A product can be bought when it is visible and not out of stock. */
const isAvailable = (p: ProductRow) => p.isVisible && p.status !== ProductStatus.OUT_OF_STOCK;

class CartService {
  constructor(private readonly db: DB) {}

  /**
   * The cart with the products' CURRENT prices. The total only counts available products;
   * unavailable ones stay in the cart (marked) so the user sees what happened.
   * Deleted products are gone automatically (ON DELETE CASCADE).
   */
  public async getCart(userId: number): Promise<CartSummary> {
    const rows = await this.db
      .select({ quantity: cartItems.quantity, product: products })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(eq(cartItems.userId, userId))
      .orderBy(asc(cartItems.createdAt))
      .all();

    const lines: CartLine[] = rows.map(({ quantity, product }) => {
      const available = isAvailable(product);
      return {
        product: { ...product, galleryFileIds: [] },
        quantity,
        available,
        lineTotal: available ? product.price * quantity : 0,
      };
    });

    const counted = lines.filter((l) => l.available);
    return {
      lines,
      totalQuantity: counted.reduce((sum, l) => sum + l.quantity, 0),
      totalAmount: counted.reduce((sum, l) => sum + l.lineTotal, 0),
      totalSaving: counted.reduce((sum, l) => {
        const { oldPrice, price } = l.product;
        return sum + (oldPrice && oldPrice > price ? (oldPrice - price) * l.quantity : 0);
      }, 0),
    };
  }

  /**
   * Sets how many of a product are in the cart. 0 removes the line.
   * Raising the amount (or adding) needs the product to be available; lowering or removing is always allowed.
   */
  public async setQuantity(userId: number, productId: number, quantity: number): Promise<CartSummary> {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_CART_QUANTITY) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_QUANTITY);
    }
    if (!Number.isSafeInteger(productId)) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    const line = and(eq(cartItems.userId, userId), eq(cartItems.productId, productId));

    if (quantity === 0) {
      await this.db.delete(cartItems).where(line);
      return this.getCart(userId);
    }

    const [product, current] = await Promise.all([
      this.db.select().from(products).where(eq(products.id, productId)).get(),
      this.db.select().from(cartItems).where(line).get(),
    ]);
    if (!product) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);

    const raising = quantity > (current?.quantity ?? 0);
    if (raising && !isAvailable(product)) throw new Errors(HttpCode.CONFLICT, Message.PRODUCT_UNAVAILABLE);

    await this.db
      .insert(cartItems)
      .values({ userId, productId, quantity })
      .onConflictDoUpdate({ target: [cartItems.userId, cartItems.productId], set: { quantity, updatedAt: new Date() } });
    return this.getCart(userId);
  }

  public async clear(userId: number): Promise<CartSummary> {
    await this.db.delete(cartItems).where(eq(cartItems.userId, userId));
    return this.getCart(userId);
  }
}

export default CartService;
