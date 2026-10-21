import type { Product } from './product';

export type CartItem = {
  productId: Product['id'];
  quantity: number;
};

export type CartLine = {
  product: Product;
  quantity: number;
  lineTotalCents: number;
};

export type CartSummary = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
};
