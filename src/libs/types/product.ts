import { Types } from "mongoose";
import { ProductSort, ProductStatus } from "../enums/product.enum";

export interface Product {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  nameUz: string;
  nameRu?: string | null;
  nameEn?: string | null;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number; // whole so'm
  oldPrice?: number | null; // price before the discount ("eski narx"); shown crossed out
  discountPercent: number; // calculated from oldPrice and price when saving; 0 = no discount
  status: ProductStatus;
  isSpecial: boolean;
  photoFileId?: string | null; // Telegram file_id (main photo)
  galleryFileIds: string[]; // extra photos, Telegram file_ids
  isVisible: boolean;
  updatedBy?: number | null; // admin's Telegram ID
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInput {
  categoryId: string;
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
  categoryId?: string;
  isSpecial?: boolean;
  onlyVisible?: boolean;
  search?: string;
  sort?: ProductSort;
  inStockOnly?: boolean;
  minDiscount?: number; // e.g. 30 = only products at least 30% off
  page?: number;
  limit?: number;
}

/** What the Mini App's home screen needs about deals. */
export interface DealsSummary {
  dealCount: number; // visible special-price products
  maxDiscount: number; // biggest discount %, 0 if none
  totalSaving: number; // so'm saved by buying one of every available deal
  topDeals: Product[]; // available deals, biggest discount first
  dealsByCategory: Record<string, number>; // categoryId -> number of deals
}
