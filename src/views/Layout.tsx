import type { Child, FC } from "hono/jsx";
import { raw } from "hono/html";
import type { Flash } from "../env";
import type { UserRow } from "../db/schema";

/** Small bits of JavaScript the admin pages need (same as the old public/js/main.js). */
const ADMIN_JS = `
// Status dropdowns in the product list save as soon as they change.
document.querySelectorAll("[data-autosubmit]").forEach((el) => {
  el.addEventListener("change", () => el.form.submit());
});
// Ask before destructive actions.
document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (e) => {
    if (!confirm(form.dataset.confirm)) e.preventDefault();
  });
});`;

interface Props {
  title?: string;
  admin?: UserRow | null;
  flash?: Flash | null;
  children?: Child;
}

/** Page frame for every admin page: head, top bar with menu, flash message. */
export const Layout: FC<Props> = ({ title, admin, flash, children }) => (
  <>
    {raw("<!DOCTYPE html>")}
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ? `${title} · ` : ""}Barchasi Arzon Admin</title>
        <link rel="stylesheet" href="/admin/static/admin.css" />
      </head>
      <body>
        <header class="topbar">
          <a class="brand" href="/admin">
            Barchasi Arzon <span>admin</span>
          </a>
          {admin && (
            <nav>
              <a href="/admin/products">Products</a>
              <a href="/admin/categories">Categories</a>
              <span class="who">{admin.firstName}</span>
              <a href="/admin/logout">Log out</a>
            </nav>
          )}
        </header>
        <main class="container">
          {flash && <div class={`flash flash-${flash.type}`}>{flash.text}</div>}
          {children}
        </main>
        <script>{raw(ADMIN_JS)}</script>
      </body>
    </html>
  </>
);

export const LoginPage: FC<{ flash: Flash | null }> = ({ flash }) => (
  <Layout title="Log in" flash={flash}>
    <section class="card narrow">
      <h1>Admin login</h1>
      <p>There is no password. To log in:</p>
      <ol>
        <li>Open the Barchasi Arzon bot in Telegram.</li>
        <li>
          Press <b>⚙️ Admin panel</b> (or send <code>/admin</code>).
        </li>
        <li>Open the link the bot sends you. It works once, for 10 minutes.</li>
      </ol>
      <p class="muted">
        Only Telegram accounts listed in <code>ADMIN_IDS</code> get the admin button.
      </p>
    </section>
  </Layout>
);
