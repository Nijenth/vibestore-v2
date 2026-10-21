import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CART_STORAGE_KEY, MAX_CART_QUANTITY, addCartItem, changeCartQuantity,
  parseStoredCart, readCart, reconcileCart, removeCartItem, summarizeCart, writeCart,
} from '../src/lib/cart.ts';
import {
  PRODUCT_SORT_OPTIONS, filterAndSortProducts, findProductById, getProductImages, getProductSortLabel, isProductSort, productPath, sortProducts,
} from '../src/lib/products.ts';

const products = [
  { id: 'headphones', name: 'Wireless Headphones', price: 149, category: 'Accessories' },
  { id: 'smartwatch', name: 'Smartwatch', price: 199, category: 'Electronics' },
  { id: 'earbuds', name: 'Earbuds', price: 89, category: 'Accessories' },
];
const stored = (items) => JSON.stringify({ version: 1, items });

test('missing, malformed, and unsupported storage data restores an empty cart', () => {
  for (const value of [null, '', '{', 'null', 'true', '42', '[]', '{}', '{"version":2,"items":[]}', '{"version":1,"items":{}}']) {
    assert.deepEqual(parseStoredCart(value), []);
  }
});

test('restoration rejects invalid IDs and non-positive, fractional, unsafe, or excessive quantities', () => {
  const invalidItems = [null, [], {}, { productId: 1, quantity: 1 }, { productId: ' ', quantity: 1 }];
  for (const quantity of [undefined, null, '2', true, 0, -1, 1.2, MAX_CART_QUANTITY + 1, Number.MAX_SAFE_INTEGER]) {
    invalidItems.push({ productId: 'headphones', quantity });
  }
  assert.deepEqual(parseStoredCart(stored(invalidItems)), []);
});

test('restoration merges duplicate IDs, caps their sum, and discards stored product details', () => {
  assert.deepEqual(parseStoredCart(stored([
    { productId: 'headphones', quantity: 70, price: 0.01, image: 'https://invalid.example/image.png' },
    { productId: 'headphones', quantity: 70 },
    { productId: 'earbuds', quantity: 2 },
  ])), [
    { productId: 'headphones', quantity: MAX_CART_QUANTITY },
    { productId: 'earbuds', quantity: 2 },
  ]);
});

test('adding the same stable ID increments its quantity without mutating the previous cart', () => {
  const original = [{ productId: 'headphones', quantity: 1 }];
  const next = addCartItem(original, 'headphones');
  assert.deepEqual(original, [{ productId: 'headphones', quantity: 1 }]);
  assert.deepEqual(next, [{ productId: 'headphones', quantity: 2 }]);
  assert.deepEqual(addCartItem(next, 'earbuds'), [...next, { productId: 'earbuds', quantity: 1 }]);
});

test('increment, decrement, removal at zero, and explicit removal preserve other items', () => {
  const original = [{ productId: 'headphones', quantity: 2 }, { productId: 'earbuds', quantity: 1 }];
  assert.equal(changeCartQuantity(original, 'missing', 1), original);
  assert.deepEqual(changeCartQuantity(original, 'headphones', 1)[0], { productId: 'headphones', quantity: 3 });
  assert.deepEqual(changeCartQuantity(original, 'headphones', -1)[0], { productId: 'headphones', quantity: 1 });
  assert.deepEqual(changeCartQuantity(original, 'earbuds', -1), [original[0]]);
  assert.deepEqual(removeCartItem(original, 'headphones'), [original[1]]);
});

test('quantity cannot increase past the validated maximum', () => {
  const items = [{ productId: 'headphones', quantity: MAX_CART_QUANTITY }];
  assert.equal(addCartItem(items, 'headphones'), items);
  assert.equal(changeCartQuantity(items, 'headphones', 1), items);
});

test('item count, line totals, and subtotal use quantities and current catalog prices', () => {
  const result = summarizeCart([
    { productId: 'headphones', quantity: 2 },
    { productId: 'smartwatch', quantity: 1 },
    { productId: 'earbuds', quantity: 1 },
  ], products);
  assert.equal(result.itemCount, 4);
  assert.equal(result.subtotalCents, 58600);
  assert.deepEqual(result.lines.map(line => line.lineTotalCents), [29800, 19900, 8900]);
  assert.equal(result.lines[0].product, products[0]);
});

test('fractional dollar prices are summed as integer cents', () => {
  const catalog = [{ ...products[0], price: 0.1 }, { ...products[1], price: 0.2 }];
  const result = summarizeCart([{ productId: 'headphones', quantity: 3 }, { productId: 'smartwatch', quantity: 1 }], catalog);
  assert.equal(result.subtotalCents, 50);
});

test('deleted and unavailable product IDs never affect counts or subtotal', () => {
  const items = [{ productId: 'deleted', quantity: 5 }, { productId: 'earbuds', quantity: 2 }];
  assert.deepEqual(reconcileCart(items, products), [items[1]]);
  assert.equal(summarizeCart(items, products).itemCount, 2);
  assert.equal(summarizeCart(items, products).subtotalCents, 17800);
  assert.deepEqual(summarizeCart(items, []), { lines: [], itemCount: 0, subtotalCents: 0 });
});

