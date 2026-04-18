import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getAccessToken, initiatePayment, listVouchers, placeOrder } from '../services/api';

function normalizeNepalPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('977') && digits.length === 13) {
    return digits.slice(3);
  }
  return digits;
}

function isValidNepalPhone(value) {
  return /^98\d{8}$/.test(normalizeNepalPhone(value));
}

function firstErrorMessage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = firstErrorMessage(entry);
      if (message) return message;
    }
    return '';
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const message = firstErrorMessage(entry);
      if (message) return message;
    }
  }
  return '';
}

function normalizeOrderErrors(payloadErrors = {}) {
  return {
    full_name: firstErrorMessage(payloadErrors.full_name) || firstErrorMessage(payloadErrors.first_name) || firstErrorMessage(payloadErrors.last_name),
    email: firstErrorMessage(payloadErrors.email),
    phone: firstErrorMessage(payloadErrors.phone),
    street_address: firstErrorMessage(payloadErrors.shipping_address),
    city: firstErrorMessage(payloadErrors.city),
    province: firstErrorMessage(payloadErrors.province),
    postal_code: firstErrorMessage(payloadErrors.postal_code),
    billing_address: firstErrorMessage(payloadErrors.billing_address),
    payment_method: firstErrorMessage(payloadErrors.payment_method),
    items: firstErrorMessage(payloadErrors.items),
    form: firstErrorMessage(payloadErrors.detail) || firstErrorMessage(payloadErrors)
  };
}

const paymentMethods = [
  { value: 'card', label: 'Bank / card', description: 'Pay securely using card or bank payment.' },
  { value: 'cod', label: 'Cash on delivery', description: 'Pay when your order arrives.' },
  { value: 'esewa', label: 'eSewa', description: 'Continue through eSewa checkout.' },
  { value: 'khalti', label: 'Khalti', description: 'Continue through Khalti checkout.' }
];

