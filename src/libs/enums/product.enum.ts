export enum ProductStatus {
  IN_STOCK = "in_stock",
  LOW_STOCK = "low_stock",
  OUT_OF_STOCK = "out_of_stock",
}

/** How the Mini App can order products. */
export enum ProductSort {
  NAME = "name",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  NEWEST = "newest",
  DISCOUNT = "discount", // biggest discount first
}
