// AI-generated renders of fictional products. See docs/asset-provenance.md.
import headphones from '../assets/catalog/headphones-main.webp';
import headphonesProfile from '../assets/catalog/headphones-profile.webp';
import headphonesDetail from '../assets/catalog/headphones-detail.webp';
import headphonesContext from '../assets/catalog/headphones-context.webp';
import smartwatch from '../assets/catalog/smartwatch-main.webp';
import earbuds from '../assets/catalog/earbuds-main.webp';
import type { Product } from '../types/product';

export const heroImage = headphones;

export const featuredProducts: Product[] = [
  {
    id: 'headphones',
    name: 'Wireless Headphones',
    price: 149,
    category: 'Accessories',
    description: 'Premium Wireless Audio',
    image: headphones,
    gallery: [
      { src: headphones, kind: 'cutout', alt: 'Matte black over-ear headphones with champagne-gold accents, three-quarter view' },
      { src: headphonesProfile, kind: 'cutout', alt: 'Side view of the headphones showing the padded headband and oval ear cup' },
      { src: headphonesDetail, kind: 'cutout', alt: 'Close-up of the matte ear cup, champagne-gold trim and leather ear cushion' },
      { src: headphonesContext, kind: 'full-frame', alt: 'The headphones resting on a marble table beside a small potted plant' },
    ],
    details: {
      summary: 'A refined fictional audio concept, designed around soft matte surfaces, comfortable ear cushions and subtle champagne-gold detailing.',
      highlights: ['Comfort-first cushioned form', 'Minimal silhouette and balanced proportions'],
      specsTitle: 'Built for everyday listening',
      specs: [
        { label: 'Design', value: 'Matte-black cushioned over-ear form' },
        { label: 'Finish', value: 'Champagne-gold accent trim' },
        { label: 'Product type', value: 'Fictional wireless audio concept' },
      ],
    },
  },
  {
    id: 'smartwatch',
    name: 'Smartwatch',
    price: 199,
    category: 'Electronics',
    description: 'Smart Fitness & Health Tracking',
    image: smartwatch,
    gallery: [
      { src: smartwatch, kind: 'cutout', alt: 'Champagne-gold square smartwatch with an olive leather strap and a dark watch face showing time and activity readings' },
    ],
    details: {
      summary: 'A fictional smartwatch concept pairing a champagne-gold case with a soft olive strap and a clean, readable watch face.',
      highlights: ['Champagne-gold case with screw detailing', 'Soft olive strap for everyday wear'],
      specsTitle: 'Built for everyday wear',
      specs: [
        { label: 'Design', value: 'Rounded-square case with a single flush button' },
        { label: 'Finish', value: 'Champagne-gold case, olive strap' },
        { label: 'Product type', value: 'Fictional smartwatch concept' },
      ],
    },
  },
  {
    id: 'earbuds',
    name: 'Earbuds',
    price: 89,
    category: 'Accessories',
    description: 'Compact Wireless Sound',
    image: earbuds,
    gallery: [
      { src: earbuds, kind: 'cutout', alt: 'Navy stemless earbuds with champagne-gold trim in an open charging case' },
    ],
    details: {
      summary: 'A fictional earbuds concept in deep navy, with champagne-gold trim on each bud and along the compact charging case.',
      highlights: ['Stemless, rounded design', 'Pocket-sized case with champagne-gold trim'],
      specsTitle: 'Built to go anywhere',
      specs: [
        { label: 'Design', value: 'Stemless buds in a rounded charging case' },
        { label: 'Finish', value: 'Deep navy with champagne-gold trim' },
        { label: 'Product type', value: 'Fictional wireless audio concept' },
      ],
    },
  },
];
