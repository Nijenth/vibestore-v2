import { useEffect, useMemo, useState } from 'react';
import { addCartItem, changeCartQuantity, readCart, reconcileCart, removeCartItem, summarizeCart, writeCart } from '../lib/cart';
import type { CartItem } from '../types/cart';
import type { Product } from '../types/product';

export function useCart(products: Product[]) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return readCart(window.localStorage, products);
    } catch {
      return [];
    }
  });
  const availableItems = useMemo(() => reconcileCart(items, products), [items, products]);
  const summary = useMemo(() => summarizeCart(availableItems, products), [availableItems, products]);

  useEffect(() => {
    try {
      writeCart(window.localStorage, availableItems);
    } catch {
      // Accessing localStorage itself can throw in privacy-restricted browsers.
    }
  }, [availableItems]);

  function add(productId: string, quantity = 1) {
    if (!products.some((product) => product.id === productId)) return;
    setItems((previous) => addCartItem(reconcileCart(previous, products), productId, quantity));
  }

  function changeQuantity(productId: string, delta: 1 | -1) {
    setItems((previous) => changeCartQuantity(reconcileCart(previous, products), productId, delta));
  }

  function remove(productId: string) {
    setItems((previous) => removeCartItem(previous, productId));
  }

  return { ...summary, add, changeQuantity, remove };
}
