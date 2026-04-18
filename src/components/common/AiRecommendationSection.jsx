import { useEffect, useState } from 'react';
import ProductCard from '../shop/ProductCard';
import { getRecommendations } from '../../services/api';
import { getRecentViewedProductIds } from '../../services/recentViews';

const productGridColumnClass = 'col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 d-flex';

function AiRecommendationSection({ eyebrow, title, text, preferences, emptyTitle = 'No recommendations yet.' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const preferenceKey = JSON.stringify(preferences || {});

  useEffect(() => {
    let active = true;
    setLoading(true);

    getRecommendations({ ...(preferences || {}), recent_viewed_ids: getRecentViewedProductIds() })
      .then((payload) => {
        if (active) {
          setItems(payload.recommended || []);
        }
      })
      .catch(() => {
        if (active) {
          setItems([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [preferenceKey]);

  return (
    <section className="section-space bg-soft homepage-section homepage-ai-section">
      <div className="container">
        <div className="section-title">
          <span className="section-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>

        {loading ? (
          <div className="filter-empty-state">
            <h4>Loading AI picks</h4>
            <p>Ranking products from your live catalog.</p>
          </div>
        ) : items.length ? (
          <div className="row g-3 g-lg-4 align-items-stretch homepage-product-row">
            {items.slice(0, 4).map((product) => (
              <div key={product.slug || product.id} className={productGridColumnClass}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="filter-empty-state">
            <h4>{emptyTitle}</h4>
            <p>Try a broader style or price preference to generate more matches.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default AiRecommendationSection;
