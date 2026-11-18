import type { ProductRow } from "../../db/schema";
import type { ProductSort, ProductStatus } from "../enums/product.enum";

/** A product row plus its gallery (product_photos), in order. */
export type Product = ProductRow & { galleryFileIds: string[] };

/** What the admin form sends (one name/description; translations stay empty). */
export interface ProductInput {
  categoryId: number;
  nameUz: string;
  nameRu?: string | null;
  nameEn?: string | null;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  oldPrice?: number | null;
  status?: ProductStatus;
  isSpecial?: boolean;
  isVisible?: boolean;
  photoFileId?: string | null;
  galleryFileIds?: string[];
}

export interface ProductInquiry {
  categoryId?: number;
  isSpecial?: boolean; // undefined = both sections
  search?: string;
  sort?: ProductSort;
  inStockOnly?: boolean;
  minDiscount?: number;
  page?: number;
  limit?: number;
}

/** What the Mini App's home screen needs about deals. */
export interface DealsSummary {
  dealCount: number;
  maxDiscount: number;
  totalSaving: number;
  topDeals: Product[];
  dealsByCategory: Record<number, number>;
}
