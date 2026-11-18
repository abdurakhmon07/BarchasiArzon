import { confirmDialog } from "../telegram";
import { formatNumber, formatPrice, t } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";
import { Photo } from "../components/ProductCard";
import QuantityControl from "../components/QuantityControl";

interface Props {
  lang: Language;
  onOpen: (product: Product) => void;
  onDeals: () => void;
}

/** Savat: lines with − / +, how much the deals saved, and the total at current prices. No ordering yet. */
export default function CartScreen({ lang, onOpen, onDeals }: Props) {
  const { cart, setQuantity, clearCart, busy } = useShop();

  const askClear = async () => {
    if (await confirmDialog(t(lang, "clearCartConfirm"))) await clearCart();
  };

  if (cart.lines.length === 0) {
    return (
      <div className="screen">
        <header className="head">
          <h1 className="screen-title">🛒 {t(lang, "cart")}</h1>
        </header>
        <div className="empty big">
          <b>🛒</b>
          <strong>{t(lang, "cartEmpty")}</strong>
          {t(lang, "cartEmptyHint")}
          <button className="cta" onClick={onDeals}>
            {t(lang, "goDeals")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="head cart-head">
        <h1 className="screen-title">
          {t(lang, "cart")} <small>{cart.totalQuantity} {t(lang, "pcs")}</small>
        </h1>
        <button className="link-danger" disabled={busy} onClick={askClear}>
          {t(lang, "clearCart")}
        </button>
      </header>

      {cart.totalSaving > 0 && (
        <div className="party">
          <b aria-hidden>🎉</b>
          <div>
            <strong>{t(lang, "savedTotal", { n: formatPrice(cart.totalSaving, lang) })}</strong>
            {t(lang, "thanksToDeals")}
          </div>
        </div>
      )}

      <ul className="lines">
        {cart.lines.map((line) => {
          const p = line.product;
          return (
            <li key={p.id} className={`line ${line.available ? "" : "off"}`}>
              <button className="thumb" onClick={() => onOpen(p)}>
                <Photo url={p.photoUrl} alt={p.name} />
              </button>
              <div className="lmain">
                <button className="lname" onClick={() => onOpen(p)}>
                  {p.name}
                </button>
                <div className={`lprice ${p.discountPercent > 0 ? "deal" : ""}`}>
                  {formatPrice(p.price, lang)}
                  {p.oldPrice && <s>{formatNumber(p.oldPrice)}</s>}
                </div>
                {!line.available && <div className="warnline">{t(lang, "notAvailable")}</div>}
                <div className="lrow">
                  <QuantityControl
                    quantity={line.quantity}
                    disabled={busy}
                    canIncrease={line.available}
                    onChange={(q) => setQuantity(p, q)}
                  />
                  <div className="ltot">{line.available ? formatNumber(line.lineTotal) : "—"}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="summary">
        {cart.totalSaving > 0 ? (
          <>
            <div className="srow">
              <span>{t(lang, "regularPrice")}</span>
              <s>{formatPrice(cart.totalRegular, lang)}</s>
            </div>
            <div className="srow sale">
              <span>{t(lang, "dealDiscount")}</span>
              <span>−{formatPrice(cart.totalSaving, lang)}</span>
            </div>
          </>
        ) : (
          <div className="srow">
            <span>{t(lang, "products", { n: cart.totalQuantity })}</span>
            <span>{formatPrice(cart.totalAmount, lang)}</span>
          </div>
        )}
        <div className="srow total">
          <span>{t(lang, "total")}</span>
          <b>{formatPrice(cart.totalAmount, lang)}</b>
        </div>
      </div>
      <p className="note">{t(lang, "pricesNote")}</p>
    </div>
  );
}
