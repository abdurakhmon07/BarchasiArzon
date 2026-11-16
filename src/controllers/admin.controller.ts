import { NextFunction, Request, Response } from "express";
import { T } from "../libs/types/common";
import { UserRole } from "../libs/enums/user.enum";
import UserService from "../models/User.service";
import PhotoService from "../models/Photo.service";
import Errors, { Message } from "../libs/Errors";
import { Flash } from "../libs/types/session";

const adminController: T = {};
const userService = new UserService();
const photoService = new PhotoService();

/** Stores a one-time message shown at the top of the next page. */
export function flash(req: Request, type: Flash["type"], text: string) {
  req.session.flash = { type, text };
}

export function errorText(err: unknown): string {
  return err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
}

adminController.goHome = (req: Request, res: Response) => {
  if (req.session.user) return res.redirect("/admin/products");
  res.render("login");
};

/** GET /admin/auth?token=… — the one-time link the bot sends to admins. */
adminController.auth = async (req: Request, res: Response) => {
  try {
    console.log("auth");
    const user = await userService.consumeLoginToken(String(req.query.token ?? ""));
    req.session.regenerate((err) => {
      if (err) {
        console.log("Error, auth session:", err);
        return res.redirect("/admin");
      }
      req.session.user = user;
      req.session.save(() => res.redirect("/admin/products"));
    });
  } catch (err) {
    console.log("Error, auth:", err);
    flash(req, "error", errorText(err));
    res.redirect("/admin");
  }
};

adminController.logout = (req: Request, res: Response) => {
  console.log("logout");
  req.session.destroy(() => res.redirect("/admin"));
};

/**
 * Guards every admin page. Re-reads the role from the database on each request,
 * so removing someone from ADMIN_IDS (and their next /start) locks them out.
 */
adminController.verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionUser = req.session.user;
    const user = sessionUser ? await userService.getUser(sessionUser._id) : null;
    if (!user || user.role !== UserRole.ADMIN) {
      flash(req, "error", Message.NOT_AUTHENTICATED);
      return res.redirect("/admin");
    }
    req.session.user = user;
    res.locals.admin = user;
    next();
  } catch (err) {
    console.log("Error, verifyAdmin:", err);
    res.redirect("/admin");
  }
};

/** GET /admin/photo/:fileId — streams a Telegram-hosted photo without exposing the bot token. */
adminController.photo = async (req: Request, res: Response) => {
  try {
    const { body, contentType } = await photoService.download(req.params.fileId);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=86400");
    res.send(Buffer.from(body));
  } catch (err) {
    console.log("Error, photo:", err);
    res.status(404).end();
  }
};

export default adminController;
