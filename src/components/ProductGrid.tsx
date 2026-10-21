import { isProductSort, PRODUCT_SORT_OPTIONS } from '../lib/products';
import type { Product, ProductSort } from '../types/product';
import { ProductCard } from './ProductCard';

type ProductGridProps = {
  products: Product[];
  onAddToCart: (product: Product) => void;
  search: string;
  category: string;
  sortBy: ProductSort;
  onSortChange: (sortBy: ProductSort) => void;
  onResetFilters: () => void;
};

export function ProductGrid({
  products,
  onAddToCart,
  search,
  category,
  sortBy,
  onSortChange,
  onResetFilters,
}: ProductGridProps) {
  const hasFilters = search.trim() !== '' || category !== 'All';
  return (
    <section id="products" className="products-section" aria-labelledby="products-title" tabIndex={-1}>
      <div className="products-header">
        <h2 id="products-title">Featured Products</h2>
        <div className="products-sort">
          <label htmlFor="product-sort" className="products-sort-label">
            Sort by
          </label>
          <select
            id="product-sort"
            className="products-sort-select"
            value={sortBy}
            onChange={(event) => {
              const nextSort = event.target.value;
              if (isProductSort(nextSort)) onSortChange(nextSort);
            }}
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hasFilters && (
        <div className="filter-summary">
          <p role="status">
            {products.length} {products.length === 1 ? 'product' : 'products'}
            {search.trim() && ` matching “${search.trim()}”`}
            {category !== 'All' && ` in ${category}`}
          </p>
          <button type="button" className="text-button" onClick={onResetFilters}>
            Clear filters
          </button>
        </div>
      )}
      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      ) : (
        <p className="empty-state">
          {hasFilters
            ? 'No products found. Try another search or clear your filters.'
            : 'New essentials are on their way. Check back soon.'}
        </p>
      )}
    </section>
  );
}
