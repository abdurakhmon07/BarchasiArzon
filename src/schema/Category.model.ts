import mongoose, { Schema } from "mongoose";
import { Category } from "../libs/types/category";

/** CATEGORIES — e.g. cleaning supplies, kitchen, bathroom. */
const categorySchema = new Schema<Category>(
  {
    nameUz: { type: String, required: true, trim: true, maxlength: 100 },
    nameRu: { type: String, trim: true, maxlength: 100, default: null },
    nameEn: { type: String, trim: true, maxlength: 100, default: null },
    icon: { type: String, trim: true, maxlength: 16, default: null }, // an emoji, e.g. 🧽 (Mini App + bot buttons)
    sortOrder: { type: Number, default: 0, required: true },
  },
  { timestamps: true }
);

categorySchema.index({ sortOrder: 1, nameUz: 1 });

export default mongoose.model<Category>("Category", categorySchema);
