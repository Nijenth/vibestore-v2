import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { ProductManager } from './components/ProductManager';
import { NotFoundState, ProductDetailsPage } from './components/ProductDetailsPage';
import { featuredProducts } from './data/products';
import { useCart } from './hooks/useCart';
import { MAX_CART_QUANTITY } from './lib/cart';
import { filterAndSortProducts, getProductSortLabel } from './lib/products';
import type { NewProduct, Product, ProductSort } from './types/product';
import './App.css';

function App() {
  const [products, setProducts] = useState<Product[]>(featuredProducts);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<ProductSort>('featured');
  const cart = useCart(products);
  const [announcement, setAnnouncement] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const managementTrigger = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const isStorefront = location.pathname === '/';

  useEffect(() => {
    if (isStorefront) document.title = `VibeStore (${products.length} products)`;
  }, [isStorefront, products.length]);

  // After in-app navigation, show the requested section (e.g. /#products) or the top of the new page.
  useEffect(() => {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) {
      target.scrollIntoView();
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash, location.key]);

  useEffect(() => {
    if (!isManaging) managementTrigger.current?.focus();
  }, [isManaging]);

  function openManagement(trigger: HTMLButtonElement | null) {
    managementTrigger.current = trigger;
    setIsManaging(true);
  }

  const filteredProducts = filterAndSortProducts(products, { search, category, sortBy });

  function changeSort(nextSort: ProductSort) {
    setSortBy(nextSort);
    setAnnouncement(`Products sorted by ${getProductSortLabel(nextSort)}.`);
  }

  function addProduct(product: NewProduct) {
    setProducts((previous) => [...previous, { ...product, id: crypto.randomUUID() }]);
    setAnnouncement(`${product.name} added to the store.`);
  }

  function deleteProduct(id: string) {
    setProducts((previous) => previous.filter((product) => product.id !== id));
    cart.remove(id);
    setAnnouncement('Product removed from the store and shopping bag.');
  }

  function resetFilters() {
    setSearch('');
    setCategory('All');
    document.getElementById('products')?.focus();
  }

  function addToCart(product: Product, quantity = 1) {
    const inBag = cart.lines.find((line) => line.product.id === product.id)?.quantity ?? 0;
    const added = Math.min(quantity, MAX_CART_QUANTITY - inBag);
    if (added <= 0) {
      setAnnouncement(`Your bag already has the maximum ${MAX_CART_QUANTITY} of ${product.name}.`);
      return;
    }
    cart.add(product.id, added);
    const total = cart.itemCount + added;
    setAnnouncement(`${added === 1 ? '' : `${added} `}${product.name} added to your bag. ${total} ${total === 1 ? 'item' : 'items'} in your bag.`);
  }

  function changeCartQuantity(productId: string, delta: 1 | -1) {
    const line = cart.lines.find((item) => item.product.id === productId);
    if (!line) return;
    cart.changeQuantity(productId, delta);
    setAnnouncement(line.quantity + delta === 0
      ? `${line.product.name} removed from your bag.`
      : `${line.product.name} quantity changed to ${line.quantity + delta}.`);
  }

  function removeFromCart(productId: string) {
    const line = cart.lines.find((item) => item.product.id === productId);
    cart.remove(productId);
    if (line) setAnnouncement(`${line.product.name} removed from your bag.`);
  }

  return (
    <div className="store" id="top">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar
        cart={cart}
        onCartQuantityChange={changeCartQuantity}
        onCartRemove={removeFromCart}
        search={search}
        category={category}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onManage={openManagement}
      />
      <main id="main-content" className="store-container" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={(
              <>
                <Hero />
                <ProductGrid
                  products={filteredProducts}
                  onAddToCart={addToCart}
                  search={search}
                  category={category}
                  sortBy={sortBy}
                  onSortChange={changeSort}
                  onResetFilters={resetFilters}
                />
              </>
            )}
          />
          <Route
            path="/products/:productId"
            element={<ProductDetailsPage products={products} cartLines={cart.lines} onAddToCart={addToCart} />}
          />
          <Route
            path="*"
            element={<NotFoundState title="Page not found" message="This page doesn't exist. Head back to the shop to keep browsing." />}
          />
        </Routes>
      </main>
      <p className="sr-only" role="status">{announcement}</p>
      {isManaging && (
        <ProductManager
          products={products}
          onAdd={addProduct}
          onDelete={deleteProduct}
          onClose={() => setIsManaging(false)}
        />
      )}
    </div>
  );
}

export default App;
