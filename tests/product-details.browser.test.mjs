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
const screenshots = resolve('node_modules/.cache/vibestore-product-details');

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

async function openPage(t, path = '/', { viewport = { width: 1440, height: 1100 }, storedCart } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  t.after(() => context.close());
  if (storedCart !== undefined) {
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: CART_STORAGE_KEY, value: storedCart });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  t.after(() => assert.deepEqual(errors, [], 'No browser errors'));
  await page.goto(baseURL + path);
  await page.locator('.product-card, .pdp, .pdp-not-found').first().waitFor();
  return page;
}

const bag = page => page.getByRole('button', { name: /^Shopping bag,/ });
const count = async (page, quantity) => assert.equal(await bag(page).getAttribute('aria-label'), `Shopping bag, ${quantity} ${quantity === 1 ? 'item' : 'items'}`);
const stageImage = page => page.locator('.pdp-stage img');
const thumbnails = page => page.getByRole('list', { name: 'Wireless Headphones images' }).getByRole('button');
const cardNames = page => page.locator('.product-card h3').allInnerTexts();
// React Router updates the URL before React renders the new page, so after any in-app navigation wait for
// content that only the new page has; never treat a URL change as "the page is ready".
const headingShown = (page, name) => page.getByRole('heading', { level: 1, name, exact: true }).waitFor();
const catalogShown = page => page.locator('#products .product-card').first().waitFor();
// Titles and focus are set by effects that run just after React renders, so wait for them instead of reading once.
const titleIs = (page, title) => page.waitForFunction(expected => document.title === expected, title);
const focusIs = (page, id) => page.waitForFunction(expected => document.activeElement?.id === expected, id);
// The visible image must stay inside its frame (no overflow or clipping), whatever the frame's proportions.
const imageFitsFrame = (frame, image) => Promise.all([frame.boundingBox(), image.boundingBox()]).then(([f, i]) =>
  i.x >= f.x - 1 && i.y >= f.y - 1 && i.x + i.width <= f.x + f.width + 1 && i.y + i.height <= f.y + f.height + 1);
const loaded = locator => locator.evaluate(image => image.decode().then(() => image.naturalWidth > 0));

test('desktop: product link opens the details page and thumbnails switch the image and selection', async t => {
  const page = await openPage(t);
  await page.getByRole('link', { name: 'Wireless Headphones', exact: true }).click();
  await page.waitForURL(`${baseURL}/products/headphones`);
  await headingShown(page, 'Wireless Headphones');
  assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'Wireless Headphones');
  await titleIs(page, 'Wireless Headphones — VibeStore');
  await focusIs(page, 'pdp-title'); // focus moves to the new page heading
  assert.equal(await page.locator('.pdp-price').innerText(), '$149.00');
  assert.equal(await page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]').innerText(), 'Wireless Headphones');

  const thumbs = thumbnails(page);
  assert.equal(await thumbs.count(), 4);
  assert.deepEqual(await thumbs.evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-pressed'))), ['true', 'false', 'false', 'false']);
  const stageBox = await page.locator('.pdp-stage').boundingBox();

  const expected = [
    { file: 'headphones-main', fit: 'contain', shadow: true },
    { file: 'headphones-profile', fit: 'contain', shadow: true },
    { file: 'headphones-detail', fit: 'contain', shadow: true },
    { file: 'headphones-context', fit: 'cover', shadow: false },
  ];
  for (const [i, view] of expected.entries()) {
    await thumbs.nth(i).click();
    assert.ok((await stageImage(page).getAttribute('src')).includes(view.file), `Image ${i + 1} is shown`);
    assert.ok(await loaded(stageImage(page)), `Image ${i + 1} loads`);
    const pressed = await thumbs.evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-pressed') === 'true'));
    assert.deepEqual(pressed, expected.map((_, j) => j === i), 'Only the selected thumbnail is marked');
    const style = await stageImage(page).evaluate(image => ({ fit: getComputedStyle(image).objectFit, filter: getComputedStyle(image).filter }));
    assert.equal(style.fit, view.fit);
    assert.equal(style.filter !== 'none', view.shadow, 'Only cut-outs get the product shadow');
    assert.equal(await stageImage(page).getAttribute('alt'), (await thumbs.nth(i).getAttribute('aria-label')).replace(/^Show image \d of 4: /, ''));
    assert.deepEqual(await page.locator('.pdp-stage').boundingBox(), stageBox, 'Gallery keeps its size');
    assert.ok(await imageFitsFrame(page.locator('.pdp-stage'), stageImage(page)), `Image ${i + 1} stays inside the gallery frame`);
    assert.ok(await imageFitsFrame(thumbs.nth(i), thumbs.nth(i).locator('img')), `Thumbnail ${i + 1} image stays inside its button`);
  }
  await thumbs.nth(0).click();
  const borders = await thumbs.evaluateAll(buttons => buttons.map(b => getComputedStyle(b).borderTopColor));
  assert.ok(borders.slice(1).every(color => color !== borders[0]), 'Selected thumbnail has a distinct border');
  assert.ok((await thumbs.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode().then(() => i.naturalWidth > 0))))).every(Boolean), 'All thumbnails load');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1440);
  await page.screenshot({ path: resolve(screenshots, 'details-desktop.png'), fullPage: true });
});

