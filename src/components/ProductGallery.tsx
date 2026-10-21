import { useState } from 'react';
import type { ProductImage } from '../types/product';

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
};

/** Main image plus clickable thumbnails. Works with any number of images; thumbnails appear only for two or more. */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, images.length - 1);
  const current = images[index];

  return (
    <div className="pdp-gallery">
      <div className={`pdp-stage${current ? ` pdp-image--${current.kind}` : ''}`}>
        {current ? (
          <img src={current.src} alt={current.alt} width="1200" height="1200" />
        ) : (
          <span className="image-placeholder">Image coming soon</span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="pdp-thumbnails" aria-label={`${productName} images`}>
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                className={`pdp-thumbnail pdp-image--${image.kind}`}
                aria-pressed={i === index}
                aria-label={`Show image ${i + 1} of ${images.length}: ${image.alt}`}
                onClick={() => setSelected(i)}
              >
                <img src={image.src} alt="" width="1200" height="1200" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
