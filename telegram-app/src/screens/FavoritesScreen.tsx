import { useEffect } from "react";
import { t } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";
import ProductCard from "../components/ProductCard";

/** ❤️ Sevimlilar: the user's saved products. */
export default function FavoritesScreen({ lang, active, onOpen }: { lang: Language; active: boolean; onOpen: (p: Product) => void }) {
  const { favorites, reloadFavorites } = useShop();

  // Fresh list each time the tab is opened (an admin may have hidden or changed something).
  useEffect(() => {
    if (active) reloadFavorites();
  }, [active, reloadFavorites]);

  return (
    <div className="screen">
      <header className="head">
        <h1 className="screen-title">
          ❤️ {t(lang, "favoritesTitle")} {favorites.length > 0 && <small>{favorites.length}</small>}
        </h1>
      </header>
      {favorites.length ? (
        <div className="grid">
          {favorites.map((p) => (
            <ProductCard key={p.id} product={p} lang={lang} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="empty big">
          <b>🤍</b>
          {t(lang, "noFavorites")}
        </div>
      )}
    </div>
  );
}
