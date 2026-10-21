import type { Product, ProductImage, ProductSort, ProductSortOption } from '../types/product';

export const PRODUCT_SORT_OPTIONS: readonly ProductSortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A–Z' },
];

const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function isProductSort(value: unknown): value is ProductSort {
  return typeof value === 'string' && PRODUCT_SORT_OPTIONS.some((option) => option.value === value);
}

export function getProductSortLabel(sortBy: ProductSort): string {
  return PRODUCT_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Featured';
}

export function sortProducts(products: readonly Product[], sortBy: ProductSort): Product[] {
  const copy = [...products];
  switch (sortBy) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'name-asc':
      return copy.sort((a, b) => nameCollator.compare(a.name.trim(), b.name.trim()));
    case 'featured':
    default:
      return copy;
  }
}

export type ProductQuery = {
  search?: string;
  category?: string;
  sortBy?: ProductSort;
};

export function filterAndSortProducts(products: readonly Product[], query: ProductQuery = {}): Product[] {
  const normalizedSearch = (query.search ?? '').trim().toLowerCase();
  const category = query.category ?? 'All';
  const sortBy = query.sortBy ?? 'featured';

  const filtered = products.filter((product) => {
    const matchesSearch = normalizedSearch === '' || product.name.toLowerCase().includes(normalizedSearch);
    const matchesCategory = category === 'All' || product.category === category;
    return matchesSearch && matchesCategory;
  });

  return sortProducts(filtered, sortBy);
}

export function findProductById(products: readonly Product[], id: string | undefined): Product | undefined {
  return id === undefined ? undefined : products.find((product) => product.id === id);
}

export function productPath(id: string): string {
  return `/products/${encodeURIComponent(id)}`;
}

/** Gallery images for a product, falling back to its primary image so every product can be shown. */
export function getProductImages(product: Product): ProductImage[] {
  if (product.gallery && product.gallery.length > 0) return product.gallery;
  return product.image ? [{ src: product.image, alt: product.name, kind: 'cutout' }] : [];
}
