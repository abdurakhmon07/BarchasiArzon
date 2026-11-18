import mongoose, { Schema, Types } from "mongoose";
import { MAX_CART_QUANTITY } from "../libs/config";

/** CART_ITEMS — from the ER model's planned extensions: (user_id, product_id, quantity). */
export interface CartItem {
  _id: Types.ObjectId;
  userId: number; // Telegram ID
  productId: Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>(
  {
    userId: { type: Number, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_CART_QUANTITY,
      validate: { validator: Number.isInteger, message: "Quantity must be a whole number" },
    },
  },
  { timestamps: true }
);

// One line per user and product.
cartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model<CartItem>("CartItem", cartItemSchema);
