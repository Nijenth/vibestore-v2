import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { CART_STORAGE_KEY } from '../src/lib/cart.ts';

let server;
let browser;
let baseURL;
const screenshots = resolve('node_modules/.cache/vibestore-cart');

before(async () => {
  await mkdir(screenshots, { recursive: true });
  server = await preview({ configFile: false, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
});

after(async () => {
  await browser?.close();
  await new Promise(resolve => server ? server.httpServer.close(resolve) : resolve());
});

async function openStore(t, { viewport = { width: 1440, height: 1440 }, storedCart, blockedStorage = false, fullStorage = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  t.after(() => context.close());
  if (storedCart !== undefined) {
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: CART_STORAGE_KEY, value: storedCart });
  }
  if (blockedStorage) {
    await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  }
  if (fullStorage) {
    await context.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  t.after(() => assert.deepEqual(errors, [], 'No browser errors'));
  await page.goto(baseURL);
  await page.locator('.product-card').last().waitFor();
  return page;
}

const bag = page => page.getByRole('button', { name: /^Shopping bag,/ });
const dialog = page => page.getByRole('dialog', { name: 'Your shopping bag', exact: true });
const row = (page, name) => dialog(page).getByRole('listitem', { name, exact: true });
const add = (page, name) => page.getByRole('button', { name: `Add ${name} to cart`, exact: true }).click();
const subtotal = async (page, amount) => assert.equal(await dialog(page).locator('.cart-subtotal dd').innerText(), amount);
const count = async (page, quantity) => assert.equal(await bag(page).getAttribute('aria-label'), `Shopping bag, ${quantity} ${quantity === 1 ? 'item' : 'items'}`);

test('desktop: quantities, line totals, subtotal, removal, empty state, and removal focus', async t => {
  const page = await openStore(t);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: resolve(screenshots, 'homepage-desktop.png'), fullPage: true });
  assert.equal(await page.locator('.product-grid').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 3);
  await add(page, 'Wireless Headphones');
  await add(page, 'Wireless Headphones');
  await add(page, 'Smartwatch');
  await add(page, 'Earbuds');
  await count(page, 4);
  await bag(page).click();
  assert.equal(await dialog(page).getByRole('listitem').count(), 3);
  assert.ok(await row(page, 'Wireless Headphones').getByText('$149.00 each', { exact: true }).isVisible());
  assert.ok(await row(page, 'Wireless Headphones').getByText('$298.00', { exact: true }).isVisible());
  assert.equal(await row(page, 'Wireless Headphones').getByLabel('Quantity of Wireless Headphones', { exact: true }).innerText(), '2');
  assert.ok(await dialog(page).locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
  await subtotal(page, '$586.00');
  await page.screenshot({ path: resolve(screenshots, 'cart-desktop.png') });
  await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones', exact: true }).click();
  await count(page, 5);
  await subtotal(page, '$735.00');
  await page.getByRole('button', { name: 'Decrease quantity of Smartwatch', exact: true }).click();
  await count(page, 4);
  await subtotal(page, '$536.00');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Decrease quantity of Earbuds');
  await page.getByRole('button', { name: 'Remove Earbuds from bag', exact: true }).click();
  await count(page, 3);
  await subtotal(page, '$447.00');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Decrease quantity of Wireless Headphones');
  await page.getByRole('button', { name: 'Decrease quantity of Wireless Headphones', exact: true }).click();
  await subtotal(page, '$298.00');
  await page.getByRole('button', { name: 'Remove Wireless Headphones from bag', exact: true }).click();
  await count(page, 0);
  await subtotal(page, '$0.00');
  assert.ok(await page.getByRole('heading', { name: 'Your bag is empty', exact: true }).isVisible());
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cart-title');
});

test('refresh preserves additions, quantities, and removals in versioned ID-only storage', async t => {
  const page = await openStore(t);
  await add(page, 'Wireless Headphones');
  await add(page, 'Wireless Headphones');
  await add(page, 'Earbuds');
  await page.reload();
  await count(page, 3);
  await bag(page).click();
  await subtotal(page, '$387.00');
  assert.equal(await row(page, 'Wireless Headphones').getByLabel('Quantity of Wireless Headphones', { exact: true }).innerText(), '2');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), CART_STORAGE_KEY), {
    version: 1, items: [{ productId: 'headphones', quantity: 2 }, { productId: 'earbuds', quantity: 1 }],
  });
  await page.getByRole('button', { name: 'Decrease quantity of Wireless Headphones', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Earbuds from bag', exact: true }).click();
  await page.reload();
  await count(page, 1);
  await bag(page).click();
  await subtotal(page, '$149.00');
  assert.equal(await dialog(page).getByRole('listitem').count(), 1);
});

