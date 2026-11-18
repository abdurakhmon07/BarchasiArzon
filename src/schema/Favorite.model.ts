import mongoose, { Schema, Types } from "mongoose";

/** FAVORITES — products a user marked with ❤️ (not in the ER model; added as a feature). */
export interface Favorite {
  _id: Types.ObjectId;
  userId: number; // Telegram ID
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<Favorite>(
  {
    userId: { type: Number, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: true }
);

// One record per user and product; also makes "my favorites, newest first" fast.
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<Favorite>("Favorite", favoriteSchema);
