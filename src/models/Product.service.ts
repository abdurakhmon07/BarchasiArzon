import { isValidObjectId, Types } from "mongoose";
import ProductModel from "../schema/Product.model";
import CategoryModel from "../schema/Category.model";
import { Product, ProductInput, ProductInquiry } from "../libs/types/product";
import { ProductStatus } from "../libs/enums/product.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";

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
   */
  public async getVisibleProducts(inquiry: ProductInquiry): Promise<{ items: Product[]; total: number }> {
    const match: T = { isVisible: true, isSpecial: Boolean(inquiry.isSpecial) };
    if (inquiry.categoryId) {
      if (!isValidObjectId(inquiry.categoryId)) return { items: [], total: 0 };
      match.categoryId = new Types.ObjectId(inquiry.categoryId);
    }

    const limit = inquiry.limit ?? 10;
    const page = Math.max(1, inquiry.page ?? 1);
    const [items, total] = await Promise.all([
      this.productModel
        .find(match)
        .sort(inquiry.isSpecial ? { updatedAt: -1 } : { nameUz: 1 })
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

  /** A photo may be shown publicly only if a visible product uses it. */
  public async isPublicPhoto(fileId: string): Promise<boolean> {
    return Boolean(await this.productModel.exists({ photoFileId: fileId, isVisible: true }));
  }

  /** ADMIN — all products, including hidden ones **/

  public async getAllForAdmin(inquiry: ProductInquiry): Promise<Product[]> {
    const match: T = {};
    if (inquiry.categoryId && isValidObjectId(inquiry.categoryId)) match.categoryId = inquiry.categoryId;
    if (inquiry.isSpecial !== undefined) match.isSpecial = inquiry.isSpecial;
    if (inquiry.search) {
      const rx = new RegExp(inquiry.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
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