test('malformed storage recovers to an empty usable cart', async t => {
  const page = await openStore(t, { storedCart: '{bad json' });
  await count(page, 0);
  await add(page, 'Earbuds');
  await bag(page).click();
  await subtotal(page, '$89.00');
});

test('restored duplicates, unavailable IDs, and tampered prices/quantities are normalized', async t => {
  const page = await openStore(t, { storedCart: JSON.stringify({ version: 1, items: [
    { productId: 'headphones', quantity: 2, price: 0.01, name: 'Tampered name' },
    { productId: 'headphones', quantity: 1 },
    { productId: 'missing', quantity: 3 },
    { productId: '__proto__', quantity: 1 },
    { productId: 'smartwatch', quantity: '3' },
    { productId: 'earbuds', quantity: 0 },
    { productId: 'earbuds', quantity: 1 },
  ] }) });
  await count(page, 4);
  await bag(page).click();
  await subtotal(page, '$536.00');
  assert.equal(await dialog(page).getByRole('listitem').count(), 2);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).items, CART_STORAGE_KEY), [
    { productId: 'headphones', quantity: 3 }, { productId: 'earbuds', quantity: 1 },
  ]);
});

test('keyboard focus stays in the cart, Escape restores the bag button, and Continue shopping focuses the catalog', async t => {
  const page = await openStore(t);
  await bag(page).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cart-title');
  await page.getByRole('button', { name: 'Close shopping bag', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Continue shopping');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))));
  }
  await page.keyboard.press('Escape');
  assert.equal(await dialog(page).count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Shopping bag, 0 items');
  await add(page, 'Wireless Headphones');
  await bag(page).click();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))));
  }
  await page.getByRole('button', { name: 'Continue shopping', exact: true }).click();
  assert.equal(await dialog(page).count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'products');
});

test('search, combined category filters, deletion, and session-only product management still work', async t => {
  const page = await openStore(t);
  await add(page, 'Wireless Headphones');
  await page.getByRole('button', { name: 'Search products', exact: true }).click();
  await page.getByRole('searchbox').fill('HEAD');
  await page.getByRole('button', { name: 'View results', exact: true }).click();
  assert.equal(await page.locator('.product-card').count(), 1);
  await count(page, 1);
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: 'Electronics', exact: true }).click();
  assert.equal(await page.locator('.product-card').count(), 0);
  await count(page, 1);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page.getByRole('button', { name: 'Manage products', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Wireless Headphones', exact: true }).click();
  await page.getByRole('button', { name: 'Close product management', exact: true }).click();
  await count(page, 0);
  assert.equal(await page.title(), 'VibeStore (2 products)');
  await bag(page).click();
  await subtotal(page, '$0.00');
  await page.getByRole('button', { name: 'Close shopping bag', exact: true }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page.getByRole('button', { name: 'Manage products', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Travel adapter');
  await page.getByLabel('Price ($)', { exact: true }).fill('29.95');
  await page.getByLabel('Category', { exact: true }).selectOption('Accessories');
  await page.getByRole('button', { name: 'Add Product', exact: true }).click();
  await page.getByRole('button', { name: 'Close product management', exact: true }).click();
  await add(page, 'Travel adapter');
  await add(page, 'Travel adapter');
  await bag(page).click();
  await subtotal(page, '$59.90');
  assert.ok(await row(page, 'Travel adapter').getByText('Image coming soon', { exact: true }).isVisible());
  await page.reload();
  await count(page, 0);
  assert.equal(await page.locator('.product-card').count(), 3);
  assert.equal(await page.title(), 'VibeStore (3 products)');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).items, CART_STORAGE_KEY), []);
});

