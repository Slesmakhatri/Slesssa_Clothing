import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { getCategoryFallbackImage, getProductImage, getProductPrice, getProductReviews, getVendorName } from '../../services/productUtils';

function QuickViewModal({ product, onClose }) {
  const { addItem } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();

  if (!product) {
    return null;
  }

  const image = getProductImage(product);
  const price = getProductPrice(product);
  const reviews = getProductReviews(product);
  const categoryLabel = product.category_detail?.name || product.category;
  const colors = product.colors || [];
  const vendorName = getVendorName(product);

  async function handleAddToCart() {
    try {
      await addItem(product, {
        size: product.sizes?.[0] || '',
        color: colors[0] || '',
        quantity: 1
      });
    } catch {}
  }

  return (
    <div className="quick-view-backdrop" onClick={onClose}>
      <div className="quick-view-modal" onClick={(event) => event.stopPropagation()}>
        <button className="quick-close" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
        <div className="row g-4">
          <div className="col-md-5">
            <img
              src={image}
              alt={product.title || product.name}
              className="img-fluid rounded-4"
              onError={(event) => {
                event.currentTarget.src = getCategoryFallbackImage(product);
              }}
            />
          </div>
          <div className="col-md-7">
            <span className="section-eyebrow">{categoryLabel}</span>
            <h3>{product.title || product.name}</h3>
            <div className="product-vendor-line quick-vendor-line">
              <i className="bi bi-shop"></i> {vendorName}
            </div>
            <p>{product.description || product.short_description}</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {colors.map((color) => (
                <span key={color} className="chip">
                  {color}
                </span>
              ))}
            </div>
            <div className="quick-view-meta">
              <strong>NPR {price.toLocaleString()}</strong>
              <span>
                <i className="bi bi-star-fill"></i> {product.rating} ({reviews} reviews)
              </span>
            </div>
            <div className="d-flex flex-wrap gap-3 mt-4">
              <button className="btn btn-slessaa btn-slessaa-primary add-to-cart-btn" onClick={handleAddToCart}>Add to Cart</button>
              <button className="btn btn-slessaa btn-slessaa-outline" onClick={() => toggleWishlist(product)}>
                {isSaved(product) ? 'Saved' : 'Wishlist'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickViewModal;
