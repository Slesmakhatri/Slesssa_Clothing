import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatWorkspace from '../components/chat/ChatWorkspace';

function parseSearchPayload(searchParams) {
  const kind = searchParams.get('kind') || '';
  const productId = searchParams.get('product_id');
  const vendorUserId = searchParams.get('vendor_user_id');
  const orderId = searchParams.get('order_id');
  const returnRequestId = searchParams.get('return_request_id');
  const tailoringRequestId = searchParams.get('tailoring_request_id');

  if (!kind) return null;
  return {
    kind,
    ...(productId ? { product_id: Number(productId) } : {}),
    ...(vendorUserId ? { vendor_user_id: Number(vendorUserId) } : {}),
    ...(orderId ? { order_id: Number(orderId) } : {}),
    ...(returnRequestId ? { return_request_id: Number(returnRequestId) } : {}),
    ...(tailoringRequestId ? { tailoring_request_id: Number(tailoringRequestId) } : {})
  };
}

function MessagesPage() {
  const [searchParams] = useSearchParams();
  const autoStartPayload = useMemo(() => parseSearchPayload(searchParams), [searchParams]);
  const title = autoStartPayload?.kind === 'customer_tailor' ? 'Customer ↔ Tailor Chat' : 'Customer ↔ Vendor Chat';
  const description =
    autoStartPayload?.kind === 'customer_tailor'
      ? 'Discuss measurements, design preferences, fitting, and customization progress.'
      : 'Ask about product details, stock, customization support, delivery, and post-order product issues.';

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Messages</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="section-space">
        <div className="container">
          <ChatWorkspace
            kind={autoStartPayload?.kind || ''}
            autoStartPayload={autoStartPayload}
            title={title}
            description={description}
            emptyTitle="No chat threads yet"
            emptyDescription="Start a chat from a product page, order flow, or tailoring request to continue communication here."
          />
        </div>
      </section>
    </>
  );
}

export default MessagesPage;
