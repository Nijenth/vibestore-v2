import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Icon } from './Icon';
import { CartPanel } from './CartPanel';
import type { CartSummary } from '../types/cart';

type Panel = 'search' | 'categories' | 'about' | 'menu' | 'bag';

const panelTitles: Record<Panel, string> = {
  search: 'Find your next essential',
  categories: 'Shop by category',
  about: 'About Vibestore',
  menu: 'Explore Vibestore',
  bag: 'Your shopping bag',
};

type NavbarProps = {
  cart: CartSummary;
  onCartQuantityChange: (productId: string, delta: 1 | -1) => void;
  onCartRemove: (productId: string) => void;
  search: string;
  category: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onManage: (trigger: HTMLButtonElement | null) => void;
};

export function Navbar({ cart, onCartQuantityChange, onCartRemove, search, category, onSearchChange, onCategoryChange, onManage }: NavbarProps) {
  const cartCount = cart.itemCount;
  const location = useLocation();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // The native cart modal owns Escape handling and focus while it is open.
    if (panel === 'bag') return;
    if (panel === 'search') searchRef.current?.focus();
    else if (panel) panelRef.current?.focus();
    if (!panel) return;
    function handleOutside(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setPanel(null);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPanel(null);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [panel]);

  function togglePanel(next: Panel, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setPanel((current) => current === next ? null : next);
  }

  function manageProducts() {
    setPanel(null);
    onManage(triggerRef.current);
  }

  function showProducts() {
    setPanel(null);
    if (location.pathname !== '/') {
      // The catalog lives on the storefront; App scrolls to and focuses #products after navigating.
      navigate({ pathname: '/', hash: '#products' });
      return;
    }
    const products = document.getElementById('products');
    products?.focus();
    products?.scrollIntoView();
  }

  function selectCategory(value: string) {
    onCategoryChange(value);
    showProducts();
  }

  const panelId = 'navbar-panel';

  return (
    <header className="navbar" ref={headerRef}>
      <div className="navbar-inner">
        <Link to="/" className="wordmark" aria-label="Vibestore home" onClick={() => setPanel(null)}>
          Vibestore.
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to={{ pathname: '/', hash: '#products' }} onClick={() => setPanel(null)}>Shop</Link>
          <button
            type="button"
            aria-expanded={panel === 'categories'}
            aria-controls={panel && panel !== 'bag' ? panelId : undefined}
            onClick={(event) => togglePanel('categories', event.currentTarget)}
          >
            Categories
          </button>
          <button
            type="button"
            aria-expanded={panel === 'about'}
            aria-controls={panel && panel !== 'bag' ? panelId : undefined}
            onClick={(event) => togglePanel('about', event.currentTarget)}
          >
            About
          </button>
        </nav>
        <div className="navbar-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Search products"
            aria-expanded={panel === 'search'}
            aria-controls={panel && panel !== 'bag' ? panelId : undefined}
            onClick={(event) => togglePanel('search', event.currentTarget)}
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            className="icon-button bag-button"
            aria-label={`Shopping bag, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            aria-expanded={panel === 'bag'}
            aria-controls={panel === 'bag' ? 'shopping-bag' : undefined}
            aria-haspopup="dialog"
            onClick={(event) => togglePanel('bag', event.currentTarget)}
          >
            <Icon name="bag" />
            {cartCount > 0 && <span className="cart-badge" aria-hidden="true">{cartCount}</span>}
          </button>
          <button
            type="button"
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            aria-expanded={panel === 'menu'}
            aria-controls={panel && panel !== 'bag' ? panelId : undefined}
            onClick={(event) => togglePanel('menu', event.currentTarget)}
          >
            <Icon name={panel === 'menu' ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {panel && panel !== 'bag' && (
        <div ref={panelRef} id={panelId} className="navbar-panel" role="region" aria-labelledby="navbar-panel-title" tabIndex={-1}>
          <div className="panel-heading">
            <h2 id="navbar-panel-title">{panelTitles[panel]}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Close navigation panel"
              onClick={() => { setPanel(null); triggerRef.current?.focus(); }}
            >
              <Icon name="close" />
            </button>
          </div>
          {panel === 'search' && (
            <form role="search" onSubmit={(event) => { event.preventDefault(); showProducts(); }}>
              <label htmlFor="product-search">Search products</label>
              <div className="search-field">
                <input
                  ref={searchRef}
                  id="product-search"
                  type="search"
                  placeholder="Search products…"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
                <button className="primary-button" type="submit">View results</button>
              </div>
            </form>
          )}
          {panel === 'categories' && (
            <div className="category-filters" aria-label="Product categories">
              {['All', 'Electronics', 'Accessories'].map((value) => (
                <button key={value} type="button" aria-pressed={category === value} onClick={() => selectCategory(value)}>
                  {value === 'All' ? 'All Products' : value}
                </button>
              ))}
            </div>
          )}
          {panel === 'about' && (
            <>
              <p>Everyday technology designed for your life. Discover audio, wearables, and your next essential.</p>
              <p>Vibestore is a portfolio demo: the products are fictional, product images are AI-generated, and no orders are processed.</p>
              <button type="button" className="text-button" onClick={manageProducts}>Manage products</button>
            </>
          )}
          {panel === 'menu' && (
            <nav className="mobile-nav" aria-label="Mobile navigation">
              <Link to={{ pathname: '/', hash: '#products' }} onClick={() => setPanel(null)}>Shop</Link>
              <button type="button" onClick={() => setPanel('categories')}>Categories</button>
              <button type="button" onClick={() => setPanel('about')}>About</button>
              <button type="button" onClick={manageProducts}>Manage products</button>
            </nav>
          )}
        </div>
      )}
      {panel === 'bag' && (
        <CartPanel
          lines={cart.lines}
          itemCount={cart.itemCount}
          subtotalCents={cart.subtotalCents}
          onQuantityChange={onCartQuantityChange}
          onRemove={onCartRemove}
          onClose={() => { setPanel(null); triggerRef.current?.focus(); }}
          onContinueShopping={showProducts}
        />
      )}
    </header>
  );
}
