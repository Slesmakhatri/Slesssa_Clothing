import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  DEFAULT_PRODUCT_IMAGE,
  getCategoryFallbackImage,
  getProductHoverImage,
  getProductIdentifier,
  getProductImage,
  getProductOldPrice,
  getProductPrice,
  getProductType,
  isCustomizableProduct,
  isReadyMadeProduct
} from '../../services/productUtils';

function ProductCard({ product, onQuickView }) {
  const { addItem } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const productPath = getProductIdentifier(product);
  const productImage = getProductImage(product);
  const hoverImage = getProductHoverImage(product);
  const [primaryImage, setPrimaryImage] = useState(productImage);
  const [secondaryImage, setSecondaryImage] = useState(hoverImage);
  const [adding, setAdding] = useState(false);
  const price = getProductPrice(product);
  const oldPrice = getProductOldPrice(product);
  const sizePreview = (product.sizes || []).slice(0, 4);
  const productType = getProductType(product);
  const canAddToCart = isReadyMadeProduct(product);
  const canCustomize = isCustomizableProduct(product);

  useEffect(() => {
    setPrimaryImage(productImage);
    setSecondaryImage(hoverImage);
  }, [hoverImage, productImage]);

  async function handleBuyNow() {
    setAdding(true);

    try {
      await addItem(product, {
        size: product.sizes?.[0] || '',
        color: product.colors?.[0] || '',
        quantity: 1
      });
      navigate('/checkout');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Shop card buy-now failed', error?.payload || error);
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="product-card premium-product-card">
      <div className="product-media premium-product-media">
        <Link to={`/shop/${productPath}`} className="product-media-stack" aria-label={`Open ${product.title || product.name}`}>
          <img
            src={primaryImage}
            alt={product.title || product.name}
            className="product-image-primary"
            onError={() => setPrimaryImage(getCategoryFallbackImage(product) || DEFAULT_PRODUCT_IMAGE)}
          />
          <img
            src={secondaryImage}
            alt={`${product.title || product.name} alternate view`}
            className="product-image-secondary"
            onError={() => setSecondaryImage(getCategoryFallbackImage(product) || primaryImage || DEFAULT_PRODUCT_IMAGE)}
          />
        </Link>

        <div className="product-card-overlays">
          <span className="product-badge">{product.badge || 'Slessaa Edit'}</span>
          <div className="product-actions">
            <button type="button" className="icon-circle" onClick={() => onQuickView?.(product)} aria-label="Quick view">
              <i className="bi bi-eye"></i>
            </button>
            <button
              type="button"
              className={`icon-circle ${isSaved(product) ? 'active' : ''}`}
              onClick={() => toggleWishlist(product)}
              aria-label="Add to wishlist"
            >
              <i className={`bi ${isSaved(product) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="product-body">
        <div className="product-copy-block">
          <div className="product-card-topline">
            <span className="product-category">{product.category}</span>
            <span className="product-audience">{product.audience}</span>
          </div>
          {product.sustainabilityLabel !== 'Guidance unavailable' ? (
            <div className="product-eco-inline">
              <span className="product-eco-badge">
                <i className="bi bi-leaf-fill"></i> {product.sustainabilityLabel}
              </span>
              <small>{product.impactBand}</small>
            </div>
          ) : null}
          <h5 className="product-card-title">
            <Link to={`/shop/${productPath}`}>{product.title || product.name}</Link>
          </h5>
          <p className="product-card-description">{product.description}</p>
          <div className="mood-values">
            <span className="value-pill">{productType === 'both' ? 'Ready-made + Customizable' : productType === 'customizable' ? 'Customizable' : 'Ready-made'}</span>
            {product.vendor_name || product.vendorName ? <span className="value-pill subtle">{product.vendor_name || product.vendorName}</span> : null}
          </div>
          <div className="product-size-row" aria-label="Available sizes">
            {sizePreview.map((size) => (
              <span key={size} className="product-size-pill">
                {size}
              </span>
            ))}
          </div>
        </div>

        <div className="product-footer">
          <div className="product-price-stack">
            <strong>NPR {price.toLocaleString()}</strong>
            {oldPrice > price ? <span>NPR {oldPrice.toLocaleString()}</span> : null}
          </div>
          <div className="product-cta-group">
            {canAddToCart ? (
              <button
                type="button"
                className="btn btn-slessaa btn-slessaa-primary add-to-cart-btn"
                onClick={handleBuyNow}
                disabled={adding}
              >
                {adding ? 'Loading...' : 'Add to Cart'}
              </button>
            ) : null}
            {canCustomize ? (
              <Link
                to="/tailoring"
                state={{ referenceProduct: product }}
                className="btn btn-slessaa btn-slessaa-outline"
              >
                Customize for You
              </Link>
            ) : null}
            {!canAddToCart && !canCustomize ? (
              <Link to={`/shop/${productPath}`} className="btn btn-slessaa btn-slessaa-outline">
                View Details
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
