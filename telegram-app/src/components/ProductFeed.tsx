import { useEffect, useRef } from "react";
import { t } from "../i18n";
import { useProducts } from "../useProducts";
import type { Language, Product, ProductFilter } from "../types";
import ProductCard, { SkeletonCards } from "./ProductCard";

interface Props {
  filter: ProductFilter;
  lang: Language;
  active: boolean; // false while its tab is hidden: don't load more pages in the background
  onOpen: (product: Product) => void;
  onTotal?: (total: number | null) => void; // e.g. "11 ta mahsulot" above the grid
}

/** Product grid with placeholder cards, empty/error states and infinite scroll. */
export default function ProductFeed({ filter, lang, active, onOpen, onTotal }: Props) {
  const { products, total, loading, hasMore, error, loadMore, retry } = useProducts(filter, lang);

  useEffect(() => onTotal?.(total), [total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the next page when the user scrolls near the bottom.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !active) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "500px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, active, products.length]);

  const firstLoad = loading && products.length === 0;

  return (
    <>
      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} lang={lang} onOpen={onOpen} />
        ))}
        {firstLoad && <SkeletonCards count={6} />}
        {loading && !firstLoad && <SkeletonCards count={2} />}
      </div>

      {!loading && !error && products.length === 0 && (
        <div className="empty">{filter.q ? t(lang, "noResults") : t(lang, "empty")}</div>
      )}
      {error && (
        <div className="empty">
          <p>{t(lang, "error")}</p>
          <button className="btn" onClick={retry}>
            {t(lang, "retry")}
          </button>
        </div>
      )}
      {hasMore && <div ref={sentinel} className="sentinel" />}
    </>
  );
}
