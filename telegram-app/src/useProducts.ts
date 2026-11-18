import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { Language, Product, ProductFilter } from "./types";

/** Loads products page by page; starts over when the filter or language changes. */
export function useProducts(filter: ProductFilter, lang: Language | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs, so the scroll observer always sees the latest values (no stale closures).
  const state = useRef({ page: 0, busy: false, hasMore: true, failed: false });
  const requestId = useRef(0); // ignores answers to requests made for an older filter

  // A string key, so a new filter object with the same values doesn't reload.
  const key = JSON.stringify(filter);

  const load = useCallback(
    async (page: number) => {
      if (!lang) return;
      const id = ++requestId.current;
      state.current.busy = true;
      state.current.failed = false;
      setLoading(true);
      setError(null);
      try {
        const res = await api.products(JSON.parse(key) as ProductFilter, page);
        if (id !== requestId.current) return;
        setProducts((prev) => (page === 1 ? res.products : [...prev, ...res.products]));
        state.current.page = res.page;
        state.current.hasMore = res.hasMore;
        setHasMore(res.hasMore);
      } catch (err) {
        if (id !== requestId.current) return;
        state.current.failed = true;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (id === requestId.current) {
          state.current.busy = false;
          setLoading(false);
        }
      }
    },
    [key, lang]
  );

  // New filter: forget everything and load page 1.
  useEffect(() => {
    state.current = { page: 0, busy: false, hasMore: true, failed: false };
    setProducts([]);
    setHasMore(true);
    load(1);
  }, [load]);

  const loadMore = useCallback(() => {
    const s = state.current;
    if (s.page > 0 && !s.busy && s.hasMore && !s.failed) load(s.page + 1);
  }, [load]);

  const retry = useCallback(() => load(state.current.page + 1), [load]);

  return { products, loading, hasMore, error, loadMore, retry };
}
