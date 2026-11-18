import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { guessLanguage, t } from "./i18n";
import { haptic, initData, tg } from "./telegram";
import { loadRecent, rememberViewed } from "./recent";
import { ShopProvider } from "./shop";
import ProductSheet from "./components/ProductSheet";
import BottomNav from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import CatalogScreen from "./screens/CatalogScreen";
import DealsScreen from "./screens/DealsScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import CartScreen from "./screens/CartScreen";
import type { Category, Home, Language, Product, Tab, User } from "./types";

/** Product id from a shared link: ?product=<id> (bot button) or start_param p_<id> (t.me/...?startapp=). */
function sharedProductId(): string | null {
  const fromUrl = new URLSearchParams(location.search).get("product");
  const fromStart = /^p_([a-f0-9]{24})$/.exec(tg?.initDataUnsafe?.start_param ?? "")?.[1];
  const id = fromUrl ?? fromStart ?? null;
  return id && /^[a-f0-9]{24}$/.test(id) ? id : null;
}

type Preset = { categoryId: string | null; n: number };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [home, setHome] = useState<Home | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [opened, setOpened] = useState<Product | null>(null);
  // Home → a category or "see all" opens Deals/Catalog with that filter; n changes on every jump.
  const [dealsPreset, setDealsPreset] = useState<Preset>({ categoryId: null, n: 0 });
  const scrollByTab = useRef<Partial<Record<Tab, number>>>({});
  const tabRef = useRef<Tab>("home");

  const lang: Language = user?.language ?? guessLanguage(tg?.initDataUnsafe?.user?.language_code);

  /** Switch tab, remembering where each tab was scrolled to. */
  const goTab = useCallback((next: Tab) => {
    scrollByTab.current[tabRef.current] = window.scrollY;
    tabRef.current = next;
    setOpened(null);
    setTab(next);
    requestAnimationFrame(() => window.scrollTo(0, scrollByTab.current[next] ?? 0));
  }, []);

  const openProduct = useCallback((p: Product) => {
    haptic();
    scrollByTab.current[tabRef.current] = window.scrollY;
    setOpened(p);
    setRecentIds((ids) => rememberViewed(ids, p.id));
  }, []);

  const closeProduct = useCallback(() => {
    setOpened(null);
    requestAnimationFrame(() => window.scrollTo(0, scrollByTab.current[tabRef.current] ?? 0));
  }, []);

  const openDeals = useCallback(
    (categoryId?: string) => {
      setDealsPreset((p) => ({ categoryId: categoryId ?? null, n: p.n + 1 }));
      scrollByTab.current.deals = 0;
      goTab("deals");
    },
    [goTab]
  );
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

  // Names come back in the user's language: reload when it changes. Home also refreshes each time it's shown.
  useEffect(() => {
    if (!user) return;
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, [user?.language]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user || (tab !== "home" && home)) return;
    api.home().then(setHome).catch(() => undefined);
  }, [user?.language, tab]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return <div className="empty big">{t(lang, "openInTelegram")}</div>;
  }
  if (bootError) {
    return (
      <div className="empty big">
        <p>{bootError}</p>
        <button className="btn" onClick={boot}>
          {t(lang, "retry")}
        </button>
      </div>
    );
  }
  if (!user) return <div className="empty big">{t(lang, "loading")}</div>;

  const showing = (name: Tab) => tab === name && !opened;

  return (
    <ShopProvider lang={user.language}>
      {opened && <ProductSheet product={opened} lang={lang} botUsername={botUsername} onClose={closeProduct} />}

      {/* Every tab stays mounted (just hidden), so its products, filters and scroll position survive switching. */}
      <div className="tabs-root" hidden={Boolean(opened)}>
        <div hidden={tab !== "home"}>
          <HomeScreen
            lang={lang}
            active={showing("home")}
            home={home}
            onOpen={openProduct}
            onLanguage={changeLanguage}
            onDeals={openDeals}
          />
        </div>
        <div hidden={tab !== "catalog"}>
          <CatalogScreen
            lang={lang}
            active={showing("catalog")}
            categories={categories}
            onOpen={openProduct}
          />
        </div>
        <div hidden={tab !== "deals"}>
          <DealsScreen
            lang={lang}
            active={showing("deals")}
            home={home}
            categories={categories}
            preset={dealsPreset}
            onOpen={openProduct}
          />
        </div>
        <div hidden={tab !== "favorites"}>
          <FavoritesScreen lang={lang} active={showing("favorites")} recentIds={recentIds} onOpen={openProduct} />
        </div>
        <div hidden={tab !== "cart"}>
          <CartScreen lang={lang} onOpen={openProduct} onDeals={() => openDeals()} />
        </div>
        <BottomNav lang={lang} active={tab} onChange={goTab} />
      </div>
    </ShopProvider>
  );
}