function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const khaltiPublicKey = import.meta.env.VITE_KHALTI_PUBLIC_KEY || '';
  const shippingFee = 250;
  const total = useMemo(() => subtotal + (items.length ? shippingFee : 0), [subtotal, items.length]);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    province: '',
    postal_code: '',
    billing_address: '',
    payment_method: 'cod',
    delivery_option: 'standard',
    save_info: false
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fullName = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ');
    setForm((current) => ({
      ...current,
      full_name: current.full_name || fullName || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || ''
    }));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setVouchers([]);
      return;
    }
    listVouchers().then(setVouchers).catch(() => setVouchers([]));
  }, [user]);

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus({ type: '', message: '' });
  }

  function validateForm() {
    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = 'Full name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
    if (form.phone.trim() && !isValidNepalPhone(form.phone)) nextErrors.phone = 'Enter a valid Nepali mobile number.';
    if (!form.street_address.trim()) nextErrors.street_address = 'Street address is required.';
    if (!form.city.trim()) nextErrors.city = 'City is required.';
    if (!form.payment_method) nextErrors.payment_method = 'Payment method is required.';
    if (!items.length) nextErrors.items = 'Your cart is empty.';
    if (!getAccessToken()) nextErrors.auth = 'Please log in before placing your order.';
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      phone: normalizeNepalPhone(form.phone),
      email: form.email.trim().toLowerCase(),
      shipping_address: form.street_address.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code: form.postal_code.trim(),
      billing_address: form.billing_address.trim() || form.street_address.trim(),
      delivery_option: form.delivery_option,
      payment_method: form.payment_method,
      shipping_fee: shippingFee,
      total,
      items: items.map((item) => ({
        ...(typeof item.productId === 'number' ? { product: item.productId } : {}),
        product_name: item.title,
        ...(typeof item.vendorId === 'number' ? { vendor: item.vendorId } : {}),
        ...(item.vendorUserId ? { vendor_user: item.vendorUserId } : {}),
        ...(item.vendorName ? { vendor_name: item.vendorName } : {}),
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price
      }))
    };

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const order = await placeOrder(payload);
      if (['esewa', 'khalti', 'card'].includes(form.payment_method)) {
        const payment = await initiatePayment({ order: order.id, provider: form.payment_method });
        setStatus({ type: 'success', message: 'Order placed. Redirecting to payment...' });
        window.setTimeout(() => {
          if (/^https?:\/\//i.test(payment.redirect_url || '')) {
            window.location.assign(payment.redirect_url);
            return;
          }
          navigate(payment.redirect_url, { state: { order } });
        }, 700);
      } else {
        await clearCart();
        setStatus({ type: 'success', message: 'Order placed successfully. Redirecting to tracking...' });
        window.setTimeout(
          () =>
            navigate('/track-order', {
              state: { order }
            }),
          1000
        );
      }
    } catch (error) {
      const payloadErrors = error.payload || {};
      const normalizedErrors = normalizeOrderErrors(payloadErrors);
      setErrors((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(normalizedErrors).filter(([, value]) => value))
      }));
      setStatus({
        type: 'error',
        message: normalizedErrors.form || 'Unable to place your order right now.'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="checkout-top-area">
        <div className="container">
          <nav className="checkout-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/cart">Cart</Link>
            <span>/</span>
            <span>Checkout</span>
          </nav>
          <h1>Billing Details</h1>
        </div>
      </section>

      <section className="section-space billing-checkout-section">
        <div className="container">
          <form className="row g-4 billing-shell" onSubmit={handleSubmit} noValidate>
            <div className="col-lg-5">
              <aside className="billing-summary-card sticky-summary">
                <div className="billing-card-head">
                  <span>Order Summary</span>
                  <strong>{items.length} {items.length === 1 ? 'item' : 'items'}</strong>
                </div>

                <div className="billing-items">
                  {items.length ? (
                    items.map((item) => (
                      <article key={`${item.backendId || item.productId}-${item.size}-${item.color}`} className="billing-item">
                        <img src={item.image} alt={item.title} />
                        <div className="billing-item-body">
                          <h2>{item.title}</h2>
                          <p>
                            Qty {item.quantity}
                            {item.size ? ` | Size ${item.size}` : ''}
                            {item.color ? ` | ${item.color}` : ''}
                          </p>
                          {item.vendorName ? <small>by {item.vendorName}</small> : null}
                        </div>
                        <strong>NPR {(item.price * item.quantity).toLocaleString()}</strong>
                      </article>
                    ))
                  ) : (
                    <div className="billing-empty-state">
                      <strong>Your cart is empty</strong>
                      <Link to="/shop">Shop products</Link>
                    </div>
                  )}
                </div>

                <div className="billing-totals">
                  <div><span>Subtotal</span><strong>NPR {subtotal.toLocaleString()}</strong></div>
                  <div><span>Shipping</span><strong>NPR {(items.length ? shippingFee : 0).toLocaleString()}</strong></div>
                  <div className="billing-total-row"><span>Total</span><strong>NPR {total.toLocaleString()}</strong></div>
                </div>

                <div className="billing-payment-block">
                  <h2>Payment Method</h2>
                  <div className="billing-payment-options">
                    {paymentMethods.map((method) => (
                      <label key={method.value} className={`billing-payment-option ${form.payment_method === method.value ? 'is-selected' : ''}`}>
                        <input type="radio" name="payment_method" value={method.value} checked={form.payment_method === method.value} onChange={handleChange} />
                        <span>
                          <strong>{method.label}</strong>
                          <small>{method.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.payment_method && <div className="invalid-feedback d-block">{errors.payment_method}</div>}
                  {form.payment_method === 'khalti' && (
                    <div className={`alert mt-3 mb-0 ${khaltiPublicKey ? 'alert-success' : 'alert-warning'}`} role="alert">
                      {khaltiPublicKey
                        ? 'Khalti live public key is configured for checkout.'
                        : 'Khalti public key is missing. Add VITE_KHALTI_PUBLIC_KEY to enable Khalti checkout.'}
                    </div>
                  )}
                </div>

                {vouchers.length ? (
                  <div className="alert alert-info mt-3 mb-0">
                    Voucher balance available: NPR {vouchers.reduce((sum, item) => sum + Number(item.balance || 0), 0).toLocaleString()}.
                  </div>
                ) : null}
                {errors.items && <div className="alert alert-warning mt-3 mb-0">{errors.items}</div>}
                {errors.form && <div className="alert alert-danger mt-3 mb-0">{errors.form}</div>}

                <button type="submit" className="btn btn-slessaa btn-slessaa-primary w-100 mt-4" disabled={submitting || !items.length}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Placing Order...
                    </>
                  ) : 'Place Order'}
                </button>
              </aside>
            </div>

            <div className="col-lg-7">
              {status.message && (
                <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
                  {status.message}
                </div>
              )}
              {errors.auth && (
                <div className="alert alert-warning" role="alert">
                  {errors.auth} <Link to="/login">Go to login</Link>
                </div>
              )}
              <div className="billing-details-card">
                <div className="billing-card-title">
                  <span>Checkout</span>
                  <h2>Billing Details</h2>
                </div>
                <div className="row g-3 g-md-4">
                  <div className="col-12">
                    <label className="premium-label">Full Name</label>
                    <input className={`form-control premium-input ${errors.full_name ? 'is-invalid' : ''}`} name="full_name" value={form.full_name} onChange={handleChange} placeholder="Aarohi Shrestha" />
                    {errors.full_name && <div className="invalid-feedback d-block">{errors.full_name}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Delivery District</label>
                    <input className={`form-control premium-input ${errors.province ? 'is-invalid' : ''}`} name="province" value={form.province} onChange={handleChange} placeholder="Bagmati" />
                    {errors.province && <div className="invalid-feedback d-block">{errors.province}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Town/City</label>
                    <input className={`form-control premium-input ${errors.city ? 'is-invalid' : ''}`} name="city" value={form.city} onChange={handleChange} placeholder="Kathmandu" />
                    {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Street Address</label>
                    <input className={`form-control premium-input ${errors.street_address ? 'is-invalid' : ''}`} name="street_address" value={form.street_address} onChange={handleChange} placeholder="Bhanimandal, Lalitpur" />
                    {errors.street_address && <div className="invalid-feedback d-block">{errors.street_address}</div>}
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Apartment, floor, etc. <span>(optional)</span></label>
                    <input className={`form-control premium-input ${errors.billing_address ? 'is-invalid' : ''}`} name="billing_address" value={form.billing_address} onChange={handleChange} placeholder="Apartment, suite, floor, landmark" />
                    {errors.billing_address && <div className="invalid-feedback d-block">{errors.billing_address}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Phone Number</label>
                    <input className={`form-control premium-input ${errors.phone ? 'is-invalid' : ''}`} name="phone" value={form.phone} onChange={handleChange} placeholder="9804000000" />
                    {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Postal Code <span>(optional)</span></label>
                    <input className={`form-control premium-input ${errors.postal_code ? 'is-invalid' : ''}`} name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="44600" />
                    {errors.postal_code && <div className="invalid-feedback d-block">{errors.postal_code}</div>}
                  </div>
                  <div className="col-md-8">
                    <label className="premium-label">Email Address</label>
                    <input className={`form-control premium-input ${errors.email ? 'is-invalid' : ''}`} type="email" name="email" value={form.email} onChange={handleChange} placeholder="hello@example.com" />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Delivery Option</label>
                    <select className="form-select premium-input" name="delivery_option" value={form.delivery_option} onChange={handleChange}>
                      <option value="standard">Standard Delivery (3-5 days)</option>
                      <option value="express">Express Delivery (1-2 days)</option>
                      <option value="pickup">Studio Pickup</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="billing-save-info">
                      <input type="checkbox" name="save_info" checked={form.save_info} onChange={handleChange} />
                      <span>Save this information for faster check-out next time</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

export default CheckoutPage;
