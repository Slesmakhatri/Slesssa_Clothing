import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ChatWorkspace from '../components/chat/ChatWorkspace';
import { listChatConversations } from '../services/api';

function parseSearchPayload(searchParams) {
  const kind = searchParams.get('kind') || '';
  const productId = searchParams.get('product_id');
  const vendorUserId = searchParams.get('vendor_user_id');
  const orderId = searchParams.get('order_id');
  const returnRequestId = searchParams.get('return_request_id');
  const tailoringRequestId = searchParams.get('tailoring_request_id') || searchParams.get('custom_request_id');

  if (!kind) return null;
  return {
    kind,
    conversation_type: kind === 'customer_tailor' ? 'tailor_chat' : 'vendor_chat',
    ...(productId ? { product_id: Number(productId) } : {}),
    ...(vendorUserId ? { vendor_user_id: Number(vendorUserId) } : {}),
    ...(orderId ? { order_id: Number(orderId) } : {}),
    ...(returnRequestId ? { return_request_id: Number(returnRequestId) } : {}),
    ...(tailoringRequestId ? { tailoring_request_id: Number(tailoringRequestId), custom_request_id: Number(tailoringRequestId) } : {})
  };
}

function formatTime(value) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';
  return new Intl.DateTimeFormat('en-NP', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function getParticipantName(conversation) {
  return conversation.counterparty_detail?.brand_name ||
    conversation.counterparty_detail?.full_name ||
    conversation.counterparty_detail?.email ||
    'Conversation';
}

function MessagesHome({ conversations, loading }) {
  const unreadTotal = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
  const vendorChats = conversations.filter((item) => item.conversation_type === 'vendor_chat' || item.kind === 'customer_vendor');
  const tailorChats = conversations.filter((item) => item.conversation_type === 'tailor_chat' || item.kind === 'customer_tailor');
  const recent = conversations.slice(0, 4);

  return (
    <div className="messages-center-grid">
      <Link to="/messages/chats" className="messages-center-card primary">
        <span className="section-eyebrow">Chats</span>
        <strong>{conversations.length}</strong>
        <p>Vendor and tailor conversations</p>
      </Link>
      <Link to="/orders" className="messages-center-card">
        <span className="section-eyebrow">Orders</span>
        <strong>{vendorChats.length}</strong>
        <p>Product, delivery, return, and shop issues</p>
      </Link>
      <Link to="/tailoring" className="messages-center-card">
        <span className="section-eyebrow">Custom Orders</span>
        <strong>{tailorChats.length}</strong>
        <p>Measurements, design changes, and progress</p>
      </Link>
      <div className="messages-center-card">
        <span className="section-eyebrow">Unread</span>
        <strong>{unreadTotal}</strong>
        <p>Replies waiting for you</p>
      </div>

      <section className="messages-recent-panel">
        <div className="messages-section-head">
          <div>
            <span className="section-eyebrow">Recent Chats</span>
            <h2>Continue a conversation</h2>
          </div>
          <Link to="/messages/chats" className="btn btn-slessaa btn-slessaa-outline">View all chats</Link>
        </div>

        {loading ? (
          <div className="empty-state-sm">Loading conversations...</div>
        ) : recent.length ? (
          <div className="messages-thread-preview-list">
            {recent.map((conversation) => (
              <Link key={conversation.id} to={`/messages/chats/${conversation.id}`} className="messages-thread-preview">
                <span className="chat-avatar">{getParticipantName(conversation).charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{getParticipantName(conversation)}</strong>
                  <p>{conversation.last_message_preview || conversation.context_summary || 'No messages yet.'}</p>
                  <small>{conversation.context_summary}</small>
                </div>
                <span className="messages-thread-time">{formatTime(conversation.last_message_at || conversation.updated_at)}</span>
                {conversation.unread_count ? <span className="tool-badge">{conversation.unread_count}</span> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="filter-empty-state compact messages-empty-state">
            <h4>No chats yet</h4>
            <p>Start with a product, order, or customization request.</p>
            <div className="messages-empty-actions">
              <Link className="btn btn-slessaa btn-slessaa-primary" to="/shop">Browse products</Link>
              <Link className="btn btn-slessaa btn-slessaa-outline" to="/orders">Start from orders</Link>
              <Link className="btn btn-slessaa btn-slessaa-outline" to="/tailoring">View customization</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MessagesPage() {
  const [searchParams] = useSearchParams();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoStartPayload = useMemo(() => parseSearchPayload(searchParams), [searchParams]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const isChatsList = location.pathname === '/messages/chats';
  const isConversationDetail = Boolean(conversationId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listChatConversations()
      .then((items) => {
        if (active) setConversations(items);
      })
      .catch(() => {
        if (active) setConversations([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const title = autoStartPayload?.kind === 'customer_tailor'
    ? 'Opening tailor chat'
    : isConversationDetail
      ? 'Conversation'
      : 'Messages';
  const description = autoStartPayload
    ? 'Preparing the right conversation for this product, order, or tailoring request.'
    : 'Keep product, order, and custom tailoring conversations in one place.';

  return (
    <>
      {!isConversationDetail ? (
        <section className="page-hero compact-hero messages-hero">
          <div className="container">
            <span className="section-eyebrow">Message Center</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </section>
      ) : null}
      <section className={`section-space messages-page-section ${isConversationDetail ? 'messages-page-section--detail' : ''}`}>
        <div className="container">
          {autoStartPayload ? (
            <ChatWorkspace
              kind={autoStartPayload.kind}
              autoStartPayload={autoStartPayload}
              title="Opening chat"
              description="Creating or finding the existing thread."
              onConversationStarted={(conversation) => navigate(`/messages/chats/${conversation.id}`, { replace: true })}
              emptyTitle="Opening conversation"
              emptyDescription="This thread will appear in your chat list after it is ready."
            />
          ) : isConversationDetail ? (
            <ChatWorkspace
              initialConversationId={conversationId}
              detailMode
              showHeader={false}
              onBack={() => navigate('/messages/chats')}
              onConversationSelect={(conversation) => navigate(`/messages/chats/${conversation.id}`)}
              title="Chat detail"
              description="Review the context and continue the conversation."
              emptyTitle="No chat threads yet"
              emptyDescription="Start a chat from a product, order, or tailoring request."
            />
          ) : isChatsList ? (
            <ChatWorkspace
              showThread={false}
              onConversationSelect={(conversation) => navigate(`/messages/chats/${conversation.id}`)}
              title="Chats"
              description="Select a conversation to open the full thread."
              emptyTitle="No chat threads yet"
              emptyDescription="Start a chat from a product page, order, or tailoring request."
            />
          ) : (
            <MessagesHome conversations={conversations} loading={loading} />
          )}
        </div>
      </section>
    </>
  );
}

export default MessagesPage;
