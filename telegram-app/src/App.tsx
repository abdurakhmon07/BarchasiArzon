import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { guessLanguage, t } from "./i18n";
import { haptic, initData, tg } from "./telegram";
import { useProducts } from "./useProducts";
import { loadRecent, rememberViewed } from "./recent";
import ProductCard from "./components/ProductCard";
import ProductSheet from "./components/ProductSheet";
import Toolbar from "./components/Toolbar";
import RecentRow from "./components/RecentRow";
import CartScreen from "./components/CartScreen";
import { ShopProvider, useShop } from "./shop";
import { formatPrice } from "./i18n";
import type { Category, Language, Product, ProductFilter, Section, User } from "./types";

const LANGS: Language[] = ["uz", "ru", "en"];

/**
 * Telegram's big button at the bottom of the screen: "🛒 Cart · 3 pcs · 157 000 so'm".
 * Shown while the cart has something in it and the cart screen isn't open.
 */
function CartMainButton({ lang, hidden, onOpen }: { lang: Language; hidden: boolean; onOpen: () => void }) {
  const { cart } = useShop();
  const visible = !hidden && cart.totalQuantity > 0;
  const text = `🛒 ${t(lang, "cart")} · ${cart.totalQuantity} ${t(lang, "pcs")} · ${formatPrice(cart.totalAmount, lang)}`;

  useEffect(() => {
    const button = tg?.MainButton;
    if (!button) return;
    if (!visible) {
      button.hide();
      return;
    }
    button.setText(text);
    button.show();
    button.onClick(onOpen);
    return () => {
      button.offClick(onOpen);
    };
  }, [visible, text, onOpen]);

  useEffect(
    () => () => {
      tg?.MainButton?.hide();
    },
    [],
  );
  return null;
}

/** The ❤️ tab. */
function FavoritesGrid({ lang, onOpen }: { lang: Language; onOpen: (p: Product) => void }) {
  const { favorites, reloadFavorites } = useShop();
  useEffect(reloadFavorites, [reloadFavorites]); // fresh list each time the tab opens
  if (!favorites.length) return <div className="center muted">{t(lang, "noFavorites")}</div>;
  return (
    <main className="grid">
      {favorites.map((p) => (
        <ProductCard key={p.id} product={p} lang={lang} onOpen={onOpen} />
      ))}
    </main>
  );
}

