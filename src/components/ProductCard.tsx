import { Link } from 'react-router';
import { productPath } from '../lib/products';
import { formatPrice } from '../types/product';
import type { Product } from '../types/product';

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const href = productPath(product.id);
  return (
    <article className="product-card">
      {/* The image repeats the name link below, so it is hidden from assistive technology and the tab order. */}
      <Link to={href} className="product-image" tabIndex={-1} aria-hidden="true">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <span className="image-placeholder">Image coming soon</span>
        )}
      </Link>
      <div className="product-details">
        <h3><Link to={href} className="product-link">{product.name}</Link></h3>
        <p className="product-price">{formatPrice(product.price)}</p>
        {product.description && <p className="product-description">{product.description}</p>}
      </div>
      <button
        className="primary-button add-to-cart"
        type="button"
        aria-label={`Add ${product.name} to cart`}
        onClick={() => onAddToCart(product)}
      >
        Add to Cart
      </button>
    </article>
  );
}
