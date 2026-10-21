import type { ProductSpec } from '../types/product';

type ProductSpecificationsProps = {
  title: string;
  specs: ProductSpec[];
};

export function ProductSpecifications({ title, specs }: ProductSpecificationsProps) {
  return (
    <section className="pdp-specs" aria-labelledby="pdp-specs-title">
      <p className="pdp-eyebrow">The details</p>
      <h2 id="pdp-specs-title">{title}</h2>
      <dl className="pdp-spec-list">
        {specs.map((spec) => (
          <div key={spec.label}>
            <dt>{spec.label}</dt>
            <dd>{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
