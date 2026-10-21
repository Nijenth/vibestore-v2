type QuantitySelectorProps = {
  id: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
};

/** Stepper for choosing a quantity before adding to the bag. Buttons disable at the limits. */
export function QuantitySelector({ id, value, min = 1, max, onChange }: QuantitySelectorProps) {
  const labelId = `${id}-label`;
  const disabled = max < min;
  return (
    <div className="pdp-quantity">
      <span id={labelId} className="pdp-label">Quantity</span>
      <div className="quantity-selector" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <output aria-live="polite" aria-atomic="true">{value}</output>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
