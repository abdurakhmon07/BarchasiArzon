import { Types } from "mongoose";
import { ProductStatus } from "../enums/product.enum";

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
  photoFileId?: string | null; // Telegram file_id
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
}

export interface ProductInquiry {
  categoryId?: string;
  isSpecial?: boolean;
  onlyVisible?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
