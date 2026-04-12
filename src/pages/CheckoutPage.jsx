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
    first_name: firstErrorMessage(payloadErrors.first_name),
    last_name: firstErrorMessage(payloadErrors.last_name),
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

function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const khaltiPublicKey = import.meta.env.VITE_KHALTI_PUBLIC_KEY || '';
  const shippingFee = 250;
  const total = useMemo(() => subtotal + (items.length ? shippingFee : 0), [subtotal, items.length]);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    province: '',
    postal_code: '',
    billing_address: '',
    payment_method: 'cod',
    delivery_option: 'standard'
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    if (!user) return;
    const names = (user.full_name || '').split(' ');
    setForm((current) => ({
      ...current,
      first_name: current.first_name || names[0] || user.first_name || '',
      last_name: current.last_name || names.slice(1).join(' ') || user.last_name || '',
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
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus({ type: '', message: '' });
  }

  function validateForm() {
    const nextErrors = {};
    if (!form.first_name.trim()) nextErrors.first_name = 'First name is required.';
    if (!form.last_name.trim()) nextErrors.last_name = 'Last name is required.';
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
      full_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
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
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Checkout</span>
          <h1>Complete your order with a clean premium payment flow</h1>
          <p>Designed to connect later with real payment and order services without reworking the UI.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <form className="row g-4" onSubmit={handleSubmit} noValidate>
            <div className="col-lg-8">
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
              <div className="checkout-card mb-4">
                <h4>Billing Details</h4>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="premium-label">First Name</label>
                    <input className={`form-control premium-input ${errors.first_name ? 'is-invalid' : ''}`} name="first_name" value={form.first_name} onChange={handleChange} placeholder="Aarohi" />
                    {errors.first_name && <div className="invalid-feedback d-block">{errors.first_name}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Last Name</label>
                    <input className={`form-control premium-input ${errors.last_name ? 'is-invalid' : ''}`} name="last_name" value={form.last_name} onChange={handleChange} placeholder="Shrestha" />
                    {errors.last_name && <div className="invalid-feedback d-block">{errors.last_name}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Email</label>
                    <input className={`form-control premium-input ${errors.email ? 'is-invalid' : ''}`} type="email" name="email" value={form.email} onChange={handleChange} placeholder="hello@example.com" />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Phone</label>
                    <input className={`form-control premium-input ${errors.phone ? 'is-invalid' : ''}`} name="phone" value={form.phone} onChange={handleChange} placeholder="9804000000 or +9779804000000" />
                    {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
                  </div>
                </div>
              </div>
              <div className="checkout-card mb-4">
                <h4>Shipping Address</h4>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="premium-label">Street Address</label>
                    <input className={`form-control premium-input ${errors.street_address ? 'is-invalid' : ''}`} name="street_address" value={form.street_address} onChange={handleChange} placeholder="Bhanimandal, Lalitpur" />
                    {errors.street_address && <div className="invalid-feedback d-block">{errors.street_address}</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">City</label>
                    <input className={`form-control premium-input ${errors.city ? 'is-invalid' : ''}`} name="city" value={form.city} onChange={handleChange} placeholder="Kathmandu" />
                    {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Province</label>
                    <input className="form-control premium-input" name="province" value={form.province} onChange={handleChange} placeholder="Bagmati" />
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Postal Code</label>
                    <input className="form-control premium-input" name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="44600" />
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Billing Address</label>
                    <input className="form-control premium-input" name="billing_address" value={form.billing_address} onChange={handleChange} placeholder="Same as shipping or alternate billing address" />
                  </div>
                </div>
              </div>
              <div className="checkout-card">
                <h4>Payment & Delivery</h4>
                <div className="payment-options">
                  {[
                    { value: 'esewa', label: 'eSewa' },
                    { value: 'khalti', label: 'Khalti' },
                    { value: 'cod', label: 'Cash on Delivery' },
                    { value: 'card', label: 'Card Payment' }
                  ].map((method) => (
                    <label key={method.value} className="payment-option">
                      <input type="radio" name="payment_method" value={method.value} checked={form.payment_method === method.value} onChange={handleChange} /> {method.label}
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
                <div className="mt-4">
                  <label className="premium-label">Delivery Option</label>
                  <select className="form-select premium-input" name="delivery_option" value={form.delivery_option} onChange={handleChange}>
                    <option value="standard">Standard Delivery (3-5 days)</option>
                    <option value="express">Express Delivery (1-2 days)</option>
                    <option value="pickup">Studio Pickup</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <aside className="summary-card sticky-summary">
                <h4>Order Summary</h4>
                <div className="summary-list-block">
                  {items.map((item) => (
                    <div key={`${item.backendId || item.productId}-${item.size}-${item.color}`}><span>{item.title} <small className="summary-vendor-label">by {item.vendorName}</small></span><strong>NPR {(item.price * item.quantity).toLocaleString()}</strong></div>
                  ))}
                  <div><span>Shipping</span><strong>NPR {(items.length ? shippingFee : 0).toLocaleString()}</strong></div>
                  <div><span>Total</span><strong>NPR {total.toLocaleString()}</strong></div>
                </div>
                {vouchers.length ? (
                  <div className="alert alert-info mt-3 mb-0">
                    Voucher balance available: NPR {vouchers.reduce((sum, item) => sum + Number(item.balance || 0), 0).toLocaleString()}.
                    Redemption is stored and tracked now, and can be connected into checkout in the next phase.
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
          </form>
        </div>
      </section>
    </>
  );
}

export default CheckoutPage;
