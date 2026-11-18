import type { Context } from "hono";
import type { AppEnv } from "../env";
import CategoryService, { type CategoryInput } from "../services/Category.service";
import { errorText, flash } from "./admin.controller";
import { CategoriesPage } from "../views/CategoriesPage";

type C = Context<AppEnv>;

async function readInput(c: C): Promise<CategoryInput> {
  const body = (await c.req.parseBody()) as Record<string, string>;
  return {
    // One name for every language: the bot and the Mini App fall back to it.
    nameUz: String(body.name ?? "").trim().slice(0, 100),
    nameRu: null,
    nameEn: null,
    icon: String(body.icon ?? "").trim().slice(0, 16) || null,
    sortOrder: Number.parseInt(body.sortOrder, 10) || 0,
  };
}

const categoryController = {
  async getCategories(c: C) {
    try {
      const service = new CategoryService(c.get("db"));
      const [categories, counts] = await Promise.all([service.getAll(), service.countProducts()]);
      return c.html(<CategoriesPage admin={c.get("admin")} flash={c.get("flash")} categories={categories} counts={counts} />);
    } catch (err) {
      flash(c, "error", errorText(err));
      return c.redirect("/admin/products");
    }
  },

  async createCategory(c: C) {
    try {
      await new CategoryService(c.get("db")).create(await readInput(c));
      flash(c, "success", "Category created.");
    } catch (err) {
      flash(c, "error", errorText(err));
    }
    return c.redirect("/admin/categories");
  },

  async updateCategory(c: C) {
    try {
      await new CategoryService(c.get("db")).update(Number(c.req.param("id")), await readInput(c));
      flash(c, "success", "Category saved.");
    } catch (err) {
      flash(c, "error", errorText(err));
    }
    return c.redirect("/admin/categories");
  },

  async deleteCategory(c: C) {
    try {
      await new CategoryService(c.get("db")).delete(Number(c.req.param("id")));
      flash(c, "success", "Category deleted.");
    } catch (err) {
      flash(c, "error", errorText(err));
    }
    return c.redirect("/admin/categories");
  },
};

export default categoryController;
