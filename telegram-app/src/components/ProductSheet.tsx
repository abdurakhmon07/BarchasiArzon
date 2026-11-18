import { useEffect } from "react";
import { haptic, tg } from "../telegram";
import { formatPrice, t } from "../i18n";
import type { Language, Product } from "../types";
import { HeartButton, StatusBadge } from "./ProductCard";
import QuantityControl from "./QuantityControl";
import { useShop } from "../shop";
import Gallery from "./Gallery";

interface Props {
  product: Product;
  lang: Language;
  botUsername: string | null;
  onClose: () => void;
}

/** Opens Telegram's "send to…" screen with a link that shows this product in the bot. */
async function share(product: Product, lang: Language, botUsername: string) {
  haptic();
  const link = `https://t.me/${botUsername}?start=p_${product.id}`;
  const text = `${product.name} — ${formatPrice(product.price, lang)}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    alert(t(lang, "linkCopied"));
  } catch {
    window.open(shareUrl, "_blank");
  }
}

/** Full-screen product view. Telegram's own Back button closes it. */
export default function ProductSheet({ product, lang, botUsername, onClose }: Props) {
  const { quantityOf, setQuantity, busy } = useShop();
  const inCart = quantityOf(product.id);
  const soldOut = product.status === "out_of_stock";

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
        <Gallery photos={product.photos} alt={product.name} />
      </div>
      <div className="sheet-body">
        {product.isSpecial && <div className="sheet-special">{t(lang, "special")}</div>}
        <h1 className="sheet-name">{product.name}</h1>
        <div className="sheet-price">{formatPrice(product.price, lang)}</div>
        <div className="sheet-row">
          <StatusBadge status={product.status} lang={lang} />
          <div className="sheet-actions">
            {botUsername && (
              <button className="share" onClick={() => share(product, lang, botUsername)}>
                ↗ {t(lang, "share")}
              </button>
            )}
            <HeartButton product={product} className="heart-sheet" />
          </div>
        </div>

        <div className="sheet-cart">
          {soldOut ? (
            <button className="btn btn-wide" disabled>
              {t(lang, "soldOut")}
            </button>
          ) : inCart ? (
            <QuantityControl
              size="large"
              quantity={inCart}
              disabled={busy}
              onChange={(q) => setQuantity(product, q)}
            />
          ) : (
            <button className="btn btn-wide" disabled={busy} onClick={() => setQuantity(product, 1)}>
              🛒 {t(lang, "addToCart")}
            </button>
          )}
        </div>
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
