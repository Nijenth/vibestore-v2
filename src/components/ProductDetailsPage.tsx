import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { MAX_CART_QUANTITY } from '../lib/cart';
import { findProductById, getProductImages } from '../lib/products';
import type { CartLine } from '../types/cart';
import { formatPrice } from '../types/product';
import type { Product } from '../types/product';
import { ProductGallery } from './ProductGallery';
import { ProductSpecifications } from './ProductSpecifications';
import { QuantitySelector } from './QuantitySelector';
import './ProductDetails.css';

type ProductDetailsPageProps = {
  products: Product[];
  cartLines: CartLine[];
  onAddToCart: (product: Product, quantity: number) => void;
};

export function ProductDetailsPage({ products, cartLines, onAddToCart }: ProductDetailsPageProps) {
  const { productId } = useParams();
  const product = findProductById(products, productId);

  if (!product) {
    return (
      <NotFoundState
        title="Product not found"
        message="This product isn't in the catalog. It may have been removed, or the link may be incorrect."
      />
    );
  }

  const inBag = cartLines.find((line) => line.product.id === product.id)?.quantity ?? 0;
  // Keyed by product so the gallery selection and quantity reset when switching products.
  return <ProductDetails key={product.id} product={product} inBag={inBag} onAddToCart={onAddToCart} />;
}

type ProductDetailsProps = {
  product: Product;
  inBag: number;
  onAddToCart: (product: Product, quantity: number) => void;
};

function ProductDetails({ product, inBag, onAddToCart }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const room = MAX_CART_QUANTITY - inBag;
  const selected = Math.min(quantity, Math.max(room, 1));
  const details = product.details;
  usePageTitle(`${product.name} — VibeStore`);
  const headingRef = useFocusOnNavigation<HTMLHeadingElement>();

  return (
    <article className="pdp" aria-labelledby="pdp-title">
      <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Shop</Link></li>
          <li>{product.category}</li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>
      <Link to="/" className="pdp-back"><span aria-hidden="true">←</span> Back to shop</Link>

      <div className="pdp-layout">
        <ProductGallery images={getProductImages(product)} productName={product.name} />

        <div className="pdp-info">
          <p className="pdp-eyebrow">{product.category}</p>
          <h1 id="pdp-title" ref={headingRef} tabIndex={-1}>{product.name}</h1>
          {product.description && <p className="pdp-subtitle">{product.description}</p>}
          <p className="pdp-price">{formatPrice(product.price)}</p>
          {details?.summary && <p className="pdp-summary">{details.summary}</p>}

          <QuantitySelector id="pdp-quantity" value={selected} max={room} onChange={setQuantity} />
          <button
            type="button"
            className="primary-button pdp-add"
            disabled={room <= 0}
            onClick={() => onAddToCart(product, selected)}
          >
            Add to Cart
          </button>
          {room <= 0 && <p className="pdp-limit">Your bag already has the maximum {MAX_CART_QUANTITY} of this product.</p>}
          <p className="pdp-note">Portfolio demo · Fictional products · No orders are processed</p>

          {details?.highlights && details.highlights.length > 0 && (
            <section className="pdp-highlights" aria-labelledby="pdp-highlights-title">
              <h2 id="pdp-highlights-title">Why you'll love the design</h2>
              <ul>
                {details.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      {details?.specs && details.specs.length > 0 && (
        <ProductSpecifications title={details.specsTitle ?? 'Product details'} specs={details.specs} />
      )}
    </article>
  );
}

type NotFoundStateProps = {
  title: string;
  message: string;
};

export function NotFoundState({ title, message }: NotFoundStateProps) {
  usePageTitle(`${title} — VibeStore`);
  const headingRef = useFocusOnNavigation<HTMLHeadingElement>();
  return (
    <section className="pdp-not-found" aria-labelledby="not-found-title">
      <h1 id="not-found-title" ref={headingRef} tabIndex={-1}>{title}</h1>
      <p>{message}</p>
      <Link to="/" className="primary-button">Back to shop</Link>
    </section>
  );
}

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

/** Moves focus to the page heading after in-app navigation, so screen readers announce the new page. */
function useFocusOnNavigation<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { key } = useLocation();
  useEffect(() => {
    // 'default' is the initial page load, where the browser already starts at the top of the document.
    if (key !== 'default') ref.current?.focus({ preventScroll: true });
  }, [key]);
  return ref;
}
