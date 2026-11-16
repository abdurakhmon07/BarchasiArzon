import express from "express";
import shopController from "./controllers/shop.controller";

/** JSON API for the Telegram Mini App, mounted at /api. */
const router = express.Router();

router.get("/photo/:fileId", shopController.getPhoto); // public: used by <img> tags

router.use(shopController.verifyTelegram);

router.get("/me", shopController.getMe);
router.patch("/me/language", shopController.setLanguage);
router.get("/categories", shopController.getCategories);
router.get("/products", shopController.getProducts);
router.get("/products/:id", shopController.getProduct);

export default router;
