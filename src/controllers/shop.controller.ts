import type { Context, Next } from "hono";
import type { AppEnv } from "../env";
import type { CategoryRow, UserRow } from "../db/schema";
import UserService from "../services/User.service";
import CategoryService from "../services/Category.service";
import ProductService from "../services/Product.service";
import FavoriteService from "../services/Favorite.service";
import CartService from "../services/Cart.service";
import PhotoService from "../services/Photo.service";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { validateInitData } from "../libs/telegramAuth";
import { adminIds, API_PAGE_SIZE, INIT_DATA_MAX_AGE_SECONDS } from "../libs/config";
import { localized } from "../libs/i18n";
import { botUsername } from "../libs/telegram";
import { Language } from "../libs/enums/user.enum";
import { ProductSort } from "../libs/enums/product.enum";
import type { Product } from "../libs/types/product";
import type { CartSummary } from "../libs/types/cart";

/**
 * JSON API for the Telegram Mini App (telegram-app/). Users are identified by Telegram's
 * signed initData, sent as `Authorization: tma <initData>` on every request.
 */
type C = Context<AppEnv>;

export function sendError(c: C, err: unknown) {
  if (err instanceof Errors) return c.json({ code: err.code, message: err.message }, err.code as 400);
  console.error("Error, api:", err);
  return c.json(Errors.standard, 500);
}

const photoUrl = (fileId: string) => `/api/photo/${encodeURIComponent(fileId)}`;

/** Shapes what the Mini App receives: text already in the user's language, ids as strings. */
function productDto(p: Product, lang: Language) {
  const photos = [p.photoFileId, ...p.galleryFileIds].filter((f): f is string => Boolean(f));
  return {
    id: String(p.id),
    categoryId: String(p.categoryId),
    name: localized(p, "name", lang),
    description: localized(p, "description", lang) || null,
    price: p.price,
    // Old price and savings only when there really is a discount.
    oldPrice: p.discountPercent > 0 ? (p.oldPrice ?? null) : null,
    discountPercent: p.discountPercent,
    saving: p.discountPercent > 0 && p.oldPrice ? p.oldPrice - p.price : 0,
    status: p.status,
    isSpecial: p.isSpecial,
    photoUrl: photos.length ? photoUrl(photos[0]) : null,
    photos: photos.map(photoUrl),
  };
}

function categoryDto(c: CategoryRow, lang: Language, dealCount = 0) {
  return { id: String(c.id), name: localized(c, "name", lang), icon: c.icon ?? null, dealCount };
}

function userDto(u: UserRow) {
  return { id: u.telegramId, firstName: u.firstName, username: u.username ?? null, language: u.language, role: u.role };
}

function cartDto(cart: CartSummary, lang: Language) {
  return {
    lines: cart.lines.map((l) => ({
      product: productDto(l.product, lang),
      quantity: l.quantity,
      available: l.available,
      lineTotal: l.lineTotal,
    })),
    totalQuantity: cart.totalQuantity,
    totalAmount: cart.totalAmount,
    totalSaving: cart.totalSaving,
    totalRegular: cart.totalAmount + cart.totalSaving, // what it would cost without discounts
  };
}

const lang = (c: C) => c.get("user").language as Language;
const userId = (c: C) => c.get("user").telegramId;
const idParam = (c: C) => Number(c.req.param("id"));

