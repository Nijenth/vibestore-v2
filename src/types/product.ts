export type ProductCategory = 'Electronics' | 'Accessories';

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

export type ProductSortOption = {
  value: ProductSort;
  label: string;
};

export type ProductImage = {
  src: string;
  alt: string;
  /**
   * cutout: a transparent image (whole product or close-up); always fitted, never cropped, with the product shadow.
   * full-frame: an image with its own background (a scene); fills the frame, without an extra shadow.
   */
  kind: 'cutout' | 'full-frame';
};

export type ProductSpec = {
  label: string;
  value: string;
};

/** Optional long-form content for the Product Details Page. */
export type ProductDetails = {
  summary: string;
  highlights?: string[];
  specsTitle?: string;
  specs?: ProductSpec[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  description?: string;
  /** Primary image, used by product cards, the cart, and as the gallery fallback. */
  image?: string;
  gallery?: ProductImage[];
  details?: ProductDetails;
};

export type NewProduct = Omit<Product, 'id'>;

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
