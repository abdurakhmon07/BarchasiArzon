import { useEffect } from "react";
import { t } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";
import ProductCard from "../components/ProductCard";
import RecentRow from "../components/RecentRow";

interface Props {
  lang: Language;
  active: boolean;
  recentIds: string[];
  onOpen: (p: Product) => void;
}

/** ❤️ Sevimli: recently viewed products on top, then the user's saved products. */
export default function FavoritesScreen({ lang, active, recentIds, onOpen }: Props) {
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
      <RecentRow ids={recentIds} lang={lang} onOpen={onOpen} />
      {recentIds.length > 0 && favorites.length > 0 && (
        <div className="sec-head">
          <h2>❤️ {t(lang, "favoritesTitle")}</h2>
        </div>
      )}
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
