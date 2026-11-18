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
import type { Category, Language, Product, ProductFilter, Section, User } from "./types";

const LANGS: Language[] = ["uz", "ru", "en"];

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
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const listScroll = useRef(0);

  const lang: Language = user?.language ?? guessLanguage(tg?.initDataUnsafe?.user?.language_code);
  const { products, loading, hasMore, error, loadMore, retry } = useProducts(filter, user ? user.language : null);
  const update = (patch: Partial<ProductFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const openProduct = useCallback((p: Product) => {
    haptic();
    listScroll.current = window.scrollY;
    setOpened(p);
    setRecentIds((ids) => rememberViewed(ids, p.id));
  }, []);

  const closeSheet = useCallback(() => {
    setOpened(null);
    requestAnimationFrame(() => window.scrollTo(0, listScroll.current)); // back to where the user was
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
        if (id) api.product(id).then(openProduct).catch(() => undefined);
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
    api.categories().then(setCategories).catch(() => setCategories([]));
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
    <>
      {opened && <ProductSheet product={opened} lang={lang} botUsername={botUsername} onClose={closeSheet} />}

      {/* The list stays mounted (just hidden) so its products and scroll position survive opening a product. */}
      <div className="app" hidden={Boolean(opened)}>
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
          {(["general", "special"] as Section[]).map((s) => (
            <button
              key={s}
              className={s === filter.section ? "on" : ""}
              onClick={() => {
                haptic();
                update({ section: s });
              }}
            >
              {s === "general" ? t(lang, "catalog") : t(lang, "special")}
            </button>
          ))}
        </nav>

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
      </div>
    </>
  );
}
