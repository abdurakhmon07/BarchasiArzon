import { useEffect, useState } from "react";
import { t } from "../i18n";
import { haptic } from "../telegram";
import type { Category, Language, Product, ProductFilter } from "../types";
import SearchBar from "../components/SearchBar";
import ProductFeed from "../components/ProductFeed";
import FilterSheet from "../components/FilterSheet";

interface Props {
  lang: Language;
  active: boolean;
  categories: Category[];
  preset: { categoryId: string | null; n: number };
  onOpen: (product: Product) => void;
}

/** Katalog: regular (non-special) products by category. */
export default function CatalogScreen({ lang, active, categories, preset, onOpen }: Props) {
  const [filter, setFilter] = useState<ProductFilter>({
    section: "general",
    categoryId: null,
    q: "",
    sort: null,
    inStock: false,
    minDiscount: 0,
  });
  const [total, setTotal] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const update = (patch: Partial<ProductFilter>) => setFilter((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (preset.n > 0) update({ categoryId: preset.categoryId, q: "" });
  }, [preset.n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      <header className="head">
        <h1 className="screen-title">📦 {t(lang, "catalogTitle")}</h1>
        <SearchBar
          value={filter.q}
          placeholder={t(lang, "searchCatalog")}
          onSearch={(q) => update({ q })}
          onFilter={() => setSheet(true)}
          filterActive={Boolean(filter.sort) || filter.inStock}
        />
      </header>

      <div className="pills">
        <button className={`pill ${filter.categoryId === null ? "on" : ""}`} onClick={() => update({ categoryId: null })}>
          {t(lang, "all")}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`pill ${filter.categoryId === c.id ? "on" : ""}`}
            onClick={() => {
              haptic();
              update({ categoryId: c.id });
            }}
          >
            {c.icon ? `${c.icon} ` : ""}
            {c.name}
          </button>
        ))}
      </div>

      <div className="listbar">
        <span>{total !== null ? t(lang, "productsCount", { n: total }) : ""}</span>
      </div>

      <ProductFeed filter={filter} lang={lang} active={active} onOpen={onOpen} onTotal={setTotal} />

      {sheet && (
        <FilterSheet
          lang={lang}
          sort={filter.sort}
          inStock={filter.inStock}
          sorts={["price_asc", "price_desc", "newest", "name"]}
          defaultSortKey="sortDefault"
          onSort={(sort) => update({ sort })}
          onInStock={(inStock) => update({ inStock })}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}
