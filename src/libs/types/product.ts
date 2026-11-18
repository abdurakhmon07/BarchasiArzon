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
  page?: number;
  limit?: number;
}
