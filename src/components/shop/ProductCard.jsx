import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  DEFAULT_PRODUCT_IMAGE,
  getCategoryFallbackImage,
  getProductDetailPath,
  getProductHoverImage,
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
  const productDetailPath = getProductDetailPath(product);
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
  const productName = product.title || product.name || 'Slessaa product';
  const vendorName = product.vendor_name || product.vendorName || product.vendor_detail?.brand_name || '';
  const productCategory = product.category || product.category_name || product.category_detail?.name || 'Slessaa edit';
  const productAudience = product.audience || product.product_type || '';
  const productTypeLabel = productType === 'both' ? 'Ready-made + Customizable' : productType === 'customizable' ? 'Customizable' : 'Ready-made';

  useEffect(() => {
    setPrimaryImage(productImage);
    setSecondaryImage(hoverImage);
  }, [hoverImage, productImage]);

  function isInteractiveCardTarget(target) {
    return Boolean(target.closest('a, button, input, select, textarea, [role="button"]'));
  }

  function openProductDetails() {
    navigate(productDetailPath);
  }

  function handleCardClick(event) {
    if (isInteractiveCardTarget(event.target)) return;
    openProductDetails();
  }

  function handleCardKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isInteractiveCardTarget(event.target)) return;
    event.preventDefault();
    openProductDetails();
  }

  async function handleBuyNow(event) {
    event?.stopPropagation();
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
    <article
      className="product-card premium-product-card ecommerce-product-card w-100"
      role="link"
      tabIndex={0}
      aria-label={`Open ${productName}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="product-media premium-product-media ecommerce-product-card__media">
        <Link to={productDetailPath} className="product-media-stack ecommerce-product-card__image-link" aria-label={`Open ${productName}`}>
          <img
            src={primaryImage}
            alt={productName}
            className="product-image-primary"
            onError={() => setPrimaryImage(getCategoryFallbackImage(product) || DEFAULT_PRODUCT_IMAGE)}
          />
          <img
            src={secondaryImage}
            alt={`${productName} alternate view`}
            className="product-image-secondary"
            onError={() => setSecondaryImage(getCategoryFallbackImage(product) || primaryImage || DEFAULT_PRODUCT_IMAGE)}
          />
        </Link>

        <div className="product-card-overlays">
          <span className="product-badge">{product.badge || 'Slessaa Edit'}</span>
          <div className="product-actions">
            <button
              type="button"
              className="icon-circle"
              onClick={(event) => {
                event.stopPropagation();
                onQuickView?.(product);
              }}
              aria-label="Quick view"
            >
              <i className="bi bi-eye"></i>
            </button>
            <button
              type="button"
              className={`icon-circle ${isSaved(product) ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleWishlist(product);
              }}
              aria-label="Add to wishlist"
            >
              <i className={`bi ${isSaved(product) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="product-body ecommerce-product-card__body">
        <div className="product-copy-block ecommerce-product-card__content">
          <div className="product-card-topline">
            <span className="product-category">{productCategory}</span>
            {productAudience ? <span className="product-audience">{productAudience}</span> : null}
          </div>
          <h5 className="product-card-title">
            <Link to={productDetailPath}>{productName}</Link>
          </h5>
          <div className="product-price-stack ecommerce-product-card__price">
            <strong>NPR {price.toLocaleString()}</strong>
            {oldPrice > price ? <span>NPR {oldPrice.toLocaleString()}</span> : null}
          </div>
          {product.description ? <p className="product-card-description">{product.description}</p> : null}
          <div className="mood-values ecommerce-product-card__meta">
            <span className="value-pill">{productTypeLabel}</span>
            {vendorName ? <span className="value-pill subtle">{vendorName}</span> : null}
          </div>
          {product.sustainabilityLabel && product.sustainabilityLabel !== 'Guidance unavailable' ? (
            <div className="product-eco-inline ecommerce-product-card__eco">
              <span className="product-eco-badge">
                <i className="bi bi-leaf-fill"></i> {product.sustainabilityLabel}
              </span>
              {product.impactBand ? <small>{product.impactBand}</small> : null}
            </div>
          ) : null}
          {sizePreview.length ? <div className="product-size-row" aria-label="Available sizes">
            {sizePreview.map((size) => (
              <span key={size} className="product-size-pill">
                {size}
              </span>
            ))}
          </div> : null}
        </div>

        <div className="product-footer ecommerce-product-card__actions">
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
                onClick={(event) => event.stopPropagation()}
              >
                Customize for You
              </Link>
            ) : null}
            {!canAddToCart && !canCustomize ? (
              <Link to={productDetailPath} className="btn btn-slessaa btn-slessaa-outline" onClick={(event) => event.stopPropagation()}>
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
