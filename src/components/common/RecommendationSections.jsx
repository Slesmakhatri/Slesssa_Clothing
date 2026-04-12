import ProductCard from '../shop/ProductCard';

function RecommendationSectionBlock({ section, loading, emptyCopy }) {
  const items = section?.items || [];

  return (
    <div className="table-card recommendation-section-card">
      <div className="section-title text-start mb-3">
        <span className="section-eyebrow">{section?.title || 'Recommendations'}</span>
        <h3>{section?.title || 'Recommendations'}</h3>
        <p>{section?.description || emptyCopy}</p>
      </div>
      {loading ? (
        <div className="filter-empty-state">
          <h4>Loading recommendations</h4>
          <p>Scoring products from your catalog signals.</p>
        </div>
      ) : items.length ? (
        <div className="shop-product-grid">
          {items.slice(0, 4).map((product) => (
            <div key={product.slug || product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="filter-empty-state">
          <h4>No products yet</h4>
          <p>{emptyCopy}</p>
        </div>
      )}
    </div>
  );
}

function RecommendationSections({ sections, loading = false, sectionOrder = [], emptyCopy = 'Try broadening your catalog signals.' }) {
  const resolvedKeys = sectionOrder.length ? sectionOrder : Object.keys(sections || {});

  return (
    <div className="recommendation-section-stack">
      {resolvedKeys.map((key) => (
        <RecommendationSectionBlock
          key={key}
          section={sections?.[key]}
          loading={loading}
          emptyCopy={emptyCopy}
        />
      ))}
    </div>
  );
}

export default RecommendationSections;
