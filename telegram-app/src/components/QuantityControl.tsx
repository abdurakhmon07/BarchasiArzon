const MAX = 99;

interface Props {
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  canIncrease?: boolean; // false for unavailable products: they can only be lowered or removed
  size?: "small" | "large";
}

/** − 3 + control. Going below 1 removes the product (onChange(0)). */
export default function QuantityControl({ quantity, onChange, disabled, canIncrease = true, size = "small" }: Props) {
  return (
    <div className={`qty qty-${size}`} onClick={(e) => e.stopPropagation()}>
      <button aria-label="−" disabled={disabled} onClick={() => onChange(quantity - 1)}>
        {quantity === 1 ? "🗑" : "−"}
      </button>
      <span className="qty-value">{quantity}</span>
      <button aria-label="+" disabled={disabled || !canIncrease || quantity >= MAX} onClick={() => onChange(quantity + 1)}>
        +
      </button>
    </div>
  );
}
