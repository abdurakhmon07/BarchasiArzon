import { initData } from "./telegram";
import type { Category, Language, Product, ProductFilter, ProductPage, User } from "./types";

/** Empty in development: Vite forwards /api to the backend. */
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: {
      // The backend checks Telegram's signature on this to know who the user is.
      Authorization: `tma ${initData}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message ?? `Request failed (${res.status})`);
  return data as T;
}

/** Turns "/api/photo/…" from the backend into a full URL. */
export function photoSrc(photoUrl: string | null): string | null {
  return photoUrl ? API_URL + photoUrl : null;
}

export const api = {
  me: () => request<{ user: User; botUsername: string | null }>("/api/me"),

  setLanguage: (language: Language) =>
    request<{ user: User }>("/api/me/language", { method: "PATCH", body: JSON.stringify({ language }) }).then(
      (r) => r.user
    ),

  categories: () => request<{ categories: Category[] }>("/api/categories").then((r) => r.categories),

  products: (filter: ProductFilter, page: number) => {
    const q = new URLSearchParams({ section: filter.section, page: String(page) });
    if (filter.categoryId) q.set("categoryId", filter.categoryId);
    if (filter.q) q.set("q", filter.q);
    if (filter.sort) q.set("sort", filter.sort);
    if (filter.inStock) q.set("inStock", "1");
    return request<ProductPage>(`/api/products?${q}`);
  },

  /** Products by id, in the same order (hidden or deleted ones are skipped). */
  productsByIds: (ids: string[]) =>
    ids.length
      ? request<ProductPage>(`/api/products?ids=${ids.join(",")}`).then((r) => r.products)
      : Promise.resolve([] as Product[]),

  product: (id: string) => request<{ product: Product }>(`/api/products/${id}`).then((r) => r.product),
};
