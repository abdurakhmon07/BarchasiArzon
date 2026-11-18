import { isValidObjectId } from "mongoose";
import CartItemModel from "../schema/CartItem.model";
import ProductModel from "../schema/Product.model";
import { Product } from "../libs/types/product";
import { CartLine, CartSummary } from "../libs/types/cart";
import { ProductStatus } from "../libs/enums/product.enum";
import { MAX_CART_QUANTITY } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";

/** A product can be bought when it is visible and not out of stock. */
const isAvailable = (p: Product) => p.isVisible && p.status !== ProductStatus.OUT_OF_STOCK;

class CartService {
  private readonly cartItemModel;
  private readonly productModel;

  constructor() {
    this.cartItemModel = CartItemModel;
    this.productModel = ProductModel;
  }

  /**
   * The cart with the products' CURRENT prices. The total only counts available products;
   * unavailable ones stay in the cart (marked) so the user sees what happened.
   */
  public async getCart(userId: number): Promise<CartSummary> {
    const items = await this.cartItemModel.find({ userId }).sort({ createdAt: 1 }).lean().exec();
    const products = await this.productModel
      .find({ _id: { $in: items.map((i) => i.productId) } })
      .lean<Product[]>()
      .exec();
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const lines: CartLine[] = [];
    for (const item of items) {
      const product = byId.get(String(item.productId));
      if (!product) continue; // deleted by an admin
      // A hidden product can't be shown to customers at all, so it is reported as unavailable too.
      const available = isAvailable(product);
      lines.push({ product, quantity: item.quantity, available, lineTotal: available ? product.price * item.quantity : 0 });
    }

    const counted = lines.filter((l) => l.available);
    return {
      lines,
      totalQuantity: counted.reduce((sum, l) => sum + l.quantity, 0),
      totalAmount: counted.reduce((sum, l) => sum + l.lineTotal, 0),
    };
  }

  /**
   * Sets how many of a product are in the cart. 0 removes the line.
   * Raising the amount (or adding) needs the product to be available; lowering or removing is always allowed.
   */
  public async setQuantity(userId: number, productId: string, quantity: number): Promise<CartSummary> {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_CART_QUANTITY) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_QUANTITY);
    }
    if (!isValidObjectId(productId)) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);

    if (quantity === 0) {
      await this.cartItemModel.deleteOne({ userId, productId }).exec();
      return this.getCart(userId);
    }

    const [product, current] = await Promise.all([
      this.productModel.findById(productId).lean<Product>().exec(),
      this.cartItemModel.findOne({ userId, productId }).lean().exec(),
    ]);
    if (!product) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);

    const raising = quantity > (current?.quantity ?? 0);
    if (raising && !isAvailable(product)) throw new Errors(HttpCode.CONFLICT, Message.PRODUCT_UNAVAILABLE);

    await this.cartItemModel
      .updateOne({ userId, productId }, { $set: { quantity } }, { upsert: true, runValidators: true })
      .exec();
    return this.getCart(userId);
  }

  public async clear(userId: number): Promise<CartSummary> {
    await this.cartItemModel.deleteMany({ userId }).exec();
    return this.getCart(userId);
  }
}

export default CartService;
