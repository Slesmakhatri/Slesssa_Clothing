import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendChatbotMessage } from '../../services/api';
import { getProductImage, getProductPrice } from '../../services/productUtils';

const quickPrompts = [
  'Help me choose a design',
  'Estimate my measurements',
  'Help me customize a product',
  'Recommend a vendor',
  'Track my order'
];

function formatFilters(filters = {}) {
  return [filters.category, filters.color, filters.occasion, filters.gender].filter(Boolean).join(' | ');
}

function ChatbotWidget() {
  const navigate = useNavigate();
  const initialMessages = useMemo(
    () => [
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Ask for product guidance, customization help, vendor suggestions, order tracking, or payment support. I can still recommend matching products from the live catalog.',
        products: [],
        filters: {},
        vendors: [],
        actions: quickPrompts
      }
    ],
    []
  );
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend(nextDraft) {
    const message = String(nextDraft ?? draft).trim();
    if (!message || sending) {
      return;
    }

    setMessages((current) => [...current, { id: `user-${Date.now()}`, sender: 'user', text: message }]);
    setDraft('');
    setSending(true);

    try {
      const payload = await sendChatbotMessage(message);
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: payload.message || 'Here are some matching products.',
          products: payload.products || [],
          filters: payload.filters || {},
          vendors: payload.vendors || [],
          actions: payload.actions || []
        }
      ]);
    } catch (error) {
      const fallbackMessage =
        error?.payload?.detail || 'I could not fetch live recommendations right now. Please try again in a moment.';
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: fallbackMessage,
          products: [],
          filters: {},
          vendors: [],
          actions: []
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleAssistantAction(action) {
    const label = String(action || '').trim();
    if (!label) return;

    const lowered = label.toLowerCase();
    if (lowered === 'log in') {
      setOpen(false);
      navigate('/login');
      return;
    }
    if (lowered.includes('tailoring') || lowered.includes('measure') || lowered.includes('tailor') || lowered.includes('design suggestion')) {
      setOpen(false);
      navigate('/tailoring');
      return;
    }
    if (lowered.includes('dashboard')) {
      setOpen(false);
      navigate('/dashboard/customer');
      return;
    }
    if (lowered.includes('support')) {
      setOpen(false);
      navigate('/contact');
      return;
    }
    if (lowered.includes('tracking')) {
      setOpen(false);
      navigate('/track-order');
      return;
    }

    handleSend(label);
  }

  return (
    <div className={`chatbot-widget ${open ? 'open' : ''}`}>
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div>
              <span className="section-eyebrow">Slessaa Assistant</span>
              <h5>AI style and shopping help</h5>
              <p>Use it for design direction, vendor choice, customization help, order tracking, or product discovery.</p>
            </div>
          </div>
          <div className="chatbot-suggestions">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" className="chat-suggestion-chip" onClick={() => handleAssistantAction(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <div className="chatbot-body">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.sender === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}>
                <div className={`chat-bubble ${message.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>{message.text}</div>
                {message.sender === 'bot' && formatFilters(message.filters) ? <div className="chatbot-meta">{formatFilters(message.filters)}</div> : null}
                {message.sender === 'bot' && message.products?.length ? (
                  <div className="chat-product-grid">
                    {message.products.slice(0, 4).map((product) => (
                      <Link key={product.id} to={`/shop/${product.slug || product.id}`} className="chat-product-card" onClick={() => setOpen(false)}>
                        <img src={getProductImage(product)} alt={product.title || product.name} />
                        <div>
                          <strong>{product.title || product.name}</strong>
                          <span>{product.category_name || product.category_detail?.name || 'Slessaa Edit'}</span>
                          <small>NPR {getProductPrice(product).toLocaleString()}</small>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.sender === 'bot' && message.vendors?.length ? (
                  <div className="chat-vendor-grid">
                    {message.vendors.map((vendor) => (
                      <Link
                        key={vendor.id}
                        to="/contact"
                        state={{
                          vendorName: vendor.brand_name,
                          vendorUserId: vendor.user || vendor.user_id || null
                        }}
                        className="chat-vendor-card"
                        onClick={() => setOpen(false)}
                      >
                        <strong>{vendor.brand_name}</strong>
                        <span>{vendor.specialization || 'Fashion vendor'}</span>
                        <small>{vendor.location || 'Location not listed'}</small>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.sender === 'bot' && message.actions?.length ? (
                  <div className="chatbot-actions">
                    {message.actions.map((action) => (
                      <button key={`${message.id}-${action}`} type="button" className="chat-suggestion-chip subtle" onClick={() => handleAssistantAction(action)}>
                        {action}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message-bot">
                <div className="chat-bubble chat-bubble-bot typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          <div className="chatbot-input">
            <input
              className="form-control premium-input"
              placeholder="Try: I want a modern kurta or track my order"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={() => handleSend()} disabled={sending}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
      <button type="button" className="chatbot-toggle" onClick={() => setOpen((value) => !value)} aria-label="Chatbot">
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
      </button>
    </div>
  );
}

export default ChatbotWidget;
