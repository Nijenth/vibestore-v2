import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { formatPrice } from '../types/product';
import type { NewProduct, Product, ProductCategory } from '../types/product';
import { Icon } from './Icon';

type ProductManagerProps = {
  products: Product[];
  onAdd: (product: NewProduct) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function ProductManager({ products, onAdd, onDelete, onClose }: ProductManagerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Electronics');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim() || !price.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Enter a product name and a price greater than zero.');
      return;
    }
    onAdd({ name: name.trim(), price: numericPrice, category });
    setStatus(`${name.trim()} added to the store.`);
    setName('');
    setPrice('');
    setError('');
    nameRef.current?.focus();
  }

  function removeProduct(product: Product) {
    onDelete(product.id);
    setStatus(`${product.name} removed from the store.`);
    // Deleting the focused row would otherwise leave focus on the document body.
    nameRef.current?.focus();
  }

  return (
    <dialog ref={dialogRef} className="management-dialog" aria-labelledby="management-title" onCancel={onClose}>
      <div className="panel-heading">
        <h2 id="management-title">Manage products</h2>
        <button className="icon-button" type="button" aria-label="Close product management" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <p className="management-intro">Add and remove products in the current session. Prices are in US dollars.</p>
      <form className="product-form" onSubmit={handleSubmit}>
        <h3>Add a new product</h3>
        <label htmlFor="new-product-name">Product name</label>
        <input
          ref={nameRef}
          id="new-product-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
        />
        <label htmlFor="new-product-price">Price ($)</label>
        <input
          id="new-product-price"
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />
        <label htmlFor="new-product-category">Category</label>
        <select id="new-product-category" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory)}>
          <option>Electronics</option>
          <option>Accessories</option>
        </select>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button">Add Product</button>
      </form>
      <p className="management-status" role="status">{status}</p>
      <h3>Current products ({products.length})</h3>
      <ul className="management-list">
        {products.map((product) => (
          <li key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>{formatPrice(product.price)} · {product.category}</span>
            </div>
            <button
              className="delete-button"
              type="button"
              aria-label={`Delete ${product.name}`}
              onClick={() => removeProduct(product)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {products.length === 0 && <p>No products yet. Add your first product above.</p>}
    </dialog>
  );
}
