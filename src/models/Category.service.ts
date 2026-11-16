import { isValidObjectId } from "mongoose";
import CategoryModel from "../schema/Category.model";
import ProductModel from "../schema/Product.model";
import { Category, CategoryInput } from "../libs/types/category";
import Errors, { HttpCode, Message } from "../libs/Errors";

class CategoryService {
  private readonly categoryModel;
  private readonly productModel;

  constructor() {
    this.categoryModel = CategoryModel;
    this.productModel = ProductModel;
  }

  public async getAll(): Promise<Category[]> {
    return this.categoryModel.find().sort({ sortOrder: 1, nameUz: 1 }).lean<Category[]>().exec();
  }

  public async getById(id: string): Promise<Category> {
    if (!isValidObjectId(id)) throw new Errors(HttpCode.NOT_FOUND, Message.NO_CATEGORY);
    const category = await this.categoryModel.findById(id).lean<Category>().exec();
    if (!category) throw new Errors(HttpCode.NOT_FOUND, Message.NO_CATEGORY);
    return category;
  }

  /** Product count per category id, for the admin page. */
  public async countProducts(): Promise<Record<string, number>> {
    const rows = await this.productModel.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
  }

  public async create(input: CategoryInput): Promise<Category> {
    try {
      const result = await this.categoryModel.create(input);
      return result.toObject() as Category;
    } catch (err) {
      console.error("Error, model:category create", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async update(id: string, input: CategoryInput): Promise<Category> {
    await this.getById(id);
    const result = await this.categoryModel
      .findByIdAndUpdate(id, input, { new: true, runValidators: true })
      .lean<Category>()
      .exec();
    if (!result) throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    return result;
  }

  /** MongoDB has no foreign keys, so we refuse to delete a category that still has products. */
  public async delete(id: string): Promise<void> {
    await this.getById(id);
    const used = await this.productModel.exists({ categoryId: id });
    if (used) throw new Errors(HttpCode.BAD_REQUEST, Message.CATEGORY_HAS_PRODUCTS);
    await this.categoryModel.findByIdAndDelete(id).exec();
  }
}

export default CategoryService;
