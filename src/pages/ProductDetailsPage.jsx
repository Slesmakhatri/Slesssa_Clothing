import { useEffect, useMemo, useState } from 'react';
import AiRecommendationSection from '../components/common/AiRecommendationSection';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/shop/ProductCard';
import SectionTitle from '../components/common/SectionTitle';
import { storefrontProducts } from '../data/storefront';
import { createProductQuestion, createReview, getProduct, getRecommendations, listOrders, listProductQuestions, listProducts, listReviews } from '../services/api';
import RecommendationSections from '../components/common/RecommendationSections';
import { getRelatedProducts, normalizeProduct } from '../services/catalog';
import { getCategoryFallbackImage, getProductGallery, getProductOldPrice, getProductPrice, getProductType, getVendorId, isCustomizableProduct, isReadyMadeProduct } from '../services/productUtils';
import { getRecentViewedProductIds, recordRecentProductView } from '../services/recentViews';
import { getSustainabilityGuidanceForProduct, getSustainableAlternatives } from '../services/sustainability';

function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [catalog, setCatalog] = useState(storefrontProducts.map(normalizeProduct));
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [reviewForm, setReviewForm] = useState({ order: '', rating: 5, comment: '' });
  const [questionForm, setQuestionForm] = useState({ question: '' });
  const [reviewStatus, setReviewStatus] = useState('');
  const [questionStatus, setQuestionStatus] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [recommendationSections, setRecommendationSections] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getProduct(productId)
      .then((item) => {
        if (active && item) {
          const normalized = normalizeProduct(item);
          setProduct(normalized);
          setSelectedImage(getProductGallery(normalized)[0]);
          setSelectedSize(normalized.sizes?.[0] || '');
          setQuantity(1);
        } else if (active) {
          setProduct(null);
        }
      })
      .catch(() => {
        if (active) {
          const fallback = storefrontProducts.find((item) => item.slug === productId || String(item.id) === String(productId));
          if (fallback) {
            const normalized = normalizeProduct(fallback);
            setProduct(normalized);
            setSelectedImage(getProductGallery(normalized)[0]);
            setSelectedSize(normalized.sizes?.[0] || '');
          }
        }
      });

    listProducts().then((items) => {
      if (active) {
        setCatalog(items.map(normalizeProduct));
      }
    });

    return () => {
      active = false;
    };
  }, [productId]);

  const related = useMemo(() => (product ? getRelatedProducts(catalog, product, 4) : []), [catalog, product]);
  const sustainability = useMemo(() => (product ? getSustainabilityGuidanceForProduct(product) : null), [product]);
  const sustainableAlternatives = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.sustainable_alternatives) && product.sustainable_alternatives.length) {
      return product.sustainable_alternatives.map(normalizeProduct);
    }
    return getSustainableAlternatives(catalog, product, 4);
  }, [catalog, product]);
  const averageRatingText = useMemo(() => {
    if (!reviews.length) return `${Number(product?.rating || 0).toFixed(1)} / 5`;
    const average = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;
    return `${average.toFixed(1)} / 5`;
  }, [product?.rating, reviews]);
  const averageRatingValue = useMemo(() => {
    if (!reviews.length) return Number(product?.rating || 0);
    return reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;
  }, [product?.rating, reviews]);

  useEffect(() => {
    if (!product?.id) return;
    recordRecentProductView(product.id);
    listReviews({ product: product.id })
      .then(setReviews)
      .catch(() => setReviews([]));
    listProductQuestions({ product: product.id })
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    let active = true;
    setRecommendationLoading(true);
    getRecommendations({
      current_product_id: product.id,
      product_id: product.id,
      category: product.category,
      color_preference: product.colors?.[0] || '',
      recent_viewed_ids: getRecentViewedProductIds(),
    })
      .then((payload) => {
        if (active) {
          setRecommendationSections(payload.sections || null);
        }
      })
      .catch(() => {
        if (active) setRecommendationSections(null);
      })
      .finally(() => {
        if (active) setRecommendationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [product?.id, product?.category, product?.colors]);

  useEffect(() => {
    if (!isAuthenticated || !product?.id) {
      setEligibleOrders([]);
      return;
    }
    listOrders()
      .then((orders) => {
        const reviewedOrderIds = new Set(reviews.map((item) => String(item.order)));
        const filtered = orders.filter(
          (order) =>
            ['delivered', 'completed'].includes(String(order.status || '').toLowerCase()) &&
            !reviewedOrderIds.has(String(order.id)) &&
            (order.items || []).some((item) => String(item.product) === String(product.id))
        );
        setEligibleOrders(filtered);
        setReviewForm((current) => ({ ...current, order: current.order || String(filtered[0]?.id || '') }));
      })
      .catch(() => setEligibleOrders([]));
  }, [isAuthenticated, product?.id, reviews]);

  if (!product) {
    return (
      <section className="section-space">
        <div className="container">
          <div className="filter-empty-state">
            <h4>Loading product details</h4>
            <p>Preparing the product gallery and related styles.</p>
          </div>
        </div>
      </section>
    );
  }

  const gallery = getProductGallery(product);
  const price = getProductPrice(product);
  const oldPrice = getProductOldPrice(product);
  const productType = getProductType(product);
  const canAddToCart = isReadyMadeProduct(product);
  const canCustomize = isCustomizableProduct(product);
  const vendorUserId = product.vendor_detail?.user || null;
  const vendorId = getVendorId(product);

  async function handleBuyNow() {
    try {
      await addItem(product, {
        size: selectedSize,
        color: product.colors?.[0] || '',
        quantity
      });
      navigate('/checkout');
    } catch {}
  }

  async function handleSubmitReview(event) {
    event.preventDefault();
    if (!reviewForm.order) {
      setReviewStatus('Select a delivered order to review this product.');
      return;
    }
    setReviewLoading(true);
    setReviewStatus('');
    try {
      const created = await createReview({
        product: product.id,
        order: Number(reviewForm.order),
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment
      });
      setReviews((current) => [created, ...current]);
      setReviewForm((current) => ({ ...current, comment: '' }));
      setReviewStatus('Review submitted successfully.');
    } catch (error) {
      setReviewStatus(error?.payload?.detail || error?.message || 'Could not submit your review.');
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleSubmitQuestion(event) {
    event.preventDefault();
    if (!questionForm.question.trim()) {
      setQuestionStatus('Enter your question first.');
      return;
    }
    setQuestionLoading(true);
    setQuestionStatus('');
    try {
      const created = await createProductQuestion({ product: product.id, question: questionForm.question.trim() });
      setQuestions((current) => [created, ...current]);
      setQuestionForm({ question: '' });
      setQuestionStatus('Question submitted. Vendors can answer it from their dashboard.');
    } catch (error) {
      setQuestionStatus(error?.payload?.detail || error?.message || 'Could not submit your question.');
    } finally {
      setQuestionLoading(false);
    }
  }

  return (
    <>
      <section className="section-space">
        <div className="container product-detail-shell">
          <div className="product-detail-gallery">
            <div className="product-gallery-main premium-detail-image">
              <img
                src={selectedImage}
                alt={product.name}
                onError={(event) => {
                  event.currentTarget.src = getCategoryFallbackImage(product);
                }}
              />
            </div>
            <div className="product-detail-thumbs">
              {gallery.map((image) => (
                <button key={image} type="button" className={`product-thumb ${selectedImage === image ? 'active' : ''}`} onClick={() => setSelectedImage(image)}>
                  <img
                    src={image}
                    alt={product.name}
                    onError={(event) => {
                      event.currentTarget.src = getCategoryFallbackImage(product);
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="product-detail-content">
            <div className="product-detail-topline">
              <span className="section-eyebrow">{product.category}</span>
              <span className="product-audience">{product.audience}</span>
            </div>
            <h1 className="product-detail-title">{product.name}</h1>
            <div className="mood-values">
              <span className="value-pill">{productType === 'both' ? 'Ready-made + Customizable' : productType === 'customizable' ? 'Customizable' : 'Ready-made'}</span>
              {product.vendor_name ? <span className="value-pill subtle">Shop: {product.vendor_name}</span> : null}
            </div>
            <p className="product-detail-copy">{product.description}</p>

            <div className="product-detail-meta">
              <strong>NPR {price.toLocaleString()}</strong>
              {oldPrice > price ? <span>NPR {oldPrice.toLocaleString()}</span> : null}
              <span>
                <i className="bi bi-star-fill"></i> {product.rating} rating
              </span>
            </div>

            <div className="product-sustainability-panel">
              <div className="product-sustainability-head">
                <div>
                  <span className="section-eyebrow">Estimated Sustainability Guidance</span>
                  <h5>{sustainability?.sustainabilityLabel || 'Guidance unavailable'}</h5>
                </div>
                {sustainability?.sustainabilityLeafScore ? (
                  <div className="sustainability-leaf-score" aria-label={`${sustainability.sustainabilityLeafScore} out of 5 leaves`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <i
                        key={index}
                        className={`bi ${index < sustainability.sustainabilityLeafScore ? 'bi-leaf-fill active' : 'bi-leaf'}`}
                      ></i>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="sustainability-meta-row">
                <span className="value-pill">{sustainability?.impactBand || 'Unknown impact'}</span>
                {(sustainability?.ecoBadges || []).map((badge) => (
                  <span key={badge} className="value-pill subtle">{badge}</span>
                ))}
              </div>
              <p>{sustainability?.sustainabilityNote}</p>
              {product.fabricOptions?.length ? (
                <div className="sustainability-fabric-grid">
                  {product.fabricOptions.map((fabric) => {
                    const guidance = sustainability?.fabricGuidance?.find((item) => item.fabric === fabric);
                    return (
                      <div key={fabric} className="sustainability-fabric-card">
                        <strong>{fabric}</strong>
                        <span>{guidance?.impactBand || 'Material guidance limited'}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <small>
                This is a simplified educational score based on fabric information already available in the catalog. It is not a certified lifecycle assessment.
              </small>
            </div>

            <div className="detail-block">
              <h6>Available Sizes</h6>
              <div className="chip-row">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`chip selectable ${selectedSize === size ? 'active' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <h6>Colorway</h6>
              <div className="chip-row">
                {product.colors.map((color) => (
                  <span key={color} className="chip">
                    {color}
                  </span>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <h6>Quantity</h6>
              <input
                className="form-control premium-input detail-quantity-input"
                type="number"
                value={quantity}
                min="1"
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
            </div>

            <div className="product-detail-actions">
              {canAddToCart ? (
                <button type="button" className="btn btn-slessaa btn-slessaa-primary add-to-cart-btn" onClick={handleBuyNow}>
                  Add to Cart
                </button>
              ) : null}
              {canCustomize ? (
                <Link
                  to="/tailoring"
                  state={{ referenceProduct: product }}
                  className="btn btn-slessaa btn-slessaa-secondary"
                >
                  Customize for You
                </Link>
              ) : null}
              <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => toggleWishlist(product)}>
                {isSaved(product) ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </button>
              {vendorUserId ? (
                <Link
                  to={isAuthenticated ? `/messages?kind=customer_vendor&vendor_user_id=${vendorUserId}&product_id=${product.id}` : '/login'}
                  className="btn btn-slessaa btn-slessaa-outline"
                >
                  Chat with Vendor
                </Link>
              ) : null}
              {vendorUserId ? (
                <Link
                  to="/contact"
                  state={{
                    vendorName: product.vendor_name,
                    vendorUserId,
                    productName: product.name,
                    productId: product.id,
                    vendorId
                  }}
                  className="btn btn-slessaa btn-slessaa-outline"
                >
                  Contact Vendor
                </Link>
              ) : null}
            </div>

            <div className="product-detail-points">
              <div>
                <strong>Shop</strong>
                <span>{product.vendor_name || 'Slessaa Vendor'}</span>
              </div>
              <div>
                <strong>Category</strong>
                <span>{product.category}</span>
              </div>
              <div>
                <strong>Customization</strong>
                <span>{canCustomize ? (product.customizationNote || 'Supports tailoring and custom detailing.') : 'Ready-made product only'}</span>
              </div>
            </div>

            <div className="table-card mt-4">
              <SectionTitle eyebrow="Full Description" title="Product details" align="start" />
              <p className="mb-3">{product.description}</p>
              {product.sustainabilityGuidance ? (
                <p className="mb-0"><strong>Sustainability Guidance:</strong> {product.sustainabilityGuidance}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-soft">
        <div className="container">
          <div className="row g-4 mb-2">
            <div className="col-lg-6">
              <div className="table-card">
                <div className="section-title text-start mb-3">
                  <span className="section-eyebrow">Ratings & Reviews</span>
                  <h2>Customer feedback from delivered orders</h2>
                  <div className="product-rating-summary">
                    <div className="product-rating-score">
                      <strong>{averageRatingText}</strong>
                      <span>{reviews.length || product.reviews || 0} verified review(s)</span>
                    </div>
                    <div className="product-rating-stars" aria-label={`${averageRatingValue.toFixed(1)} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <i
                          key={index}
                          className={`bi ${averageRatingValue >= index + 0.75 ? 'bi-star-fill' : averageRatingValue >= index + 0.25 ? 'bi-star-half' : 'bi-star'}`}
                        ></i>
                      ))}
                    </div>
                  </div>
                </div>
                <form className="d-grid gap-3 mb-4" onSubmit={handleSubmitReview}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="premium-label">Rating</label>
                      <select
                        className="form-select premium-input"
                        value={reviewForm.rating}
                        onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>{value} / 5</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="premium-label">Delivered Order</label>
                      <select
                        className="form-select premium-input"
                        value={reviewForm.order}
                        onChange={(event) => setReviewForm((current) => ({ ...current, order: event.target.value }))}
                        disabled={!isAuthenticated || !eligibleOrders.length}
                      >
                        <option value="">
                          {isAuthenticated ? (eligibleOrders.length ? 'Select delivered order' : 'No unreviewed delivered order found') : 'Log in to review'}
                        </option>
                        {eligibleOrders.map((order) => (
                          <option key={order.id} value={order.id}>{order.order_number}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="premium-label">Review</label>
                    <textarea
                      className="form-control premium-input premium-textarea"
                      rows="4"
                      value={reviewForm.comment}
                      onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                      placeholder="Share your fit, quality, and delivery experience."
                    ></textarea>
                  </div>
                  {reviewStatus ? <div className="alert alert-info mb-0">{reviewStatus}</div> : null}
                  <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={!isAuthenticated || reviewLoading}>
                    {reviewLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                  {!isAuthenticated ? <small>Log in and use a delivered order to leave a verified review.</small> : null}
                </form>
                <div className="dashboard-list-stack">
                  {reviews.length ? reviews.map((review) => (
                    <article key={review.id} className="dashboard-list-card">
                      <div className="dashboard-list-head">
                        <strong>{review.user_name}</strong>
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mood-values">
                        <span className="value-pill"><i className="bi bi-star-fill"></i> {review.rating}/5</span>
                        {review.order_number ? <span className="value-pill subtle">{review.order_number}</span> : null}
                      </div>
                      <p className="mb-0">{review.comment || 'Customer left a rating without extra review text.'}</p>
                    </article>
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No reviews yet</h4>
                      <p>Delivered-order reviews will appear here and help future customers shop with more confidence.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="table-card">
                <div className="section-title text-start mb-3">
                  <span className="section-eyebrow">Product Q&A</span>
                  <h2>Ask before you buy</h2>
                  <p>Customers can ask product questions here. Vendors answer them from their dashboard.</p>
                </div>
                <form className="d-grid gap-3 mb-4" onSubmit={handleSubmitQuestion}>
                  <div>
                    <label className="premium-label">Your Question</label>
                    <textarea
                      className="form-control premium-input premium-textarea"
                      rows="4"
                      value={questionForm.question}
                      onChange={(event) => setQuestionForm({ question: event.target.value })}
                      placeholder="Ask about fit, material, color, delivery, or styling."
                    ></textarea>
                  </div>
                  {questionStatus ? <div className="alert alert-info mb-0">{questionStatus}</div> : null}
                  <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={!isAuthenticated || questionLoading}>
                    {questionLoading ? 'Submitting...' : 'Ask Question'}
                  </button>
                  {!isAuthenticated ? <small>Log in to ask product questions.</small> : null}
                </form>
                <div className="dashboard-list-stack">
                  {questions.length ? questions.map((question) => (
                    <article key={question.id} className="dashboard-list-card">
                      <div className="dashboard-list-head">
                        <strong>{question.user_name}</strong>
                        <span>{new Date(question.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mood-values">
                        <span className="value-pill">{String(question.status || 'pending').replaceAll('_', ' ')}</span>
                      </div>
                      <p><strong>Q:</strong> {question.question}</p>
                      <p className="mb-0">
                        <strong>A:</strong> {question.answer || 'Waiting for vendor response.'}
                      </p>
                    </article>
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No questions yet</h4>
                      <p>Questions about this product will appear here and help pre-purchase decision-making.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="section-title">
            <span className="section-eyebrow">Sustainable Alternatives</span>
            <h2>Explore lower-impact options in a similar style direction.</h2>
            <p>These alternatives are ranked with the same simplified fabric-based sustainability guidance used across the app.</p>
          </div>
          {sustainableAlternatives.length ? (
            <div className="row g-3 g-lg-4 align-items-stretch product-section-grid sustainability-alt-grid">
              {sustainableAlternatives.map((item) => (
                <div key={item.slug || item.id} className="col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 d-flex">
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="filter-empty-state sustainability-empty-state">
              <h4>No stronger alternatives yet</h4>
              <p>This product is already one of the stronger fabric choices in the current catalog, or similar material data is still limited.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section-space bg-soft">
        <div className="container">
          <div className="section-title">
            <span className="section-eyebrow">More Products Like This</span>
            <h2>Similar items from the marketplace</h2>
            <p>Browse similar pieces with related styling, category cues, and matching product identity data.</p>
          </div>
          {related.length ? (
            <div className="row g-3 g-lg-4 align-items-stretch product-section-grid">
              {related.map((item) => (
                <div key={item.slug || item.id} className="col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 d-flex">
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="filter-empty-state compact homepage-empty-state">
              <h4>No similar products yet</h4>
              <p>More products like this will appear as the catalog grows.</p>
            </div>
          )}
        </div>
      </section>

      <AiRecommendationSection
        eyebrow="AI Similar Picks"
        title="More products in the same style direction"
        text="These recommendations use the current product, nearby price range, and catalog freshness as ranking signals."
        preferences={{
          product_id: product.id,
          category: product.category,
          color_preference: product.colors?.[0] || ''
        }}
        emptyTitle="No similar AI matches yet."
      />

      <section className="section-space">
        <div className="container">
          <div className="section-title">
            <span className="section-eyebrow">Hybrid Recommendations</span>
            <h2>Similar items and live marketplace trends</h2>
            <p>These sections combine product similarity, your recent browsing history, and trending catalog signals.</p>
          </div>
          <RecommendationSections
            sections={recommendationSections}
            loading={recommendationLoading}
            sectionOrder={['similar_items', 'trending_now']}
            emptyCopy="Open more products or broaden your preferences to generate stronger matches."
          />
        </div>
      </section>
    </>
  );
}

export default ProductDetailsPage;
