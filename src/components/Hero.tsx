import { heroImage } from '../data/products';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">THE NEW ESSENTIALS</p>
        <h1 id="hero-title">Tech that moves<br className="desktop-break" /> with you.</h1>
        <p className="hero-description">Discover everyday technology designed for your life.</p>
        <a className="primary-button hero-link" href="#products">Shop Collection</a>
      </div>
      <div className="hero-art">
        <img
          src={heroImage}
          alt="Matte black over-ear wireless headphones with champagne-gold accents"
          width="800"
          height="800"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
