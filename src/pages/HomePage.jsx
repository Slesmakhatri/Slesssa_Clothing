import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QuickViewModal from '../components/common/QuickViewModal';
import ProductSection from '../components/common/ProductSection';
import {
  storefrontHero,
  storefrontProducts
} from '../data/storefront';
import { listProducts } from '../services/api';
import { buildCuratedCollections } from '../services/catalog';

function pickFirstProductSet(...groups) {
  return groups.find((group) => Array.isArray(group) && group.length) || [];
}

function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const fallbackCollections = useMemo(() => buildCuratedCollections(storefrontProducts), []);
  const [collections, setCollections] = useState(fallbackCollections);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    setCatalogLoading(true);
    listProducts()
      .then((items) => {
        const nextCollections = items.length ? buildCuratedCollections(items) : fallbackCollections;
        setCollections(nextCollections);
      })
      .catch(() => setCollections(fallbackCollections))
      .finally(() => setCatalogLoading(false));
  }, [fallbackCollections]);

  const featuredProducts = useMemo(
    () => pickFirstProductSet(collections.recommended, collections.newIn, collections.catalog).slice(0, 8),
    [collections.catalog, collections.newIn, collections.recommended, collections.trending]
  );
  const trendingProducts = useMemo(
    () => pickFirstProductSet(collections.trending, collections.newIn, collections.catalog).slice(0, 8),
    [collections.catalog, collections.newIn, collections.trending]
  );
  const hasCatalogProducts = collections.catalog.length > 0;

  return (
    <>
      <section className="storefront-hero">
        <div className="container storefront-hero-grid">
          <div className="storefront-hero-copy">
            <span className="section-eyebrow">{storefrontHero.eyebrow}</span>
            <h1>{storefrontHero.title}</h1>
            <p>{storefrontHero.text}</p>
            <div className="storefront-hero-actions">
              <Link to={storefrontHero.primaryCta.to} className="btn btn-slessaa btn-slessaa-primary">
                {storefrontHero.primaryCta.label}
              </Link>
              <Link to={storefrontHero.secondaryCta.to} className="btn btn-slessaa btn-slessaa-outline">
                {storefrontHero.secondaryCta.label}
              </Link>
            </div>
            <div className="storefront-hero-metrics">
              {storefrontHero.metrics.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="storefront-hero-media">
            <img src={storefrontHero.image} alt="Slessaa premium collection" />
            <div className="hero-floating-note">
              <span>Stable catalog</span>
              <strong>Same product identity from homepage to cart.</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="homepage-main-flow">
        {catalogLoading || hasCatalogProducts ? (
          <>
            <ProductSection
              eyebrow="Featured Products"
              title="A tighter edit of refined pieces ready to shop."
              text="Curated first from featured catalog products, then from the freshest active arrivals."
              products={featuredProducts}
              fallbackProducts={collections.catalog}
              loading={catalogLoading}
              limit={8}
              action={{ to: '/shop', label: 'Shop All Products' }}
              onQuickView={setSelectedProduct}
              className="homepage-product-section"
            />

            <ProductSection
              eyebrow="Trending Now"
              title="Current favorites with the same clean, stable catalog flow."
              text="Built from trending products first, then backed by the latest active catalog so this section never drops out when products exist."
              products={trendingProducts}
              fallbackProducts={collections.catalog}
              loading={catalogLoading}
              limit={8}
              action={{ to: '/shop?sort=latest', label: 'Explore New Arrivals' }}
              onQuickView={setSelectedProduct}
            />
          </>
        ) : (
          <section className="section-space homepage-section">
            <div className="container">
              <div className="filter-empty-state compact homepage-empty-state">
                <h4>No products available yet. Stay tuned.</h4>
                <p>Fresh catalog drops will appear here as soon as products are published.</p>
                <Link to="/categories" className="btn btn-slessaa btn-slessaa-outline mt-3">
                  Browse Categories
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}

export default HomePage;
