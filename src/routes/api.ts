import { Hono } from "hono";
import type { AppEnv } from "../env";
import shopController from "../controllers/shop.controller";

/** JSON API for the Telegram Mini App, mounted at /api. */
const api = new Hono<AppEnv>();

api.get("/photo/:fileId", shopController.getPhoto); // public: used by <img> tags

api.use("*", shopController.verifyTelegram);

api.get("/me", shopController.getMe);
api.patch("/me/language", shopController.setLanguage);
api.get("/home", shopController.getHome);
api.get("/categories", shopController.getCategories);
api.get("/products", shopController.getProducts);
api.get("/products/:id", shopController.getProduct);

api.get("/favorites", shopController.getFavorites);
api.put("/favorites/:id", shopController.addFavorite);
api.delete("/favorites/:id", shopController.removeFavorite);

api.get("/cart", shopController.getCart);
api.put("/cart/:id", shopController.setCartQuantity);
api.delete("/cart", shopController.clearCart);

api.all("*", (c) => c.json({ code: 404, message: "Not found" }, 404));

export default api;