test('390px mobile: two columns, scrolling cart, quantity controls, removal, persistence, and navigation', async t => {
  const page = await openStore(t, { viewport: { width: 390, height: 1800 } });
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  assert.equal(await page.locator('.product-grid').evaluate(e => getComputedStyle(e).gridTemplateColumns), '173px 173px');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: resolve(screenshots, 'homepage-mobile-390.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await add(page, 'Wireless Headphones');
  await add(page, 'Wireless Headphones');
  await add(page, 'Smartwatch');
  await add(page, 'Earbuds');
  await bag(page).click();
  await subtotal(page, '$586.00');
  const fits = await dialog(page).evaluate(e => {
    const rect = e.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && e.scrollWidth === e.clientWidth;
  });
  assert.ok(fits, 'Mobile dialog fits the viewport without horizontal overflow');
  assert.ok(await dialog(page).locator('.cart-content').evaluate(e => e.scrollHeight > e.clientHeight), 'Long cart content scrolls independently');
  await page.screenshot({ path: resolve(screenshots, 'cart-mobile-390.png') });
  await page.setViewportSize({ width: 390, height: 390 });
  assert.ok(await dialog(page).evaluate(e => e.getBoundingClientRect().bottom <= innerHeight), 'Short-screen dialog stays within the viewport');
  await page.getByRole('button', { name: 'Continue shopping', exact: true }).click();
  assert.equal(await dialog(page).count(), 0, 'Short-screen footer remains reachable');
  await page.setViewportSize({ width: 390, height: 844 });
  await bag(page).click();
  await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones', exact: true }).click();
  await count(page, 5);
  await subtotal(page, '$735.00');
  await page.getByRole('button', { name: 'Remove Earbuds from bag', exact: true }).click();
  await count(page, 4);
  await subtotal(page, '$646.00');
  await page.getByRole('button', { name: 'Decrease quantity of Smartwatch', exact: true }).click();
  await count(page, 3);
  await subtotal(page, '$447.00');
  await page.reload();
  await count(page, 3);
  await bag(page).click();
  await subtotal(page, '$447.00');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: 'Accessories', exact: true }).click();
  assert.equal(await page.locator('.product-card').count(), 2);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Manage products', exact: true }).click();
  assert.ok(await page.getByRole('dialog', { name: 'Manage products', exact: true }).isVisible());
  await page.keyboard.press('Escape');
  await count(page, 3);
});

for (const failure of ['blockedStorage', 'fullStorage']) {
  test(`cart remains functional when ${failure} prevents persistence`, async t => {
    const page = await openStore(t, { [failure]: true });
    await add(page, 'Earbuds');
    await add(page, 'Earbuds');
    await count(page, 2);
    await bag(page).click();
    await subtotal(page, '$178.00');
  });
}

