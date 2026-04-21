import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TailoringRequestThread from '../components/tailoring/TailoringRequestThread';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ProductCard from '../components/shop/ProductCard';
import SectionTitle from '../components/common/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { buildOrderDetailsPath } from '../routes/config';
import { createReturnRequest, deleteProductQuestion, deleteReturnRequest, deleteReview, getDashboardSummary, listOrders, listProductQuestions, listProducts, listReturnRequests, listReviews, listTailoringRequests, listVouchers, updateProductQuestion, updateReview } from '../services/api';
import { normalizeProduct } from '../services/catalog';

const RETURN_WINDOW_DAYS = 14;
const RETURN_ELIGIBLE_ORDER_STATUSES = new Set(['delivered', 'completed']);

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getReturnAnchor(order) {
  const candidates = (order.tracking_updates || [])
    .filter((update) => RETURN_ELIGIBLE_ORDER_STATUSES.has(String(update.status || '').toLowerCase()))
    .map((update) => new Date(update.timestamp))
    .filter((value) => !Number.isNaN(value.getTime()));
  if (candidates.length) {
    return candidates.sort((left, right) => right.getTime() - left.getTime())[0];
  }
  const fallback = new Date(order.created_at);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function getReturnEligibility(order) {
  const status = String(order.status || '').toLowerCase();
  if (!RETURN_ELIGIBLE_ORDER_STATUSES.has(status)) {
    return { eligible: false, reason: 'Return requests open only after delivery.' };
  }
  const anchor = getReturnAnchor(order);
  if (!anchor) {
    return { eligible: false, reason: 'Delivery date is not available yet.' };
  }
  const deadline = new Date(anchor.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() > deadline) {
    return { eligible: false, reason: `Return period expired on ${formatDateTime(deadline)}.` };
  }
  return { eligible: true, deadline };
}

function getOrderVendorUserIds(order) {
  const ids = new Set();
  (order.vendor_user_ids || []).forEach((id) => {
    if (id) ids.add(String(id));
  });
  (order.items || []).forEach((item) => {
    const vendorUserId = item.vendor_user_id || item.vendor_user || item.vendor_detail?.user || item.product_detail?.vendor_detail?.user;
    if (vendorUserId) ids.add(String(vendorUserId));
  });
  if (!ids.size) {
    ids.add('1');
  }
  return Array.from(ids);
}

function CustomerDashboardPage({ initialFocusSection = '' }) {
  const { user } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [returns, setReturns] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [returnForm, setReturnForm] = useState({
    order: '',
    order_item: '',
    reason: 'wrong_size',
    requested_resolution: 'voucher',
    description: '',
    image_proof: null,
  });
  const [returnStatus, setReturnStatus] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [questionStatus, setQuestionStatus] = useState('');

  function loadRequests() {
    listTailoringRequests()
      .then((items) => {
        setRequests(items);
        setActiveRequestId((current) => current || items[0]?.id || null);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    getDashboardSummary('customer').then(setSummary).catch(() => undefined);
    listOrders().then(setOrders).catch(() => undefined);
    listProducts().then((items) => setCatalog(items.map(normalizeProduct))).catch(() => undefined);
    loadRequests();
    if (user?.id) {
      listReviews({ user: user.id }).then(setReviews).catch(() => undefined);
    }
    listProductQuestions({ mine: 1 }).then(setQuestions).catch(() => undefined);
    listReturnRequests().then(setReturns).catch(() => undefined);
    listVouchers().then(setVouchers).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    if (!initialFocusSection || typeof document === 'undefined') return;
    const target = document.getElementById(initialFocusSection);
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [initialFocusSection]);

  const activeRequest = requests.find((item) => item.id === activeRequestId) || null;
  const wishlistCatalog = catalog.filter((product) =>
    wishlistItems.some((item) => item.identity === (product.slug || product.id) || String(item.productId) === String(product.id))
  );
  const deliveredOrderItems = orders.flatMap((order) =>
    (order.items || []).map((item) => {
      const eligibility = getReturnEligibility(order);
      const existingReturn = returns.find(
        (entry) =>
          String(entry.order) === String(order.id) &&
          String(entry.order_item) === String(item.id) &&
          String(entry.status || '').toLowerCase() !== 'cancelled'
      );
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        orderItemId: item.id,
        productName: item.product_name,
        eligibility,
        existingReturn,
      };
    })
  );
  const eligibleReturnItems = deliveredOrderItems.filter((item) => item.eligibility.eligible && !item.existingReturn);
  const stats = [
    { label: 'Recent Orders', value: String(summary?.recent_orders?.length || orders.length).padStart(2, '0'), icon: 'bi-bag-check' },
    { label: 'Tailor Threads', value: String(requests.length).padStart(2, '0'), icon: 'bi-chat-dots' },
    { label: 'Tailoring Requests', value: String(summary?.tailoring_requests_count || requests.length).padStart(2, '0'), icon: 'bi-scissors' },
    { label: 'Returns', value: String(returns.length).padStart(2, '0'), icon: 'bi-arrow-counterclockwise' },
    { label: 'Wishlist', value: String(wishlistCatalog.length).padStart(2, '0'), icon: 'bi-heart' },
    { label: 'Vouchers', value: String(vouchers.length).padStart(2, '0'), icon: 'bi-ticket-perforated' }
  ];

  async function saveReview(reviewId, payload) {
    try {
      const updated = await updateReview(reviewId, payload);
      setReviews((current) => current.map((item) => (item.id === reviewId ? updated : item)));
      setReviewStatus('Review updated.');
    } catch (error) {
      setReviewStatus(error?.payload?.detail || error?.message || 'Could not update your review.');
    }
  }

  async function removeReview(reviewId) {
    try {
      await deleteReview(reviewId);
      setReviews((current) => current.filter((item) => item.id !== reviewId));
      setReviewStatus('Review removed.');
    } catch (error) {
      setReviewStatus(error?.payload?.detail || error?.message || 'Could not remove your review.');
    }
  }

  async function saveQuestion(questionId, payload) {
    try {
      const updated = await updateProductQuestion(questionId, payload);
      setQuestions((current) => current.map((item) => (item.id === questionId ? updated : item)));
      setQuestionStatus('Question updated.');
    } catch (error) {
      setQuestionStatus(error?.payload?.detail || error?.message || 'Could not update your question.');
    }
  }

  async function removeQuestion(questionId) {
    try {
      await deleteProductQuestion(questionId);
      setQuestions((current) => current.filter((item) => item.id !== questionId));
      setQuestionStatus('Question removed.');
    } catch (error) {
      setQuestionStatus(error?.payload?.detail || error?.message || 'Could not remove your question.');
    }
  }

  function startReturnRequest(item) {
    setReturnForm((current) => ({
      ...current,
      order: String(item.orderId),
      order_item: String(item.orderItemId),
    }));
    setReturnStatus(item.eligibility.deadline ? `Return window closes on ${formatDateTime(item.eligibility.deadline)}.` : '');
    if (typeof document !== 'undefined') {
      document.getElementById('customer-return-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function cancelPendingReturn(returnId) {
    try {
      await deleteReturnRequest(returnId);
      setReturns((current) => current.map((item) => (item.id === returnId ? { ...item, status: 'cancelled' } : item)));
      setReturnStatus('Return request cancelled.');
    } catch (error) {
      setReturnStatus(error?.payload?.detail || error?.message || 'Could not cancel the return request.');
    }
  }

  return (
    <>
      <section className="page-hero compact-hero" id="profile">
        <div className="container">
          <span className="section-eyebrow">Customer Dashboard</span>
          <h1>Orders, tailoring requests, and direct tailor communication</h1>
          <p>Track custom orders and continue structured request conversations from one dashboard.</p>
        </div>
      </section>
      <section className="section-space">
        <div className="container">
          <div className="row g-4 mb-4">
            {stats.map((stat) => (
              <div key={stat.label} className="col-md-4 col-xl-2">
                <DashboardStatCard stat={stat} />
              </div>
            ))}
          </div>

          <div className="dashboard-thread-layout">
            <div className="table-card">
              <SectionTitle eyebrow="Tailoring Threads" title="Your active custom orders" align="start" />
              <table className="table align-middle mb-0">
                <thead>
                  <tr><th>Garment</th><th>Status</th><th>Tailor</th><th>Thread</th></tr>
                </thead>
                <tbody>
                  {requests.map((item) => (
                    <tr key={item.id}>
                      <td>{item.clothing_type}</td>
                      <td>{item.status}</td>
                      <td>{item.assigned_tailor_detail?.full_name || item.assigned_tailor_detail?.email || 'Unassigned'}</td>
                      <td>
                        <div className="d-flex flex-column align-items-start gap-1">
                          <button type="button" className="btn btn-link p-0" onClick={() => setActiveRequestId(item.id)}>
                            Open
                          </button>
                          {item.assigned_tailor ? (
                            <Link to={`/messages?kind=customer_tailor&tailoring_request_id=${item.id}`} className="btn btn-link p-0">
                              Chat with Tailor
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TailoringRequestThread request={activeRequest} onMessageCreated={loadRequests} />
          </div>

          <div className="row g-4 mt-2" id="orders">
            <div className="col-lg-8">
              <div className="table-card">
                <SectionTitle eyebrow="Order History" title="Your latest orders" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Order</th><th>Status</th><th>Payment</th><th>Amount</th><th>Vendor Chat</th><th>Returns</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((item) => {
                      const vendorUserIds = getOrderVendorUserIds(item);
                      const orderReturnItems = deliveredOrderItems.filter((entry) => String(entry.orderId) === String(item.id));
                      return (
                        <tr key={item.id}>
                          <td><Link to={buildOrderDetailsPath(item.id)}>{item.order_number}</Link></td>
                          <td>{item.status}</td>
                          <td>{item.payment_status || item.payment_method}</td>
                          <td>NPR {Number(item.total).toLocaleString()}</td>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              {vendorUserIds.length ? vendorUserIds.map((vendorUserId, index) => (
                                <Link
                                  key={`${item.id}-${vendorUserId}`}
                                  to={`/messages?kind=customer_vendor&vendor_user_id=${vendorUserId}&order_id=${item.id}`}
                                  className="btn btn-link p-0"
                                >
                                  Chat with Vendor{vendorUserIds.length > 1 ? ` ${index + 1}` : ''}
                                </Link>
                              )) : (
                                <span className="text-muted small">No vendor linked</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              {orderReturnItems.length ? orderReturnItems.map((entry) => {
                                if (entry.existingReturn) {
                                  return (
                                    <span key={`${entry.orderId}-${entry.orderItemId}`} className="text-muted small">
                                      {entry.productName}: {String(entry.existingReturn.status || '').replaceAll('_', ' ')}
                                    </span>
                                  );
                                }
                                if (!entry.eligibility.eligible) {
                                  return (
                                    <span key={`${entry.orderId}-${entry.orderItemId}`} className="text-muted small">
                                      {entry.productName}: {entry.eligibility.reason}
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    key={`${entry.orderId}-${entry.orderItemId}`}
                                    type="button"
                                    className="btn btn-link p-0"
                                    onClick={() => startReturnRequest(entry)}
                                  >
                                    Request Return: {entry.productName}
                                  </button>
                                );
                              }) : (
                                <span className="text-muted small">No returnable items</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="summary-card">
                <h4>New Custom Order</h4>
                <p>Need a new piece? Start with a tailoring request and keep all follow-up communication in the same thread.</p>
                <Link className="btn btn-slessaa btn-slessaa-outline" to="/tailoring">Create Tailoring Request</Link>
                <Link className="btn btn-slessaa btn-slessaa-outline mt-3" to="/messages">Open My Messages</Link>
              </div>
            </div>
          </div>

          <div className="row g-4 mt-2" id="wishlist">
            <div className="col-12">
              <div className="table-card">
                <SectionTitle eyebrow="Wishlist" title="Saved products you may want to revisit" align="start" />
                {wishlistCatalog.length ? (
                  <div className="shop-product-grid">
                    {wishlistCatalog.slice(0, 4).map((product) => (
                      <div key={product.slug || product.id}>
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="filter-empty-state">
                    <h4>No wishlist items yet</h4>
                    <p>Save products from the catalog and they will appear here for faster return visits.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="row g-4 mt-2" id="reviews">
            <div className="col-lg-6">
              <div className="table-card">
                <SectionTitle eyebrow="My Reviews" title="Delivered-order feedback" align="start" />
                {reviewStatus ? <div className="alert alert-info">{reviewStatus}</div> : null}
                <div className="dashboard-list-stack">
                  {reviews.length ? reviews.map((item) => (
                    <CustomerReviewCard key={item.id} review={item} onSave={saveReview} onDelete={removeReview} />
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No reviews submitted yet</h4>
                      <p>Your delivered-order feedback will appear here after you review products.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="table-card">
                <SectionTitle eyebrow="My Questions" title="Product Q&A activity" align="start" />
                {questionStatus ? <div className="alert alert-info">{questionStatus}</div> : null}
                <div className="dashboard-list-stack">
                  {questions.length ? questions.map((item) => (
                    <CustomerQuestionCard key={item.id} question={item} onSave={saveQuestion} onDelete={removeQuestion} />
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No product questions yet</h4>
                      <p>Your product questions and vendor answers will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-7" id="returns">
              <div className="table-card">
                <SectionTitle eyebrow="My Returns" title="Return and refund requests" align="start" />
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="value-pill subtle">{eligibleReturnItems.length} eligible items</span>
                  <span className="value-pill subtle">{RETURN_WINDOW_DAYS}-day return window</span>
                </div>
                <form id="customer-return-form" className="row g-3 mb-4" onSubmit={async (event) => {
                  event.preventDefault();
                  if (!returnForm.order || !returnForm.order_item) {
                    setReturnStatus('Choose a delivered order item first.');
                    return;
                  }
                  setReturnSubmitting(true);
                  setReturnStatus('');
                  try {
                    const formData = new FormData();
                    formData.append('order', returnForm.order);
                    formData.append('order_item', returnForm.order_item);
                    formData.append('reason', returnForm.reason);
                    formData.append('requested_resolution', returnForm.requested_resolution);
                    formData.append('description', returnForm.description);
                    if (returnForm.image_proof) formData.append('image_proof', returnForm.image_proof);
                    const created = await createReturnRequest(formData);
                    setReturns((current) => [created, ...current]);
                    setReturnForm({
                      order: '',
                      order_item: '',
                      reason: 'wrong_size',
                      requested_resolution: 'voucher',
                      description: '',
                      image_proof: null,
                    });
                    setReturnStatus('Return request submitted successfully.');
                  } catch (error) {
                    setReturnStatus(error?.payload?.detail || error?.message || 'Could not submit the return request.');
                  } finally {
                    setReturnSubmitting(false);
                  }
                }}>
                  <div className="col-md-6">
                    <label className="premium-label">Delivered Item</label>
                    <select
                      className="form-select premium-input"
                      value={`${returnForm.order}:${returnForm.order_item}`}
                      onChange={(event) => {
                        const [order, orderItem] = event.target.value.split(':');
                        setReturnForm((current) => ({ ...current, order, order_item: orderItem }));
                      }}
                    >
                      <option value="">Select delivered order item</option>
                      {eligibleReturnItems.map((item) => (
                        <option key={`${item.orderId}-${item.orderItemId}`} value={`${item.orderId}:${item.orderItemId}`}>
                          {item.orderNumber} · {item.productName}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-2">Only delivered items within the {RETURN_WINDOW_DAYS}-day return window can be submitted.</small>
                  </div>
                  <div className="col-md-3">
                    <label className="premium-label">Reason</label>
                    <select className="form-select premium-input" value={returnForm.reason} onChange={(event) => setReturnForm((current) => ({ ...current, reason: event.target.value }))}>
                      <option value="wrong_size">Wrong size</option>
                      <option value="damaged_item">Damaged item</option>
                      <option value="not_as_expected">Not as expected</option>
                      <option value="quality_issue">Quality issue</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="premium-label">Resolution</label>
                    <select className="form-select premium-input" value={returnForm.requested_resolution} onChange={(event) => setReturnForm((current) => ({ ...current, requested_resolution: event.target.value }))}>
                      <option value="full_refund">Full refund</option>
                      <option value="exchange">Exchange</option>
                      <option value="voucher">Voucher / store credit</option>
                      <option value="manual_vendor_review">Manual vendor review</option>
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="premium-label">Description</label>
                    <textarea className="form-control premium-input premium-textarea" rows="3" value={returnForm.description} onChange={(event) => setReturnForm((current) => ({ ...current, description: event.target.value }))}></textarea>
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Image Proof</label>
                    <input className="form-control premium-input" type="file" accept="image/*" onChange={(event) => setReturnForm((current) => ({ ...current, image_proof: event.target.files?.[0] || null }))} />
                  </div>
                  <div className="col-12 d-flex flex-column gap-2">
                    {returnStatus ? <div className="alert alert-info mb-0">{returnStatus}</div> : null}
                    <button type="submit" className="btn btn-slessaa btn-slessaa-primary align-self-start" disabled={returnSubmitting}>
                      {returnSubmitting ? 'Submitting...' : 'Create Return Request'}
                    </button>
                  </div>
                </form>
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Order</th><th>Product</th><th>Status</th><th>Resolution</th><th>Updated</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {returns.length ? returns.map((item) => (
                      <tr key={item.id}>
                        <td>{item.order_number}</td>
                        <td>{item.product_name}</td>
                        <td>{item.status.replaceAll('_', ' ')}</td>
                        <td>{(item.decision_resolution || item.requested_resolution).replaceAll('_', ' ')}</td>
                        <td>{formatDateTime(item.updated_at || item.created_at)}</td>
                        <td>
                          {String(item.status || '').toLowerCase() === 'pending' ? (
                            <button type="button" className="btn btn-link p-0" onClick={() => cancelPendingReturn(item.id)}>
                              Cancel
                            </button>
                          ) : (
                            <span className="text-muted small">Tracked</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6">No return requests yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="table-card">
                <SectionTitle eyebrow="My Vouchers" title="Store credit balance" align="start" />
                <div className="dashboard-list-stack">
                  {vouchers.length ? vouchers.map((voucher) => (
                    <article key={voucher.id} className="dashboard-list-card">
                      <div className="dashboard-list-head">
                        <strong>Voucher #{voucher.id}</strong>
                        <span>{voucher.status}</span>
                      </div>
                      <p className="mb-1">Balance: NPR {Number(voucher.balance).toLocaleString()}</p>
                      <small>{voucher.note} Redemption can be connected into checkout in the next phase.</small>
                    </article>
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No vouchers yet</h4>
                      <p>Approved voucher-based returns will appear here as store credit.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CustomerReviewCard({ review, onSave, onDelete }) {
  const [rating, setRating] = useState(String(review.rating || 5));
  const [comment, setComment] = useState(review.comment || '');
  const editable = review.status !== 'hidden';

  useEffect(() => {
    setRating(String(review.rating || 5));
    setComment(review.comment || '');
  }, [review.id, review.rating, review.comment]);

  return (
    <article className="dashboard-list-card">
      <div className="dashboard-list-head">
        <strong>{review.product_name}</strong>
        <span>{review.status}</span>
      </div>
      <div className="mood-values">
        <span className="value-pill"><i className="bi bi-star-fill"></i> {review.rating}/5</span>
        {review.order_number ? <span className="value-pill subtle">{review.order_number}</span> : null}
      </div>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="premium-label">Rating</label>
          <select className="form-select premium-input" value={rating} onChange={(event) => setRating(event.target.value)} disabled={!editable}>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} / 5</option>
            ))}
          </select>
        </div>
        <div className="col-md-8">
          <label className="premium-label">Comment</label>
          <textarea className="form-control premium-input premium-textarea" rows="3" value={comment} onChange={(event) => setComment(event.target.value)} disabled={!editable}></textarea>
        </div>
      </div>
      <div className="chip-row mt-3">
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onSave(review.id, { rating: Number(rating), comment })} disabled={!editable}>
          Update Review
        </button>
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onDelete(review.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

function CustomerQuestionCard({ question, onSave, onDelete }) {
  const [text, setText] = useState(question.question || '');
  const editable = question.status === 'pending';

  useEffect(() => {
    setText(question.question || '');
  }, [question.id, question.question]);

  return (
    <article className="dashboard-list-card">
      <div className="dashboard-list-head">
        <strong>{question.product_name}</strong>
        <span>{question.status}</span>
      </div>
      <label className="premium-label">Question</label>
      <textarea className="form-control premium-input premium-textarea" rows="3" value={text} onChange={(event) => setText(event.target.value)} disabled={!editable}></textarea>
      <p className="mt-3 mb-0"><strong>Answer:</strong> {question.answer || 'Waiting for vendor response.'}</p>
      <div className="chip-row mt-3">
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onSave(question.id, { question: text })} disabled={!editable}>
          Update Question
        </button>
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onDelete(question.id)} disabled={!editable}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default CustomerDashboardPage;
