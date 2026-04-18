import ProductCard from '../shop/ProductCard';

const productGridColumnClass = 'col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 d-flex';

function RecommendationSectionBlock({ section, loading, emptyCopy, onQuickView }) {
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
        <div className="row g-3 g-lg-4 align-items-stretch recommendation-product-grid">
          {items.slice(0, 4).map((product) => (
            <div key={product.slug || product.id} className={productGridColumnClass}>
              <ProductCard product={product} onQuickView={onQuickView} />
            </div>
          ))}
        </div>
      ) : (
        <div className="filter-empty-state compact recommendation-empty-state">
          <h4>No products yet</h4>
          <p>{emptyCopy}</p>
        </div>
      )}
    </div>
  );
}

function RecommendationSections({ sections, loading = false, sectionOrder = [], emptyCopy = 'Try broadening your catalog signals.', onQuickView }) {
  const resolvedKeys = sectionOrder.length ? sectionOrder : Object.keys(sections || {});
  const availableSections = resolvedKeys
    .map((key) => ({ key, section: sections?.[key] }))
    .filter(({ section }) => section);
  const hasProducts = availableSections.some(({ section }) => (section?.items || []).length > 0);
  const renderableSections = loading
    ? availableSections.length
      ? availableSections
      : [{ key: 'loading', section: { title: 'Recommendations', description: emptyCopy, items: [] } }]
    : availableSections.filter(({ section }) => hasProducts ? (section?.items || []).length > 0 : true);

  if (!renderableSections.length) {
    return (
      <div className="recommendation-section-stack">
        <div className="filter-empty-state compact recommendation-empty-state">
          <h4>No recommendations yet</h4>
          <p>{emptyCopy}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-section-stack">
      {renderableSections.map(({ key, section }) => (
        <RecommendationSectionBlock
          key={key}
          section={section}
          loading={loading}
          emptyCopy={emptyCopy}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}

export default RecommendationSections;
