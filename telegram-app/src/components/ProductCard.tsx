import { photoSrc } from "../api";
import { formatPrice, statusText } from "../i18n";
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

export default function ProductCard({ product, lang, onOpen }: Props) {
  const soldOut = product.status === "out_of_stock";
  return (
    <button className={`card ${soldOut ? "card-soldout" : ""}`} onClick={() => onOpen(product)}>
      <div className="card-photo">
        <Photo url={product.photoUrl} alt={product.name} />
        {product.isSpecial && <span className="hot">🔥</span>}
      </div>
      <div className="card-body">
        <div className="card-name">{product.name}</div>
        <div className="card-price">{formatPrice(product.price, lang)}</div>
        <StatusBadge status={product.status} lang={lang} />
      </div>
    </button>
  );
}
