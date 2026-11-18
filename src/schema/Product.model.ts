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
    // Price before the discount; null = no old price. Must be higher than price (checked in the service).
    oldPrice: {
      type: Number,
      default: null,
      min: 0,
      validate: { validator: (v: number | null) => v === null || Number.isSafeInteger(v), message: "Old price must be a whole number" },
    },
    // Kept in the database (not only calculated) so we can sort and filter by it.
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.IN_STOCK,
      required: true,
    },
    isSpecial: { type: Boolean, default: false, required: true },
    photoFileId: { type: String, maxlength: 255, default: null },
    // Extra photos shown in the Mini App gallery (not in the ER model; added as a feature).
    galleryFileIds: { type: [String], default: [] },
    isVisible: { type: Boolean, default: true, required: true },
    updatedBy: { type: Number, ref: "User", default: null },
  },
  { timestamps: true } // updatedAt = last change
);

// Customer queries: visible products of a category / the special section.
productSchema.index({ isVisible: 1, categoryId: 1, isSpecial: 1, nameUz: 1 });
productSchema.index({ isVisible: 1, isSpecial: 1, updatedAt: -1 });
productSchema.index({ isVisible: 1, isSpecial: 1, discountPercent: -1 });

export default mongoose.model<Product>("Product", productSchema);
