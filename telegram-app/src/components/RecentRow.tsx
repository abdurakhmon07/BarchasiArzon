import { useEffect, useState } from "react";
import { api } from "../api";
import { t } from "../i18n";
import type { Language, Product } from "../types";
import { DiscountBadge, Photo, PriceLine } from "./ProductCard";

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
    <section>
      <div className="sec-head">
        <h2>🕘 {t(lang, "recent")}</h2>
      </div>
      <div className="hscroll">
        {products.map((p) => (
          <button key={p.id} className="mini-card" onClick={() => onOpen(p)}>
            <div className="mini-photo">
              <Photo url={p.photoUrl} alt={p.name} />
              <DiscountBadge percent={p.discountPercent} />
            </div>
            <PriceLine product={p} lang={lang} />
            <div className="mini-name">{p.name}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
