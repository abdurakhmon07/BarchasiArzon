import { isValidObjectId, Types } from "mongoose";
import ProductModel from "../schema/Product.model";
import CategoryModel from "../schema/Category.model";
import FavoriteModel from "../schema/Favorite.model";
import CartItemModel from "../schema/CartItem.model";
import { Product, ProductInput, ProductInquiry } from "../libs/types/product";
import { ProductSort, ProductStatus } from "../libs/enums/product.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** _id as a tie-breaker keeps page 2 from repeating or skipping products with equal values. */
const SORTS: Record<ProductSort, Record<string, 1 | -1>> = {
  [ProductSort.NAME]: { nameUz: 1, _id: 1 },
  [ProductSort.PRICE_ASC]: { price: 1, _id: 1 },
  [ProductSort.PRICE_DESC]: { price: -1, _id: 1 },
  [ProductSort.NEWEST]: { createdAt: -1, _id: -1 },
};

class ProductService {
  private readonly productModel;
  private readonly categoryModel;

  constructor() {
    this.productModel = ProductModel;
    this.categoryModel = CategoryModel;
  }

  /** CUSTOMER (bot) — only visible products **/

  /**
   * General catalog: visible, non-special products of one category.
   * Special section: visible products with isSpecial = true.
   * Optional: search by name (any language), hide out-of-stock, sort.
   */
  public async getVisibleProducts(inquiry: ProductInquiry): Promise<{ items: Product[]; total: number }> {
    const match: T = { isVisible: true, isSpecial: Boolean(inquiry.isSpecial) };
    if (inquiry.categoryId) {
      if (!isValidObjectId(inquiry.categoryId)) return { items: [], total: 0 };
      match.categoryId = new Types.ObjectId(inquiry.categoryId);
    }
    if (inquiry.search) {
      const rx = new RegExp(escapeRegex(inquiry.search), "i");
      match.$or = [{ nameUz: rx }, { nameRu: rx }, { nameEn: rx }];
    }
    if (inquiry.inStockOnly) match.status = { $ne: ProductStatus.OUT_OF_STOCK };

    const defaultSort = inquiry.isSpecial ? { updatedAt: -1 as const, _id: 1 as const } : SORTS[ProductSort.NAME];

    const limit = inquiry.limit ?? 10;
    const page = Math.max(1, inquiry.page ?? 1);
    const [items, total] = await Promise.all([
      this.productModel
        .find(match)
        .sort(inquiry.sort ? SORTS[inquiry.sort] : defaultSort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Product[]>()
        .exec(),
      this.productModel.countDocuments(match).exec(),
    ]);
    return { items, total };
  }

  public async getVisibleProduct(id: string): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel.findOne({ _id: id, isVisible: true }).lean<Product>().exec();
  }

  /** Visible products by id, in the order given (for "recently viewed"). Unknown or hidden ids are skipped. */
  public async getVisibleByIds(ids: string[]): Promise<Product[]> {
    const valid = ids.filter((id) => isValidObjectId(id));
    if (!valid.length) return [];
    const found = await this.productModel
      .find({ _id: { $in: valid }, isVisible: true })
      .lean<Product[]>()
      .exec();
    const byId = new Map(found.map((p) => [String(p._id), p]));
    return valid.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }

  /** A photo may be shown publicly only if a visible product uses it (main or gallery). */
  public async isPublicPhoto(fileId: string): Promise<boolean> {
    return Boolean(
      await this.productModel.exists({
        isVisible: true,
        $or: [{ photoFileId: fileId }, { galleryFileIds: fileId }],
      })
    );
  }

  /** ADMIN — all products, including hidden ones **/

  public async getAllForAdmin(inquiry: ProductInquiry): Promise<Product[]> {
    const match: T = {};
    if (inquiry.categoryId && isValidObjectId(inquiry.categoryId)) match.categoryId = inquiry.categoryId;
    if (inquiry.isSpecial !== undefined) match.isSpecial = inquiry.isSpecial;
    if (inquiry.search) {
      const rx = new RegExp(escapeRegex(inquiry.search), "i");
      match.$or = [{ nameUz: rx }, { nameRu: rx }, { nameEn: rx }];
    }
    return this.productModel
      .find(match)
      .populate("categoryId", "nameUz")
      .sort({ updatedAt: -1 })
      .lean<Product[]>()
      .exec();
  }

  public async getById(id: string): Promise<Product> {
    if (!isValidObjectId(id)) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    const product = await this.productModel.findById(id).lean<Product>().exec();
    if (!product) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    return product;
  }

  public async create(input: ProductInput, adminId: number): Promise<Product> {
    await this.checkInput(input);
    try {
      const result = await this.productModel.create({ ...input, updatedBy: adminId });
      return result.toObject() as Product;
    } catch (err) {
      console.error("Error, model:product create", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async update(id: string, input: Partial<ProductInput>, adminId: number): Promise<Product> {
    await this.getById(id);
    await this.checkInput(input);
    const result = await this.productModel
      .findByIdAndUpdate(id, { ...input, updatedBy: adminId }, { new: true, runValidators: true })
      .lean<Product>()
      .exec();
    if (!result) throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    return result;
  }

  public async setVisibility(id: string, isVisible: boolean, adminId: number) {
    return this.update(id, { isVisible }, adminId);
  }

  public async setSpecial(id: string, isSpecial: boolean, adminId: number) {
    return this.update(id, { isSpecial }, adminId);
  }

  public async setStatus(id: string, status: ProductStatus, adminId: number) {
    return this.update(id, { status }, adminId);
  }

  /** The ER model prefers hiding; hard delete is kept for mistakes (e.g. a duplicate entry). */
  public async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.productModel.findByIdAndDelete(id).exec();
    // No foreign keys in MongoDB: remove the deleted product from everyone's favorites and carts.
    await Promise.all([
      FavoriteModel.deleteMany({ productId: id }).exec(),
      CartItemModel.deleteMany({ productId: id }).exec(),
    ]);
  }

  /** MongoDB has no foreign keys, so check the category exists and the price is valid here. */
  private async checkInput(input: Partial<ProductInput>): Promise<void> {
    if (input.price !== undefined && (!Number.isSafeInteger(input.price) || input.price < 0)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PRICE);
    }
    if (input.status !== undefined && !Object.values(ProductStatus).includes(input.status)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    if (input.categoryId !== undefined) {
      const ok = isValidObjectId(input.categoryId) && (await this.categoryModel.exists({ _id: input.categoryId }));
      if (!ok) throw new Errors(HttpCode.BAD_REQUEST, Message.NO_CATEGORY);
    }
  }
}

export default ProductService;
