import type { Context, Next } from "hono";
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import type { AppEnv, Flash } from "../env";
import UserService from "../services/User.service";
import PhotoService from "../services/Photo.service";
import { UserRole } from "../libs/enums/user.enum";
import Errors, { Message } from "../libs/Errors";
import { ADMIN_SESSION_HOURS } from "../libs/config";
import { LoginPage } from "../views/Layout";

type C = Context<AppEnv>;

const SESSION_COOKIE = "ba_admin";
const FLASH_COOKIE = "ba_flash";
const secure = (c: C) => new URL(c.req.url).protocol === "https:";

/** Stores a one-time message shown at the top of the next admin page. */
export function flash(c: C, type: Flash["type"], text: string) {
  setCookie(c, FLASH_COOKIE, encodeURIComponent(JSON.stringify({ type, text })), {
    path: "/admin",
    httpOnly: true,
    sameSite: "Lax",
    secure: secure(c),
    maxAge: 60,
  });
}

export function errorText(err: unknown): string {
  if (err instanceof Errors) return err.message;
  console.error("Error, admin:", err);
  return Message.SOMETHING_WENT_WRONG;
}

const adminController = {
  /** Reads (and clears) the flash message for this page. Runs before every admin route. */
  async readFlash(c: C, next: Next) {
    const raw = getCookie(c, FLASH_COOKIE);
    let value: Flash | null = null;
    if (raw) {
      try {
        value = JSON.parse(decodeURIComponent(raw));
      } catch {
        value = null;
      }
      deleteCookie(c, FLASH_COOKIE, { path: "/admin" });
    }
    c.set("flash", value);
    await next();
  },

  /** GET /admin — products if logged in, otherwise "how to log in". */
  async goHome(c: C) {
    const session = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE);
    if (session) return c.redirect("/admin/products");
    return c.html(<LoginPage flash={c.get("flash")} />);
  },

  /** GET /admin/auth?token=… — the one-time link the bot sends to admins. */
  async auth(c: C) {
    try {
      const user = await new UserService(c.get("db")).consumeLoginToken(c.req.query("token") ?? "");
      const expires = Date.now() + ADMIN_SESSION_HOURS * 3600 * 1000;
      // Signed with SESSION_SECRET: the browser can't change the id or the expiry without breaking the signature.
      await setSignedCookie(c, SESSION_COOKIE, `${user.telegramId}.${expires}`, c.env.SESSION_SECRET, {
        path: "/admin",
        httpOnly: true,
        sameSite: "Lax", // blocks cross-site form posts to the admin panel
        secure: secure(c),
        maxAge: ADMIN_SESSION_HOURS * 3600,
      });
      return c.redirect("/admin/products");
    } catch (err) {
      flash(c, "error", errorText(err));
      return c.redirect("/admin");
    }
  },

  async logout(c: C) {
    deleteCookie(c, SESSION_COOKIE, { path: "/admin" });
    return c.redirect("/admin");
  },

  /**
   * Guards every admin page. Re-reads the role from the database on each request,
   * so removing someone from ADMIN_IDS (and their next /start) locks them out.
   */
  async verifyAdmin(c: C, next: Next) {
    const session = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE);
    const [id, expires] = String(session || "").split(".").map(Number);
    const user = id && expires > Date.now() ? await new UserService(c.get("db")).getUser(id) : undefined;
    if (!user || user.role !== UserRole.ADMIN) {
      flash(c, "error", Message.NOT_AUTHENTICATED);
      return c.redirect("/admin");
    }
    c.set("admin", user);
    await next();
  },

  /** GET /admin/photo/:fileId — any product photo (also hidden ones), without exposing the bot token. */
  async photo(c: C) {
    try {
      const tg = await new PhotoService(c.env).download(c.req.param("fileId") ?? "");
      return new Response(tg.body, {
        headers: {
          "Content-Type": tg.headers.get("content-type") ?? "image/jpeg",
          // Short on purpose: after changing bots, old photos must not keep showing for a day.
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      return c.body(null, 404);
    }
  },
};

export default adminController;
