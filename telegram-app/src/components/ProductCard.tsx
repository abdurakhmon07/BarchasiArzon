import { photoSrc } from "../api";
import { currency, formatNumber, formatPrice, statusText, t } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";

export function Photo({ url, alt }: { url: string | null; alt: string }) {
  const src = photoSrc(url);
  return src ? (
    <img className="photo" src={src} alt={alt} loading="lazy" />
  ) : (
    <div className="photo photo-empty" aria-hidden>
      🧴
    </div>
  );
}

/** ● Kam qoldi — a coloured dot instead of a big pill. */
export function StatusDot({ status, lang }: { status: Product["status"]; lang: Language }) {
  return <span className={`dot dot-${status}`}>{statusText(lang, status)}</span>;
}

/** "−35%" badge; nothing when there is no discount. */
export function DiscountBadge({ percent, size = "small" }: { percent: number; size?: "small" | "big" }) {
  if (percent <= 0) return null;
  return <span className={`disc disc-${size}`}>−{percent}%</span>;
}

/** "💰 14 000 so'm tejang" */
export function SaveChip({ product, lang }: { product: Product; lang: Language }) {
  if (product.saving <= 0) return null;
  return <span className="save">💰 {t(lang, "save", { n: formatPrice(product.saving, lang) })}</span>;
}

/** Price (red when discounted) + old price crossed out. */
export function PriceLine({ product, lang, big }: { product: Product; lang: Language; big?: boolean }) {
  const deal = product.discountPercent > 0;
  return (
    <div className={`priceline ${big ? "priceline-big" : ""}`}>
      <span className={`price ${deal ? "price-deal" : ""}`}>
        {formatNumber(product.price)}
        <small> {currency(lang)}</small>
      </span>
      {deal && product.oldPrice && <s className="oldprice">{formatNumber(product.oldPrice)}</s>}
    </div>
  );
}

export function HeartButton({ product, className = "" }: { product: Product; className?: string }) {
  const { isFavorite, toggleFavorite } = useShop();
  const on = isFavorite(product.id);
  return (
    <button
      className={`heart ${on ? "on" : ""} ${className}`}
      aria-label="Favorite"
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation(); // don't also open the product
        toggleFavorite(product);
      }}
    >
      {on ? "❤️" : "🤍"}
    </button>
  );
}

/** Orange "+" on the photo corner; shows the quantity once the product is in the cart. */
function AddButton({ product }: { product: Product }) {
  const { quantityOf, setQuantity, busy } = useShop();
  if (product.status === "out_of_stock") return null;
  const inCart = quantityOf(product.id);
  return (
    <button
      className={`add ${inCart ? "in-cart" : ""}`}
      aria-label="Add to cart"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        setQuantity(product, Math.min(inCart + 1, 99));
      }}
    >
      {inCart || "+"}
    </button>
  );
}

interface CardProps {
  product: Product;
  lang: Language;
  onOpen: (product: Product) => void;
}

/** Grid card: photo with −% / ❤️ / +, then price, name, savings or stock. */
export default function ProductCard({ product, lang, onOpen }: CardProps) {
  const soldOut = product.status === "out_of_stock";
  return (
    // A div (not a button) because it contains other buttons (❤️ and +).
    <div
      className={`card ${soldOut ? "card-soldout" : ""} ${product.discountPercent > 0 ? "card-deal" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(product)}
    >
      <div className="card-photo">
        <Photo url={product.photoUrl} alt={product.name} />
        <DiscountBadge percent={product.discountPercent} />
        <HeartButton product={product} className="heart-card" />
        <AddButton product={product} />
      </div>
      <div className="card-body">
        <PriceLine product={product} lang={lang} />
        <div className="card-name">{product.name}</div>
        {product.saving > 0 && !soldOut ? <SaveChip product={product} lang={lang} /> : <StatusDot status={product.status} lang={lang} />}
      </div>
    </div>
  );
}

/** Wide card for the "Bugungi aksiyalar" row on the home screen. */
export function DealHeroCard({ product, lang, onOpen }: CardProps) {
  return (
    <div className="hcard" role="button" tabIndex={0} onClick={() => onOpen(product)}>
      <div className="hcard-photo">
        <Photo url={product.photoUrl} alt={product.name} />
        <DiscountBadge percent={product.discountPercent} size="big" />
        <HeartButton product={product} className="heart-card" />
      </div>
      <div className="hcard-body">
        <PriceLine product={product} lang={lang} big />
        <div className="card-name one-line">{product.name}</div>
        <div className="hcard-foot">
          {product.saving > 0 ? <SaveChip product={product} lang={lang} /> : <StatusDot status={product.status} lang={lang} />}
          <AddButton product={product} />
        </div>
      </div>
    </div>
  );
}

/** Grey placeholder cards while the first page loads. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div className="card skeleton" key={i} aria-hidden>
          <div className="card-photo shimmer" />
          <div className="card-body">
            <div className="line shimmer" style={{ width: "55%" }} />
            <div className="line shimmer" />
            <div className="line shimmer" style={{ width: "70%" }} />
          </div>
        </div>
      ))}
    </>
  );
}
