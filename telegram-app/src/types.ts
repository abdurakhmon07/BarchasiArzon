export type Language = "uz" | "ru" | "en";
export type ProductStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface User {
  id: number;
  firstName: string;
  username: string | null;
  language: Language;
  role: "customer" | "admin";
}

export interface Category {
  id: string;
  name: string;
  icon: string | null; // emoji set by the admin
  dealCount: number; // special-price products in this category
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  oldPrice: number | null; // price before discount (only when there is a discount)
  discountPercent: number; // 0 = no discount
  saving: number; // oldPrice − price, so'm
  status: ProductStatus;
  isSpecial: boolean;
  photoUrl: string | null; // main photo
  photos: string[]; // main + gallery
}

export interface ProductPage {
  products: Product[];
  page: number;
  hasMore: boolean;
  total: number;
}

/** Which products a list shows: catalog, deals (Aksiyalar), or both (home search). */
export type Section = "general" | "special" | "all";

/** Bottom navigation tabs. */
export type Tab = "home" | "catalog" | "deals" | "favorites" | "cart";

export type Sort = "name" | "price_asc" | "price_desc" | "newest" | "discount";

/** Everything that decides which products the list shows. */
export interface ProductFilter {
  section: Section;
  categoryId: string | null;
  q: string;
  sort: Sort | null; // null = the section's default order
  inStock: boolean;
  minDiscount: number; // 0 = any
}

/** GET /api/home */
export interface Home {
  dealCount: number;
  maxDiscount: number;
  totalSaving: number;
  topDeals: Product[];
}

export interface CartLine {
  product: Product;
  quantity: number;
  available: boolean; // false = now out of stock or hidden: kept, but not counted
  lineTotal: number;
}

export interface Cart {
  lines: CartLine[];
  totalQuantity: number;
  totalAmount: number; // so'm, at current prices
  totalSaving: number; // so'm saved thanks to discounts
  totalRegular: number; // what it would cost at old prices
}
