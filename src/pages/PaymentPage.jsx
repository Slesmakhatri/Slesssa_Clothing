import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { verifyPayment } from '../services/api';

function PaymentPage() {
  const { provider, paymentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const order = location.state?.order;
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const hasProcessedCallback = useRef(false);
  const providerName = provider === 'esewa' ? 'eSewa' : provider === 'khalti' ? 'Khalti' : 'Card';

  useEffect(() => {
    if (provider !== 'khalti' || hasProcessedCallback.current) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const pidx = params.get('pidx');
    const khaltiStatus = params.get('status');
    if (!pidx || !khaltiStatus) {
      return;
    }
    hasProcessedCallback.current = true;
    const success = khaltiStatus === 'Completed';
    const gatewayResponse = Object.fromEntries(params.entries());
    handleVerification(success, {
      gateway_reference: pidx,
      external_transaction_id: params.get('transaction_id') || params.get('tidx') || '',
      verification_reference: pidx,
      gateway_code: khaltiStatus,
      gateway_message: `Khalti callback returned ${khaltiStatus}.`,
      gateway_response: gatewayResponse,
    });
  }, [location.search, provider]);

  async function handleVerification(success, extraPayload = {}) {
    setSubmitting(true);
    setStatusMessage('');
    try {
      const response = await verifyPayment({ payment_id: Number(paymentId), success, ...extraPayload });
      if (success) {
        await clearCart();
      }
      navigate('/track-order', { state: { order: response.order } });
    } catch (error) {
      setStatusMessage(error?.payload?.detail || error?.message || 'Unable to verify payment right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section-space">
      <div className="container">
        <div className="checkout-card mx-auto" style={{ maxWidth: '720px' }}>
          <span className="section-eyebrow">{providerName} Sandbox</span>
          <h1>Complete your payment verification</h1>
          <p>
            {provider === 'khalti'
              ? 'Khalti redirects back to this page after checkout, and the backend performs the final lookup before updating your order.'
              : `This demo flow simulates the ${providerName} sandbox redirect and updates payment plus order status in the backend.`}
          </p>
          {statusMessage && <div className="alert alert-danger">{statusMessage}</div>}
          <div className="summary-list-block">
            <div><span>Payment ID</span><strong>{paymentId}</strong></div>
            <div><span>Order</span><strong>{order?.order_number || `#${order?.id || 'Pending'}`}</strong></div>
            <div><span>Amount</span><strong>NPR {Number(order?.total || 0).toLocaleString()}</strong></div>
          </div>
          <div className="d-flex gap-3 mt-4 flex-wrap">
            <button className="btn btn-slessaa btn-slessaa-primary" disabled={submitting} onClick={() => handleVerification(true)}>
              {submitting ? 'Processing...' : `Pay with ${providerName}`}
            </button>
            <button className="btn btn-slessaa btn-slessaa-outline" disabled={submitting} onClick={() => handleVerification(false)}>
              Mark as Failed
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PaymentPage;
