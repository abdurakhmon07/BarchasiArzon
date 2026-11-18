import { useEffect, useState } from "react";
import { t } from "../i18n";
import { haptic } from "../telegram";
import type { Category, Home, Language, Product, ProductFilter, Sort } from "../types";
import SearchBar from "../components/SearchBar";
import ProductFeed from "../components/ProductFeed";
import FilterSheet from "../components/FilterSheet";

const MIN_DISCOUNTS = [0, 20, 30, 50];

interface Props {
  lang: Language;
  active: boolean;
  home: Home | null;
  categories: Category[];
  preset: { categoryId: string | null; n: number }; // set when Home sends the user here
  onOpen: (product: Product) => void;
}

/** Aksiyalar: every special-price product, biggest discount first, with discount and category pills. */
export default function DealsScreen({ lang, active, home, categories, preset, onOpen }: Props) {
  const [filter, setFilter] = useState<ProductFilter>({
    section: "special",
    categoryId: null,
    q: "",
    sort: "discount",
    inStock: false,
    minDiscount: 0,
  });
  const [total, setTotal] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const update = (patch: Partial<ProductFilter>) => setFilter((f) => ({ ...f, ...patch }));

  // Home → "Tozalash · 9 aksiya" opens this screen filtered to that category.
  useEffect(() => {
    if (preset.n > 0) update({ categoryId: preset.categoryId, minDiscount: 0, q: "" });
  }, [preset.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const dealCategories = categories.filter((c) => c.dealCount > 0);
  const pill = (on: boolean, label: string, onClick: () => void, key: string) => (
    <button
      key={key}
      className={`pill ${on ? "on" : ""}`}
      onClick={() => {
        haptic();
        onClick();
      }}
    >
      {label}
    </button>
  );
  const sortLabel: Record<Sort, Parameters<typeof t>[1]> = {
    discount: "sortDiscount",
    name: "sortName",
    price_asc: "sortPriceAsc",
    price_desc: "sortPriceDesc",
    newest: "sortNewest",
  };

  return (
    <div className="screen">
      <header className="deals-head">
        <h1>🔥 {t(lang, "dealsTitle")}</h1>
        {home && home.dealCount > 0 && (
          <p>{t(lang, "dealsSubtitle", { n: home.dealCount, p: home.maxDiscount })}</p>
        )}
        <SearchBar value={filter.q} placeholder={t(lang, "searchDeals")} onSearch={(q) => update({ q })} light />
      </header>

      <div className="pills">
        {MIN_DISCOUNTS.map((d) =>
          pill(
            filter.minDiscount === d && (d > 0 || !filter.categoryId),
            d === 0 ? t(lang, "all") : `${d}%+`,
            () => update(d === 0 ? { minDiscount: 0, categoryId: null } : { minDiscount: d }),
            `d${d}`
          )
        )}
        {dealCategories.map((c) =>
          pill(
            filter.categoryId === c.id,
            `${c.icon ? c.icon + " " : ""}${c.name}`,
            () => update({ categoryId: filter.categoryId === c.id ? null : c.id }),
            c.id
          )
        )}
      </div>

      <div className="listbar">
        <span>{total !== null ? t(lang, "productsCount", { n: total }) : ""}</span>
        <button className="link-muted" onClick={() => setSheet(true)}>
          {t(lang, "sortBy")}: <b>{filter.sort ? t(lang, sortLabel[filter.sort]) : t(lang, "sortDiscount")}</b>
          {filter.inStock ? " · ✓" : ""} ▾
        </button>
      </div>

      <ProductFeed filter={filter} lang={lang} active={active} onOpen={onOpen} onTotal={setTotal} />

      {sheet && (
        <FilterSheet
          lang={lang}
          sort={filter.sort === "discount" ? null : filter.sort}
          inStock={filter.inStock}
          sorts={["price_asc", "price_desc", "newest", "name"]}
          defaultSortKey="sortDiscount"
          onSort={(s) => update({ sort: s ?? "discount" })}
          onInStock={(inStock) => update({ inStock })}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}
