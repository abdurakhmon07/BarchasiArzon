import { useEffect } from "react";
import { tg } from "../telegram";
import { formatPrice, t } from "../i18n";
import type { Language, Product } from "../types";
import { Photo, StatusBadge } from "./ProductCard";

interface Props {
  product: Product;
  lang: Language;
  onClose: () => void;
}

/** Full-screen product view. Telegram's own Back button closes it. */
export default function ProductSheet({ product, lang, onClose }: Props) {
  useEffect(() => {
    const back = tg?.BackButton;
    back?.onClick(onClose);
    back?.show();
    window.scrollTo(0, 0);
    return () => {
      back?.offClick(onClose);
      back?.hide();
    };
  }, [onClose]);

  return (
    <div className="sheet" role="dialog" aria-label={product.name}>
      <div className="sheet-photo">
        <Photo url={product.photoUrl} alt={product.name} />
      </div>
      <div className="sheet-body">
        {product.isSpecial && <div className="sheet-special">{t(lang, "special")}</div>}
        <h1 className="sheet-name">{product.name}</h1>
        <div className="sheet-price">{formatPrice(product.price, lang)}</div>
        <StatusBadge status={product.status} lang={lang} />
        {product.description && (
          <>
            <h2 className="sheet-h2">{t(lang, "description")}</h2>
            <p className="sheet-desc">{product.description}</p>
          </>
        )}
        {/* Fallback for opening the page outside Telegram, where there is no Back button */}
        {!tg?.initData && (
          <button className="btn" onClick={onClose}>
            {t(lang, "close")}
          </button>
        )}
      </div>
    </div>
  );
}
