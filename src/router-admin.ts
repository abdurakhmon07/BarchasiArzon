import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import adminController, { flash } from "./controllers/admin.controller";
import productController from "./controllers/product.controller";
import categoryController from "./controllers/category.controller";
import { MAX_PHOTO_BYTES } from "./libs/config";
import { Message } from "./libs/Errors";

const routerAdmin = express.Router();

/** Product photos are kept in memory only long enough to forward them to Telegram. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("not an image"));
  },
});

function photoUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("photo")(req, res, (err: unknown) => {
    if (!err) return next();
    flash(req, "error", Message.INVALID_PHOTO);
    res.redirect(req.params.id ? `/admin/products/${req.params.id}/edit` : "/admin/products/new");
  });
}

/** Auth (login link comes from the bot) */
routerAdmin.get("/", adminController.goHome);
routerAdmin.get("/auth", adminController.auth);
routerAdmin.get("/logout", adminController.logout);

/** Everything below needs a logged-in admin */
routerAdmin.use(adminController.verifyAdmin);

routerAdmin.get("/photo/:fileId", adminController.photo);

/** Product */
routerAdmin.get("/products", productController.getProducts);
routerAdmin.get("/products/new", productController.getNewProduct);
routerAdmin.post("/products", photoUpload, productController.createProduct);
routerAdmin.get("/products/:id/edit", productController.getEditProduct);
routerAdmin.post("/products/:id", photoUpload, productController.updateProduct);
routerAdmin.post("/products/:id/quick", productController.quickUpdate);
routerAdmin.post("/products/:id/delete", productController.deleteProduct);

/** Category */
routerAdmin.get("/categories", categoryController.getCategories);
routerAdmin.post("/categories", categoryController.createCategory);
routerAdmin.post("/categories/:id", categoryController.updateCategory);
routerAdmin.post("/categories/:id/delete", categoryController.deleteCategory);

export default routerAdmin;
