import { Hono } from "hono";
import type { AppEnv } from "../env";
import adminController from "../controllers/admin.controller";
import productController from "../controllers/product.controller";
import categoryController from "../controllers/category.controller";
import adminCss from "../views/admin.css";

/** Admin panel (server-rendered pages), mounted at /admin. */
const admin = new Hono<AppEnv>();

admin.get("/static/admin.css", (c) =>
  c.body(adminCss, 200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=3600" })
);

admin.use("*", adminController.readFlash);

/** Auth (login link comes from the bot) */
admin.get("/", adminController.goHome);
admin.get("/auth", adminController.auth);
admin.get("/logout", adminController.logout);

/** Everything below needs a logged-in admin */
admin.use("*", adminController.verifyAdmin);

admin.get("/photo/:fileId", adminController.photo);

/** Product */
admin.get("/products", productController.getProducts);
admin.get("/products/new", productController.getNewProduct);
admin.post("/products", productController.createProduct);
admin.get("/products/:id/edit", productController.getEditProduct);
admin.post("/products/:id", productController.updateProduct);
admin.post("/products/:id/quick", productController.quickUpdate);
admin.post("/products/:id/delete", productController.deleteProduct);

/** Category */
admin.get("/categories", categoryController.getCategories);
admin.post("/categories", categoryController.createCategory);
admin.post("/categories/:id", categoryController.updateCategory);
admin.post("/categories/:id/delete", categoryController.deleteCategory);

export default admin;
