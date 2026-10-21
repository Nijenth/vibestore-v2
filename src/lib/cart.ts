import type { CartItem, CartSummary } from '../types/cart';
import type { Product } from '../types/product';

export const CART_STORAGE_KEY = 'vibestore.cart.v1';
export const MAX_CART_QUANTITY = 99;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_CART_QUANTITY;
}

/** Treat localStorage as untrusted. Only versioned IDs and integer quantities survive. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.items)) return [];
    const quantities = new Map<string, number>();
    for (const item of value.items) {
      if (!isRecord(item) || typeof item.productId !== 'string' || !item.productId.trim() || !isQuantity(item.quantity)) continue;
      quantities.set(item.productId, Math.min(MAX_CART_QUANTITY, (quantities.get(item.productId) ?? 0) + item.quantity));
    }
    return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
  } catch {
    return [];
  }
}

export function reconcileCart(items: CartItem[], products: Product[]): CartItem[] {
  const availableIds = new Set(products.map((product) => product.id));
  return items.filter((item) => availableIds.has(item.productId));
}

export function readCart(storage: Pick<Storage, 'getItem'>, products: Product[]): CartItem[] {
  try {
    return reconcileCart(parseStoredCart(storage.getItem(CART_STORAGE_KEY)), products);
  } catch {
    return [];
  }
}

export function writeCart(storage: Pick<Storage, 'setItem'>, items: CartItem[]): boolean {
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items }));
    return true;
  } catch {
    // A disabled/full storage area must not break the in-memory cart.
    return false;
  }
}

/** Adds `quantity` units (default 1), capped at MAX_CART_QUANTITY. Invalid quantities leave the cart unchanged. */
export function addCartItem(items: CartItem[], productId: string, quantity = 1): CartItem[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items;
  const existing = items.find((item) => item.productId === productId);
  if (!existing) return [...items, { productId, quantity: Math.min(quantity, MAX_CART_QUANTITY) }];
  if (existing.quantity >= MAX_CART_QUANTITY) return items;
  const next = Math.min(existing.quantity + quantity, MAX_CART_QUANTITY);
  return items.map((item) => item.productId === productId ? { ...item, quantity: next } : item);
}

export function removeCartItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

export function changeCartQuantity(items: CartItem[], productId: string, delta: 1 | -1): CartItem[] {
  const existing = items.find((item) => item.productId === productId);
  if (!existing) return items;
  if (delta === -1 && existing.quantity === 1) return removeCartItem(items, productId);
  if (delta === 1) return addCartItem(items, productId);
  return items.map((item) => item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item);
}

export function summarizeCart(items: CartItem[], products: Product[]): CartSummary {
  const catalog = new Map(products.map((product) => [product.id, product]));
  const summary: CartSummary = { lines: [], itemCount: 0, subtotalCents: 0 };
  for (const item of items) {
    const product = catalog.get(item.productId);
    if (!product) continue;
    // Round the unit price once, then multiply integers to avoid floating-point totals.
    const lineTotalCents = Math.round(product.price * 100) * item.quantity;
    summary.lines.push({ product, quantity: item.quantity, lineTotalCents });
    summary.itemCount += item.quantity;
    summary.subtotalCents += lineTotalCents;
  }
  return summary;
}
