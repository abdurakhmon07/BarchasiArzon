import express from "express";
import shopController from "./controllers/shop.controller";

/** JSON API for the Telegram Mini App, mounted at /api. */
const router = express.Router();

router.get("/photo/:fileId", shopController.getPhoto); // public: used by <img> tags

router.use(shopController.verifyTelegram);

router.get("/me", shopController.getMe);
router.patch("/me/language", shopController.setLanguage);
router.get("/home", shopController.getHome);
router.get("/categories", shopController.getCategories);
router.get("/products", shopController.getProducts);
router.get("/products/:id", shopController.getProduct);

router.get("/favorites", shopController.getFavorites);
router.put("/favorites/:id", shopController.addFavorite);
router.delete("/favorites/:id", shopController.removeFavorite);

router.get("/cart", shopController.getCart);
router.put("/cart/:id", shopController.setCartQuantity);
router.delete("/cart", shopController.clearCart);

export default router;
