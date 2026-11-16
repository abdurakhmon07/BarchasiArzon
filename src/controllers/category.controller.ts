import { Request, Response } from "express";
import { T } from "../libs/types/common";
import CategoryService from "../models/Category.service";
import { CategoryInput } from "../libs/types/category";
import { errorText, flash } from "./admin.controller";

const categoryController: T = {};
const categoryService = new CategoryService();

function readInput(body: T): CategoryInput {
  return {
    // One name for every language: the bot falls back to it.
    nameUz: String(body.name ?? "").trim(),
    nameRu: null,
    nameEn: null,
    sortOrder: Number.parseInt(body.sortOrder, 10) || 0,
  };
}

categoryController.getCategories = async (req: Request, res: Response) => {
  try {
    console.log("getCategories");
    const [categories, counts] = await Promise.all([categoryService.getAll(), categoryService.countProducts()]);
    res.render("categories/list", { categories, counts });
  } catch (err) {
    console.log("Error, getCategories:", err);
    flash(req, "error", errorText(err));
    res.redirect("/admin/products");
  }
};

categoryController.createCategory = async (req: Request, res: Response) => {
  try {
    console.log("createCategory");
    await categoryService.create(readInput(req.body));
    flash(req, "success", "Category created.");
  } catch (err) {
    console.log("Error, createCategory:", err);
    flash(req, "error", errorText(err));
  }
  res.redirect("/admin/categories");
};

categoryController.updateCategory = async (req: Request, res: Response) => {
  try {
    console.log("updateCategory");
    await categoryService.update(req.params.id, readInput(req.body));
    flash(req, "success", "Category saved.");
  } catch (err) {
    console.log("Error, updateCategory:", err);
    flash(req, "error", errorText(err));
  }
  res.redirect("/admin/categories");
};

categoryController.deleteCategory = async (req: Request, res: Response) => {
  try {
    console.log("deleteCategory");
    await categoryService.delete(req.params.id);
    flash(req, "success", "Category deleted.");
  } catch (err) {
    console.log("Error, deleteCategory:", err);
    flash(req, "error", errorText(err));
  }
  res.redirect("/admin/categories");
};

export default categoryController;
