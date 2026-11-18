import { Request, Response } from "express";
import { T } from "../libs/types/common";
import ProductService from "../models/Product.service";
import CategoryService from "../models/Category.service";
import PhotoService from "../models/Photo.service";
import { ProductInput } from "../libs/types/product";
import { ProductStatus } from "../libs/enums/product.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { errorText, flash } from "./admin.controller";
import { MAX_GALLERY_PHOTOS } from "../libs/config";

const productController: T = {};
const productService = new ProductService();
const categoryService = new CategoryService();
const photoService = new PhotoService();

const optionalText = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** "125 000" / "125,000" -> 125000. Anything that isn't a whole number is rejected. */
function parsePrice(v: unknown): number {
  const cleaned = String(v ?? "").replace(/[\s,_']/g, "");
  if (!/^\d+$/.test(cleaned)) throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PRICE);
  return Number(cleaned);
}

type UploadedFiles = Partial<Record<"photo" | "gallery", Express.Multer.File[]>>;

/**
 * Reads the product form. New photos are uploaded to Telegram (we keep their file_ids).
 * `currentGallery` is the product's gallery before this save (empty for a new product).
 */
async function readInput(req: Request, currentGallery: string[] = []): Promise<ProductInput> {
  const b = req.body;
  const input: ProductInput = {
    categoryId: String(b.categoryId ?? ""),
    // One name/description for every language: the bot falls back to these.
    nameUz: String(b.name ?? "").trim(),
    nameRu: null,
    nameEn: null,
    descriptionUz: optionalText(b.description),
    descriptionRu: null,
    descriptionEn: null,
    price: parsePrice(b.price),
    status: b.status as ProductStatus,
    isSpecial: b.isSpecial === "on",
    isVisible: b.isVisible === "on",
  };
  const files = (req.files ?? {}) as UploadedFiles;
  const adminChat = req.session.user!._id;

  // Gallery: keep the photos not ticked "remove", then add the new uploads (checked before uploading).
  const toRemove: string[] = ([] as string[]).concat(b.removeGallery ?? []);
  const kept = currentGallery.filter((f) => !toRemove.includes(f));
  const newGallery = files.gallery ?? [];
  if (kept.length + newGallery.length > MAX_GALLERY_PHOTOS) {
    throw new Errors(HttpCode.BAD_REQUEST, Message.TOO_MANY_PHOTOS);
  }

  const main = files.photo?.[0];
  if (main) {
    input.photoFileId = await photoService.upload(main.buffer, main.originalname, adminChat);
  } else if (b.removePhoto === "on") {
    input.photoFileId = null;
  }

  const uploaded: string[] = [];
  for (const f of newGallery) uploaded.push(await photoService.upload(f.buffer, f.originalname, adminChat));
  input.galleryFileIds = [...kept, ...uploaded];
  return input;
}

productController.getProducts = async (req: Request, res: Response) => {
  try {
    console.log("getProducts");
    const filter = {
      categoryId: String(req.query.category ?? ""),
      search: String(req.query.q ?? "").trim(),
      section: String(req.query.section ?? ""),
    };
    const [products, categories] = await Promise.all([
      productService.getAllForAdmin({
        categoryId: filter.categoryId || undefined,
        search: filter.search || undefined,
        isSpecial: filter.section === "special" ? true : filter.section === "general" ? false : undefined,
      }),
      categoryService.getAll(),
    ]);
    res.render("products/list", { products, categories, filter, statuses: Object.values(ProductStatus) });
  } catch (err) {
    console.log("Error, getProducts:", err);
    flash(req, "error", errorText(err));
    res.redirect("/admin");
  }
};

productController.getNewProduct = async (req: Request, res: Response) => {
  try {
    const categories = await categoryService.getAll();
    if (!categories.length) {
      flash(req, "error", "Create a category first.");
      return res.redirect("/admin/categories");
    }
    res.render("products/form", { product: null, categories, statuses: Object.values(ProductStatus) });
  } catch (err) {
    console.log("Error, getNewProduct:", err);
    flash(req, "error", errorText(err));
    res.redirect("/admin/products");
  }
};

productController.createProduct = async (req: Request, res: Response) => {
  try {
    console.log("createProduct");
    const input = await readInput(req);
    await productService.create(input, req.session.user!._id);
    flash(req, "success", `"${input.nameUz}" added.`);
    res.redirect("/admin/products");
  } catch (err) {
    console.log("Error, createProduct:", err);
    flash(req, "error", errorText(err));
    res.redirect("/admin/products/new");
  }
};

productController.getEditProduct = async (req: Request, res: Response) => {
  try {
    const [product, categories] = await Promise.all([
      productService.getById(req.params.id),
      categoryService.getAll(),
    ]);
    res.render("products/form", { product, categories, statuses: Object.values(ProductStatus) });
  } catch (err) {
    console.log("Error, getEditProduct:", err);
    flash(req, "error", errorText(err));
    res.redirect("/admin/products");
  }
};

productController.updateProduct = async (req: Request, res: Response) => {
  try {
    console.log("updateProduct");
    const current = await productService.getById(req.params.id);
    const input = await readInput(req, current.galleryFileIds ?? []);
    await productService.update(req.params.id, input, req.session.user!._id);
    flash(req, "success", `"${input.nameUz}" saved.`);
    res.redirect("/admin/products");
  } catch (err) {
    console.log("Error, updateProduct:", err);
    flash(req, "error", errorText(err));
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
};

/** Quick actions from the product list: hide/show, special on/off, stock status. */
productController.quickUpdate = async (req: Request, res: Response) => {
  try {
    console.log("quickUpdate");
    const { id } = req.params;
    const adminId = req.session.user!._id;
    const { action, value } = req.body;

    if (action === "visible") await productService.setVisibility(id, value === "true", adminId);
    else if (action === "special") await productService.setSpecial(id, value === "true", adminId);
    else if (action === "status") await productService.setStatus(id, value as ProductStatus, adminId);
    else throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
  } catch (err) {
    console.log("Error, quickUpdate:", err);
    flash(req, "error", errorText(err));
  }
  res.redirect(backToList(req));
};

/** Return to the product list with the same filters, but only ever to our own path. */
function backToList(req: Request): string {
  try {
    const ref = new URL(req.get("Referer") ?? "", "http://local");
    if (ref.pathname === "/admin/products") return ref.pathname + ref.search;
  } catch {}
  return "/admin/products";
}

productController.deleteProduct = async (req: Request, res: Response) => {
  try {
    console.log("deleteProduct");
    await productService.delete(req.params.id);
    flash(req, "success", "Product deleted.");
  } catch (err) {
    console.log("Error, deleteProduct:", err);
    flash(req, "error", errorText(err));
  }
  res.redirect("/admin/products");
};

export default productController;
