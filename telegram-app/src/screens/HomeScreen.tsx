import { useState } from "react";
import { formatPrice, t } from "../i18n";
import type { Home, Language, Product, ProductFilter } from "../types";
import SearchBar from "../components/SearchBar";
import ProductFeed from "../components/ProductFeed";
import { DealHeroCard, SkeletonCards } from "../components/ProductCard";
import FilterSheet from "../components/FilterSheet";
import type { Sort } from "../types";

const LANGS: Language[] = ["uz", "ru", "en"];
const FLAGS: Record<Language, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

interface Props {
  lang: Language;
  active: boolean;
  home: Home | null;
  onOpen: (product: Product) => void;
  onLanguage: (lang: Language) => void;
  onDeals: (categoryId?: string) => void;
}

/** Logo + language switch, shared look for the top of the home screen. */
function BrandHeader({ lang, onLanguage }: { lang: Language; onLanguage: (l: Language) => void }) {
  return (
    <div className="brandrow">
      <div className="logo">
        <i>%</i>Barchasi <span>Arzon</span>
      </div>
      <label className="lang">
        {FLAGS[lang]} {lang.toUpperCase()} ▾
        <select value={lang} onChange={(e) => onLanguage(e.target.value as Language)} aria-label="Language">
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {FLAGS[l]} {l.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/**
 * Home: deals first — the big "Bugungi aksiyalar" row and how much you can save today,
 * then every product mixed in one long feed. Typing in search shows results from the whole shop.
 * (Categories live in Katalog/Aksiyalar; "recently viewed" lives in the Sevimli tab.)
 */
export default function HomeScreen(props: Props) {
  const { lang, active, home, onOpen, onLanguage, onDeals } = props;
  const [q, setQ] = useState("");
  // The "all products" feed under the deals: every visible product, deals and regular mixed, newest first.
  const [feedSort, setFeedSort] = useState<Sort | null>(null);
  const [feedInStock, setFeedInStock] = useState(false);
  const [sheet, setSheet] = useState(false);
  const searchFilter: ProductFilter = { section: "all", categoryId: null, q, sort: null, inStock: false, minDiscount: 0 };
  const feedFilter: ProductFilter = {
    section: "all",
    categoryId: null,
    q: "",
    sort: feedSort,
    inStock: feedInStock,
    minDiscount: 0,
  };
  const sortKeys: Record<Sort, Parameters<typeof t>[1]> = {
    newest: "sortNewest",
    discount: "sortDiscount",
    price_asc: "sortPriceAsc",
    price_desc: "sortPriceDesc",
    name: "sortName",
  };

  return (
    <div className="screen">
      <header className="head">
        <BrandHeader lang={lang} onLanguage={onLanguage} />
        <SearchBar value={q} placeholder={t(lang, "searchAll")} onSearch={setQ} />
      </header>

      {q ? (
        <>
          <div className="sec-head">
            <h2>{t(lang, "searchResults")}</h2>
          </div>
          <ProductFeed filter={searchFilter} lang={lang} active={active} onOpen={onOpen} />
        </>
      ) : (
        <>
          <div className="sec-head">
            <h2>
              🔥 {t(lang, "todayDeals")} {home && home.dealCount > 0 && <em className="count-pill">{home.dealCount}</em>}
            </h2>
            <button className="link" onClick={() => onDeals()}>
              {t(lang, "seeAll")}
            </button>
          </div>
          <div className="hscroll hero">
            {home ? (
              home.topDeals.map((p) => <DealHeroCard key={p.id} product={p} lang={lang} onOpen={onOpen} />)
            ) : (
              <div className="grid hero-skeleton">
                <SkeletonCards count={2} />
              </div>
            )}
            {home && home.topDeals.length === 0 && <div className="empty">{t(lang, "empty")}</div>}
          </div>

          {home && home.totalSaving > 0 && (
            <button className="savestrip" onClick={() => onDeals()}>
              <b aria-hidden>💸</b>
              <div>
                <strong>{t(lang, "canSaveToday", { n: formatPrice(home.totalSaving, lang) })}</strong>
                {t(lang, "canSaveHint")}
              </div>
              <span>{t(lang, "see")}</span>
            </button>
          )}

          <div className="sec-head">
            <h2>🛍 {t(lang, "allProducts")}</h2>
            <button className="link-muted" onClick={() => setSheet(true)}>
              <b>{t(lang, feedSort ? sortKeys[feedSort] : "sortNewest")}</b>
              {feedInStock ? " · ✓" : ""} ▾
            </button>
          </div>
          <ProductFeed filter={feedFilter} lang={lang} active={active} onOpen={onOpen} />
        </>
      )}

      {sheet && (
        <FilterSheet
          lang={lang}
          sort={feedSort}
          inStock={feedInStock}
          sorts={["discount", "price_asc", "price_desc", "name"]}
          defaultSortKey="sortNewest"
          onSort={setFeedSort}
          onInStock={setFeedInStock}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}