test('quantity selector adds the chosen quantity, persists it, and the page survives a refresh', async t => {
  const page = await openPage(t, '/products/headphones');
  const decrease = page.getByRole('button', { name: 'Decrease quantity', exact: true });
  const increase = page.getByRole('button', { name: 'Increase quantity', exact: true });
  const value = page.getByRole('group', { name: 'Quantity' }).locator('output');
  assert.ok(await decrease.isDisabled(), 'Cannot go below 1');
  await increase.click();
  await increase.click();
  assert.equal(await value.innerText(), '3');
  await decrease.click();
  await increase.click();
  await page.getByRole('button', { name: 'Add to Cart', exact: true }).click();
  await count(page, 3);
  assert.equal(await page.getByRole('status').filter({ hasText: 'added to your bag' }).innerText(), '3 Wireless Headphones added to your bag. 3 items in your bag.');
  await page.reload();
  await headingShown(page, 'Wireless Headphones');
  assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'Wireless Headphones');
  await count(page, 3);
  await bag(page).click();
  assert.equal(await page.getByRole('dialog', { name: 'Your shopping bag' }).locator('.cart-subtotal dd').innerText(), '$447.00');
});

test('quantity is limited by the room left in the bag', async t => {
  const page = await openPage(t, '/products/headphones', { storedCart: JSON.stringify({ version: 1, items: [{ productId: 'headphones', quantity: 98 }] }) });
  const increase = page.getByRole('button', { name: 'Increase quantity', exact: true });
  const addButton = page.getByRole('button', { name: 'Add to Cart', exact: true });
  assert.ok(await increase.isDisabled(), 'Only one more fits');
  await addButton.click();
  await count(page, 99);
  assert.ok(await addButton.isDisabled());
  assert.ok(await page.getByText('Your bag already has the maximum 99 of this product.', { exact: true }).isVisible());
});

test('earbuds gallery shows four images, and navigation back keeps storefront filters', async t => {
  const page = await openPage(t);
  await page.getByLabel('Sort by', { exact: true }).selectOption({ label: 'Price: High to Low' });
  await page.getByRole('link', { name: 'Earbuds', exact: true }).click();
  await page.waitForURL(`${baseURL}/products/earbuds`);
  await headingShown(page, 'Earbuds');
  const earbudsThumbnails = page.getByRole('list', {
  name: 'Earbuds images',
}).getByRole('button');

assert.equal(await earbudsThumbnails.count(), 4);

await earbudsThumbnails.nth(1).click();

assert.ok(
  (await page.locator('.pdp-stage img').getAttribute('src'))
    .includes('earbuds-profile')
);
  assert.ok(await loaded(stageImage(page)));
  assert.equal(
    await stageImage(page).getAttribute('alt'),
    'Profile view of navy earbuds and charging case'
  );
  await page.getByRole('link', { name: 'Back to shop', exact: true }).click();
  await page.waitForURL(`${baseURL}/`);
  await catalogShown(page);
  assert.equal(await page.getByLabel('Sort by', { exact: true }).inputValue(), 'price-desc');
  assert.deepEqual(await cardNames(page), ['Smartwatch', 'Wireless Headphones', 'Earbuds']);
  await titleIs(page, 'VibeStore (3 products)');

  await page.getByRole('link', { name: 'Smartwatch', exact: true }).click();
  await page.waitForURL(`${baseURL}/products/smartwatch`);
  await headingShown(page, 'Smartwatch');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Shop', exact: true }).click();
  await page.waitForURL(`${baseURL}/#products`);
  await focusIs(page, 'products');
  assert.equal(await page.locator('.product-card').count(), 3, 'Navbar Shop returns to the catalog');
});

test('unknown product and page URLs show a not-found page with a way back', async t => {
  const page = await openPage(t, '/products/does-not-exist');
  assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'Product not found');
  await titleIs(page, 'Product not found — VibeStore');
  await page.getByRole('main').getByRole('link', { name: 'Back to shop', exact: true }).click();
  await page.waitForURL(`${baseURL}/`);
  await catalogShown(page);
  await page.goto(`${baseURL}/no-such-page`);
  await headingShown(page, 'Page not found');
  assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'Page not found');
});

test('390px mobile: details page fits the viewport with usable gallery and controls', async t => {
  const page = await openPage(t, '/products/headphones', { viewport: { width: 390, height: 844 } });
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, 'No horizontal overflow');
  const stage = await page.locator('.pdp-stage').boundingBox();
  assert.ok(stage.x >= 0 && stage.x + stage.width <= 390, 'Gallery fits the viewport');
  assert.ok(await imageFitsFrame(page.locator('.pdp-stage'), stageImage(page)), 'Image stays inside the mobile gallery frame');
  const boxes = await thumbnails(page).evaluateAll(buttons => buttons.map(b => b.getBoundingClientRect().toJSON()));
  assert.equal(boxes.length, 4);
  assert.ok(boxes.every(b => b.left >= 0 && b.right <= 390 && b.height >= 44 && b.width >= 44), 'Thumbnails fit and are large enough to tap');
  const add = await page.getByRole('button', { name: 'Add to Cart', exact: true }).boundingBox();
  assert.ok(add.height >= 44 && add.x + add.width <= 390);
  assert.equal(await page.locator('.pdp-back').isVisible(), false, 'Mobile uses the breadcrumb only');
  await page.screenshot({ path: resolve(screenshots, 'details-mobile-390.png'), fullPage: true });
});