/** Product id from a shared link: ?product=<id> (bot button) or start_param p_<id> (t.me/...?startapp=). */
function sharedProductId(): string | null {
  const fromUrl = new URLSearchParams(location.search).get("product");
  const fromStart = /^p_([a-f0-9]{24})$/.exec(tg?.initDataUnsafe?.start_param ?? "")?.[1];
  const id = fromUrl ?? fromStart ?? null;
  return id && /^[a-f0-9]{24}$/.test(id) ? id : null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<ProductFilter>({
    section: "general",
    categoryId: null,
    q: "",
    sort: null,
    inStock: false,
  });
  const [opened, setOpened] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const listScroll = useRef(0);

  const lang: Language = user?.language ?? guessLanguage(tg?.initDataUnsafe?.user?.language_code);
  const favoritesTab = filter.section === "favorites";
  // The favorites tab has its own list, so the catalog list doesn't load meanwhile.
  const { products, loading, hasMore, error, loadMore, retry } = useProducts(
    filter,
    user && !favoritesTab ? user.language : null,
  );
  const update = (patch: Partial<ProductFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const openProduct = useCallback((p: Product) => {
    haptic();
    if (!document.querySelector(".app[hidden]")) listScroll.current = window.scrollY;
    setOpened(p);
    setRecentIds((ids) => rememberViewed(ids, p.id));
  }, []);

  const restoreScroll = () => requestAnimationFrame(() => window.scrollTo(0, listScroll.current));

  // Back from a product returns to wherever it was opened from (the list or the cart).
  const closeSheet = useCallback(() => {
    setOpened(null);
    if (!cartOpen) restoreScroll();
  }, [cartOpen]);

  const openCart = useCallback(() => {
    haptic();
    if (!document.querySelector(".app[hidden]")) listScroll.current = window.scrollY;
    setOpened(null);
    setCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setCartOpen(false);
    restoreScroll();
  }, []);

  // Who is this? (the backend checks Telegram's signature and remembers the language)
  const boot = useCallback(() => {
    setBootError(null);
    api
      .me()
      .then((r) => {
        setUser(r.user);
        setBotUsername(r.botUsername);
        // Opened from a shared link → show that product straight away.
        const id = sharedProductId();
        if (id)
          api
            .product(id)
            .then(openProduct)
            .catch(() => undefined);
      })
      .catch((e) => setBootError(e.message));
  }, [openProduct]);

  useEffect(() => {
    if (!initData) return;
    boot();
    loadRecent().then(setRecentIds);
  }, [boot]);

  // Category names come back in the user's language, so reload them when it changes.
  useEffect(() => {
    if (!user) return;
    api
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [user?.language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the next page when the user scrolls near the bottom.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, opened]);

  const changeLanguage = async (next: Language) => {
    if (!user || next === user.language) return;
    haptic();
    setUser({ ...user, language: next }); // feels instant; the server confirms below
    try {
      setUser(await api.setLanguage(next));
    } catch {
      setUser(user);
    }
  };

  if (!initData) {
    return <div className="center">{t(lang, "openInTelegram")}</div>;
  }
  if (bootError) {
    return (
      <div className="center">
        <p>{bootError}</p>
        <button className="btn" onClick={boot}>
          {t(lang, "retry")}
        </button>
      </div>
    );
  }
  if (!user) return <div className="center muted">{t(lang, "loading")}</div>;

  const searching = filter.q !== "";
  const showRecent = filter.section === "general" && !filter.categoryId && !searching && recentIds.length > 0;

  return (
    <ShopProvider lang={user.language}>
      <CartMainButton lang={lang} hidden={cartOpen} onOpen={openCart} />

      {opened ? (
        <ProductSheet product={opened} lang={lang} botUsername={botUsername} onClose={closeSheet} />
      ) : (
        cartOpen && <CartScreen lang={lang} onClose={closeCart} onOpen={openProduct} />
      )}

      {/* The list stays mounted (just hidden) so its products and scroll position survive opening a product. */}
      <div className="app" hidden={Boolean(opened) || cartOpen}>
        <header className="header">
          <div className="title">Barchasi Arzon</div>
          <div className="langs" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l} className={l === lang ? "on" : ""} onClick={() => changeLanguage(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <nav className="tabs">
          {(["general", "special", "favorites"] as Section[]).map((s) => (
            <button
              key={s}
              className={s === filter.section ? "on" : ""}
              onClick={() => {
                haptic();
                update({ section: s });
              }}
            >
              {t(lang, s === "general" ? "catalog" : s === "special" ? "tabSpecial" : "tabFavorites")}
            </button>
          ))}
        </nav>

        {favoritesTab && <FavoritesGrid lang={lang} onOpen={openProduct} />}

        {!favoritesTab && (
          <>
            <Toolbar
              lang={lang}
              q={filter.q}
              sort={filter.sort}
              inStock={filter.inStock}
              onSearch={(q) => update({ q })}
              onSort={(sort) => update({ sort })}
              onInStock={(inStock) => {
                haptic();
                update({ inStock });
              }}
            />

            {filter.section === "general" && categories.length > 0 && (
              <div className="chips">
                <button className={filter.categoryId === null ? "on" : ""} onClick={() => update({ categoryId: null })}>
                  {t(lang, "all")}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={c.id === filter.categoryId ? "on" : ""}
                    onClick={() => update({ categoryId: c.id })}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {showRecent && <RecentRow ids={recentIds} lang={lang} onOpen={openProduct} />}

            <main className="grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} onOpen={openProduct} />
              ))}
            </main>

            {!loading && !error && products.length === 0 && (
              <div className="center muted">{searching ? t(lang, "noResults") : t(lang, "empty")}</div>
            )}
            {loading && <div className="center muted">{t(lang, "loading")}</div>}
            {error && (
              <div className="center">
                <p>{t(lang, "error")}</p>
                <button className="btn" onClick={retry}>
                  {t(lang, "retry")}
                </button>
              </div>
            )}
            {hasMore && <div ref={sentinel} className="sentinel" />}
          </>
        )}
      </div>
    </ShopProvider>
  );
}
