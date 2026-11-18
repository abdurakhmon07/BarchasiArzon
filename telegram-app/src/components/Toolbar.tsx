import { useEffect, useState } from "react";
import { t } from "../i18n";
import type { Language, Sort } from "../types";

interface Props {
  lang: Language;
  q: string;
  sort: Sort | null;
  inStock: boolean;
  onSearch: (q: string) => void;
  onSort: (sort: Sort | null) => void;
  onInStock: (inStock: boolean) => void;
}

const SORTS: { value: Sort | ""; key: Parameters<typeof t>[1] }[] = [
  { value: "", key: "sortDefault" },
  { value: "name", key: "sortName" },
  { value: "price_asc", key: "sortPriceAsc" },
  { value: "price_desc", key: "sortPriceDesc" },
  { value: "newest", key: "sortNewest" },
];

/** Search box (waits until typing pauses) + sort menu + "in stock only" switch. */
export default function Toolbar({ lang, q, sort, inStock, onSearch, onSort, onInStock }: Props) {
  const [text, setText] = useState(q);

  useEffect(() => setText(q), [q]); // e.g. cleared from outside

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === q) return;
    const timer = setTimeout(() => onSearch(trimmed), 350);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="toolbar">
      <div className="search">
        <span className="search-icon" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={t(lang, "search")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {text && (
          <button className="search-clear" aria-label="Clear" onClick={() => setText("")}>
            ✕
          </button>
        )}
      </div>
      <div className="filters">
        <select
          className={sort ? "on" : ""}
          value={sort ?? ""}
          onChange={(e) => onSort((e.target.value || null) as Sort | null)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {t(lang, s.key)}
            </option>
          ))}
        </select>
        <button className={`toggle ${inStock ? "on" : ""}`} aria-pressed={inStock} onClick={() => onInStock(!inStock)}>
          {inStock ? "✓ " : ""}
          {t(lang, "inStockOnly")}
        </button>
      </div>
    </div>
  );
}
