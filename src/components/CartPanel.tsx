import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { MAX_CART_QUANTITY } from '../lib/cart';
import type { CartSummary } from '../types/cart';
import { formatPrice } from '../types/product';
import { Icon } from './Icon';
import './CartPanel.css';

type CartPanelProps = CartSummary & {
  onQuantityChange: (productId: string, delta: 1 | -1) => void;
  onRemove: (productId: string) => void;
  onClose: () => void;
  onContinueShopping: () => void;
};

export function CartPanel({ lines, itemCount, subtotalCents, onQuantityChange, onRemove, onClose, onContinueShopping }: CartPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const quantityButtons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    headingRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (pendingFocus.current === undefined) return;
    const nextButton = pendingFocus.current ? quantityButtons.current.get(pendingFocus.current) : undefined;
    (nextButton ?? headingRef.current)?.focus();
    pendingFocus.current = undefined;
  }, [lines]);

  function close(continueShopping = false) {
    // Close the native modal before focusing the bag button or storefront.
    dialogRef.current?.close();
    if (continueShopping) onContinueShopping();
    else onClose();
  }

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const first = controls[0];
    const last = controls.at(-1);
    const active = document.activeElement;
    const startsAtHeading = active === headingRef.current || active === dialogRef.current;
    if (event.shiftKey && (active === first || startsAtHeading)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (active === last || startsAtHeading)) {
      event.preventDefault();
      first?.focus();
    }
  }

  function prepareRemoval(productId: string) {
    const index = lines.findIndex((line) => line.product.id === productId);
    pendingFocus.current = (lines[index + 1] ?? lines[index - 1])?.product.id ?? null;
  }

  function remove(productId: string) {
    prepareRemoval(productId);
    onRemove(productId);
  }

  function changeQuantity(productId: string, quantity: number, delta: 1 | -1) {
    if (quantity === 1 && delta === -1) prepareRemoval(productId);
    if (quantity === MAX_CART_QUANTITY - 1 && delta === 1) {
      // The increment button becomes disabled at the limit; keep focus in its row.
      pendingFocus.current = productId;
    }
    onQuantityChange(productId, delta);
  }

  return (
    <dialog
      ref={dialogRef}
      id="shopping-bag"
      className="cart-dialog"
      aria-labelledby="cart-title"
      aria-describedby="cart-count"
      onKeyDown={trapFocus}
      onCancel={(event) => { event.preventDefault(); close(); }}
    >
      <header className="cart-header">
        <div>
          <h2 ref={headingRef} id="cart-title" tabIndex={-1}>Your shopping bag</h2>
          <p id="cart-count">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Close shopping bag" onClick={() => close()}>
          <Icon name="close" />
        </button>
      </header>

      <div className="cart-content">
        {lines.length === 0 ? (
          <div className="cart-empty">
            <Icon name="bag" />
            <h3>Your bag is empty</h3>
            <p>Find your next essential in our collection.</p>
          </div>
        ) : (
          <>
            <p className="sr-only" id="cart-quantity-help">Decrease to zero to remove an item. Maximum {MAX_CART_QUANTITY} of each product.</p>
            <ul className="cart-list" aria-label="Shopping bag items">
              {lines.map(({ product, quantity, lineTotalCents }) => (
                <li key={product.id} className="cart-item" aria-labelledby={`cart-product-${product.id}`}>
                  <div className="cart-item-image">
                    {product.image ? <img src={product.image} alt={product.name} /> : <span>Image coming soon</span>}
                  </div>
                  <div className="cart-item-details">
                    <h3 id={`cart-product-${product.id}`}>{product.name}</h3>
                    <p className="cart-unit-price">{formatPrice(product.price)} each</p>
                    <div className="cart-quantity" role="group" aria-label={`Quantity for ${product.name}`} aria-describedby="cart-quantity-help">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${product.name}`}
                        ref={(button) => {
                          if (button) quantityButtons.current.set(product.id, button);
                          else quantityButtons.current.delete(product.id);
                        }}
                        onClick={() => changeQuantity(product.id, quantity, -1)}
                      >−</button>
                      <output aria-label={`Quantity of ${product.name}`} aria-live="off">{quantity}</output>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${product.name}`}
                        disabled={quantity >= MAX_CART_QUANTITY}
                        onClick={() => changeQuantity(product.id, quantity, 1)}
                      >+</button>
                    </div>
                    {quantity === MAX_CART_QUANTITY && <p className="cart-limit">Maximum {MAX_CART_QUANTITY} per product.</p>}
                    <div className="cart-line-footer">
                      <p>Line total <strong>{formatPrice(lineTotalCents / 100)}</strong></p>
                      <button type="button" className="text-button" aria-label={`Remove ${product.name} from bag`} onClick={() => remove(product.id)}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <footer className="cart-footer">
        <p className="sr-only" role="status" aria-atomic="true">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} in your bag. Subtotal {formatPrice(subtotalCents / 100)}.
        </p>
        <dl className="cart-subtotal"><dt>Subtotal</dt><dd>{formatPrice(subtotalCents / 100)}</dd></dl>
        <button type="button" className="primary-button" onClick={() => close(true)}>Continue shopping</button>
      </footer>
    </dialog>
  );
}
