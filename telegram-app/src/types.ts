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
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
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

export type Section = "general" | "special" | "favorites";

export type Sort = "name" | "price_asc" | "price_desc" | "newest";

/** Everything that decides which products the list shows. */
export interface ProductFilter {
  section: Section;
  categoryId: string | null;
  q: string;
  sort: Sort | null; // null = the section's default order
  inStock: boolean;
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
}
