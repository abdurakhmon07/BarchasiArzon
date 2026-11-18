import { isValidObjectId } from "mongoose";
import FavoriteModel from "../schema/Favorite.model";
import ProductModel from "../schema/Product.model";
import { Product } from "../libs/types/product";
import Errors, { HttpCode, Message } from "../libs/Errors";

class FavoriteService {
  private readonly favoriteModel;
  private readonly productModel;

  constructor() {
    this.favoriteModel = FavoriteModel;
    this.productModel = ProductModel;
  }

  /**
   * The user's favorite products, newest first. Hidden products are left out
   * (not deleted), so they come back if an admin makes them visible again.
   */
  public async getProducts(userId: number): Promise<Product[]> {
    const favorites = await this.favoriteModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    const ids = favorites.map((f) => f.productId);
    const products = await this.productModel
      .find({ _id: { $in: ids }, isVisible: true })
      .lean<Product[]>()
      .exec();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    return ids.map((id) => byId.get(String(id))).filter((p): p is Product => Boolean(p));
  }

  /** Adding twice is fine (nothing changes). Only visible products can be added. */
  public async add(userId: number, productId: string): Promise<void> {
    const visible = isValidObjectId(productId) && (await this.productModel.exists({ _id: productId, isVisible: true }));
    if (!visible) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    await this.favoriteModel
      .updateOne({ userId, productId }, { $setOnInsert: { userId, productId } }, { upsert: true })
      .exec();
  }

  public async remove(userId: number, productId: string): Promise<void> {
    if (!isValidObjectId(productId)) return;
    await this.favoriteModel.deleteOne({ userId, productId }).exec();
  }
}

export default FavoriteService;
