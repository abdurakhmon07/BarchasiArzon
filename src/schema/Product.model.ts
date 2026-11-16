import mongoose, { Schema } from "mongoose";
import { ProductStatus } from "../libs/enums/product.enum";
import { Product } from "../libs/types/product";

/**
 * PRODUCTS — the central collection. The general catalog (isSpecial=false)
 * and the special-price section (isSpecial=true) are filtered views of it.
 */
const productSchema = new Schema<Product>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },

    nameUz: { type: String, required: true, trim: true, maxlength: 200 },
    nameRu: { type: String, trim: true, maxlength: 200, default: null },
    nameEn: { type: String, trim: true, maxlength: 200, default: null },

    descriptionUz: { type: String, trim: true, default: null },
    descriptionRu: { type: String, trim: true, default: null },
    descriptionEn: { type: String, trim: true, default: null },

    price: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isSafeInteger, message: "Price must be a whole number of so'm" },
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.IN_STOCK,
      required: true,
    },
    isSpecial: { type: Boolean, default: false, required: true },
    photoFileId: { type: String, maxlength: 255, default: null },
    isVisible: { type: Boolean, default: true, required: true },
    updatedBy: { type: Number, ref: "User", default: null },
  },
  { timestamps: true } // updatedAt = last change
);

// Customer queries: visible products of a category / the special section.
productSchema.index({ isVisible: 1, categoryId: 1, isSpecial: 1, nameUz: 1 });
productSchema.index({ isVisible: 1, isSpecial: 1, updatedAt: -1 });

export default mongoose.model<Product>("Product", productSchema);
