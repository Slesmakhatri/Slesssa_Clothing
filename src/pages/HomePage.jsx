import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QuickViewModal from '../components/common/QuickViewModal';
import ProductSection from '../components/common/ProductSection';
import {
  storefrontHero,
  storefrontProducts
} from '../data/storefront';
import { getRecommendations, listProducts } from '../services/api';
import { buildCuratedCollections } from '../services/catalog';
import { getRecentViewedProductIds } from '../services/recentViews';

function pickFirstProductSet(...groups) {
  return groups.find((group) => Array.isArray(group) && group.length) || [];
}

function buildHomepageRecommendationFallback(sections, collections, recentViewedIds = []) {
  const recentViewedItems = recentViewedIds.length
    ? collections.catalog.filter((item) => recentViewedIds.includes(Number(item.id)))
    : [];
  const recommendedItems = pickFirstProductSet(
    recentViewedItems,
    collections.recommended,
    collections.trending,
    collections.newIn,
    collections.catalog
  );
  const trendingItems = pickFirstProductSet(
    collections.trending,
    collections.bestSellers,
    collections.newIn,
    collections.catalog
  );
  return {
    ...(sections || {}),
    recommended_for_you: {
      title: sections?.recommended_for_you?.title || 'Recommended for You',
      description:
        sections?.recommended_for_you?.description ||
        (recentViewedItems.length
          ? 'Inspired by pieces you recently viewed.'
          : 'Fallback picks from active catalog favorites and fresh arrivals.'),
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
  const fallbackCollections = useMemo(() => buildCuratedCollections(storefrontProducts), []);
  const [collections, setCollections] = useState(fallbackCollections);
  const [recommendationSections, setRecommendationSections] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const recentViewedIds = useMemo(() => getRecentViewedProductIds(), []);

  useEffect(() => {
    setCatalogLoading(true);
    listProducts()
      .then((items) => {
        const nextCollections = items.length ? buildCuratedCollections(items) : fallbackCollections;
        setCollections(nextCollections);
      })
      .catch(() => setCollections(fallbackCollections))
      .finally(() => setCatalogLoading(false));

    getRecommendations({ recent_viewed_ids: recentViewedIds })
      .then((payload) => setRecommendationSections(payload.sections || null))
      .catch(() => setRecommendationSections(null))
      .finally(() => setRecommendationLoading(false));
  }, [fallbackCollections, recentViewedIds]);

  const tailoringProducts = useMemo(
    () =>
      collections.catalog
        .filter((item) => ['Dresses', 'Kurtas', 'Blazers'].includes(item.category))
        .slice(0, 4),
    [collections.catalog]
  );
  const bestSellerProducts = useMemo(
    () =>
      pickFirstProductSet(
        collections.bestSellers,
        collections.recommended,
        collections.trending,
        collections.newIn,
        collections.catalog
      ).slice(0, 4),
    [collections.bestSellers, collections.catalog, collections.newIn, collections.recommended, collections.trending]
  );
  const homepageRecommendationSections = useMemo(
    () => buildHomepageRecommendationFallback(recommendationSections, collections, recentViewedIds),
    [collections, recommendationSections, recentViewedIds]
  );
  const featuredProducts = useMemo(
    () => pickFirstProductSet(collections.recommended, collections.trending, collections.newIn, collections.catalog).slice(0, 4),
    [collections.catalog, collections.newIn, collections.recommended, collections.trending]
  );
  const newArrivalProducts = useMemo(
    () => pickFirstProductSet(collections.newIn, collections.trending, collections.catalog).slice(0, 4),
    [collections.catalog, collections.newIn, collections.trending]
  );
  const recommendedForYouProducts = useMemo(
    () => (homepageRecommendationSections.recommended_for_you?.items || []).slice(0, 4),
    [homepageRecommendationSections]
  );
  const trendingNowProducts = useMemo(
    () => (homepageRecommendationSections.trending_now?.items || []).slice(0, 4),
    [homepageRecommendationSections]
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
        <ProductSection
          eyebrow="Featured Products"
          title="Clean product discovery without extra category clutter."
          text="Browse a tighter edit of premium pieces with direct purchase and customization actions."
          products={featuredProducts}
          fallbackProducts={collections.catalog}
          loading={catalogLoading}
          onQuickView={setSelectedProduct}
          className="homepage-product-section"
        />

        <ProductSection
          eyebrow="New Arrivals"
          title="Fresh drops across denim, tailoring, and festive dressing."
          text="New catalog pieces using the same card layout as every other product shelf."
          products={newArrivalProducts}
          fallbackProducts={collections.catalog}
          action={{ to: '/shop?curated=New%20Arrivals', label: 'Explore New Arrivals' }}
          loading={catalogLoading}
          onQuickView={setSelectedProduct}
        />

        <ProductSection
          eyebrow="Tailoring Picks"
          title="Made to your taste, fit, and occasion."
          text="Start from a product idea, then customize the details through tailoring."
          products={tailoringProducts}
          fallbackProducts={collections.catalog}
          action={{ to: '/tailoring', label: 'Start Customization' }}
          loading={catalogLoading}
          onQuickView={setSelectedProduct}
        />

        <ProductSection
          eyebrow="Best Sellers"
          title="High-conviction styles with cleaner product presentation."
          text="Large clothing images, stable spacing, quick actions, and a simpler premium visual rhythm."
          products={bestSellerProducts}
          fallbackProducts={pickFirstProductSet(collections.trending, collections.newIn, collections.catalog)}
          loading={catalogLoading}
          onQuickView={setSelectedProduct}
        />

        <ProductSection
          eyebrow="Recommended for You"
          title="Personalized picks from catalog and shopping signals."
          text={homepageRecommendationSections.recommended_for_you?.description || 'Fallback products keep this shelf filled for new users.'}
          products={recommendedForYouProducts}
          fallbackProducts={pickFirstProductSet(featuredProducts, collections.trending, collections.newIn, collections.catalog)}
          loading={catalogLoading || recommendationLoading}
          onQuickView={setSelectedProduct}
        />

        <ProductSection
          eyebrow="Trending Now"
          title="Popular styles from the current Slessaa catalog."
          text={homepageRecommendationSections.trending_now?.description || 'Trending catalog products with the same stable ecommerce grid.'}
          products={trendingNowProducts}
          fallbackProducts={pickFirstProductSet(bestSellerProducts, collections.newIn, collections.catalog)}
          loading={catalogLoading || recommendationLoading}
          onQuickView={setSelectedProduct}
        />
      </div>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}

export default HomePage;
