import { photoSrc } from "../api";
import { formatPrice, statusText } from "../i18n";
import { useShop } from "../shop";
import type { Language, Product } from "../types";

interface Props {
  product: Product;
  lang: Language;
  onOpen: (product: Product) => void;
}

export function StatusBadge({ status, lang }: { status: Product["status"]; lang: Language }) {
  return <span className={`badge badge-${status}`}>{statusText(lang, status)}</span>;
}

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

export default function ProductCard({ product, lang, onOpen }: Props) {
  const { quantityOf, setQuantity, busy } = useShop();
  const soldOut = product.status === "out_of_stock";
  const inCart = quantityOf(product.id);

  return (
    // A div (not a button) because it contains other buttons (❤️ and +).
    <div
      className={`card ${soldOut ? "card-soldout" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(product)}
    >
      <div className="card-photo">
        <Photo url={product.photoUrl} alt={product.name} />
        {product.isSpecial && <span className="hot">🔥</span>}
        <HeartButton product={product} className="heart-card" />
      </div>
      <div className="card-body">
        <div className="card-name">{product.name}</div>
        <div className="card-price">{formatPrice(product.price, lang)}</div>
        <div className="card-foot">
          <StatusBadge status={product.status} lang={lang} />
          {!soldOut && (
            <button
              className={`add ${inCart ? "in-cart" : ""}`}
              aria-label="Add to cart"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                setQuantity(product, Math.min(inCart + 1, 99));
              }}
            >
              {inCart ? inCart : "+"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
