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
  photoUrl: string | null;
}

export interface ProductPage {
  products: Product[];
  page: number;
  hasMore: boolean;
  total: number;
}

export type Section = "general" | "special";