const shopController = {
  /**
   * Every API call sends `Authorization: tma <initData>`. We check Telegram's signature,
   * then create the user if they opened the Mini App without pressing /start.
   */
  async verifyTelegram(c: C, next: Next) {
    try {
      const header = c.req.header("Authorization") ?? "";
      const initData = header.startsWith("tma ") ? header.slice(4) : "";
      const tgUser = await validateInitData(initData, c.env.BOT_TOKEN, INIT_DATA_MAX_AGE_SECONDS);
      if (!tgUser) throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_INIT_DATA);

      const users = new UserService(c.get("db"));
      const user =
        (await users.getUser(tgUser.id)) ??
        (
          await users.upsertFromTelegram(
            {
              telegramId: tgUser.id,
              firstName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
              username: tgUser.username,
            },
            adminIds(c.env)
          )
        ).user;
      c.set("user", user);
      await next();
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** GET /api/me */
  async getMe(c: C) {
    return c.json({ user: userDto(c.get("user")), botUsername: await botUsername(c.env) });
  },

  /** PATCH /api/me/language  { language: "uz" | "ru" | "en" } */
  async setLanguage(c: C) {
    try {
      const body = await c.req.json().catch(() => ({}));
      const user = await new UserService(c.get("db")).setLanguage(userId(c), body?.language);
      return c.json({ user: userDto(user) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** GET /api/categories — with icon and number of deals */
  async getCategories(c: C) {
    try {
      const db = c.get("db");
      const [categories, deals] = await Promise.all([
        new CategoryService(db).getAll(),
        new ProductService(db).getDealsSummary(0),
      ]);
      return c.json({ categories: categories.map((cat) => categoryDto(cat, lang(c), deals.dealsByCategory[cat.id] ?? 0)) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** GET /api/home — top deals, how many, biggest %, and the total you could save */
  async getHome(c: C) {
    try {
      const deals = await new ProductService(c.get("db")).getDealsSummary(10);
      return c.json({
        dealCount: deals.dealCount,
        maxDiscount: deals.maxDiscount,
        totalSaving: deals.totalSaving,
        topDeals: deals.topDeals.map((p) => productDto(p, lang(c))),
      });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /**
   * GET /api/products?section=general|special|all&categoryId=…&q=…&sort=…&inStock=1&minDiscount=30&page=1
   * GET /api/products?ids=3,1,7   (recently viewed: those products, in that order)
   */
  async getProducts(c: C) {
    try {
      const service = new ProductService(c.get("db"));
      const q = c.req.query();

      if (q.ids !== undefined) {
        const ids = q.ids.split(",").filter(Boolean).slice(0, API_PAGE_SIZE).map(Number);
        const items = await service.getVisibleByIds(ids);
        return c.json({ products: items.map((p) => productDto(p, lang(c))), page: 1, hasMore: false, total: items.length });
      }

      const isSpecial = q.section === "special" ? true : q.section === "all" ? undefined : false;
      const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
      const sort = Object.values(ProductSort).includes(q.sort as ProductSort) ? (q.sort as ProductSort) : undefined;
      const minDiscount = Math.min(99, Math.max(0, Number.parseInt(q.minDiscount ?? "0", 10) || 0));

      const { items, total } = await service.getVisibleProducts({
        isSpecial,
        categoryId: q.categoryId ? Number(q.categoryId) : undefined,
        search: (q.q ?? "").trim().slice(0, 100) || undefined,
        sort,
        inStockOnly: q.inStock === "1",
        minDiscount: minDiscount || undefined,
        page,
        limit: API_PAGE_SIZE,
      });
      return c.json({ products: items.map((p) => productDto(p, lang(c))), page, hasMore: page * API_PAGE_SIZE < total, total });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** GET /api/products/:id */
  async getProduct(c: C) {
    try {
      const product = await new ProductService(c.get("db")).getVisibleProduct(idParam(c));
      if (!product) throw new Errors(HttpCode.NOT_FOUND, Message.NO_PRODUCT);
      return c.json({ product: productDto(product, lang(c)) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** GET /api/favorites */
  async getFavorites(c: C) {
    try {
      const products = await new FavoriteService(c.get("db")).getProducts(userId(c));
      return c.json({ products: products.map((p) => productDto(p, lang(c))) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** PUT /api/favorites/:id */
  async addFavorite(c: C) {
    try {
      await new FavoriteService(c.get("db")).add(userId(c), idParam(c));
      return c.json({ ok: true });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** DELETE /api/favorites/:id */
  async removeFavorite(c: C) {
    try {
      await new FavoriteService(c.get("db")).remove(userId(c), idParam(c));
      return c.json({ ok: true });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** GET /api/cart */
  async getCart(c: C) {
    try {
      return c.json({ cart: cartDto(await new CartService(c.get("db")).getCart(userId(c)), lang(c)) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** PUT /api/cart/:id  { quantity: 0..99 }  (0 removes the line) — returns the whole cart */
  async setCartQuantity(c: C) {
    try {
      const body = await c.req.json().catch(() => ({}));
      // Only a real JSON number: Number(null) or Number("") would be 0 and silently remove the line.
      const quantity = typeof body?.quantity === "number" ? body.quantity : NaN;
      const cart = await new CartService(c.get("db")).setQuantity(userId(c), idParam(c), quantity);
      return c.json({ cart: cartDto(cart, lang(c)) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /** DELETE /api/cart */
  async clearCart(c: C) {
    try {
      return c.json({ cart: cartDto(await new CartService(c.get("db")).clear(userId(c)), lang(c)) });
    } catch (err) {
      return sendError(c, err);
    }
  },

  /**
   * GET /api/photo/:fileId — public (img tags can't send headers), but only photos of visible
   * products. Kept in Cloudflare's cache for a day so repeat views don't call Telegram.
   */
  async getPhoto(c: C) {
    try {
      const fileId = c.req.param("fileId") ?? "";
      const cache = caches.default;
      const hit = await cache.match(c.req.raw);
      if (hit) return hit;

      if (!(await new ProductService(c.get("db")).isPublicPhoto(fileId))) return c.body(null, 404);
      const tg = await new PhotoService(c.env).download(fileId);
      const res = new Response(tg.body, {
        headers: {
          "Content-Type": tg.headers.get("content-type") ?? "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
      c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()));
      return res;
    } catch (err) {
      console.error("Error, getPhoto:", err);
      return c.body(null, 404);
    }
  },
};

export default shopController;