test('storage round trips preserve only IDs and quantities, and reconcile against the catalog', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const items = [{ productId: 'headphones', quantity: 2 }, { productId: 'deleted', quantity: 1 }];
  assert.equal(writeCart(storage, items), true);
  assert.deepEqual(JSON.parse(memory.get(CART_STORAGE_KEY)), { version: 1, items });
  assert.deepEqual(readCart(storage, products), [items[0]]);
});

test('blocked reads and full storage fail safely without throwing', () => {
  const storage = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Quota exceeded'); } };
  assert.deepEqual(readCart(storage, products), []);
  assert.equal(writeCart(storage, []), false);
});

test('PRODUCT_SORT_OPTIONS exposes the four required sort options and validates values', () => {
  assert.deepEqual(PRODUCT_SORT_OPTIONS, [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A–Z' },
  ]);
  for (const option of PRODUCT_SORT_OPTIONS) {
    assert.equal(isProductSort(option.value), true);
    assert.equal(getProductSortLabel(option.value), option.label);
  }
  for (const invalid of [null, undefined, '', 'price', 'name-desc', 42, {}]) {
    assert.equal(isProductSort(invalid), false);
  }
});

test('sortProducts orders by featured, price low-to-high, price high-to-low, and name A-Z without mutating input', () => {
  const snapshot = structuredClone(products);
  const featured = sortProducts(products, 'featured');
  assert.notEqual(featured, products);
  assert.deepEqual(featured.map(p => p.id), ['headphones', 'smartwatch', 'earbuds']);
  assert.deepEqual(sortProducts(products, 'price-asc').map(p => p.id), ['earbuds', 'headphones', 'smartwatch']);
  assert.deepEqual(sortProducts(products, 'price-desc').map(p => p.id), ['smartwatch', 'headphones', 'earbuds']);
  assert.deepEqual(sortProducts(products, 'name-asc').map(p => p.id), ['earbuds', 'smartwatch', 'headphones']);
  assert.deepEqual(products, snapshot);
});

test('sortProducts preserves relative order on equal prices and compares names case-insensitively', () => {
  const catalog = [
    { id: 'c', name: 'usb-c hub', price: 99, category: 'Electronics' },
    { id: 'a', name: 'Adapter Pro', price: 99, category: 'Accessories' },
    { id: 'b', name: ' braided cable ', price: 25, category: 'Accessories' },
  ];
  assert.deepEqual(sortProducts(catalog, 'price-asc').map(p => p.id), ['b', 'c', 'a']);
  assert.deepEqual(sortProducts(catalog, 'price-desc').map(p => p.id), ['c', 'a', 'b']);
  assert.deepEqual(sortProducts(catalog, 'name-asc').map(p => p.id), ['a', 'b', 'c']);
});

test('filterAndSortProducts composes search, category filtering, and sorting', () => {
  assert.deepEqual(
    filterAndSortProducts(products, { category: 'Accessories', sortBy: 'price-asc' }).map(p => p.id),
    ['earbuds', 'headphones'],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { category: 'Accessories', sortBy: 'price-desc' }).map(p => p.id),
    ['headphones', 'earbuds'],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { search: '  ea ', category: 'All', sortBy: 'name-asc' }).map(p => p.id),
    ['earbuds', 'headphones'],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { search: 'watch', category: 'Accessories', sortBy: 'price-asc' }),
    [],
  );
});

test('adding a chosen quantity merges with the existing line and caps at the maximum', () => {
  const once = addCartItem([], 'headphones', 3);
  assert.deepEqual(once, [{ productId: 'headphones', quantity: 3 }]);
  assert.deepEqual(addCartItem(once, 'headphones', 2), [{ productId: 'headphones', quantity: 5 }]);
  assert.deepEqual(addCartItem([{ productId: 'headphones', quantity: 97 }], 'headphones', 5), [{ productId: 'headphones', quantity: MAX_CART_QUANTITY }]);
  assert.deepEqual(addCartItem([], 'earbuds', 500), [{ productId: 'earbuds', quantity: MAX_CART_QUANTITY }]);
  assert.deepEqual(once, [{ productId: 'headphones', quantity: 3 }], 'previous cart is not mutated');
});

test('invalid quantities leave the cart unchanged', () => {
  const items = [{ productId: 'headphones', quantity: 2 }];
  for (const quantity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(addCartItem(items, 'headphones', quantity), items);
  }
});

test('product lookup and URLs use stable IDs', () => {
  assert.equal(findProductById(products, 'smartwatch')?.name, 'Smartwatch');
  assert.equal(findProductById(products, 'missing'), undefined);
  assert.equal(findProductById(products, undefined), undefined);
  assert.equal(productPath('headphones'), '/products/headphones');
  assert.equal(productPath('a b/c'), '/products/a%20b%2Fc');
});

test('gallery images prefer the gallery, fall back to the main image, and are empty without images', () => {
  const gallery = [
    { src: 'main.webp', alt: 'Main view', kind: 'cutout' },
    { src: 'scene.webp', alt: 'Scene', kind: 'full-frame' },
  ];
  assert.equal(getProductImages({ ...products[0], image: 'main.webp', gallery }), gallery);
  assert.deepEqual(getProductImages({ ...products[1], image: 'watch.webp' }), [{ src: 'watch.webp', alt: 'Smartwatch', kind: 'cutout' }]);
  assert.deepEqual(getProductImages({ ...products[1], image: 'watch.webp', gallery: [] }), [{ src: 'watch.webp', alt: 'Smartwatch', kind: 'cutout' }]);
  assert.deepEqual(getProductImages(products[2]), []);
});
