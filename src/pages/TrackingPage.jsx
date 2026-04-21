import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import OrderProgress from '../components/tracking/OrderProgress';
import { getOrder } from '../services/api';

function TrackingPage() {
  const location = useLocation();
  const { orderId: routeOrderId } = useParams();
  const [order, setOrder] = useState(location.state?.order || null);
  const orderId = routeOrderId || new URLSearchParams(location.search).get('order');

  useEffect(() => {
    if (order || !orderId) return;
    getOrder(orderId).then(setOrder).catch(() => undefined);
  }, [order, orderId]);

  const progressSteps = useMemo(() => {
    const statusOrder = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
    const latestStatus = order?.status || 'pending';
    return statusOrder.map((status) => {
      const update = order?.tracking_updates?.find((item) => item.status === status);
      return {
        label: status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        date: update?.timestamp ? new Date(update.timestamp).toLocaleDateString() : 'Pending',
        completed: statusOrder.indexOf(status) <= statusOrder.indexOf(latestStatus)
      };
    });
  }, [order]);

  const displayOrderNumber = order?.order_number || '#SL-00000';
  const displayItem = order?.items?.[0]?.product_name || order?.items?.[0]?.product_detail?.name || 'Awaiting order selection';
  const displayPayment = order?.payment_method || 'N/A';
  const displayStatus = order?.status || 'Pending';
  const displayDelivery = order?.estimated_delivery || order?.city || 'TBD';

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Order Tracking</span>
          <h1>Track tailoring and delivery progress with confidence</h1>
          <p>Clear status visualization for order placement, fit confirmation, tailoring, dispatch, and delivery.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="tracking-card">
                <div className="tracking-top">
                  <div>
                    <span className="section-eyebrow">Order {displayOrderNumber}</span>
                    <h3>{displayItem}</h3>
                  </div>
                  <div className="tracking-status">Estimated Delivery: {displayDelivery}</div>
                </div>
                <OrderProgress steps={progressSteps} />
              </div>
            </div>
            <div className="col-lg-4">
              <aside className="summary-card">
                <h4>Order Summary</h4>
                <div className="summary-list-block">
                  <div><span>Payment</span><strong>{displayPayment}</strong></div>
                  <div><span>Shipping</span><strong>Standard</strong></div>
                  <div><span>Status</span><strong>{displayStatus}</strong></div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default TrackingPage;
