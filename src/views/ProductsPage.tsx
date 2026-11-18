import type { FC } from "hono/jsx";
import type { Flash } from "../env";
import type { CategoryRow, UserRow } from "../db/schema";
import type { AdminProduct } from "../services/Product.service";
import type { Product } from "../libs/types/product";
import { ProductStatus } from "../libs/enums/product.enum";
import { formatPrice } from "../libs/i18n";
import { Language } from "../libs/enums/user.enum";
import { Layout } from "./Layout";

const STATUSES = Object.values(ProductStatus);
const price = (n: number) => formatPrice(n, Language.UZ);
const photoSrc = (fileId: string) => `/admin/photo/${encodeURIComponent(fileId)}`;
const statusLabel = (s: string) => s.replace(/_/g, " ");

export interface ProductFilterForm {
  categoryId: string;
  search: string;
  section: string;
}

/** One quick-action button (special on/off, shown/hidden) — a tiny form posting to /quick. */
const QuickToggle: FC<{ id: number; action: string; value: boolean; className: string; label: string; title: string }> = (p) => (
  <form method="post" action={`/admin/products/${p.id}/quick`} class="inline">
    <input type="hidden" name="action" value={p.action} />
    <input type="hidden" name="value" value={String(p.value)} />
    <button class={`pill ${p.className}`} title={p.title}>
      {p.label}
    </button>
  </form>
);

