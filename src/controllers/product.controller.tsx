import type { Context } from "hono";
import type { AppEnv } from "../env";
import ProductService from "../services/Product.service";
import CategoryService from "../services/Category.service";
import PhotoService from "../services/Photo.service";
import type { ProductInput } from "../libs/types/product";
import { ProductStatus } from "../libs/enums/product.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { MAX_GALLERY_PHOTOS, MAX_PHOTO_BYTES } from "../libs/config";
import { errorText, flash } from "./admin.controller";
import { ProductFormPage, ProductsPage } from "../views/ProductsPage";

type C = Context<AppEnv>;
type Body = Record<string, string | File | (string | File)[]>;

const IMAGE_TYPES = /^image\/(jpeg|png|webp)$/;
const idParam = (c: C) => Number(c.req.param("id"));

const optionalText = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/** "125 000" / "125,000" → 125000. Anything that isn't a whole number is rejected. */
function parsePrice(v: unknown): number {
  const cleaned = String(v ?? "").replace(/[\s,_']/g, "");
  if (!/^\d+$/.test(cleaned)) throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PRICE);
  return Number(cleaned);
}

/** Uploaded files from a form field (empty file inputs send a nameless 0-byte file: skipped). */
function files(body: Body, field: string): File[] {
  const value = body[field];
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const out = list.filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of out) {
    if (!IMAGE_TYPES.test(f.type) || f.size > MAX_PHOTO_BYTES) throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PHOTO);
  }
  return out;
}

const strings = (v: Body[string] | undefined) =>
  (Array.isArray(v) ? v : v === undefined ? [] : [v]).filter((s): s is string => typeof s === "string");

/**
 * Reads the product form. New photos are uploaded to Telegram (we keep their file_ids).
 * `currentGallery` is the product's gallery before this save (empty for a new product).
 */
async function readInput(c: C, currentGallery: string[] = []): Promise<ProductInput> {
  const b = (await c.req.parseBody({ all: true })) as Body;
  const input: ProductInput = {
    categoryId: Number(b.categoryId),
    // One name/description for every language: the bot and the Mini App fall back to these.
    nameUz: String(b.name ?? "").trim(),
    nameRu: null,
    nameEn: null,
    descriptionUz: optionalText(b.description),
    descriptionRu: null,
    descriptionEn: null,
    price: parsePrice(b.price),
    oldPrice: String(b.oldPrice ?? "").trim() === "" ? null : parsePrice(b.oldPrice),
    status: String(b.status) as ProductStatus,
    isSpecial: b.isSpecial === "on",
    isVisible: b.isVisible === "on",
  };

  // Gallery: keep the photos not ticked "remove", then add the new uploads (checked before uploading).
  const toRemove = strings(b.removeGallery);
  const kept = currentGallery.filter((f) => !toRemove.includes(f));
  const newGallery = files(b, "gallery");
  if (kept.length + newGallery.length > MAX_GALLERY_PHOTOS) throw new Errors(HttpCode.BAD_REQUEST, Message.TOO_MANY_PHOTOS);
  const [main] = files(b, "photo");

  const photos = new PhotoService(c.env);
  const adminChat = c.get("admin").telegramId;
  if (main) input.photoFileId = await photos.upload(main, adminChat);
  else if (b.removePhoto === "on") input.photoFileId = null;

  const uploaded: string[] = [];
  for (const f of newGallery) uploaded.push(await photos.upload(f, adminChat));
  input.galleryFileIds = [...kept, ...uploaded];
  return input;
}

/** Return to the product list with the same filters, but only ever to our own path. */
function backToList(c: C): string {
  try {
    const ref = new URL(c.req.header("Referer") ?? "", "http://local");
    if (ref.pathname === "/admin/products") return ref.pathname + ref.search;
  } catch {
    /* no or bad Referer */
  }
  return "/admin/products";
}

const productController = {
  async getProducts(c: C) {
    try {
      const db = c.get("db");
      const filter = {
        categoryId: c.req.query("category") ?? "",
        search: (c.req.query("q") ?? "").trim(),
        section: c.req.query("section") ?? "",
      };
      const [products, categories] = await Promise.all([
        new ProductService(db).getAllForAdmin({
          categoryId: filter.categoryId ? Number(filter.categoryId) : undefined,
          search: filter.search || undefined,
          isSpecial: filter.section === "special" ? true : filter.section === "general" ? false : undefined,
        }),
        new CategoryService(db).getAll(),
      ]);
      return c.html(<ProductsPage admin={c.get("admin")} flash={c.get("flash")} products={products} categories={categories} filter={filter} />);
    } catch (err) {
      flash(c, "error", errorText(err));
      return c.redirect("/admin");
    }
  },

  async getNewProduct(c: C) {
    const categories = await new CategoryService(c.get("db")).getAll();
    if (!categories.length) {
      flash(c, "error", "Create a category first.");
      return c.redirect("/admin/categories");
    }
    return c.html(
      <ProductFormPage admin={c.get("admin")} flash={c.get("flash")} product={null} categories={categories} maxGallery={MAX_GALLERY_PHOTOS} />
    );
  },

  async createProduct(c: C) {
    try {
      const input = await readInput(c);
      await new ProductService(c.get("db")).create(input, c.get("admin").telegramId);
      flash(c, "success", `"${input.nameUz}" added.`);
      return c.redirect("/admin/products");
    } catch (err) {
      flash(c, "error", errorText(err));
      return c.redirect("/admin/products/new");
    }
  },

  async getEditProduct(c: C) {
    try {
      const db = c.get("db");
      const [product, categories] = await Promise.all([new ProductService(db).getById(idParam(c)), new CategoryService(db).getAll()]);
      return c.html(
        <ProductFormPage admin={c.get("admin")} flash={c.get("flash")} product={product} categories={categories} maxGallery={MAX_GALLERY_PHOTOS} />
      );
    } catch (err) {
      flash(c, "error", errorText(err));
      return c.redirect("/admin/products");
    }
  },

  async updateProduct(c: C) {
    const id = idParam(c);
    try {
      const service = new ProductService(c.get("db"));
      const current = await service.getById(id);
      const input = await readInput(c, current.galleryFileIds);
      await service.update(id, input, c.get("admin").telegramId);
      flash(c, "success", `"${input.nameUz}" saved.`);
      return c.redirect("/admin/products");
    } catch (err) {
      flash(c, "error", errorText(err));
      return c.redirect(`/admin/products/${id}/edit`);
    }
  },

  /** Quick actions from the product list: hide/show, special on/off, stock status. */
  async quickUpdate(c: C) {
    try {
      const id = idParam(c);
      const adminId = c.get("admin").telegramId;
      const service = new ProductService(c.get("db"));
      const { action, value } = (await c.req.parseBody()) as Record<string, string>;
      if (action === "visible") await service.setVisibility(id, value === "true", adminId);
      else if (action === "special") await service.setSpecial(id, value === "true", adminId);
      else if (action === "status") await service.setStatus(id, value as ProductStatus, adminId);
      else throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    } catch (err) {
      flash(c, "error", errorText(err));
    }
    return c.redirect(backToList(c));
  },

  async deleteProduct(c: C) {
    try {
      await new ProductService(c.get("db")).delete(idParam(c));
      flash(c, "success", "Product deleted.");
    } catch (err) {
      flash(c, "error", errorText(err));
    }
    return c.redirect("/admin/products");
  },
};

export default productController;
