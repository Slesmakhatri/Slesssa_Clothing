import { useEffect, useMemo, useState } from 'react';
import AiRecommendationSection from '../components/common/AiRecommendationSection';
import RecommendationSections from '../components/common/RecommendationSections';
import { Link } from 'react-router-dom';
import QuickViewModal from '../components/common/QuickViewModal';
import ProductCard from '../components/shop/ProductCard';
import {
  storefrontHero,
  storefrontProducts
} from '../data/storefront';
import { getRecommendations, listProducts } from '../services/api';
import { buildCuratedCollections } from '../services/catalog';
import { getRecentViewedProductIds } from '../services/recentViews';

function buildHomepageRecommendationFallback(sections, collections) {
  const recommendedItems = collections.recommended?.length ? collections.recommended : collections.trending || [];
  const trendingItems = collections.trending?.length ? collections.trending : collections.catalog || [];
  return {
    ...(sections || {}),
    recommended_for_you: {
      title: sections?.recommended_for_you?.title || 'Recommended for You',
      description: sections?.recommended_for_you?.description || 'New-user fallback from top-rated catalog products.',
      items: sections?.recommended_for_you?.items?.length ? sections.recommended_for_you.items : recommendedItems.slice(0, 8)
    },
    trending_now: {
      title: sections?.trending_now?.title || 'Trending Now',
      description: sections?.trending_now?.description || 'Popular styles from the current Slessaa catalog.',
      items: sections?.trending_now?.items?.length ? sections.trending_now.items : trendingItems.slice(0, 8)
    }
  };
}

function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [collections, setCollections] = useState(buildCuratedCollections(storefrontProducts));
  const [recommendationSections, setRecommendationSections] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  useEffect(() => {
    listProducts()
      .then((items) => setCollections(buildCuratedCollections(items)))
      .catch(() => setCollections(buildCuratedCollections(storefrontProducts)));

    getRecommendations({ recent_viewed_ids: getRecentViewedProductIds() })
      .then((payload) => setRecommendationSections(payload.sections || null))
      .catch(() => setRecommendationSections(null))
      .finally(() => setRecommendationLoading(false));
  }, []);

  const customizationIdeas = useMemo(
    () =>
      collections.catalog
        .filter((item) => ['Dresses', 'Kurtas', 'Blazers'].includes(item.category))
        .slice(0, 3),
    [collections.catalog]
  );
  const bestSellerProducts = useMemo(
    () => (collections.bestSellers?.length ? collections.bestSellers : collections.trending).slice(0, 4),
    [collections.bestSellers, collections.trending]
  );
  const homepageRecommendationSections = useMemo(
    () => buildHomepageRecommendationFallback(recommendationSections, collections),
    [collections, recommendationSections]
  );

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
        <section className="section-space homepage-section homepage-product-section">
          <div className="container">
            <div className="section-title">
              <span className="section-eyebrow">Featured Products</span>
              <h2>Clean product discovery without extra category clutter.</h2>
              <p>Browse a tighter edit of premium pieces with direct purchase and customization actions.</p>
            </div>

            <div className="shop-product-grid">
              {collections.recommended.slice(0, 4).map((product) => (
                <div key={product.slug}>
                  <ProductCard product={product} onQuickView={setSelectedProduct} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space bg-soft homepage-section">
          <div className="container">
            <div className="section-title">
              <span className="section-eyebrow">New Arrivals</span>
              <h2>Fresh drops across denim, tailoring, and festive dressing.</h2>
              <p>
                This section stays connected to the same product records used in shop results, quick view, details, and
                the cart.
              </p>
            </div>

            <div className="homepage-two-column">
              <div className="editorial-panel">
                <Link to="/shop?curated=New%20Arrivals" className="btn btn-slessaa btn-slessaa-outline">
                  Explore New Arrivals
                </Link>
              </div>

              <div className="stacked-product-list">
                {collections.newIn.slice(0, 3).map((product) => (
                  <Link key={product.slug} to={`/shop/${product.slug}`} className="stacked-product-item">
                    <img src={product.image} alt={product.name} />
                    <div>
                      <span>{product.category}</span>
                      <strong>{product.name}</strong>
                      <small>NPR {product.price.toLocaleString()}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-space homepage-section">
          <div className="container">
            <div className="custom-home-cta">
              <div className="section-title">
                <span className="section-eyebrow">Customize For You</span>
                <h2>Made to your taste, fit, and occasion.</h2>
                <p>Choose a design you love, personalize the details, and send a premium customization request in a few steps.</p>
                <Link to="/tailoring" className="btn btn-slessaa btn-slessaa-primary">
                  Start Customization
                </Link>
              </div>

              <div className="custom-home-grid">
                {customizationIdeas.map((product) => (
                  <Link key={product.slug} to="/tailoring" state={{ referenceProduct: product }} className="custom-home-card">
                    <img src={product.image} alt={product.name} />
                    <div>
                      <span>{product.category}</span>
                      <strong>{product.name}</strong>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-space bg-soft homepage-section">
          <div className="container">
            <div className="section-title">
              <span className="section-eyebrow">Best Sellers</span>
              <h2>High-conviction styles with cleaner product presentation.</h2>
              <p>Large clothing images, stable spacing, quick actions, and a simpler premium visual rhythm.</p>
            </div>
            <div className="shop-product-grid best-seller-product-grid">
              {bestSellerProducts.map((product) => (
                <div key={product.slug}>
                  <ProductCard product={product} onQuickView={setSelectedProduct} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-space bg-soft homepage-section homepage-recommendation-section">
          <div className="container">
            <div className="section-title">
              <span className="section-eyebrow">Advanced Recommendations</span>
              <h2>Recommended for you and trending now</h2>
              <p>This section combines browsing, cart/order behavior, and trending catalog signals with a clean fallback for new users.</p>
            </div>
            <RecommendationSections
              sections={homepageRecommendationSections}
              loading={recommendationLoading}
              sectionOrder={['recommended_for_you', 'trending_now']}
              emptyCopy="Recommendations will appear here after the catalog is ranked."
              onQuickView={setSelectedProduct}
            />
          </div>
        </section>

        <AiRecommendationSection
          eyebrow="AI For You"
          title="Smart recommendations from recent products and shopper signals"
          text="This legacy quick shelf still uses the upgraded backend ranking while keeping the original UI intact."
          preferences={{ occasion: 'casual' }}
        />
      </div>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}

export default HomePage;
