import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { guessLanguage, t } from "./i18n";
import { haptic, initData, tg } from "./telegram";
import { useProducts } from "./useProducts";
import ProductCard from "./components/ProductCard";
import ProductSheet from "./components/ProductSheet";
import type { Category, Language, Product, Section, User } from "./types";

const LANGS: Language[] = ["uz", "ru", "en"];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [section, setSection] = useState<Section>("general");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [opened, setOpened] = useState<Product | null>(null);

  const lang: Language = user?.language ?? guessLanguage(tg?.initDataUnsafe?.user?.language_code);
  const { products, loading, hasMore, error, loadMore, retry } = useProducts(
    section,
    categoryId,
    user ? user.language : null
  );

  // Who is this? (the backend checks Telegram's signature and remembers the language)
  const boot = useCallback(() => {
    setBootError(null);
    api.me().then(setUser).catch((e) => setBootError(e.message));
  }, []);
  useEffect(() => {
    if (initData) boot();
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
  }, [loadMore]);

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

  const closeSheet = useCallback(() => setOpened(null), []);

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

  if (opened) return <ProductSheet product={opened} lang={lang} onClose={closeSheet} />;

  return (
    <div className="app">
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
            className={s === section ? "on" : ""}
            onClick={() => {
              haptic();
              setSection(s);
            }}
          >
            {s === "general" ? t(lang, "catalog") : t(lang, "special")}
          </button>
        ))}
      </nav>

      {section === "general" && categories.length > 0 && (
        <div className="chips">
          <button className={categoryId === null ? "on" : ""} onClick={() => setCategoryId(null)}>
            {t(lang, "all")}
          </button>
          {categories.map((c) => (
            <button key={c.id} className={c.id === categoryId ? "on" : ""} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <main className="grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            lang={lang}
            onOpen={(prod) => {
              haptic();
              setOpened(prod);
            }}
          />
        ))}
      </main>

      {!loading && !error && products.length === 0 && <div className="center muted">{t(lang, "empty")}</div>}
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
  );
}
