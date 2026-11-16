import { Types } from "mongoose";

export interface Category {
  _id: Types.ObjectId;
  nameUz: string;
  nameRu?: string | null;
  nameEn?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryInput {
  nameUz: string;
  nameRu?: string | null;
  nameEn?: string | null;
  sortOrder?: number;
}
