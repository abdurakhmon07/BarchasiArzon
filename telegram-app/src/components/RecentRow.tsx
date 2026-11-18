import { useEffect, useState } from "react";
import { api } from "../api";
import { formatPrice, t } from "../i18n";
import type { Language, Product } from "../types";
import { Photo } from "./ProductCard";

interface Props {
  ids: string[];
  lang: Language;
  onOpen: (product: Product) => void;
}

/** Horizontal strip of products the user opened recently. Hidden when there are none. */
export default function RecentRow({ ids, lang, onOpen }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const key = ids.join(",");

  useEffect(() => {
    let alive = true;
    api
      .productsByIds(ids)
      .then((p) => alive && setProducts(p))
      .catch(() => alive && setProducts([]));
    return () => {
      alive = false;
    };
  }, [key, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!products.length) return null;

  return (
    <section className="recent">
      <h2 className="recent-title">{t(lang, "recent")}</h2>
      <div className="recent-row">
        {products.map((p) => (
          <button key={p.id} className="recent-item" onClick={() => onOpen(p)}>
            <div className="recent-photo">
              <Photo url={p.photoUrl} alt={p.name} />
            </div>
            <div className="recent-name">{p.name}</div>
            <div className="recent-price">{formatPrice(p.price, lang)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
