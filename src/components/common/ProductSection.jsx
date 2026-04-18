import { Link } from 'react-router-dom';
import ProductCard from '../shop/ProductCard';

const productGridColumnClass = 'col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 d-flex';

function mergeProducts(products = [], fallbackProducts = [], limit = 4) {
  const seen = new Set();
  const merged = [];

  [...products, ...fallbackProducts].forEach((product) => {
    if (!product || merged.length >= limit) return;
    const key = product.slug || product.id || product.name || product.title;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(product);
  });

  return merged;
}

function ProductSection({
  eyebrow,
  title,
  text,
  products = [],
  fallbackProducts = [],
  loading = false,
  emptyTitle = 'No products yet',
  emptyText = 'Products will appear here when the catalog is ready.',
  action,
  onQuickView,
  className = ''
}) {
  const items = mergeProducts(products, fallbackProducts, 4);

  return (
    <section className={`section-space homepage-section product-section ${className}`}>
      <div className="container">
        <div className="product-section-head">
          <div className="section-title">
            {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
            <h2>{title}</h2>
            {text ? <p>{text}</p> : null}
          </div>
          {action?.to && action?.label ? (
            <Link to={action.to} className="btn btn-slessaa btn-slessaa-outline product-section-action">
              {action.label}
            </Link>
          ) : null}
        </div>

        {loading && !items.length ? (
          <div className="filter-empty-state compact homepage-empty-state">
            <h4>Loading products</h4>
            <p>Preparing this section from the live catalog.</p>
          </div>
        ) : items.length ? (
          <div className="row g-3 g-lg-4 align-items-stretch product-section-grid">
            {items.map((product) => (
              <div key={product.slug || product.id} className={productGridColumnClass}>
                <ProductCard product={product} onQuickView={onQuickView} />
              </div>
            ))}
          </div>
        ) : (
          <div className="filter-empty-state compact homepage-empty-state">
            <h4>{emptyTitle}</h4>
            <p>{emptyText}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductSection;
