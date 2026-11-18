import { useState } from "react";
import { formatPrice, t } from "../i18n";
import type { Category, Home, Language, Product, ProductFilter } from "../types";
import SearchBar from "../components/SearchBar";
import ProductFeed from "../components/ProductFeed";
import RecentRow from "../components/RecentRow";
import { DealHeroCard, SkeletonCards } from "../components/ProductCard";

const LANGS: Language[] = ["uz", "ru", "en"];
const FLAGS: Record<Language, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

interface Props {
  lang: Language;
  active: boolean;
  home: Home | null;
  categories: Category[];
  recentIds: string[];
  onOpen: (product: Product) => void;
  onLanguage: (lang: Language) => void;
  onDeals: (categoryId?: string) => void;
  onCatalog: (categoryId?: string) => void;
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
 * Home: deals first. Big "Bugungi aksiyalar" row, how much you can save today,
 * categories with their deal counts, recently viewed. Typing in search shows results from the whole shop.
 */
export default function HomeScreen(props: Props) {
  const { lang, active, home, categories, recentIds, onOpen, onLanguage, onDeals, onCatalog } = props;
  const [q, setQ] = useState("");
  const searchFilter: ProductFilter = { section: "all", categoryId: null, q, sort: null, inStock: false, minDiscount: 0 };

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

          {categories.length > 0 && (
            <>
              <div className="sec-head">
                <h2>{t(lang, "categories")}</h2>
              </div>
              <div className="hscroll cats">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className="cat"
                    // Deals first: a category with deals opens Aksiyalar, otherwise the catalog.
                    onClick={() => (c.dealCount > 0 ? onDeals(c.id) : onCatalog(c.id))}
                  >
                    <div className="cat-icon">{c.icon || c.name.charAt(0)}</div>
                    <span className="cat-name">{c.name}</span>
                    {c.dealCount > 0 && <span className="cat-deals">{t(lang, "dealsInCategory", { n: c.dealCount })}</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          <RecentRow ids={recentIds} lang={lang} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}
