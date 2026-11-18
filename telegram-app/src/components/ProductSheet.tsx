import { useEffect } from "react";
import { haptic, tg } from "../telegram";
import { formatNumber, formatPrice, t } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";
import { DiscountBadge, HeartButton, PriceLine, StatusDot } from "./ProductCard";
import QuantityControl from "./QuantityControl";
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
  const deal = product.discountPercent > 0 ? ` (−${product.discountPercent}%)` : "";
  const text = `${product.name} — ${formatPrice(product.price, lang)}${deal}`;
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
  const deal = product.discountPercent > 0;

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
    <div className="pview" role="dialog" aria-label={product.name}>
      <div className={`pphoto ${deal ? "pphoto-deal" : ""}`}>
        <Gallery photos={product.photos} alt={product.name} />
        <DiscountBadge percent={product.discountPercent} size="big" />
        <div className="ptools">
          {botUsername && (
            <button className="round" aria-label={t(lang, "share")} onClick={() => share(product, lang, botUsername)}>
              ↗
            </button>
          )}
          <HeartButton product={product} className="round" />
        </div>
        {!tg?.initData && (
          <button className="round pclose" onClick={onClose} aria-label={t(lang, "close")}>
            ✕
          </button>
        )}
      </div>

      <div className="psheet">
        <PriceLine product={product} lang={lang} big />
        <h1 className="pname">{product.name}</h1>

        {deal && (
          <div className="savebox">
            <b aria-hidden>💰</b>
            <div>
              <strong>{t(lang, "youSave", { n: formatPrice(product.saving, lang) })}</strong>
              {t(lang, "cheaperBy", { p: product.discountPercent })}
            </div>
          </div>
        )}

        <div className="chips">
          <span className={`chip chip-${product.status}`}>
            <StatusDot status={product.status} lang={lang} />
          </span>
          {product.isSpecial && <span className="chip">{t(lang, "dealChip")}</span>}
        </div>

        {product.description && (
          <>
            <h2 className="ptitle">{t(lang, "description")}</h2>
            <p className="pdesc">{product.description}</p>
          </>
        )}
      </div>

      <div className="buybar">
        {soldOut ? (
          <button className="cta" disabled>
            {t(lang, "soldOut")}
          </button>
        ) : inCart ? (
          <>
            <QuantityControl size="large" quantity={inCart} disabled={busy} onChange={(q) => setQuantity(product, q)} />
            <div className="cta cta-ghost">{t(lang, "inCart", { n: formatPrice(product.price * inCart, lang) })}</div>
          </>
        ) : (
          <>
            <div className="buyprice">
              <small>{t(lang, deal ? "dealPrice" : "price")}</small>
              <b className={deal ? "deal" : ""}>{formatNumber(product.price)}</b>
            </div>
            <button className="cta" disabled={busy} onClick={() => setQuantity(product, 1)}>
              🛒 {t(lang, "addToCart")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