export const ProductsPage: FC<{
  admin: UserRow;
  flash: Flash | null;
  products: AdminProduct[];
  categories: CategoryRow[];
  filter: ProductFilterForm;
}> = ({ admin, flash, products, categories, filter }) => (
  <Layout title="Products" admin={admin} flash={flash}>
    <div class="page-head">
      <h1>
        Products <span class="count">{products.length}</span>
      </h1>
      <a class="btn btn-primary" href="/admin/products/new">
        + Add product
      </a>
    </div>

    <form class="filters" method="get" action="/admin/products">
      <input type="search" name="q" placeholder="Search by name…" value={filter.search} />
      <select name="category">
        <option value="">All categories</option>
        {categories.map((c) => (
          <option value={String(c.id)} selected={String(c.id) === filter.categoryId}>
            {c.icon ? `${c.icon} ` : ""}
            {c.nameUz}
          </option>
        ))}
      </select>
      <select name="section">
        <option value="">All sections</option>
        <option value="general" selected={filter.section === "general"}>
          General catalog
        </option>
        <option value="special" selected={filter.section === "special"}>
          Special price
        </option>
      </select>
      <button class="btn" type="submit">
        Filter
      </button>
    </form>

    {!products.length ? (
      <p class="empty">No products found.</p>
    ) : (
      <div class="table-wrap">
        <table class="products">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Category</th>
              <th class="num">Price</th>
              <th>Status</th>
              <th>Section</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr class={p.isVisible ? "" : "is-hidden"}>
                <td class="thumb">
                  {p.photoFileId ? <img src={photoSrc(p.photoFileId)} alt="" loading="lazy" /> : <div class="no-photo">—</div>}
                </td>
                <td>
                  <a href={`/admin/products/${p.id}/edit`}>
                    <b>{p.nameUz}</b>
                  </a>
                </td>
                <td>{p.categoryName ?? "—"}</td>
                <td class="num">
                  {price(p.price)}
                  {p.oldPrice && p.discountPercent > 0 && (
                    <div class="muted small">
                      <s>{price(p.oldPrice)}</s> · −{p.discountPercent}%
                    </div>
                  )}
                </td>
                <td>
                  <form method="post" action={`/admin/products/${p.id}/quick`} class="inline">
                    <input type="hidden" name="action" value="status" />
                    <select name="value" class={`status status-${p.status}`} data-autosubmit>
                      {STATUSES.map((s) => (
                        <option value={s} selected={s === p.status}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </form>
                </td>
                <td>
                  <QuickToggle
                    id={p.id}
                    action="special"
                    value={!p.isSpecial}
                    className={p.isSpecial ? "pill-hot" : ""}
                    label={p.isSpecial ? "🔥 Special" : "General"}
                    title="Click to move"
                  />
                </td>
                <td>
                  <QuickToggle
                    id={p.id}
                    action="visible"
                    value={!p.isVisible}
                    className={p.isVisible ? "pill-ok" : "pill-off"}
                    label={p.isVisible ? "Shown" : "Hidden"}
                    title="Click to toggle"
                  />
                </td>
                <td class="actions">
                  <a class="btn btn-small" href={`/admin/products/${p.id}/edit`}>
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Layout>
);

export const ProductFormPage: FC<{
  admin: UserRow;
  flash: Flash | null;
  product: Product | null;
  categories: CategoryRow[];
  maxGallery: number;
}> = ({ admin, flash, product, categories, maxGallery }) => {
  const isEdit = Boolean(product);
  const p = product;
  const gallery = p?.galleryFileIds ?? [];
  return (
    <Layout title={isEdit ? "Edit product" : "New product"} admin={admin} flash={flash}>
      <div class="page-head">
        <h1>{isEdit ? "Edit product" : "New product"}</h1>
        <a class="btn" href="/admin/products">
          ← Back to list
        </a>
      </div>

      <form class="card form" method="post" enctype="multipart/form-data" action={isEdit ? `/admin/products/${p!.id}` : "/admin/products"}>
        <div class="grid-2">
          <label>
            Category
            <select name="categoryId" required>
              {categories.map((c) => (
                <option value={String(c.id)} selected={c.id === p?.categoryId}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.nameUz}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price (so'm, whole number)
            <input name="price" inputmode="numeric" pattern="[0-9 ,]+" required value={p ? String(p.price) : ""} placeholder="26000" />
          </label>
        </div>
        <div class="grid-2">
          <label>
            Old price — optional (shown crossed out, discount is calculated)
            <input name="oldPrice" inputmode="numeric" pattern="[0-9 ,]*" value={p?.oldPrice != null ? String(p.oldPrice) : ""} placeholder="40000" />
          </label>
          <div class="checks">{p && p.discountPercent > 0 && <span class="pill pill-hot">−{p.discountPercent}% now</span>}</div>
        </div>

        <fieldset>
          <label>
            Name
            <input name="name" required maxlength={200} value={p?.nameUz ?? ""} />
          </label>
        </fieldset>

        <fieldset>
          <label>
            Description (optional)
            <textarea name="description" rows={4}>
              {p?.descriptionUz ?? ""}
            </textarea>
          </label>
        </fieldset>

        <div class="grid-2">
          <label>
            Availability
            <select name="status">
              {STATUSES.map((s) => (
                <option value={s} selected={s === (p?.status ?? "in_stock")}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <div class="checks">
            <label class="check">
              <input type="checkbox" name="isSpecial" checked={Boolean(p?.isSpecial)} /> 🔥 Special-price section
            </label>
            <label class="check">
              <input type="checkbox" name="isVisible" checked={!isEdit || Boolean(p?.isVisible)} /> Visible to customers
            </label>
          </div>
        </div>

        <fieldset>
          <legend>Main photo</legend>
          <div class="photo-row">
            {p?.photoFileId && <img class="preview" src={photoSrc(p.photoFileId)} alt="" />}
            <div>
              <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
              <p class="muted small">JPEG, PNG or WebP, up to 10 MB. It is stored on Telegram's servers.</p>
              {p?.photoFileId && (
                <label class="check">
                  <input type="checkbox" name="removePhoto" /> Remove current photo
                </label>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>
            More photos <span class="muted small">(up to {maxGallery}, shown as a gallery in the shop)</span>
          </legend>
          {gallery.length > 0 && (
            <div class="gallery-admin">
              {gallery.map((f) => (
                <label class="gallery-item">
                  <img src={photoSrc(f)} alt="" loading="lazy" />
                  <span class="check">
                    <input type="checkbox" name="removeGallery" value={f} /> Remove
                  </span>
                </label>
              ))}
            </div>
          )}
          {gallery.length < maxGallery ? (
            <>
              <input type="file" name="gallery" multiple accept="image/jpeg,image/png,image/webp" />
              <p class="muted small">You can add {maxGallery - gallery.length} more. Select several files at once.</p>
            </>
          ) : (
            <p class="muted small">The gallery is full. Remove a photo to add another.</p>
          )}
        </fieldset>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit">
            {isEdit ? "Save changes" : "Add product"}
          </button>
        </div>
      </form>

      {p && (
        <>
          <form
            class="danger-zone"
            method="post"
            action={`/admin/products/${p.id}/delete`}
            data-confirm="Delete this product permanently? Hiding it (untick 'Visible') is usually better."
          >
            <p class="muted small">Prefer hiding a discontinued product instead of deleting it: future order history will need it.</p>
            <button class="btn btn-danger" type="submit">
              Delete permanently
            </button>
          </form>
          <p class="muted small">
            Last updated {p.updatedAt.toLocaleString("en-GB")}
            {p.updatedBy ? ` by admin ${p.updatedBy}` : ""}.
          </p>
        </>
      )}
    </Layout>
  );
};
