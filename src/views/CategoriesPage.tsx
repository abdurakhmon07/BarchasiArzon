import type { FC } from "hono/jsx";
import type { Flash } from "../env";
import type { CategoryRow, UserRow } from "../db/schema";
import { Layout } from "./Layout";

export const CategoriesPage: FC<{
  admin: UserRow;
  flash: Flash | null;
  categories: CategoryRow[];
  counts: Record<number, number>;
}> = ({ admin, flash, categories, counts }) => (
  <Layout title="Categories" admin={admin} flash={flash}>
    <div class="page-head">
      <h1>
        Categories <span class="count">{categories.length}</span>
      </h1>
    </div>

    <form class="card form" method="post" action="/admin/categories">
      <h2>Add category</h2>
      <div class="grid-name-order">
        <label>
          Name <input name="name" required maxlength={100} placeholder="Tozalash vositalari" />
        </label>
        <label>
          Icon <input name="icon" maxlength={16} placeholder="🧽" class="icon-input" />
        </label>
        <label>
          Order <input name="sortOrder" type="number" value="0" />
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">
          Add
        </button>
      </div>
    </form>

    {!categories.length ? (
      <p class="empty">No categories yet. Add the first one above.</p>
    ) : (
      <>
        {/* One empty form per row; the inputs in the table point to it with form="…" (a <form> can't sit inside <tr>). */}
        {categories.map((c) => (
          <form method="post" action={`/admin/categories/${c.id}`} id={`cat-${c.id}`}></form>
        ))}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Order</th>
                <th class="num">Products</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const n = counts[c.id] ?? 0;
                const form = `cat-${c.id}`;
                return (
                  <tr>
                    <td>
                      <input form={form} name="icon" maxlength={16} class="icon-input" value={c.icon ?? ""} placeholder="🧽" />
                    </td>
                    <td>
                      <input form={form} name="name" required maxlength={100} value={c.nameUz} />
                    </td>
                    <td>
                      <input form={form} name="sortOrder" type="number" class="short" value={String(c.sortOrder)} />
                    </td>
                    <td class="num">
                      <a href={`/admin/products?category=${c.id}`}>{n}</a>
                    </td>
                    <td class="actions">
                      <button form={form} class="btn btn-small" type="submit">
                        Save
                      </button>
                      <form method="post" action={`/admin/categories/${c.id}/delete`} class="inline" data-confirm={`Delete category '${c.nameUz}'?`}>
                        <button class="btn btn-small btn-danger" type="submit" disabled={n > 0} title={n ? "Has products" : undefined}>
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </Layout>
);
