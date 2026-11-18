import { t, type TextKey } from "../i18n";
import { haptic } from "../telegram";
import type { Language, Sort } from "../types";

interface Props {
  lang: Language;
  sort: Sort | null;
  inStock: boolean;
  sorts: Sort[]; // which sorts make sense on this screen
  defaultSortKey: TextKey; // label for "null" (the screen's own default)
  onSort: (sort: Sort | null) => void;
  onInStock: (inStock: boolean) => void;
  onClose: () => void;
}

const LABELS: Record<Sort, TextKey> = {
  discount: "sortDiscount",
  name: "sortName",
  price_asc: "sortPriceAsc",
  price_desc: "sortPriceDesc",
  newest: "sortNewest",
};

/** Bottom sheet with sort options and the "in stock only" switch. Changes apply at once. */
export default function FilterSheet({ lang, sort, inStock, sorts, defaultSortKey, onSort, onInStock, onClose }: Props) {
  const options: { value: Sort | null; key: TextKey }[] = [
    { value: null, key: defaultSortKey },
    ...sorts.map((s) => ({ value: s, key: LABELS[s] })),
  ];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="bsheet" role="dialog" aria-label={t(lang, "filters")} onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h3>{t(lang, "sortBy")}</h3>
        <div className="radios">
          {options.map((o) => (
            <button
              key={o.key}
              className={`radio ${sort === o.value ? "on" : ""}`}
              onClick={() => {
                haptic();
                onSort(o.value);
              }}
            >
              {t(lang, o.key)}
              <i aria-hidden>{sort === o.value ? "●" : ""}</i>
            </button>
          ))}
        </div>
        <button className={`switch-row ${inStock ? "on" : ""}`} onClick={() => onInStock(!inStock)} aria-pressed={inStock}>
          {t(lang, "inStockOnly")}
          <span className="switch" aria-hidden />
        </button>
        <button className="cta" onClick={onClose}>
          {t(lang, "done")}
        </button>
      </div>
    </div>
  );
}