test('quantity limit prevents overflow and keeps keyboard focus in the current cart row', async t => {
  const page = await openStore(t, { storedCart: JSON.stringify({ version: 1, items: [{ productId: 'headphones', quantity: 98 }] }) });
  await bag(page).click();
  await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones', exact: true }).click();
  await count(page, 99);
  await subtotal(page, '$14,751.00');
  assert.ok(await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones', exact: true }).isDisabled());
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Decrease quantity of Wireless Headphones');
  await page.keyboard.press('Escape');
  await add(page, 'Wireless Headphones');
  await count(page, 99);
});

const cardNames = page => page.locator('.product-card h3').allInnerTexts();

test('desktop sorting: four options, keyboard accessibility, filters, product management, and cart persistence', async t => {
  const page = await openStore(t);
  const sortSelect = page.getByLabel('Sort by', { exact: true });
  assert.ok(await sortSelect.isVisible());
  assert.equal(await sortSelect.inputValue(), 'featured');
  assert.deepEqual(await sortSelect.locator('option').allInnerTexts(), [
    'Featured',
    'Price: Low to High',
    'Price: High to Low',
    'Name: A–Z',
  ]);
  assert.deepEqual(await cardNames(page), ['Wireless Headphones', 'Smartwatch', 'Earbuds']);

  await sortSelect.focus();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'product-sort');
  await sortSelect.selectOption({ label: 'Price: Low to High' });
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Wireless Headphones', 'Smartwatch']);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: resolve(screenshots, 'sorted-desktop.png'), fullPage: true });

  await sortSelect.selectOption({ label: 'Price: High to Low' });
  assert.deepEqual(await cardNames(page), ['Smartwatch', 'Wireless Headphones', 'Earbuds']);

  await sortSelect.selectOption({ label: 'Name: A–Z' });
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Smartwatch', 'Wireless Headphones']);

  await sortSelect.selectOption({ label: 'Featured' });
  assert.deepEqual(await cardNames(page), ['Wireless Headphones', 'Smartwatch', 'Earbuds']);

  // Sorting combined with category and search filters
  await sortSelect.selectOption({ label: 'Price: Low to High' });
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: 'Accessories', exact: true }).click();
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Wireless Headphones']);

  await sortSelect.selectOption({ label: 'Price: High to Low' });
  assert.deepEqual(await cardNames(page), ['Wireless Headphones', 'Earbuds']);

  await page.getByRole('button', { name: 'Search products', exact: true }).click();
  await page.getByRole('searchbox').fill('ea');
  await page.getByRole('button', { name: 'View results', exact: true }).click();
  assert.deepEqual(await cardNames(page), ['Wireless Headphones', 'Earbuds']);
  await sortSelect.selectOption({ label: 'Price: Low to High' });
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Wireless Headphones']);

  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Wireless Headphones', 'Smartwatch']);

  // Product management (add & delete) and cart persistence while sorted
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page.getByRole('button', { name: 'Manage products', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Audio Stand');
  await page.getByLabel('Price ($)', { exact: true }).fill('120');
  await page.getByLabel('Category', { exact: true }).selectOption('Accessories');
  await page.getByRole('button', { name: 'Add Product', exact: true }).click();
  await page.getByRole('button', { name: 'Close product management', exact: true }).click();

  assert.deepEqual(await cardNames(page), ['Earbuds', 'Audio Stand', 'Wireless Headphones', 'Smartwatch']);
  await sortSelect.selectOption({ label: 'Name: A–Z' });
  assert.deepEqual(await cardNames(page), ['Audio Stand', 'Earbuds', 'Smartwatch', 'Wireless Headphones']);
  await sortSelect.selectOption({ label: 'Featured' });
  assert.deepEqual(await cardNames(page), ['Wireless Headphones', 'Smartwatch', 'Earbuds', 'Audio Stand']);

  await add(page, 'Earbuds');
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page.getByRole('button', { name: 'Manage products', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Audio Stand', exact: true }).click();
  await page.getByRole('button', { name: 'Close product management', exact: true }).click();
  await sortSelect.selectOption({ label: 'Price: High to Low' });
  assert.deepEqual(await cardNames(page), ['Smartwatch', 'Wireless Headphones', 'Earbuds']);
  await count(page, 1);
});

test('390px mobile sorting: responsive layout without horizontal overflow and accurate sort order', async t => {
  const page = await openStore(t, { viewport: { width: 390, height: 1800 } });
  const sortSelect = page.getByLabel('Sort by', { exact: true });
  assert.ok(await sortSelect.isVisible());
  const box = await sortSelect.boundingBox();
  assert.ok(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 390, 'Mobile sort control fits viewport with >=44px target height');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.equal(await page.locator('.product-grid').evaluate(e => getComputedStyle(e).gridTemplateColumns), '173px 173px');

  await sortSelect.selectOption({ label: 'Price: Low to High' });
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Wireless Headphones', 'Smartwatch']);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: resolve(screenshots, 'sorted-mobile-390.png'), fullPage: true });

  await sortSelect.selectOption({ label: 'Name: A–Z' });
  assert.deepEqual(await cardNames(page), ['Earbuds', 'Smartwatch', 'Wireless Headphones']);
});

