import type { Product } from "./product";

/** One cart line, with the product's current data. */
export interface CartLine {
  product: Product;
  quantity: number;
  /** false when the product is now out of stock or hidden: kept in the cart but not counted. */
  available: boolean;
  /** price × quantity, or 0 when not available. */
  lineTotal: number;
}

export interface CartSummary {
  lines: CartLine[];
  totalQuantity: number; // pieces of available products
  totalAmount: number; // so'm, available products only, at current prices
  totalSaving: number; // so'm saved thanks to discounts (old price − price), available products only
}
