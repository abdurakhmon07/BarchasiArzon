import { useEffect } from "react";
import { confirmDialog, tg } from "../telegram";
import { formatPrice, t } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";
import { Photo } from "./ProductCard";
import QuantityControl from "./QuantityControl";

interface Props {
  lang: Language;
  onClose: () => void;
  onOpen: (product: Product) => void;
}

/** Cart: lines with − / + and the total at current prices. No ordering yet. */
export default function CartScreen({ lang, onClose, onOpen }: Props) {
  const { cart, setQuantity, clearCart, busy } = useShop();

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

  const askClear = async () => {
    if (await confirmDialog(t(lang, "clearCartConfirm"))) await clearCart();
  };

  return (
    <div className="cart">
      <header className="cart-head">
        <h1>🛒 {t(lang, "cart")}</h1>
        {!tg?.initData && (
          <button className="btn" onClick={onClose}>
            {t(lang, "close")}
          </button>
        )}
      </header>

      {cart.lines.length === 0 ? (
        <div className="center muted">{t(lang, "cartEmpty")}</div>
      ) : (
        <>
          <ul className="cart-lines">
            {cart.lines.map((line) => (
              <li key={line.product.id} className={`cart-line ${line.available ? "" : "unavailable"}`}>
                <button className="cart-photo" onClick={() => onOpen(line.product)}>
                  <Photo url={line.product.photoUrl} alt={line.product.name} />
                </button>
                <div className="cart-info">
                  <button className="cart-name" onClick={() => onOpen(line.product)}>
                    {line.product.name}
                  </button>
                  <div className="cart-unit">
                    {formatPrice(line.product.price, lang)} × {line.quantity}
                  </div>
                  {!line.available && <div className="cart-warn">{t(lang, "notAvailable")}</div>}
                  <div className="cart-row">
                    <QuantityControl
                      quantity={line.quantity}
                      disabled={busy}
                      canIncrease={line.available}
                      onChange={(q) => setQuantity(line.product, q)}
                    />
                    <div className="cart-line-total">{line.available ? formatPrice(line.lineTotal, lang) : "—"}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <footer className="cart-total">
            <div className="cart-total-row">
              <span>
                {t(lang, "total")} · {cart.totalQuantity} {t(lang, "pcs")}
              </span>
              <strong>{formatPrice(cart.totalAmount, lang)}</strong>
            </div>
            <button className="link-danger" disabled={busy} onClick={askClear}>
              {t(lang, "clearCart")}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
