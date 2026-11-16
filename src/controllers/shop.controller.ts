import { NextFunction, Request, Response } from "express";
import { T } from "../libs/types/common";
import UserService from "../models/User.service";
import CategoryService from "../models/Category.service";
import ProductService from "../models/Product.service";
import PhotoService from "../models/Photo.service";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { validateInitData } from "../libs/telegramAuth";
import { API_PAGE_SIZE, INIT_DATA_MAX_AGE_SECONDS, requireEnv } from "../libs/config";
import { localized } from "../libs/i18n";
import { Language } from "../libs/enums/user.enum";
import { Product } from "../libs/types/product";
import { Category } from "../libs/types/category";
import { User } from "../libs/types/user";

/**
 * JSON API for the Telegram Mini App (the React app in ~/Desktop/telegram-app).
 * Like Burak's SPA side (router.ts), but users are identified by Telegram initData.
 */
const shopController: T = {};
const userService = new UserService();
const categoryService = new CategoryService();
const productService = new ProductService();
const photoService = new PhotoService();

interface ShopRequest extends Request {
  user: User;
}

function sendError(res: Response, err: unknown) {
  if (err instanceof Errors) res.status(err.code).json({ code: err.code, message: err.message });
  else res.status(Errors.standard.code).json(Errors.standard);
}

/** Shapes what the Mini App receives: text already in the user's language. */
function productDto(p: Product, lang: Language) {
  return {
    id: String(p._id),
    categoryId: String(p.categoryId),
    name: localized(p, "name", lang),
    description: localized(p, "description", lang) || null,
    price: p.price,
    status: p.status,
    isSpecial: p.isSpecial,
    photoUrl: p.photoFileId ? `/api/photo/${encodeURIComponent(p.photoFileId)}` : null,
  };
}

function categoryDto(c: Category, lang: Language) {
  return { id: String(c._id), name: localized(c, "name", lang) };
}

function userDto(u: User) {
  return { id: u._id, firstName: u.firstName, username: u.username ?? null, language: u.language, role: u.role };
}

/**
 * Every API call sends `Authorization: tma <initData>`. We check Telegram's signature,
 * then create or refresh the user (someone may open the Mini App without pressing /start).
 */
shopController.verifyTelegram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.get("Authorization") ?? "";
    const initData = header.startsWith("tma ") ? header.slice(4) : "";
    const tgUser = validateInitData(initData, requireEnv("BOT_TOKEN"), INIT_DATA_MAX_AGE_SECONDS);
    if (!tgUser) throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_INIT_DATA);

    const existing = await userService.getUser(tgUser.id);
    (req as ShopRequest).user =
      existing ??
      (
        await userService.upsertFromTelegram({
          telegramId: tgUser.id,
          firstName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "User",
          username: tgUser.username,
        })
      ).user;
    next();
  } catch (err) {
    sendError(res, err);
  }
};

/** GET /api/me */
shopController.getMe = (req: Request, res: Response) => {
  res.json({ user: userDto((req as ShopRequest).user) });
};

/** PATCH /api/me/language  { language: "uz" | "ru" | "en" } */
shopController.setLanguage = async (req: Request, res: Response) => {
  try {
    const language = req.body?.language;
    if (!Object.values(Language).includes(language)) throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    const user = await userService.setLanguage((req as ShopRequest).user._id, language);
    res.json({ user: userDto(user) });
  } catch (err) {
    console.log("Error, setLanguage:", err);
    sendError(res, err);
  }
};

/** GET /api/categories */
shopController.getCategories = async (req: Request, res: Response) => {
  try {
    const lang = (req as ShopRequest).user.language;
    const categories = await categoryService.getAll();
    res.json({ categories: categories.map((c) => categoryDto(c, lang)) });
  } catch (err) {
    console.log("Error, getCategories:", err);
    sendError(res, err);
  }
};

/**
 * GET /api/products?section=general&categoryId=…&page=1
 * GET /api/products?section=special&page=1
 * Same rules as the bot: only visible products; special ones only in the special section.
 */
shopController.getProducts = async (req: Request, res: Response) => {
  try {
    const lang = (req as ShopRequest).user.language;
    const isSpecial = req.query.section === "special";
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const categoryId = !isSpecial && req.query.categoryId ? String(req.query.categoryId) : undefined;

    const { items, total } = await productService.getVisibleProducts({
      isSpecial,
      categoryId,
      page,
      limit: API_PAGE_SIZE,
    });
    res.json({
      products: items.map((p) => productDto(p, lang)),
      page,
      hasMore: page * API_PAGE_SIZE < total,
      total,
    });
  } catch (err) {
    console.log("Error, getProducts:", err);
    sendError(res, err);
  }
};

/** GET /api/products/:id */
shopController.getProduct = async (req: Request, res: Response) => {
  try {
    const product = await productService.getVisibleProduct(req.params.id);
    if (!product) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
    res.json({ product: productDto(product, (req as ShopRequest).user.language) });
  } catch (err) {
    sendError(res, err);
  }
};

/**
 * GET /api/photo/:fileId — public, because <img> tags can't send the Authorization header.
 * Only photos of visible products are served, and the bot token never leaves the server.
 */
shopController.getPhoto = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    if (!(await productService.isPublicPhoto(fileId))) return res.status(404).end();
    const { body, contentType } = await photoService.download(fileId);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(body));
  } catch (err) {
    console.log("Error, getPhoto:", err);
    res.status(404).end();
  }
};

export default shopController;
